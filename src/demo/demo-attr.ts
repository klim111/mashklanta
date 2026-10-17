/**
 * העוגן של ההדגמה: `{...demoId('eq-price')}` מוסיף `data-demo-id` לרכיב.
 * המזהים יציבים ואינם תלויים במבנה ה-CSS, ולכן שינוי עיצוב לא שובר הדגמה.
 */
export function demoId(id: string): { 'data-demo-id': string } {
  return { 'data-demo-id': id };
}
