// ASAPTools CodeLab - In-Browser Python WebAssembly Worker (Pyodide v0.26.4)
// Interactive Python standard input via Web Worker AST Async Bridge
/* eslint-disable no-restricted-globals */

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_CDN_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`;
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let pyodideInstance = null;
let pyodideLoadingPromise = null;
let activeRunId = null;
let activeInputResolver = null;

// Global JS bridge handlers registered on self for Python to call
self._asap_stream_write = function (streamType, chunk) {
  if (activeRunId) {
    self.postMessage({
      type: 'STREAM',
      id: activeRunId,
      stream: streamType,
      chunk: String(chunk || ''),
    });
  }
};

self._asap_request_input = function (promptText) {
  return new Promise((resolve) => {
    if (!activeRunId) {
      resolve({ value: '', eof: true });
      return;
    }
    activeInputResolver = resolve;
    self.postMessage({
      type: 'INPUT_REQUEST',
      id: activeRunId,
      prompt: String(promptText || ''),
    });
  });
};

// Python harness code to safely redirect I/O, perform AST transformation for interactive input, and capture tracebacks
const PYTHON_RUNNER_HARNESS = `
import sys
import io
import ast
import traceback
import asyncio
import js

class __ASAPStream:
    def __init__(self, stream_type):
        self.stream_type = stream_type
        self.captured = []

    def write(self, s):
        if not s:
            return 0
        s_str = str(s)
        self.captured.append(s_str)
        try:
            js._asap_stream_write(self.stream_type, s_str)
        except Exception:
            pass
        return len(s_str)

    def flush(self):
        pass

    def getvalue(self):
        return "".join(self.captured)


class __CallGraphVisitor(ast.NodeVisitor):
    def __init__(self):
        self.func_nodes = {}
        self.func_calls = {}
        self.func_calls_input = set()
        self.current_func = None

    def visit_FunctionDef(self, node):
        prev = self.current_func
        self.current_func = node.name
        self.func_nodes[node.name] = node
        self.func_calls.setdefault(node.name, set())
        self.generic_visit(node)
        self.current_func = prev

    def visit_AsyncFunctionDef(self, node):
        prev = self.current_func
        self.current_func = node.name
        self.func_nodes[node.name] = node
        self.func_calls.setdefault(node.name, set())
        self.generic_visit(node)
        self.current_func = prev

    def visit_Call(self, node):
        called_name = None
        if isinstance(node.func, ast.Name):
            called_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            called_name = node.func.attr

        is_input = (called_name == "input") or (
            isinstance(node.func, ast.Attribute)
            and node.func.attr in ("readline", "read")
            and isinstance(node.func.value, (ast.Name, ast.Attribute))
            and "stdin" in ast.dump(node.func.value)
        )

        if is_input:
            if self.current_func is not None:
                self.func_calls_input.add(self.current_func)
        elif called_name and self.current_func is not None:
            self.func_calls[self.current_func].add(called_name)

        self.generic_visit(node)


def __find_async_functions(tree):
    visitor = __CallGraphVisitor()
    visitor.visit(tree)

    async_funcs = set(visitor.func_calls_input)
    changed = True
    while changed:
        changed = False
        for caller, callees in visitor.func_calls.items():
            if caller not in async_funcs:
                if any(callee in async_funcs for callee in callees):
                    async_funcs.add(caller)
                    changed = True

    return async_funcs


