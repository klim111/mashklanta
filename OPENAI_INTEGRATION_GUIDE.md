# OpenAI Integration Guide for Mortgage Document Parsing

## Overview
This guide explains how to integrate OpenAI's GPT-4 Vision API to parse mortgage documents from uploaded images, extracting rates, amounts, periods, and other key information automatically.

## Prerequisites
- OpenAI API key with GPT-4 Vision access
- Node.js and npm installed
- Existing mortgage application setup

## Step-by-Step Implementation

### 1. Install Dependencies
```bash
npm install openai
```

### 2. Environment Variables Setup
Add the following to your `.env.local` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-vision-preview
```

**How to get your OpenAI API key:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

### 3. Key Components Created

#### A. OpenAI Service (`src/lib/openai.ts`)
- `parseMortgageDocumentWithOpenAI()`: Main function for intelligent document parsing
- `extractTextFromImageWithOpenAI()`: Text extraction using OpenAI
- Returns structured data with confidence scores

#### B. Enhanced API Route (`src/app/api/analyze-image/route.ts`)
- Updated to use OpenAI as primary parsing method
- Falls back to Google Vision if OpenAI fails
- Returns parsing method and confidence information

#### C. Enhanced Document Parser Component (`src/components/mortgage-advisor/EnhancedDocumentParser.tsx`)
- Reusable React component for document upload and parsing
- Shows confidence scores and parsing method
- Handles errors gracefully

### 4. Features

#### Intelligent Parsing
- **Bank Name Detection**: Identifies the lending institution
- **Loan Amount**: Extracts total loan amount
- **Interest Rate**: Finds current interest rate percentage
- **Loan Period**: Determines loan duration in years
- **Monthly Payment**: Calculates monthly payment amount
- **LTV Ratio**: Loan-to-value ratio percentage
- **Fees**: Associated processing fees
- **Track Type**: Mortgage track classification (kalatz, katz, prime, gilad, etc.)
- **Remaining Term**: Outstanding loan term
- **Principal Outstanding**: Current principal balance
- **Additional Terms**: Any other relevant information

#### Multi-language Support
- Optimized for Hebrew mortgage documents
- Supports English documents as well
- Intelligent text recognition and parsing

#### Fallback System
- Primary: OpenAI GPT-4 Vision for intelligent parsing
- Fallback: Google Vision API for basic OCR
- Regex parsing as final fallback

### 5. Usage Examples

#### Basic API Usage
```javascript
const response = await fetch('/api/analyze-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    imageData: base64ImageData, 
    useOpenAI: true 
  }),
});

const result = await response.json();
console.log('Parsed data:', result.mortgageTerms);
console.log('Confidence:', result.mortgageTerms.confidence);
console.log('Method used:', result.parsingMethod);
```

#### React Component Usage
```jsx
import EnhancedDocumentParser from '@/components/mortgage-advisor/EnhancedDocumentParser';

function MyComponent() {
  const handleDataParsed = (data) => {
    console.log('Parsed mortgage data:', data);
    // Auto-fill your forms with the extracted data
  };

  const handleTextExtracted = (text) => {
    console.log('Extracted text:', text);
  };

  return (
    <EnhancedDocumentParser
      onDataParsed={handleDataParsed}
      onTextExtracted={handleTextExtracted}
    />
  );
}
```

### 6. Response Format

The API returns structured data in this format:

```json
{
  "success": true,
  "extractedText": "Raw text from document...",
  "mortgageTerms": {
    "bankName": "בנק לאומי",
    "loanAmount": "500000",
    "interestRate": "3.5",
    "loanPeriod": "25",
    "monthlyPayment": "2500",
    "ltv": "80",
    "fees": "5000",
    "trackType": "prime",
    "remainingTermYears": "20",
    "principalOutstanding": "400000",
    "currentRatePercent": "3.5",
    "additionalTerms": ["תנאים נוספים"],
    "confidence": 85
  },
  "parsingMethod": "openai"
}
```

### 7. Error Handling

The system includes comprehensive error handling:

- **API Key Missing**: Falls back to Google Vision
- **OpenAI API Error**: Automatically switches to fallback methods
- **Invalid Image**: Returns clear error messages
- **Network Issues**: Retries with alternative methods

### 8. Cost Considerations

#### OpenAI Pricing (as of 2024)
- GPT-4 Vision: ~$0.01 per image for standard analysis
- High detail mode: ~$0.02 per image
- Consider implementing usage limits for production

#### Optimization Tips
- Use standard detail mode for most documents
- Implement caching for repeated analyses
- Add user confirmation before expensive operations

### 9. Testing

#### Test with Sample Documents
1. Upload a Hebrew mortgage document
2. Check console for parsing method and confidence
3. Verify all fields are correctly extracted
4. Test with different document formats

#### Debug Mode
```javascript
// Enable detailed logging
console.log('Parsing method:', result.parsingMethod);
console.log('Confidence score:', result.mortgageTerms.confidence);
console.log('Raw extracted text:', result.extractedText);
```

### 10. Production Deployment

#### Environment Setup
1. Set `OPENAI_API_KEY` in production environment
2. Configure rate limiting if needed
3. Monitor API usage and costs
4. Set up error monitoring

#### Security Considerations
- Never expose API keys in client-side code
- Validate image file types and sizes
- Implement proper error handling
- Consider request rate limiting

### 11. Troubleshooting

#### Common Issues
1. **"No response from OpenAI"**: Check API key and network connection
2. **Low confidence scores**: Try higher resolution images
3. **Missing fields**: Ensure document is clear and well-lit
4. **Hebrew text issues**: Verify language detection is working

#### Debug Steps
1. Check environment variables are set
2. Test with simple, clear documents first
3. Verify API key has proper permissions
4. Check console for detailed error messages

### 12. Future Enhancements

#### Potential Improvements
- Batch processing for multiple documents
- Document type classification
- Advanced validation rules
- Integration with mortgage calculation APIs
- Historical document comparison

#### Advanced Features
- Machine learning model training
- Custom document templates
- Automated form filling
- Document verification workflows

## Conclusion

This integration provides intelligent, AI-powered mortgage document parsing that significantly improves user experience by automatically extracting and populating form fields from uploaded documents. The system is robust, with multiple fallback options, and provides confidence scores to help users understand the reliability of the extracted data.

