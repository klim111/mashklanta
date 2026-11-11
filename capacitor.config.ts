import type { CapacitorConfig } from '@capacitor/cli';

/**
 * אפליקציית משכלנתא לאנדרואיד ולאייפון — מעטפת אחת שטוענת את האתר עצמו,
 * כך שכל שינוי באתר מופיע מיד גם באפליקציה. הסבר מלא ב-mobile/README.md.
 *
 * appId ו-allowNavigation משותפים עם src/lib/native-app/constants.ts.
 */
const SITE_URL = process.env.MOBILE_SITE_URL || 'https://mashkalanta.com';

const config: CapacitorConfig = {
  appId: 'com.mashkalanta.app',
  appName: 'משכלנתא',
  webDir: 'mobile/www',
  appendUserAgent: 'MashkalantaApp',
  backgroundColor: '#ffffff',
  server: {
    url: SITE_URL,
    // עמוד התשלום של HYP נפתח בתוך האפליקציה וחוזר לאתר בסוף התשלום
    allowNavigation: ['mashkalanta.com', '*.mashkalanta.com', 'pay.hyp.co.il'],
    // כשאין אינטרנט: עמוד מקומי עם "נסו שוב" במקום מסך שגיאה של המערכת
    errorPath: 'offline.html',
    cleartext: SITE_URL.startsWith('http://'),
  },
  android: {
    path: 'mobile/android',
  },
  ios: {
    path: 'mobile/ios',
    // התוכן מתחיל מתחת לשעון ולמצלמה של האייפון
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    SystemBars: {
      // האתר לא מצויר מתחת לשורת הסטטוס; האפליקציה שומרת לו מקום
      insetsHandling: 'css',
      style: 'LIGHT',
    },
  },
};

export default config;
