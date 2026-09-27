import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { planDocumentFailure, planDocumentsArchive } from '@/lib/plan-documents';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** תיק המסמכים כולו, כקובץ אחד להורדה */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const result = await planDocumentsArchive(userId, id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.count === 0) {
      return NextResponse.json({ error: 'אין עדיין מסמכים בתיק' }, { status: 404 });
    }

    const fileName = `mashklanta-documents-${id}.zip`;
    return new NextResponse(result.archive as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(result.archive.byteLength),
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[plan-documents] archive failed', error);
    const failure = planDocumentFailure(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
