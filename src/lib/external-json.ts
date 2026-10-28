import https from 'node:https';
import tls from 'node:tls';

/**
 * קריאת JSON משירות חיצוני בצד השרת.
 *
 * fetch המובנה של Node מסתמך על מאגר אישורי אבטחה פנימי בלבד, ולכן נכשל
 * בסביבות שבהן פרוקסי ארגוני או אנטי-וירוס חותם מחדש על תעבורת HTTPS. כאן
 * נטען גם מאגר האישורים של מערכת ההפעלה, כך שהאימות נשמר אבל הבקשה עוברת.
 */

let cachedAgent: https.Agent | null = null;

function sharedAgent(): https.Agent {
  if (cachedAgent) return cachedAgent;

  let ca: string[] | undefined;
  try {
    // זמין מ-Node 22.15; בגרסאות מוקדמות נשארים עם מאגר האישורים המובנה
    const getCACertificates = (
      tls as unknown as { getCACertificates?: (type: string) => string[] }
    ).getCACertificates;
    if (typeof getCACertificates === 'function') {
      ca = [...getCACertificates('default'), ...getCACertificates('system')];
    }
  } catch {
    ca = undefined;
  }

  cachedAgent = new https.Agent({ ca, keepAlive: true });
  return cachedAgent;
}

interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function fetchExternalJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { headers = {}, timeoutMs = 8_000 } = options;

  return new Promise<T>((resolve, reject) => {
    const request = https.get(
      url,
      { agent: sharedAgent(), headers: { Accept: 'application/json', ...headers } },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Request to ${url} failed with status ${status}`));
          return;
        }

        response.setEncoding('utf8');
        let body = '';
        response.on('data', (chunk: string) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error(`Response from ${url} is not valid JSON`));
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request to ${url} timed out`));
    });
    request.on('error', reject);
  });
}
