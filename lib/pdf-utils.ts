import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PdfFileMeta {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  pageCount: number;
  isEncrypted: boolean;
  error?: string;
  arrayBuffer?: ArrayBuffer;
}

export interface ParsedPageRange {
  pages: number[]; // 1-indexed extracted pages in order
  totalPages: number;
  isValid: boolean;
  errors: string[];
  summary: string;
}

export interface PdfOperationResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  pageCount: number;
  downloadFilename: string;
}

export const MAX_PDF_FILE_SIZE = 100 * 1024 * 1024; // 100 MB max size safety limit

/**
 * Formats byte size into human-readable B, KB, or MB string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Returns filename without trailing extension.
 */
export function getFilenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
}

/**
 * Safely revokes an object URL to release browser memory.
 */
export function safeRevokeUrl(url: string | null | undefined): void {
  if (url && typeof window !== 'undefined' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation errors
    }
  }
}

/**
 * Parses and validates user-entered page ranges such as:
 * "1-3, 5, 8-10"
 * Validates against the document's total page count.
 */
export function parsePageRanges(input: string, totalPages: number): ParsedPageRange {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      pages: [],
      totalPages,
      isValid: false,
      errors: ['Please enter page numbers or ranges (e.g. 1-3, 5, 8-10).'],
      summary: '',
    };
  }

  if (totalPages <= 0) {
    return {
      pages: [],
      totalPages,
      isValid: false,
      errors: ['The loaded PDF does not contain any valid pages.'],
      summary: '',
    };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {
      pages: [],
      totalPages,
      isValid: false,
      errors: ['No valid page numbers found.'],
      summary: '',
    };
  }

  const selectedPages: number[] = [];
  const errors: string[] = [];
  const seenPages = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const rangeParts = part.split('-').map((s) => s.trim());
      if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
        errors.push(`Invalid range syntax "${part}". Expected format: start-end (e.g. 1-5).`);
        continue;
      }

      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        errors.push(`Invalid numbers in range "${part}". Both ends must be whole numbers.`);
        continue;
      }

      if (start <= 0 || end <= 0) {
        errors.push(`Page numbers must be 1 or greater in range "${part}".`);
        continue;
      }

      if (start > end) {
        errors.push(`Invalid range "${part}": start page (${start}) cannot be greater than end page (${end}).`);
        continue;
      }

      if (end > totalPages) {
        errors.push(`Page ${end} in range "${part}" exceeds document total (${totalPages} pages).`);
        continue;
      }

      for (let p = start; p <= end; p++) {
        if (!seenPages.has(p)) {
          seenPages.add(p);
          selectedPages.push(p);
        }
      }
    } else {
      const pageNum = Number(part);
      if (!Number.isInteger(pageNum)) {
        errors.push(`"${part}" is not a valid whole page number.`);
        continue;
      }

      if (pageNum <= 0) {
        errors.push(`Page numbers must be 1 or greater ("${pageNum}").`);
        continue;
      }

      if (pageNum > totalPages) {
        errors.push(`Page ${pageNum} exceeds document total (${totalPages} pages).`);
        continue;
      }

      if (!seenPages.has(pageNum)) {
        seenPages.add(pageNum);
        selectedPages.push(pageNum);
      }
    }
  }

  const isValid = errors.length === 0 && selectedPages.length > 0;
  let summary = '';
  if (isValid) {
    if (selectedPages.length === 1) {
      summary = `Extracting page ${selectedPages[0]} of ${totalPages}`;
    } else if (selectedPages.length === totalPages) {
      summary = `Extracting all ${totalPages} pages`;
    } else {
      summary = `Extracting ${selectedPages.length} pages (${selectedPages.slice(0, 8).join(', ')}${
        selectedPages.length > 8 ? '...' : ''
      }) of ${totalPages}`;
    }
  }

  return {
    pages: selectedPages,
    totalPages,
    isValid,
    errors,
    summary,
  };
}

