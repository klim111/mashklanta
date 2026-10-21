/**
 * סיום הליווי בתהליך מלוח היועץ — מתיק הלקוח או מרשימת בקשות הליווי. לפני
 * הסיום היועץ מאשר, כי הלקוח מקבל מייל וייתכן שהכלים שלו יינעלו.
 */
export async function setAdvisoryEnded(
  planId: string,
  ended: boolean,
  platformPrice: number,
): Promise<{ emailed: boolean } | null> {
  if (
    ended &&
    !window.confirm(
      `לסמן שהליווי בתהליך הסתיים?\n\nהלקוח יקבל מייל עם הצעה להמשיך לבד ב-₪${platformPrice} לחודש, ואותה הצעה תוצג לו בפלטפורמה. אם אין לו חודש ששולם, הכלים בתהליך יינעלו לעריכה עד שישלם. כל הנתונים נשמרים.`,
    )
  ) {
    return null;
  }
  const response = await fetch(`/api/advisor/plans/${encodeURIComponent(planId)}/advisory`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ended }),
  });
  if (!response.ok) throw new Error(String(response.status));
  const body = await response.json().catch(() => null);
  return { emailed: body?.emailed === true };
}
