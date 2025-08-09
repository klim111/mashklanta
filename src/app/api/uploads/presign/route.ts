import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPresignedPutUrl } from "@/lib/s3";
import { isAllowedImageMime, PresignUploadSchema } from "@/lib/validators";
import { getServerAuth } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PresignUploadSchema.parse(json);

    if (!isAllowedImageMime(parsed.contentType)) {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;

    const safeFileName = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${userId ?? "anon"}/${Date.now()}-${uuid()}-${safeFileName}`;

    const url = await getPresignedPutUrl(key, parsed.contentType);

    return NextResponse.json({
      key,
      url,
      method: "PUT",
      headers: { "Content-Type": parsed.contentType },
      maxSize: parsed.fileSize,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message ?? "Failed to presign" }, { status: 500 });
  }
}