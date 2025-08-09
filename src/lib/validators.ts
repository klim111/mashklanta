import { z } from "zod";

export const PresignUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().max(15 * 1024 * 1024), // 15MB limit
});

export const CreateDocumentSchema = z.object({
  s3Key: z.string().min(1),
  originalUrl: z.string().url().optional(),
});

export const RatesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export function isAllowedImageMime(mime: string): boolean {
  return [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
  ].includes(mime.toLowerCase());
}