/**
 * Generates quick range strings for common presets.
 */
export function generatePresetRange(
  preset: 'all' | 'odd' | 'even' | 'first-half' | 'second-half',
  totalPages: number
): string {
  if (totalPages <= 0) return '';
  switch (preset) {
    case 'all':
      return totalPages === 1 ? '1' : `1-${totalPages}`;
    case 'odd': {
      const oddPages: number[] = [];
      for (let i = 1; i <= totalPages; i += 2) oddPages.push(i);
      return oddPages.join(', ');
    }
    case 'even': {
      const evenPages: number[] = [];
      for (let i = 2; i <= totalPages; i += 2) evenPages.push(i);
      return evenPages.length > 0 ? evenPages.join(', ') : '1';
    }
    case 'first-half': {
      const midpoint = Math.ceil(totalPages / 2);
      return midpoint === 1 ? '1' : `1-${midpoint}`;
    }
    case 'second-half': {
      const midpoint = Math.ceil(totalPages / 2);
      const start = midpoint + 1;
      return start > totalPages ? `${totalPages}` : `${start}-${totalPages}`;
    }
  }
}

/**
 * Loads and inspects PDF metadata, detecting page count and encryption.
 */
export async function loadPdfMeta(file: File, id?: string): Promise<PdfFileMeta> {
  const fileId = id || Math.random().toString(36).substring(2, 11);

  if (file.size > MAX_PDF_FILE_SIZE) {
    return {
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      formattedSize: formatByteSize(file.size),
      pageCount: 0,
      isEncrypted: false,
      error: `File exceeds maximum limit of 100 MB (${formatByteSize(file.size)}).`,
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Check magic bytes for %PDF-
    const header = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...header);
    if (!headerStr.startsWith('%PDF')) {
      return {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        pageCount: 0,
        isEncrypted: false,
        error: 'The selected file is not a valid PDF document.',
      };
    }

    try {
      const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      if (doc.isEncrypted) {
        return {
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          formattedSize: formatByteSize(file.size),
          pageCount: 0,
          isEncrypted: true,
          error: 'This PDF is password-protected. Please remove the password before merging or splitting.',
          arrayBuffer,
        };
      }

      const pageCount = doc.getPageCount();
      if (pageCount === 0) {
        return {
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          formattedSize: formatByteSize(file.size),
          pageCount: 0,
          isEncrypted: false,
          error: 'This PDF does not contain any pages.',
          arrayBuffer,
        };
      }

      return {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        pageCount,
        isEncrypted: false,
        arrayBuffer,
      };
    } catch (parseError: unknown) {
      const errMessage = parseError instanceof Error ? parseError.message : String(parseError);
      if (errMessage.toLowerCase().includes('encrypt') || errMessage.toLowerCase().includes('password')) {
        return {
          id: fileId,
          file,
          name: file.name,
          size: file.size,
          formattedSize: formatByteSize(file.size),
          pageCount: 0,
          isEncrypted: true,
          error: 'This PDF is password-protected. Please remove the password before merging or splitting.',
        };
      }

      return {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        pageCount: 0,
        isEncrypted: false,
        error: `Could not parse PDF: ${errMessage.replace(/at.*/g, '').trim() || 'corrupted structure'}`,
      };
    }
  } catch (err: unknown) {
    return {
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      formattedSize: formatByteSize(file.size),
      pageCount: 0,
      isEncrypted: false,
      error: err instanceof Error ? err.message : 'Failed to read PDF file.',
    };
  }
}

/**
 * Merges multiple PDF files in given order into a single PDF document.
 */
