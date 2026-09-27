/**
 * ההארה (spotlight) — מעטפת דקה מעל driver.js.
 *
 * driver.js מחשיך את המסך, חותך חלון סביב הרכיב ומצמיד לו חלונית הסבר. כאן
 * מכוונים אותו לעברית (RTL), בלי הכפתורים שלו — הניווט הוא של סרגל ההדגמה —
 * ומכבים אותו במצב ההתנסות כדי שהמסך יהיה פתוח ללחיצה.
 */

import { driver } from 'driver.js';
import type { Driver, Side, AllowedButtons } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { SpotlightAlign, SpotlightSide } from '../types';

export interface SpotlightOptions {
  title?: string;
  description?: string;
  side?: SpotlightSide;
  align?: SpotlightAlign;
  padding?: number;
  /** לחסום לחיצות גם על הרכיב המואר (בזמן ניגון אוטומטי) */
  lockInteraction?: boolean;
}

export class Spotlight {
  private instance: Driver | null = null;

  private ensure(lock: boolean): Driver {
    if (this.instance) {
      this.instance.setConfig({ ...this.baseConfig(), disableActiveInteraction: lock });
      return this.instance;
    }
    this.instance = driver({ ...this.baseConfig(), disableActiveInteraction: lock });
    return this.instance;
  }

  private baseConfig() {
    return {
      animate: true,
      overlayColor: '#0f172a',
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 14,
      allowClose: false,
      allowKeyboardControl: false,
      smoothScroll: false,
      showButtons: [] as AllowedButtons[],
      showProgress: false,
      popoverClass: 'mk-demo-popover',
      onPopoverRender: (popover: { wrapper: HTMLElement }) => {
        popover.wrapper.setAttribute('dir', 'rtl');
      },
    };
  }

  highlight(element: HTMLElement, options: SpotlightOptions = {}) {
    const instance = this.ensure(options.lockInteraction !== false);
    const hasPopover = Boolean(options.title || options.description);
    // בעברית "start" הוא ימין — driver.js מיישר לפי כיוון המסמך, ולכן ההיפוך נעשה כאן
    const side: Side = (options.side === 'over' ? 'over' : options.side ?? 'bottom') as Side;
    instance.highlight({
      element,
      popover: hasPopover
        ? {
            title: options.title ?? '',
            description: options.description ?? '',
            side,
            align: options.align ?? 'center',
          }
        : undefined,
    });
    if (typeof options.padding === 'number') {
      instance.setConfig({ ...this.baseConfig(), stagePadding: options.padding });
    }
  }

  /** עדכון גבולות ההארה אחרי שינוי גודל או גלילה */
  refresh() {
    this.instance?.refresh();
  }

  clear() {
    if (!this.instance) return;
    try {
      this.instance.destroy();
    } catch {
      /* already destroyed */
    }
    this.instance = null;
  }
}
