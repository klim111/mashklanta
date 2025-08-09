import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPresignedGetUrl } from "@/lib/s3";
import { extractTextFromImageUri } from "@/lib/ocr";
import { getServerAuth } from "@/lib/auth";

const BodySchema = z.object({ s3Key: z.string().min(1), originalUrl: z.string().url().optional() });

function parseMortgagePayoffReport(text: string) {
  // Minimal placeholder parser with raw text; extend later with real extraction
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const content = lines.join(" ");
  const findNumber = (label: RegExp) => {
    const m = content.match(new RegExp(`${label.source}[^0-9]*([0-9,.]+)`, "i"));
    return m ? parseFloat(m[1].replace(/,/g, "")) : null;
  };

  return {
    borrowerName: null as string | null,
    loanNumber: null as string | null,
    issueDate: null as string | null,
    principalOutstanding: findNumber(/יתרה|קרן/),
    earlyRepaymentAmount: findNumber(/סילוק|פירעון מוקדם/),
    penalties: findNumber(/קנס|עמלת/),
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