export async function mergePdfs(
  files: (File | { file: File; arrayBuffer?: ArrayBuffer })[],
  outputFilename = 'asaptools-merged.pdf'
): Promise<PdfOperationResult> {
  if (!files || files.length === 0) {
    throw new Error('Please select at least one PDF file to merge.');
  }

  const mergedDoc = await PDFDocument.create();
  let totalMergedPages = 0;

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    const file = item instanceof File ? item : item.file;
    const existingBuffer = !(item instanceof File) ? item.arrayBuffer : undefined;
    const arrayBuffer = existingBuffer || (await file.arrayBuffer());

    let srcDoc: PDFDocument;
    try {
      srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    } catch (err) {
      throw new Error(
        `Failed to read "${file.name}": ${err instanceof Error ? err.message : 'Invalid or corrupted PDF'}`
      );
    }

    if (srcDoc.isEncrypted) {
      throw new Error(`"${file.name}" is password-protected and cannot be merged. Please decrypt it first.`);
    }

    const pageCount = srcDoc.getPageCount();
    if (pageCount === 0) {
      continue;
    }

    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
    totalMergedPages += copiedPages.length;
  }

  if (totalMergedPages === 0) {
    throw new Error('The selected PDF files do not contain any pages to merge.');
  }

  const pdfBytes = await mergedDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);

  const cleanFilename = outputFilename.endsWith('.pdf') ? outputFilename : `${outputFilename}.pdf`;

  return {
    blob,
    objectUrl,
    size: blob.size,
    formattedSize: formatByteSize(blob.size),
    pageCount: totalMergedPages,
    downloadFilename: cleanFilename,
  };
}

/**
 * Splits a PDF and extracts the specified 1-indexed page numbers in given order.
 */
export async function splitPdf(
  file: File | { file: File; arrayBuffer?: ArrayBuffer },
  pageNumbers: number[],
  outputFilename?: string
): Promise<PdfOperationResult> {
  const sourceFile = file instanceof File ? file : file.file;
  const existingBuffer = !(file instanceof File) ? file.arrayBuffer : undefined;
  const arrayBuffer = existingBuffer || (await sourceFile.arrayBuffer());

  if (!pageNumbers || pageNumbers.length === 0) {
    throw new Error('Please specify at least one page number to extract.');
  }

  let srcDoc: PDFDocument;
  try {
    srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (err) {
    throw new Error(
      `Failed to read "${sourceFile.name}": ${err instanceof Error ? err.message : 'Invalid or corrupted PDF'}`
    );
  }

  if (srcDoc.isEncrypted) {
    throw new Error(`"${sourceFile.name}" is password-protected. Please decrypt it first.`);
  }

  const totalDocPages = srcDoc.getPageCount();
  const targetDoc = await PDFDocument.create();

  // Convert 1-indexed pages to 0-indexed indices and validate
  const zeroIndexedIndices: number[] = [];
  for (const pageNum of pageNumbers) {
    if (pageNum < 1 || pageNum > totalDocPages) {
      throw new Error(`Page ${pageNum} is out of bounds (document has ${totalDocPages} pages).`);
    }
    zeroIndexedIndices.push(pageNum - 1);
  }

  const copiedPages = await targetDoc.copyPages(srcDoc, zeroIndexedIndices);
  for (const page of copiedPages) {
    targetDoc.addPage(page);
  }

  const pdfBytes = await targetDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);

  const baseName = getFilenameWithoutExtension(sourceFile.name);
  const rangeLabel = pageNumbers.length === 1 ? `page-${pageNumbers[0]}` : `${pageNumbers.length}-pages`;
  const defaultFilename = `${baseName}-extracted-${rangeLabel}.pdf`;
  const finalFilename = outputFilename
    ? outputFilename.endsWith('.pdf')
      ? outputFilename
      : `${outputFilename}.pdf`
    : defaultFilename;

  return {
    blob,
    objectUrl,
    size: blob.size,
    formattedSize: formatByteSize(blob.size),
    pageCount: copiedPages.length,
    downloadFilename: finalFilename,
  };
}

/**
 * Creates an in-memory sample multi-page PDF document for 1-click testing.
 */
