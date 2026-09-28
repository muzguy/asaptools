import { NextRequest, NextResponse } from 'next/server';
import {
  validateWordFile,
  getOutputPdfFilename,
  convertWordToPdfWithCloudConvert,
  getCloudConvertApiKey,
} from '@/lib/word-to-pdf-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = getCloudConvertApiKey();
  return NextResponse.json({
    configured: Boolean(apiKey),
    maxFileSizeMb: 25,
    supportedFormats: ['.docx', '.doc'],
  });
}

export async function POST(req: NextRequest) {
  const apiKey = getCloudConvertApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'CloudConvert API key is not configured on the server.',
        details:
          'To enable real Word to PDF conversion, add CLOUDCONVERT_API_KEY to your .env.local file in the project root. You can generate a free API key at https://cloudconvert.com/dashboard/api/v2/keys.',
        code: 'MISSING_API_KEY',
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No Word document file was provided.', code: 'INVALID_FILE' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const validation = validateWordFile({
      name: file.name,
      size: file.size,
      type: file.type,
      buffer: arrayBuffer,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid Word document file.', code: 'INVALID_FILE' },
        { status: 400 }
      );
    }

    const { pdfBuffer } = await convertWordToPdfWithCloudConvert(
      arrayBuffer,
      file.name,
      apiKey
    );

    const outputFilename = getOutputPdfFilename(file.name);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'X-Converted-From': file.name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Word to PDF conversion failed.';
    return NextResponse.json(
      {
        error: message,
        code: 'CONVERSION_FAILED',
      },
      { status: 500 }
    );
  }
}
