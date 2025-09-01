import { useState, useEffect } from 'react';

interface CPIData {
  value: number;
  date: string;
  previousValue: number;
  change: number;
  changePercentage: number;
  source: 'api' | 'fallback';
}

export function useCPI() {
  const [cpiData, setCpiData] = useState<CPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCPI = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/boi/cpi');
        
        if (!response.ok) {
          throw new Error('Failed to fetch CPI data');
        }
        
        const data = await response.json();
        setCpiData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCpiData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCPI();
  }, []);

  return { cpiData, loading, error };
}