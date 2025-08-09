import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPresignedGetUrl } from "@/lib/s3";
import { extractTextFromImageUri } from "@/lib/ocr";
import { getServerAuth } from "@/lib/auth";

const BodySchema = z.object({ s3Key: z.string().min(1), originalUrl: z.string().url().optional() });

function parseMortgagePayoffReport(text: string) {
  // Minimal-yet-practical parser with Hebrew heuristics; extend as needed
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const content = lines.join(" ");

  const normalize = (s: string) => s.replace(/[\u05F3\u05F4\"']/g, '"'); // normalize Hebrew gershayim

  const c = normalize(content);

  const findNumber = (label: RegExp) => {
    const m = c.match(new RegExp(`${label.source}[^0-9]*([0-9,.]+)`, "i"));
    return m ? parseFloat(m[1].replace(/,/g, "")) : null;
  };

  const findPercent = (label: RegExp) => {
    const m = c.match(new RegExp(`${label.source}[^0-9]*([0-9]+(?:[.,][0-9]+)?)%?`, "i"));
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, "."));
    return isNaN(num) ? null : num;
  };

  const findRemainingTermYears = () => {
    // Try to capture expressions like: "יתרת תקופה: 12 שנים", "יתרת תקופה: 84 חודשים"
    const monthMatch = c.match(/(?:יתרת\s*תקופה|תקופה\s*נותרה|יתרה\s*חודשים|יתרת\s*חודשים)[^0-9]*([0-9]{1,4})\s*חודש/i);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      if (!isNaN(months) && months > 0) return months / 12;
    }
    const yearMatch = c.match(/(?:יתרת\s*תקופה|תקופה\s*נותרה|יתרת\s*שנים|יתרה\s*שנים)[^0-9]*([0-9]{1,3})\s*שנ/i);
    if (yearMatch) {
      const years = parseInt(yearMatch[1], 10);
      if (!isNaN(years) && years > 0) return years;
    }
    return null;
  };

  const detectTrackType = (): { trackType: string | null; linkage: string | null } => {
    // Map common Hebrew labels to internal identifiers
    if (/(קל"ץ|קל״ץ|קבועה\s*לא\s*צמודה)/i.test(c)) return { trackType: 'kalatz', linkage: 'לא צמוד' };
    if (/(ק"צ|ק״צ|קבועה\s*צמודה)/i.test(c)) return { trackType: 'katz', linkage: 'צמוד' };
    if (/פריים/i.test(c)) return { trackType: 'prime', linkage: 'לא צמוד' };
    if (/(משתנה).*אג"?ח/i.test(c)) return { trackType: 'gilad', linkage: /צמוד/i.test(c) ? 'צמוד' : 'לא צמוד' };
    if (/משתנה/i.test(c)) return { trackType: 'variable', linkage: /צמוד/i.test(c) ? 'צמוד' : 'לא צמוד' };
    return { trackType: null, linkage: /צמוד/i.test(c) ? 'צמוד' : null };
  };

  const { trackType, linkage } = detectTrackType();

  return {
    borrowerName: null as string | null,
    loanNumber: null as string | null,
    issueDate: null as string | null,
    principalOutstanding: findNumber(/יתרה|קרן|סכום\s*קרן/),
    earlyRepaymentAmount: findNumber(/סילוק|פירעון\s*מוקדם/),
    penalties: findNumber(/קנס|עמלת/),
    currentRatePercent: findPercent(/ריבית|שיעור/),
    remainingTermYears: findRemainingTermYears(),
    trackType,
    linkage,
    tracks: [] as Array<{ trackType: string; rate: number | null; linkage: string | null; outstanding: number | null }>,
    validUntil: null as string | null,
    rawText: text,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;

    const body = await req.json();
    const { s3Key, originalUrl } = BodySchema.parse(body);

    const doc = await prisma.document.create({
      data: { userId, s3Key, originalUrl, status: "processing" },
    });

    try {
      const imageUrl = await getPresignedGetUrl(s3Key, 300);
      const text = await extractTextFromImageUri(imageUrl, ["he"]);
      const parsedJson = parseMortgagePayoffReport(text);

      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "ready", ocrText: text, parsedJson },
      });

      const updated = await prisma.document.findUnique({ where: { id: doc.id } });
      return NextResponse.json(updated, { status: 201 });
    } catch (innerErr: any) {
      await prisma.document.update({ where: { id: doc.id }, data: { status: "failed" } });
      return NextResponse.json({ error: innerErr?.message ?? "OCR failed", documentId: doc.id }, { status: 500 });
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message ?? "Failed to create document" }, { status: 500 });
  }
}