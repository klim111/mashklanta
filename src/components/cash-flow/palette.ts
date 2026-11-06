/**
 * צבעי הגרף: המשכנתא תמיד בכחול, וההלוואות בסדר קבוע אחריה — כך הצבע של כל
 * הלוואה זהה ברשימה, בגרף ובדוח. מעבר לשבע הלוואות הצבעים חוזרים בגוון בהיר.
 */
export const MORTGAGE_COLOR = '#2a78d6';
export const FREE_COLOR = '#cbd5e1';

const LOAN_COLORS = ['#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

export function loanColor(index: number): string {
  return LOAN_COLORS[index % LOAN_COLORS.length];
}
