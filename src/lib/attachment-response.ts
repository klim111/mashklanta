import { NextResponse } from 'next/server';
import { isAllowedDocumentType } from './plan-documents';
import type { StoredAttachment } from './conversation';

/**
 * תשובה עם קובץ מצורף. רק PDF ותמונה מוצגים בדפדפן; כל סוג אחר — ובמיוחד
 * HTML שמישהו צירף — יורד כקובץ בלבד, כדי שלא ירוץ בדומיין של הפלטפורמה.
 */
export function attachmentResponse(
  body: BodyInit,
  attachment: StoredAttachment,
  forceDownload: boolean
): NextResponse {
  const previewable = isAllowedDocumentType(attachment.contentType);
  const download = forceDownload || !previewable;
  return new NextResponse(body, {
    headers: {
      'Content-Type': previewable ? attachment.contentType : 'application/octet-stream',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(
        attachment.fileName
      )}`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
