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

/**
 * בחירת כל הערך בשדה בכניסה אליו, כך שהקלדה מחליפה אותו ואין צורך למחוק
 * קודם. גם ערך שהופיע בשדה מעצמו — ברירת מחדל, או פרט שהוזן במקום אחר — לא
 * עומד בדרך: מקלידים ישר את הערך הרצוי.
 *
 * הבחירה נדחית בטיק אחד כי מיקום הסמן של הלחיצה נקבע אחרי אירוע המיקוד, וה-
 * mouseup שמסיים את אותה לחיצה מבוטל פעם אחת כדי שלא יבטל את הבחירה.
 */
export function selectValueOnFocus(input: HTMLInputElement | null | undefined): void {
  if (!input) return;
  // הקלדה שהתחילה לפני הבחירה הדחויה לא נבחרת שוב — אחרת התו הראשון היה נמחק
  let typed = false;
  const onInput = () => {
    typed = true;
  };
  const select = () => {
    if (typed || document.activeElement !== input || input.value.length === 0) return;
    try {
      input.select();
    } catch {
      /* שדה שאינו תומך בבחירה */
    }
  };
  const keepSelection = (event: MouseEvent) => {
    if (!typed && document.activeElement === input && input.value.length > 0) event.preventDefault();
  };
  input.addEventListener('input', onInput);
  input.addEventListener('mouseup', keepSelection, { once: true });
  window.setTimeout(() => {
    input.removeEventListener('mouseup', keepSelection);
    input.removeEventListener('input', onInput);
  }, 600);
  select();
  window.setTimeout(select, 0);
}

const NUMERIC_INPUT_MODES = new Set(['numeric', 'decimal']);

/** שדה שמחזיק אפס בלבד (0, 0.0, 0,00) — ערך התחלתי ולא משהו שהמשתמש הקליד */
export function isZeroValue(value: string): boolean {
  return /^0+([.,]0*)?$/.test(value.trim());
}

/**
 * מאזין גלובלי: כל שדה מספרי שמקבל מיקוד — לפי type או inputmode — נבחר
 * כולו, כך שהקלדה מחליפה את מה שהיה בו. מכסה גם שדות `type="number"` ישנים
 * שאינם עוברים דרך NumericInput, כדי שבשום מקום בפלטפורמה לא יהיה צורך למחוק
 * ערך קיים לפני הזנת הערך הרצוי.
 */
export function attachNumericCaretFix(): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const isNumeric =
      target.type === 'number' ||
      (target.type === 'text' && NUMERIC_INPUT_MODES.has(target.inputMode ?? ''));
    if (!isNumeric) return;

    selectValueOnFocus(target);
  };

  document.addEventListener('focusin', onFocusIn);
  return () => document.removeEventListener('focusin', onFocusIn);
}
