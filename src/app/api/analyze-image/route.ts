import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { parseMortgageDocumentWithOpenAI, extractTextFromImageWithOpenAI, parseSpecificMortgageDocument, MortgageDocumentData } from '@/lib/openai';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { getServerAuth } from '@/lib/auth';

// ה-endpoint פתוח בכוונה (המחשבון הציבורי משתמש בו), ולכן הוא חשוף לניצול על
// חשבון מפתח ה-OpenAI. המגבלות כאן הן ההגנה היחידה עליו.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// הקידוד ל-base64 ועטיפת ה-JSON מנפחים את הבקשה בכשליש מעל גודל הקובץ
const MAX_REQUEST_BYTES = Math.ceil(MAX_IMAGE_BYTES * 1.4);
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const ANONYMOUS_REQUESTS_PER_WINDOW = 5;
const AUTHENTICATED_REQUESTS_PER_WINDOW = 30;

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

interface EnhancedMortgageTerms extends MortgageTerms {
  confidence?: number;
  trackType?: string;
  remainingTermYears?: string;
  principalOutstanding?: string;
  currentRatePercent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuth();
    const userId = (session?.user as any)?.id as string | undefined;

    const { allowed, resetInSeconds } = await rateLimit(
      userId ? `analyze-image:user:${userId}` : `analyze-image:ip:${getClientIp(request)}`,
      {
        limit: userId ? AUTHENTICATED_REQUESTS_PER_WINDOW : ANONYMOUS_REQUESTS_PER_WINDOW,
        windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
      }
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'יותר מדי בקשות ניתוח. נסה שוב בעוד מספר דקות.' },
        { status: 429, headers: { 'Retry-After': String(resetInSeconds) } }
      );
    }

    // דחייה לפני קריאת הגוף, כדי שגוף ענק לא ייטען לזיכרון רק כדי להידחות
    const declaredSize = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי. הגודל המרבי הוא ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const { imageData, useOpenAI = true, documentType = 'general' } = await request.json();

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = imageData.split(',')[1] || imageData;

    if (Math.floor((base64Image.length * 3) / 4) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי. הגודל המרבי הוא ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    let extractedText = '';
    let mortgageTerms: EnhancedMortgageTerms = {
      additionalTerms: [],
    };

    if (useOpenAI && process.env.OPENAI_API_KEY) {
      try {
        // Use OpenAI for enhanced parsing with document type specialization
        const openAIData = await parseSpecificMortgageDocument(
          base64Image, 
          documentType as 'bank_offer' | 'payoff_report' | 'mortgage_statement' | 'general',
          'he'
        );
        
        // Convert OpenAI data to the expected format
        mortgageTerms = {
          bankName: openAIData.bankName || undefined,
          loanAmount: openAIData.loanAmount?.toString() || undefined,
          interestRate: openAIData.interestRate?.toString() || undefined,
          loanPeriod: openAIData.loanPeriod?.toString() || undefined,
          monthlyPayment: openAIData.monthlyPayment?.toString() || undefined,
          ltv: openAIData.ltv?.toString() || undefined,
          fees: openAIData.fees?.toString() || undefined,
          trackType: openAIData.trackType || undefined,
          remainingTermYears: openAIData.remainingTermYears?.toString() || undefined,
          principalOutstanding: openAIData.principalOutstanding?.toString() || undefined,
          currentRatePercent: openAIData.currentRatePercent?.toString() || undefined,
          additionalTerms: openAIData.additionalTerms,
          confidence: openAIData.confidence
        };

        // Get raw text using OpenAI
        extractedText = await extractTextFromImageWithOpenAI(base64Image);
        
      } catch (openAIError) {
        console.error('OpenAI parsing failed, falling back to Google Vision:', openAIError);
        // Fall back to Google Vision if OpenAI fails
        const [result] = await client.textDetection({
          image: { content: base64Image },
        });
        const detections = result.textAnnotations;
        extractedText = detections && detections.length > 0 ? (detections[0].description || '') : '';
        
        // Use regex parsing as fallback
        mortgageTerms = await parseWithRegex(extractedText);
      }
    } else {
      // Use Google Vision API as fallback
      const [result] = await client.textDetection({
        image: { content: base64Image },
      });
      const detections = result.textAnnotations;
      extractedText = detections && detections.length > 0 ? (detections[0].description || '') : '';
      
      // Use regex parsing
      mortgageTerms = await parseWithRegex(extractedText);
    }

    return NextResponse.json({ 
      success: true, 
      extractedText, 
      mortgageTerms,
      parsingMethod: useOpenAI && process.env.OPENAI_API_KEY ? 'openai' : 'google-vision'
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}

async function parseWithRegex(extractedText: string): Promise<EnhancedMortgageTerms> {
  const mortgageTerms: EnhancedMortgageTerms = {
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

  return mortgageTerms;
}