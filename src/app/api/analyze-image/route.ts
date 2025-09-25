import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize Google Vision client using environment variables
const client = new ImageAnnotatorClient({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
  },
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

interface MortgageTerms {
  bankName?: string;
  loanAmount?: string;
  interestRate?: string;
  loanPeriod?: string;
  monthlyPayment?: string;
  ltv?: string;
  fees?: string;
  additionalTerms: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = imageData.split(',')[1] || imageData;

    const [result] = await client.textDetection({
      image: { content: base64Image },
    });
    const detections = result.textAnnotations;
    const extractedText = detections && detections.length > 0 ? detections[0].description : '';

    const mortgageTerms: MortgageTerms = {
      additionalTerms: [],
    };

    // Regex patterns for common mortgage terms in Hebrew
    const patterns = {
      bankName: /(בנק\s+\S+)/,
      loanAmount: /(סכום הלוואה|סכום משכנתא|קרן)\s*:\s*(\d[\d,.]*)\s*ש"ח/,
      interestRate: /(ריבית|אחוז ריבית)\s*:\s*(\d[\d,.]*)\s*%/,
      loanPeriod: /(תקופה|שנים)\s*:\s*(\d+)\s*שנים/,
      monthlyPayment: /(החזר חודשי|תשלום חודשי)\s*:\s*(\d[\d,.]*)\s*ש"ח/,
      ltv: /(אחוז מימון|LTV)\s*:\s*(\d[\d,.]*)\s*%/,
      fees: /(עמלות|הוצאות)\s*:\s*(\d[\d,.]*)\s*ש"ח/,
    };

    if (extractedText) {
      for (const key in patterns) {
        const match = extractedText.match(patterns[key as keyof typeof patterns]);
        if (match && match[2]) {
          (mortgageTerms as any)[key] = match[2].replace(/,/g, ''); // Remove commas for numerical parsing
        } else if (match && match[1] && key === 'bankName') {
          (mortgageTerms as any)[key] = match[1];
        }
      }

      // Add any other relevant lines as additional terms
      const lines = extractedText.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !Object.values(patterns).some(pattern => trimmedLine.match(pattern))) {
          mortgageTerms.additionalTerms.push(trimmedLine);
        }
      });
    }

    return NextResponse.json({ success: true, extractedText, mortgageTerms });
  } catch (error) {
    console.error('Google Vision API error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}