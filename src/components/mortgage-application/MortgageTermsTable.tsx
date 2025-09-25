import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

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

interface MortgageTermsTableProps {
  terms: MortgageTerms;
  extractedText: string;
}

const MortgageTermsTable: React.FC<MortgageTermsTableProps> = ({ terms, extractedText }) => {
  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(terms, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mortgage_terms.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const termLabels: { [key: string]: string } = {
    bankName: 'שם הבנק',
    loanAmount: 'סכום משכנתא',
    interestRate: 'ריבית',
    loanPeriod: 'תקופה (שנים)',
    monthlyPayment: 'החזר חודשי',
    ltv: 'אחוז מימון (LTV)',
    fees: 'עמלות',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">תנאי משכנתא שזוהו מהצעה</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadJson} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            הורד JSON
          </Button>
          {extractedText && (
            <Button variant="outline" onClick={() => alert(extractedText)} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              הצג טקסט מלא
            </Button>
          )}
        </div>
      </div>

      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px] text-right">פרט</TableHead>
            <TableHead className="text-right">ערך</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(termLabels).map(([key, label]) => (
            terms[key as keyof MortgageTerms] && (
              <TableRow key={key}>
                <TableCell className="font-medium text-right">{label}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="text-base py-1 px-3">
                    {terms[key as keyof MortgageTerms]}
                    {key === 'loanAmount' || key === 'monthlyPayment' || key === 'fees' ? ' ₪' : ''}
                    {key === 'interestRate' || key === 'ltv' ? ' %' : ''}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          ))}
          {terms.additionalTerms.length > 0 && (
            <TableRow>
              <TableCell className="font-medium text-right">תנאים נוספים</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap gap-2 justify-end">
                  {terms.additionalTerms.map((term, index) => (
                    <Badge key={index} variant="outline" className="text-sm py-1 px-2">
                      {term}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MortgageTermsTable;