class __AsyncInputTransformer(ast.NodeTransformer):
    def __init__(self, async_funcs):
        super().__init__()
        self.async_funcs = async_funcs
        self.await_parents = set()

    def visit_Await(self, node):
        self.await_parents.add(node.value)
        return self.generic_visit(node)

    def visit_Call(self, node):
        self.generic_visit(node)

        is_input = (isinstance(node.func, ast.Name) and node.func.id == "input") or (
            isinstance(node.func, ast.Attribute)
            and node.func.attr in ("readline", "read")
            and isinstance(node.func.value, (ast.Name, ast.Attribute))
            and "stdin" in ast.dump(node.func.value)
        )

        if is_input:
            replacement_call = ast.Call(
                func=ast.Name(id="_asap_async_input", ctx=ast.Load()),
                args=node.args,
                keywords=node.keywords,
            )
            ast.copy_location(replacement_call, node)
            if node in self.await_parents:
                return replacement_call
            await_node = ast.Await(value=replacement_call)
            ast.copy_location(await_node, node)
            return await_node

        called_name = None
        if isinstance(node.func, ast.Name):
            called_name = node.func.id

        if called_name in self.async_funcs:
            if node in self.await_parents:
                return node
            await_node = ast.Await(value=node)
            ast.copy_location(await_node, node)
            return await_node

        return node

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        if node.name in self.async_funcs:
            async_node = ast.AsyncFunctionDef(
                name=node.name,
                args=node.args,
                body=node.body,
                decorator_list=node.decorator_list,
                returns=node.returns,
                type_comment=getattr(node, "type_comment", None),
            )
            ast.copy_location(async_node, node)
            return async_node
        return node


async def _asap_async_input(prompt=None):
    prompt_str = "" if prompt is None else str(prompt)

    # Request input from JavaScript UI
    res = await js._asap_request_input(prompt_str)

    is_eof = False
    val = ""
    try:
        is_eof = bool(res.eof)
        val = str(res.value)
    except Exception:
        if isinstance(res, dict):
            is_eof = bool(res.get("eof", False))
            val = str(res.get("value", ""))

    if is_eof:
        raise EOFError("EOF when reading a line")

    return val


