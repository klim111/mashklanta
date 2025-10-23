import OpenAI from 'openai';

// Initialize OpenAI client with proper error handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface MortgageDocumentData {
  bankName?: string;
  loanAmount?: number;
  interestRate?: number;
  loanPeriod?: number;
  monthlyPayment?: number;
  ltv?: number;
  fees?: number;
  trackType?: string;
  remainingTermYears?: number;
  principalOutstanding?: number;
  currentRatePercent?: number;
  tableData?: Array<{
    trackType?: string;
    interestRate?: number;
    period?: number;
    monthlyPayment?: number;
    totalAmount?: number;
    ltv?: number;
    fees?: number;
  }>;
  additionalTerms: string[];
  confidence: number;
  rawText: string;
}

export async function parseMortgageDocumentWithOpenAI(
  imageBase64: string,
  language: string = 'he'
): Promise<MortgageDocumentData> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a mortgage document analysis expert specializing in TABLE STRUCTURE parsing. Analyze this ${language === 'he' ? 'Hebrew' : 'English'} mortgage document and extract data COLUMN BY COLUMN from any tables present.

              CRITICAL TABLE PARSING INSTRUCTIONS:
              1. IDENTIFY ALL TABLES in the document
              2. For each table, analyze COLUMN BY COLUMN
              3. Extract data ROW BY ROW for each column
              4. Parse each column separately and maintain column structure
              5. Look for table headers and column labels
              6. Extract numerical data from each cell
              7. Identify relationships between columns

              TABLE STRUCTURE ANALYSIS:
              - Look for table headers (מסלול, ריבית, תקופה, החזר חודשי, etc.)
              - Identify column boundaries and separators
              - Parse each row as a separate data entry
              - Extract values from each cell individually
              - Maintain column-to-column relationships

              MORTGAGE TABLE COLUMNS TO EXTRACT:
              - מסלול / Track Type: Column containing loan track types (קבועה, משתנה, פריים, etc.)
              - ריבית / Interest Rate: Column with interest rates (numbers with %)
              - תקופה / Period: Column with loan periods (months/years)
              - החזר חודשי / Monthly Payment: Column with payment amounts
              - סכום הלוואה / Loan Amount: Column with loan amounts
              - אחוז מימון / LTV: Column with loan-to-value ratios
              - עמלות / Fees: Column with fees and costs

              EXTRACT AND CLASSIFY BY TABLE STRUCTURE:
              - bankName: Bank or financial institution name
              - loanAmount: Total loan amount (number only)
              - interestRate: Interest rate percentage (number only)
              - loanPeriod: Loan duration in years (number only)
              - monthlyPayment: Monthly payment amount (number only)
              - ltv: Loan-to-value ratio percentage (number only)
              - fees: Processing fees or costs (number only)
              - trackType: Mortgage track type (kalatz/katz/prime/gilad/variable/fixed)
              - remainingTermYears: Remaining loan term in years (number only)
              - principalOutstanding: Current outstanding principal (number only)
              - currentRatePercent: Current interest rate percentage (number only)
              - tableData: Array of objects representing each table row with column data
              - additionalTerms: Any other important terms or conditions (array of strings)
              - confidence: Your confidence in the extraction accuracy (0-100)

              HEBREW TABLE TERMS TO LOOK FOR:
              - מסלול = track type column
              - ריבית = interest rate column
              - תקופה = period column
              - החזר חודשי = monthly payment column
              - סכום הלוואה = loan amount column
              - אחוז מימון = LTV column
              - עמלות = fees column
              - בנק = bank name

              ENGLISH TABLE TERMS TO LOOK FOR:
              - Track Type / Loan Type
              - Interest Rate / APR
              - Period / Term
              - Monthly Payment
              - Loan Amount
              - LTV / Loan-to-Value
              - Fees / Costs
              - Bank / Lender

              Return ONLY valid JSON with table structure preserved.
              Extract exact values from each table cell.
              
              Example response with table data:
              {
                "bankName": "בנק לאומי",
                "loanAmount": 350000,
                "interestRate": 7.7,
                "loanPeriod": 20,
                "monthlyPayment": 2804.62,
                "ltv": 80,
                "fees": 0,
                "trackType": "משתנה פריים",
                "remainingTermYears": 20,
                "principalOutstanding": 350000,
                "currentRatePercent": 7.7,
                "tableData": [
                  {
                    "trackType": "קבועה לא צמודה",
                    "interestRate": 7.84,
                    "period": 240,
                    "monthlyPayment": 2858.47,
                    "totalAmount": 673468.80
                  },
                  {
                    "trackType": "משתנה פריים",
                    "interestRate": 7.7,
                    "period": 240,
                    "monthlyPayment": 2804.62,
                    "totalAmount": 673468.80
                  }
                ],
                "additionalTerms": ["תנאים נוספים"],
                "confidence": 90
              }`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsedData = JSON.parse(content);
    
    // Validate and clean the data
    const cleanedData: MortgageDocumentData = {
      bankName: parsedData.bankName || null,
      loanAmount: typeof parsedData.loanAmount === 'number' ? parsedData.loanAmount : undefined,
      interestRate: typeof parsedData.interestRate === 'number' ? parsedData.interestRate : undefined,
      loanPeriod: typeof parsedData.loanPeriod === 'number' ? parsedData.loanPeriod : undefined,
      monthlyPayment: typeof parsedData.monthlyPayment === 'number' ? parsedData.monthlyPayment : undefined,
      ltv: typeof parsedData.ltv === 'number' ? parsedData.ltv : undefined,
      fees: typeof parsedData.fees === 'number' ? parsedData.fees : undefined,
      trackType: parsedData.trackType || null,
      remainingTermYears: typeof parsedData.remainingTermYears === 'number' ? parsedData.remainingTermYears : undefined,
      principalOutstanding: typeof parsedData.principalOutstanding === 'number' ? parsedData.principalOutstanding : undefined,
      currentRatePercent: typeof parsedData.currentRatePercent === 'number' ? parsedData.currentRatePercent : undefined,
      tableData: Array.isArray(parsedData.tableData) ? parsedData.tableData.map((row: any) => ({
        trackType: row.trackType || null,
        interestRate: typeof row.interestRate === 'number' ? row.interestRate : undefined,
        period: typeof row.period === 'number' ? row.period : undefined,
        monthlyPayment: typeof row.monthlyPayment === 'number' ? row.monthlyPayment : undefined,
        totalAmount: typeof row.totalAmount === 'number' ? row.totalAmount : undefined,
        ltv: typeof row.ltv === 'number' ? row.ltv : undefined,
        fees: typeof row.fees === 'number' ? row.fees : undefined,
      })) : [],
      additionalTerms: Array.isArray(parsedData.additionalTerms) ? parsedData.additionalTerms : [],
      confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 0,
      rawText: content
    };

    return cleanedData;

  } catch (error) {
    console.error('OpenAI parsing error:', error);
    
    // Return fallback data structure
    return {
      bankName: undefined,
      loanAmount: undefined,
      interestRate: undefined,
      loanPeriod: undefined,
      monthlyPayment: undefined,
      ltv: undefined,
      fees: undefined,
      trackType: undefined,
      remainingTermYears: undefined,
      principalOutstanding: undefined,
      currentRatePercent: undefined,
      additionalTerms: [],
      confidence: 0,
      rawText: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function extractTextFromImageWithOpenAI(
  imageBase64: string
): Promise<string> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this mortgage document image. Return only the raw text content, preserving line breaks and formatting. Focus on financial numbers, dates, and terms.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI text extraction error:', error);
    return `Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Specialized function for different document types
