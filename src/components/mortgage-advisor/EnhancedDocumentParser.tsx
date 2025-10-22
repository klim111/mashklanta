'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle, AlertCircle, Brain } from 'lucide-react';

interface ParsedMortgageData {
  bankName?: string;
  loanAmount?: string;
  interestRate?: string;
  loanPeriod?: string;
  monthlyPayment?: string;
  ltv?: string;
  fees?: string;
  trackType?: string;
  remainingTermYears?: string;
  principalOutstanding?: string;
  currentRatePercent?: string;
  additionalTerms: string[];
  confidence?: number;
}

interface EnhancedDocumentParserProps {
  onDataParsed: (data: ParsedMortgageData) => void;
  onTextExtracted: (text: string) => void;
  className?: string;
}

export default function EnhancedDocumentParser({ 
  onDataParsed, 
  onTextExtracted, 
  className = '' 
}: EnhancedDocumentParserProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedMortgageData | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [parsingMethod, setParsingMethod] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setParsedData(null);
      setExtractedText('');
    }
  };

  const analyzeDocument = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imageData = String(reader.result);
          
          const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              imageData, 
              useOpenAI: true 
            }),
          });

          if (response.ok) {
            const result = await response.json();
            
            setParsedData(result.mortgageTerms);
            setExtractedText(result.extractedText);
            setParsingMethod(result.parsingMethod);
            
            // Call parent callbacks
            onDataParsed(result.mortgageTerms);
            onTextExtracted(result.extractedText);
            
            console.log(`Document parsed with ${result.parsingMethod}`, result.mortgageTerms);
          } else {
            const errorText = await response.text();
            setError(`Analysis failed: ${errorText}`);
            console.error('Error analyzing image:', errorText);
          }
        } catch (err) {
          setError(`Processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
          console.error('Error processing image:', err);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(uploadedFile);
    } catch (err) {
      setError(`File reading error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  const resetParser = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setParsedData(null);
    setExtractedText('');
    setParsingMethod('');
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Enhanced Document Parser
            {parsingMethod && (
              <Badge variant={parsingMethod === 'openai' ? 'default' : 'secondary'}>
                {parsingMethod === 'openai' ? 'OpenAI' : 'Google Vision'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="document-upload">Upload Mortgage Document</Label>
            <Input
              id="document-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              disabled={isAnalyzing}
            />
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {uploadedFile.name}
              </div>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-2">
                <img 
                  src={previewUrl} 
                  alt="Document preview" 
                  className="max-h-48 w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={analyzeDocument} 
              disabled={!uploadedFile || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetParser}
              disabled={isAnalyzing}
            >
              Reset
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Results Display */}
          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Document Successfully Parsed</span>
                {parsedData.confidence && (
                  <Badge variant="outline">
                    Confidence: {parsedData.confidence}%
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {parsedData.bankName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank</Label>
                    <p className="font-medium">{parsedData.bankName}</p>
                  </div>
                )}
                {parsedData.loanAmount && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Loan Amount</Label>
                    <p className="font-medium">{parsedData.loanAmount} ₪</p>
                  </div>
                )}
                {parsedData.interestRate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                    <p className="font-medium">{parsedData.interestRate}%</p>
                  </div>
                )}
                {parsedData.loanPeriod && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Loan Period</Label>
                    <p className="font-medium">{parsedData.loanPeriod} years</p>
                  </div>
                )}
                {parsedData.monthlyPayment && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Monthly Payment</Label>
                    <p className="font-medium">{parsedData.monthlyPayment} ₪</p>
                  </div>
                )}
                {parsedData.trackType && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Track Type</Label>
                    <p className="font-medium">{parsedData.trackType}</p>
                  </div>
                )}
              </div>

              {parsedData.additionalTerms.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Additional Terms</Label>
                  <ul className="text-sm space-y-1 mt-1">
                    {parsedData.additionalTerms.map((term, index) => (
                      <li key={index} className="text-muted-foreground">• {term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

