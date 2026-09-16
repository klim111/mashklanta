/**
 * העברת הסמן לסוף הערך בשדה קלט, אחרי שהדפדפן סיים למקם אותו לפי הלחיצה.
 *
 * שדות מספר בפלטפורמה הם LTR עם טקסט מיושר לימין, ולכן לחיצה על החלק הריק
 * של השדה מציבה את הסמן לפני הספרה הראשונה — ומקש המחיקה לא עושה כלום.
 * ההעברה נדחית בטיק אחד כי מיקום הסמן של הלחיצה נקבע אחרי אירוע המיקוד.
 */
export function moveCaretToEnd(input: HTMLInputElement | null | undefined): void {
  if (!input) return;
  const place = () => {
    if (document.activeElement !== input) return;
    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      /* type="number" ודומיו לא תומכים בבחירת טווח */
    }
  };
  place();
  window.setTimeout(place, 0);
}

const NUMERIC_INPUT_MODES = new Set(['numeric', 'decimal']);

/**
 * מאזין גלובלי: כל שדה מספרי שמקבל מיקוד — לפי type או inputmode — מקבל את
 * הסמן בסוף הערך. מכסה גם שדות `type="number"` ישנים שאינם עוברים דרך
 * NumericInput, כדי שהמחיקה תעבוד מיד בכל מקום בפלטפורמה.
 */
export function attachNumericCaretFix(): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const isNumeric =
      target.type === 'number' ||
      (target.type === 'text' && NUMERIC_INPUT_MODES.has(target.inputMode ?? ''));
    if (!isNumeric) return;

    if (target.type === 'number') {
      // שדה מספר לא תומך ב-setSelectionRange; המעבר הרגעי ל-text מאפשר אותו
      window.setTimeout(() => {
        if (document.activeElement !== target) return;
        const original = target.type;
        try {
          target.type = 'text';
          const end = target.value.length;
          target.setSelectionRange(end, end);
        } catch {
          /* לא קריטי — נשאר עם מיקום הסמן של הדפדפן */
        } finally {
          target.type = original;
        }
      }, 0);
      return;
    }
    moveCaretToEnd(target);
  };

  document.addEventListener('focusin', onFocusIn);
  return () => document.removeEventListener('focusin', onFocusIn);
}
