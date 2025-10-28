import { useState, useEffect } from 'react';

interface CurrencyRates {
  usd: number;
  eur: number;
  lastUpdated: string;
  source: 'api' | 'fallback';
}

export function useCurrencyRates() {
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrencyRates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/currency/rates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch currency rates');
        }
        
        const data = await response.json();
        setCurrencyRates(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCurrencyRates(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencyRates();
  }, []);

  return { currencyRates, loading, error };
}