export async function createSamplePdf(
  title = 'Sample Document',
  pageCount = 4
): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const colors = [
    { r: 0.1, g: 0.45, b: 0.9 }, // Blue
    { r: 0.05, g: 0.65, b: 0.45 }, // Emerald
    { r: 0.85, g: 0.35, b: 0.1 }, // Orange
    { r: 0.55, g: 0.25, b: 0.8 }, // Purple
  ];

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([600, 780]);
    const { width, height } = page.getSize();
    const colorScheme = colors[(i - 1) % colors.length];

    // Top decorative bar
    page.drawRectangle({
      x: 0,
      y: height - 12,
      width,
      height: 12,
      color: rgb(colorScheme.r, colorScheme.g, colorScheme.b),
    });

    // Header badge
    page.drawRectangle({
      x: 48,
      y: height - 70,
      width: 140,
      height: 28,
      color: rgb(colorScheme.r, colorScheme.g, colorScheme.b),
    });

    page.drawText(`ASAPTOOLS PDF`, {
      x: 62,
      y: height - 52,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Title
    page.drawText(`${title}`, {
      x: 48,
      y: height - 120,
      size: 26,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });

    // Subtitle / Page Indicator
    page.drawText(`Page ${i} of ${pageCount} — Client-Side PDF Processing Demo`, {
      x: 48,
      y: height - 150,
      size: 14,
      font,
      color: rgb(0.35, 0.42, 0.5),
    });

    // Horizontal divider
    page.drawLine({
      start: { x: 48, y: height - 175 },
      end: { x: width - 48, y: height - 175 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Section Content
    page.drawText(`Section ${i}: Verified Browser Execution`, {
      x: 48,
      y: height - 215,
      size: 16,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.24),
    });

    const bodyParagraphs = [
      `This document was dynamically compiled client-side using pure JavaScript.`,
      `When you merge multiple PDF files, ASAPTools combines their pages in your exact requested order.`,
      `When you split a PDF, you can extract individual pages or custom ranges (such as 1-3, 5, 8-10).`,
      `Zero document data ever leaves your device — complete privacy is guaranteed.`,
    ];

    let currentY = height - 250;
    for (const paragraph of bodyParagraphs) {
      page.drawText(`• ${paragraph}`, {
        x: 56,
        y: currentY,
        size: 12,
        font,
        color: rgb(0.2, 0.25, 0.32),
      });
      currentY -= 28;
    }

    // Interactive Test Note Box
    page.drawRectangle({
      x: 48,
      y: 120,
      width: width - 96,
      height: 90,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(colorScheme.r, colorScheme.g, colorScheme.b),
      borderWidth: 1,
    });

    page.drawText(`TESTING NOTE FOR PAGE ${i}`, {
      x: 64,
      y: 180,
      size: 11,
      font: fontBold,
      color: rgb(colorScheme.r, colorScheme.g, colorScheme.b),
    });

    page.drawText(
      `This page can be reordered in Merge mode, or isolated using Split mode (e.g. range "${i}").`,
      {
        x: 64,
        y: 150,
        size: 11,
        font,
        color: rgb(0.3, 0.35, 0.42),
      }
    );

    // Footer
    page.drawLine({
      start: { x: 48, y: 70 },
      end: { x: width - 48, y: 70 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText(`https://asaptools.in — Fast, Free & Private Web Utilities`, {
      x: 48,
      y: 48,
      size: 10,
      font,
      color: rgb(0.45, 0.5, 0.6),
    });

    page.drawText(`Page ${i} / ${pageCount}`, {
      x: width - 110,
      y: 48,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.32),
    });
  }

  const pdfBytes = await doc.save();
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return new File([pdfBytes as Uint8Array<ArrayBuffer>], `asaptools-${safeTitle}-${pageCount}pages.pdf`, {
    type: 'application/pdf',
  });
}
