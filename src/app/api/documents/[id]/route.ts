import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, context: any) {
  const session = await getServerAuth();
  const userId = (session?.user as any)?.id as string | undefined;

  const doc = await prisma.document.findUnique({ where: { id: context.params.id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (doc.userId && userId && doc.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(doc);
}