export async function parseSpecificMortgageDocument(
  imageBase64: string,
  documentType: 'bank_offer' | 'payoff_report' | 'mortgage_statement' | 'general',
  language: string = 'he'
): Promise<MortgageDocumentData> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
  }

  const documentTypePrompts = {
    bank_offer: `This is a BANK OFFER document. Focus on:
    - Bank name and institution
    - Loan amount offered
    - Interest rate proposed
    - Loan term/period
    - Monthly payment amount
    - Any fees or costs
    - Special terms or conditions`,
    
    payoff_report: `This is a PAYOFF REPORT document. Focus on:
    - Current outstanding balance
    - Remaining loan term
    - Current interest rate
    - Monthly payment amount
    - Any penalties or fees
    - Loan track type`,
    
    mortgage_statement: `This is a MORTGAGE STATEMENT document. Focus on:
    - Current balance
    - Interest rate
    - Payment amount
    - Due dates
    - Any fees or charges
    - Account information`,
    
    general: `This is a general mortgage document. Extract all relevant financial information.`
  };

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${documentTypePrompts[documentType]}

              CRITICAL: This document contains TABLES. Parse each table COLUMN BY COLUMN and ROW BY ROW.

              TABLE PARSING INSTRUCTIONS:
              1. IDENTIFY ALL TABLES in the document
              2. For each table, analyze COLUMN BY COLUMN
              3. Extract data ROW BY ROW for each column
              4. Parse each column separately and maintain column structure
              5. Look for table headers and column labels
              6. Extract numerical data from each cell
              7. Identify relationships between columns

              MORTGAGE TABLE STRUCTURE:
              - Look for table headers (מסלול, ריבית, תקופה, החזר חודשי, etc.)
              - Identify column boundaries and separators
              - Parse each row as a separate data entry
              - Extract values from each cell individually
              - Maintain column-to-column relationships

              EXTRACT THESE FIELDS WITH TABLE STRUCTURE:
              - bankName: Bank or financial institution name
              - loanAmount: Total loan amount (number only)
              - interestRate: Interest rate percentage (number only)
              - loanPeriod: Loan duration in years (number only)
              - monthlyPayment: Monthly payment amount (number only)
              - ltv: Loan-to-value ratio percentage (number only)
              - fees: Processing fees or costs (number only)
              - trackType: Mortgage track type (kalatz/katz/prime/gilad/variable/fixed)
              - remainingTermYears: Remaining loan term in years (number only)
              - principalOutstanding: Current outstanding principal (number only)
              - currentRatePercent: Current interest rate percentage (number only)
              - tableData: Array of objects representing each table row with column data
              - additionalTerms: Any other important terms (array of strings)
              - confidence: Your confidence in extraction accuracy (0-100)

              TABLE DATA FORMAT:
              Each table row should be represented as an object with column data:
              {
                "trackType": "מסלול value",
                "interestRate": number,
                "period": number,
                "monthlyPayment": number,
                "totalAmount": number
              }

              Return ONLY valid JSON with table structure preserved.
              Extract exact values from each table cell.
              Be very precise with numbers - extract exact values from the document.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsedData = JSON.parse(content);
    
    // Validate and clean the data
    const cleanedData: MortgageDocumentData = {
      bankName: parsedData.bankName || null,
      loanAmount: typeof parsedData.loanAmount === 'number' ? parsedData.loanAmount : undefined,
      interestRate: typeof parsedData.interestRate === 'number' ? parsedData.interestRate : undefined,
      loanPeriod: typeof parsedData.loanPeriod === 'number' ? parsedData.loanPeriod : undefined,
      monthlyPayment: typeof parsedData.monthlyPayment === 'number' ? parsedData.monthlyPayment : undefined,
      ltv: typeof parsedData.ltv === 'number' ? parsedData.ltv : undefined,
      fees: typeof parsedData.fees === 'number' ? parsedData.fees : undefined,
      trackType: parsedData.trackType || null,
      remainingTermYears: typeof parsedData.remainingTermYears === 'number' ? parsedData.remainingTermYears : undefined,
      principalOutstanding: typeof parsedData.principalOutstanding === 'number' ? parsedData.principalOutstanding : undefined,
      currentRatePercent: typeof parsedData.currentRatePercent === 'number' ? parsedData.currentRatePercent : undefined,
      tableData: Array.isArray(parsedData.tableData) ? parsedData.tableData.map((row: any) => ({
        trackType: row.trackType || null,
        interestRate: typeof row.interestRate === 'number' ? row.interestRate : undefined,
        period: typeof row.period === 'number' ? row.period : undefined,
        monthlyPayment: typeof row.monthlyPayment === 'number' ? row.monthlyPayment : undefined,
        totalAmount: typeof row.totalAmount === 'number' ? row.totalAmount : undefined,
        ltv: typeof row.ltv === 'number' ? row.ltv : undefined,
        fees: typeof row.fees === 'number' ? row.fees : undefined,
      })) : [],
      additionalTerms: Array.isArray(parsedData.additionalTerms) ? parsedData.additionalTerms : [],
      confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 0,
      rawText: content
    };

    return cleanedData;

  } catch (error) {
    console.error('OpenAI specialized parsing error:', error);
    
    // Return fallback data structure
    return {
      bankName: undefined,
      loanAmount: undefined,
      interestRate: undefined,
      loanPeriod: undefined,
      monthlyPayment: undefined,
      ltv: undefined,
      fees: undefined,
      trackType: undefined,
      remainingTermYears: undefined,
      principalOutstanding: undefined,
      currentRatePercent: undefined,
      additionalTerms: [],
      confidence: 0,
      rawText: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
