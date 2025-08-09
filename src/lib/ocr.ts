import vision, { ImageAnnotatorClient } from "@google-cloud/vision";

let client: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!client) {
    client = new vision.ImageAnnotatorClient();
  }
  return client;
}

export async function extractTextFromImageUri(imageUri: string, languageHints: string[] = ["he"]): Promise<string> {
  const c = getClient();
  const [res] = await c.documentTextDetection({
    image: { source: { imageUri } },
    imageContext: { languageHints },
  });
  return res.fullTextAnnotation?.text ?? "";
}