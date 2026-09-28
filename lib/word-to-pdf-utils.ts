import JSZip from 'jszip';

export const MAX_WORD_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_WORD_EXTENSIONS = ['.docx', '.doc'];

export const SUPPORTED_WORD_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
  'application/x-zip-compressed',
];

/**
 * Sanitizes and validates an API key string, stripping surrounding quotes and placeholder text.
 */
export function sanitizeApiKey(rawKey?: string | null): string | undefined {
  if (!rawKey) return undefined;
  const trimmed = rawKey.trim();
  const unquoted = trimmed.replace(/^["']|["']$/g, '').trim();
  if (
    !unquoted ||
    unquoted === 'your_cloudconvert_api_key_here' ||
    unquoted === 'your_actual_cloudconvert_api_key_here'
  ) {
    return undefined;
  }
  return unquoted;
}

/**
 * Retrieves and sanitizes the CLOUDCONVERT_API_KEY environment variable.
 */
export function getCloudConvertApiKey(): string | undefined {
  return sanitizeApiKey(process.env.CLOUDCONVERT_API_KEY);
}

/**
 * Checks if the buffer starts with valid DOCX (Zip: 50 4B 03 04) or DOC (CFB: D0 CF 11 E0) magic bytes.
 */
export function isValidWordMagicBytes(buffer: ArrayBuffer | Uint8Array, extension: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  if (bytes.length < 4) return false;

  const ext = extension.toLowerCase();

  // DOCX is a zip archive: 50 4B 03 04
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  // DOC is OLE CFB: D0 CF 11 E0 A1 B1 1A E1
  const isDoc = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;

  if (ext.endsWith('.docx')) {
    return isZip;
  }
  if (ext.endsWith('.doc')) {
    return isDoc || isZip;
  }

  return isZip || isDoc;
}

/**
 * Validates a Word file's extension, size, and optional byte header.
 */
export function validateWordFile(file: {
  name: string;
  size: number;
  type?: string;
  buffer?: ArrayBuffer;
}): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'No filename provided.' };
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = SUPPORTED_WORD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a Word document (.docx or .doc).',
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The uploaded file is empty (0 bytes).' };
  }

  if (file.size > MAX_WORD_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 25 MB limit (${formatByteSize(file.size)}). Please choose a smaller document.`,
    };
  }

  if (file.buffer && file.buffer.byteLength >= 4) {
    if (!isValidWordMagicBytes(file.buffer, file.name)) {
      return {
        valid: false,
        error: 'The file appears to be corrupted or is not a valid Microsoft Word document.',
      };
    }
  }

  return { valid: true };
}

/**
 * Formats byte size into human-readable B, KB, or MB string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Converts a Word document filename to its corresponding PDF filename.
 */
export function getOutputPdfFilename(inputFilename: string): string {
  const cleanName = inputFilename.replace(/\.(docx|doc)$/i, '');
  return `${cleanName || 'document'}.pdf`;
}

/**
 * Safely revokes an object URL to release browser memory.
 */
export function safeRevokeUrl(url: string | null | undefined): void {
  if (url && typeof window !== 'undefined' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation error
    }
  }
}

/**
 * Builds the CloudConvert v2 job payload.
 */
export function buildCloudConvertJobPayload() {
  return {
    tasks: {
      'import-file': {
        operation: 'import/upload',
      },
      'convert-file': {
        operation: 'convert',
        input: 'import-file',
        output_format: 'pdf',
        engine: 'office',
      },
      'export-file': {
        operation: 'export/url',
        input: 'convert-file',
      },
    },
  };
}

export interface CloudConvertJobResponse {
  data: {
    id: string;
    status: 'waiting' | 'processing' | 'finished' | 'error';
    tasks: Array<{
      id: string;
      name: string;
      operation: string;
      status: 'waiting' | 'processing' | 'finished' | 'error';
      message?: string;
      result?: {
        form?: {
          url: string;
          parameters: Record<string, string>;
        };
        files?: Array<{
          filename: string;
          url: string;
          size: number;
        }>;
      };
    }>;
  };
}

/**
 * Executes Word to PDF conversion via CloudConvert API v2.
 */
export async function convertWordToPdfWithCloudConvert(
  fileBuffer: ArrayBuffer,
  filename: string,
  apiKey: string,
  options?: {
    onProgress?: (status: string) => void;
  }
): Promise<{ pdfBuffer: ArrayBuffer; size: number }> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('CLOUDCONVERT_API_KEY is not configured.');
  }

  options?.onProgress?.('Initializing CloudConvert job...');

  // 1. Create CloudConvert job
  const jobPayload = buildCloudConvertJobPayload();
  const createJobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobPayload),
  });

  if (!createJobRes.ok) {
    const errorJson = await createJobRes.json().catch(() => ({}));
    const message = errorJson.message || `CloudConvert job creation failed with status ${createJobRes.status}`;
    throw new Error(message);
  }

  const jobData: CloudConvertJobResponse = await createJobRes.json();
  const uploadTask = jobData.data.tasks.find((t) => t.operation === 'import/upload');

  if (!uploadTask || !uploadTask.result?.form) {
    throw new Error('CloudConvert did not return upload form parameters.');
  }

  options?.onProgress?.('Uploading Word document to CloudConvert...');

  // 2. Upload file to CloudConvert upload URL
  const form = uploadTask.result.form;
  const formData = new FormData();

  // Append parameters
  for (const [key, val] of Object.entries(form.parameters)) {
    formData.append(key, val);
  }

  // Append file (must be last field)
  const fileBlob = new Blob([fileBuffer], {
    type: filename.toLowerCase().endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword',
  });
  formData.append('file', fileBlob, filename);

  const uploadRes = await fetch(form.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`File upload to CloudConvert failed with status ${uploadRes.status}`);
  }

  options?.onProgress?.('Converting document with high-fidelity Office engine...');

  // 3. Poll for job completion
  const jobId = jobData.data.id;
  const maxAttempts = 35; // ~50 seconds max
  let attempts = 0;
  let exportUrl: string | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, 1500));

    const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    if (!pollRes.ok) {
      throw new Error(`Failed to check CloudConvert job status: ${pollRes.statusText}`);
    }

    const currentJob: CloudConvertJobResponse = await pollRes.json();
    const status = currentJob.data.status;

    if (status === 'finished') {
      const exportTask = currentJob.data.tasks.find(
        (t) => t.operation === 'export/url' && t.status === 'finished'
      );
      if (exportTask?.result?.files?.[0]?.url) {
        exportUrl = exportTask.result.files[0].url;
        break;
      }
    } else if (status === 'error') {
      const failedTask = currentJob.data.tasks.find((t) => t.status === 'error');
      throw new Error(
        failedTask?.message || 'Word to PDF conversion failed on CloudConvert server.'
      );
    }
  }

  if (!exportUrl) {
    throw new Error('Conversion timed out waiting for CloudConvert to finish.');
  }

  options?.onProgress?.('Downloading converted PDF...');

  // 4. Download converted PDF file
  const downloadRes = await fetch(exportUrl);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download converted PDF: ${downloadRes.statusText}`);
  }

  const pdfBuffer = await downloadRes.arrayBuffer();
  return {
    pdfBuffer,
    size: pdfBuffer.byteLength,
  };
}

/**
 * Creates a valid, formatted sample .docx file in-memory for testing.
 */
export async function createSampleWordDocument(): Promise<File> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/document.xml with formatted title, paragraphs, and a styled table
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>ASAPTools Sample Document</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="24"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Production Word to PDF High-Fidelity Conversion Test</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>This is an authentic Microsoft Word document (.docx) generated for testing the ASAPTools Word to PDF pipeline. When converted using the CloudConvert Office rendering engine, all document styling, typography, paragraph spacing, and tables are preserved with 100% vector accuracy.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Feature</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Status</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Font Fidelity</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Preserved</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Table Alignment</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Preserved</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Vector Output</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>Crisp PDF</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`
  );

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return new File([docxBlob], 'asaptools-sample-document.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
