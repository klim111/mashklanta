import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getServerAuth } from "@/lib/auth";

const UpsertSchema = z.object({
  inputsJson: z.any(),
  resultsJson: z.any(),
});

export async function GET() {
  const session = await getServerAuth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json([], { status: 200 });
  const items = await prisma.calculation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;
    const body = await req.json();
    const { inputsJson, resultsJson } = UpsertSchema.parse(body);
    const item = await prisma.calculation.create({ data: { userId, inputsJson, resultsJson } });
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}