async def _asap_execute(user_code):
    orig_stdin = sys.stdin
    orig_stdout = sys.stdout
    orig_stderr = sys.stderr

    out_stream = __ASAPStream("stdout")
    err_stream = __ASAPStream("stderr")

    sys.stdout = out_stream
    sys.stderr = err_stream

    error_type = None
    error_msg = None
    error_traceback = None

    try:
        # Step 1: Pre-parse code to isolate syntax/compilation errors
        tree = ast.parse(user_code, filename="<input>", mode="exec")

        # Step 2: Check for input() calls and transform
        has_input = False
        for node in ast.walk(tree):
            is_call = isinstance(node, ast.Call)
            if is_call and isinstance(node.func, ast.Name) and node.func.id == "input":
                has_input = True
                break
            if is_call and isinstance(node.func, ast.Attribute) and node.func.attr in ("readline", "read"):
                has_input = True
                break

        if has_input:
            async_funcs = __find_async_functions(tree)
            transformer = __AsyncInputTransformer(async_funcs)
            tree = transformer.visit(tree)
            ast.fix_missing_locations(tree)

        # Step 3: Compile with PyCF_ALLOW_TOP_LEVEL_AWAIT
        compiled = compile(tree, filename="<input>", mode="exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)

        # Step 4: Execute in fresh global namespace
        globs = {
            "__name__": "__main__",
            "__doc__": None,
            "__package__": None,
            "__builtins__": __builtins__,
            "_asap_async_input": _asap_async_input,
        }

        res = eval(compiled, globs)
        if asyncio.iscoroutine(res):
            await res

    except SyntaxError as e:
        error_type = "compilation_error"
        error_msg = str(e)
        error_traceback = traceback.format_exc()
    except SystemExit:
        # Gracefully handle sys.exit() calls without terminating the worker
        pass
    except BaseException as e:
        error_type = "runtime_error"
        error_msg = f"{type(e).__name__}: {str(e)}"
        error_traceback = traceback.format_exc()
    finally:
        sys.stdin = orig_stdin
        sys.stdout = orig_stdout
        sys.stderr = orig_stderr

    return {
        "stdout": out_stream.getvalue(),
        "stderr": err_stream.getvalue(),
        "error_type": error_type,
        "error_msg": error_msg,
        "error_traceback": error_traceback,
    }
`;

/**
 * Lazily loads and initializes Pyodide.
 */
async function getOrInitPyodide(requestId) {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (pyodideLoadingPromise) {
    return pyodideLoadingPromise;
  }

  pyodideLoadingPromise = (async () => {
    try {
      self.postMessage({
        type: 'STATUS',
        id: requestId,
        stage: 'downloading',
        message: 'Downloading Python WebAssembly runtime (Pyodide)...',
      });

      // Load Pyodide script from CDN
      importScripts(PYODIDE_CDN_URL);

      self.postMessage({
        type: 'STATUS',
        id: requestId,
        stage: 'initializing',
        message: 'Initializing WebAssembly Python virtual machine...',
      });

      // Initialize Pyodide environment
      const pyodide = await self.loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });

      // Prepare harness function in Pyodide namespace
      await pyodide.runPythonAsync(PYTHON_RUNNER_HARNESS);

      pyodideInstance = pyodide;

      self.postMessage({
        type: 'STATUS',
        id: requestId,
        stage: 'ready',
        message: 'Python runtime ready.',
      });

      return pyodide;
    } catch (err) {
      pyodideLoadingPromise = null;
      throw err;
    }
  })();

  return pyodideLoadingPromise;
}

/**
 * Handle messages from the main React UI thread.
 */
self.onmessage = async (event) => {
  const data = event.data;
  if (!data) return;

  const { type, id } = data;

  if (type === 'PING') {
    self.postMessage({ type: 'PONG', id });
    return;
  }

  if (type === 'INIT') {
    try {
      await getOrInitPyodide(id);
      self.postMessage({ type: 'INIT_SUCCESS', id });
    } catch (err) {
      self.postMessage({
        type: 'INIT_ERROR',
        id,
        error: err instanceof Error ? err.message : 'Failed to initialize Python WebAssembly runtime.',
      });
    }
    return;
  }

  if (type === 'INPUT_RESPONSE') {
    if (activeInputResolver && activeRunId === id) {
      const resolver = activeInputResolver;
      activeInputResolver = null;
      resolver({
        value: typeof data.value === 'string' ? data.value : '',
        eof: Boolean(data.eof),
      });
    }
    return;
  }

  if (type === 'RUN') {
    const startTime = Date.now();
    activeRunId = id;
    activeInputResolver = null;

    try {
      // 1. Ensure runtime is ready
      const pyodide = await getOrInitPyodide(id);

      self.postMessage({
        type: 'STATUS',
        id,
        stage: 'running',
        message: 'Executing Python code...',
      });

      // 2. Set user code and execute via async harness
      pyodide.globals.set('__asap_user_code__', data.sourceCode || '');
      const pyResultProxy = await pyodide.runPythonAsync('await _asap_execute(__asap_user_code__)');
      pyodide.globals.delete('__asap_user_code__');

      const pyResult = pyResultProxy.toJs({ dict_converter: Object.fromEntries });
      pyResultProxy.destroy();

      const durationMs = Date.now() - startTime;
      const stdout = typeof pyResult.stdout === 'string' ? pyResult.stdout : '';
      const stderr = typeof pyResult.stderr === 'string' ? pyResult.stderr : '';

      if (pyResult.error_type) {
        self.postMessage({
          type: 'ERROR',
          id,
          errorType: pyResult.error_type,
          error: pyResult.error_msg || 'Execution error',
          traceback: pyResult.error_traceback || pyResult.error_msg,
          stdout,
          stderr,
          executionTimeMs: durationMs,
        });
      } else {
        self.postMessage({
          type: 'SUCCESS',
          id,
          stdout,
          stderr,
          executionTimeMs: durationMs,
        });
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const msg = err instanceof Error ? err.message : String(err);

      self.postMessage({
        type: 'ERROR',
        id,
        errorType: 'runtime_error',
        error: msg,
        traceback: msg,
        stdout: '',
        stderr: '',
        executionTimeMs: durationMs,
      });
    } finally {
      if (activeRunId === id) {
        activeRunId = null;
        activeInputResolver = null;
      }
    }
  }
};
