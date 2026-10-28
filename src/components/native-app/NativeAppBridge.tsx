'use client';

import { useEffect } from 'react';
import { startNativeBridge } from '@/lib/native-app/native';

/** מחבר את האתר לאפליקציה לנייד, כשהוא רץ בתוכה. בדפדפן רגיל לא עושה כלום */
export function NativeAppBridge() {
  useEffect(() => {
    void startNativeBridge();
  }, []);
  return null;
}
