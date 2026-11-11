/**
 * ניקוי חד-פעמי של הטקסט הגולמי של מסמכים מבסיס הנתונים.
 *
 * עד לשינוי הזה כל מסמך שעבר OCR נשמר כטקסט מלא פעמיים: בעמודה ocrText ובתוך
 * parsedJson.rawText. הטקסט הזה מכיל ת"ז, מספרי חשבון ונתוני שכר, ואין לו שימוש
 * אחרי שהשדות המובנים חולצו ממנו.
 *
 * הרצה:
 *   node --env-file=.env scripts/scrub-document-text.mjs --dry-run
 *   node --env-file=.env scripts/scrub-document-text.mjs
 */

import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 200;

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const total = await prisma.document.count();
  const withOcrText = await prisma.document.count({ where: { NOT: { ocrText: null } } });

  console.log(`מסמכים בסך הכל: ${total}`);
  console.log(`מסמכים עם ocrText: ${withOcrText}`);

  let scannedForRawText = 0;
  let clearedRawText = 0;
  let cursor;

  // parsedJson הוא Json חופשי, ולכן אי אפשר לסנן עליו בשאילתה אחת ויש לעבור עליו בקוד
  for (;;) {
    const batch = await prisma.document.findMany({
      where: { NOT: { parsedJson: { equals: null } } },
      select: { id: true, parsedJson: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;
    scannedForRawText += batch.length;

    for (const doc of batch) {
      const parsed = doc.parsedJson;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      if (!("rawText" in parsed)) continue;

      clearedRawText += 1;
      if (dryRun) continue;

      const { rawText: _dropped, ...rest } = parsed;
      await prisma.document.update({ where: { id: doc.id }, data: { parsedJson: rest } });
    }
  }

  console.log(`נסרקו עבור rawText: ${scannedForRawText}`);
  console.log(`רשומות עם rawText: ${clearedRawText}`);

  if (dryRun) {
    console.log("\nהרצה יבשה — לא בוצע שינוי. הרץ ללא --dry-run כדי לנקות.");
    return;
  }

  const { count } = await prisma.document.updateMany({
    where: { NOT: { ocrText: null } },
    data: { ocrText: null },
  });

  console.log(`\nנוקו: ${count} ערכי ocrText, ${clearedRawText} ערכי rawText.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
