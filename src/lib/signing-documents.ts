/**
 * רשימות המסמכים שהבנק דורש לקראת החתימה על תיק המשכנתא.
 *
 * הדרישה משתנה לפי שני דברים: סוג העסקה (יד 1 מקבלן, יד 2, מגרש, בנייה עצמית
 * או הלוואה לכל מטרה) ואופן רישום הזכויות בנכס — טאבו, הערת אזהרה בלבד או
 * רמ"י / חברה משכנת. לכן הקטלוג בנוי כעץ: סוג עסקה → (בדירה יד 2 גם אופן
 * הרישום) → תרחיש → רשימת המסמכים של אותו תרחיש.
 *
 * הקובץ מכיל טקסט בלבד, בלי אייקונים ובלי React, כדי שיוכל להיטען גם בצד
 * השרת (`normalizeStageData` ב-`mortgage-plan.ts` נשען עליו כדי לאמת בחירות).
 */

export interface SigningDocument {
  /** מפתח ייחודי בתוך התרחיש; המפתח שנשמר הוא `${scenarioId}:${key}` */
  key: string;
  name: string;
  /** הדגשים והפרטים שהבנק מצפה למצוא במסמך */
  note: string;
}

export interface SigningScenario {
  id: string;
  /** הכותרת המלאה, שהופכת לכותרת המסך אחרי הבחירה */
  title: string;
  /** ניסוח קצר לכפתור הבחירה */
  short: string;
  documents: SigningDocument[];
}

/** אופן רישום הזכויות, כשהוא מפצל את סוג העסקה לשתי רשימות תרחישים */
export interface SigningRegistry {
  id: string;
  title: string;
  description: string;
  scenarios: SigningScenario[];
}

export interface SigningDealType {
  id: string;
  title: string;
  short: string;
  tagline: string;
  /** מדרג הצבע של הכרטיס, בסגנון שאר שלבי התהליך */
  gradient: string;
  /** בעסקאות יד 2 בוחרים קודם את אופן הרישום ורק אז את התרחיש */
  registries?: SigningRegistry[];
  scenarios?: SigningScenario[];
}

/** מסמכים שחוזרים כמעט בכל תרחיש, כדי לא לשכפל את אותו ניסוח */
const STANDING_ORDER: SigningDocument = {
  key: 'standing_order',
  name: 'הוראת קבע',
  note: 'הרשאה לחיוב חשבון העו"ש לתשלום ההחזר החודשי.',
};

const NOTARY_POWER: SigningDocument = {
  key: 'notary_power',
  name: 'ייפוי כוח נוטריוני',
  note: 'חתום ומאושר נוטריונית, המייפה את כוחו של הבנק לביצוע פעולות הרישום.',
};

const REGISTRY_EXTRACT: SigningDocument = {
  key: 'pledge_extract',
  name: 'דו"ח עיון מרשם המשכונות',
  note: 'נסח עיון עדכני ונקי מרשם המשכונות, לאחר רישום המשכון.',
};

const INSURANCE: SigningDocument = {
  key: 'insurance',
  name: 'ביטוחי משכנתא',
  note: 'ביטוח חיים ללווים וביטוח נכס, בהתאם לתאריך הכניסה בפועל.',
};

const APPRAISAL: SigningDocument = {
  key: 'appraisal',
  name: 'שמאות מקרקעין',
  note: 'הערכת שווי הבטוחה שבוצעה על ידי שמאי מורשה מטעם הבנק.',
};

export const SIGNING_DEAL_TYPES: readonly SigningDealType[] = [
  {
    id: 'new_from_developer',
    title: 'רכישת דירה יד 1 מקבלן',
    short: 'דירה יד 1 מקבלן',
    tagline: 'ליווי בנקאי, ערבויות חוק מכר ומכתב החרגה',
    gradient: 'from-blue-500 to-cyan-500',
    scenarios: [
      {
        id: 'new_owner_tabu',
        title: 'זכויות בעלות או חכירה לדורות רשומות ע"ש הקבלן בטאבו',
        short: 'הקבלן רשום כבעלים או כחוכר לדורות בטאבו',
        documents: [
          { key: 'contract', name: 'חוזה רכישה', note: 'כולל את כל נספחיו החתומים.' },
          {
            key: 'tabu',
            name: 'נסח טאבו עדכני ונקי',
            note: 'מוצג לאחר רישום הערת האזהרה.',
          },
          {
            key: 'building_permit',
            name: 'היתר בנייה',
            note: 'היתר בנייה מאושר ובתוקף מהוועדה לתכנון ובנייה.',
          },
          {
            key: 'sale_law_guarantees',
            name: 'פנקס שוברים וביטחונות חוק המכר',
            note: 'פנקס שוברי תשלום לחשבון הליווי, התחייבות להמצאת ערבות בנקאית או פוליסת ביטוח, הוראת בנק חתומה ומכתב החרגה מותנה.',
          },
          {
            key: 'seller_undertaking',
            name: 'התחייבות מוכרים לרישום משכנתא',
            note: 'התחייבות רשמית של הקבלן לרישום משכנתא לטובת הבנק.',
          },
          {
            key: 'caveat',
            name: 'רישום הערת אזהרה',
            note: 'רישום הערות אזהרה בטאבו לטובת הלווה ולטובת הבנק המלווה.',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות ברשם המשכונות',
            note: 'שטר משכון והודעת משכון חתומים על זכויות הלווה.',
          },
          REGISTRY_EXTRACT,
          NOTARY_POWER,
          INSURANCE,
          STANDING_ORDER,
        ],
      },
      {
        id: 'new_caveat_only',
        title: 'רשומה הערת אזהרה בלבד לטובת הקבלן בטאבו',
        short: 'לקבלן הערת אזהרה בלבד בטאבו',
        documents: [
          { key: 'contract', name: 'חוזה רכישה', note: 'כולל את כל נספחיו החתומים.' },
          { key: 'tabu', name: 'נסח טאבו עדכני ונקי', note: 'מוצג לאחר רישום הערת האזהרה.' },
          { key: 'building_permit', name: 'היתר בנייה', note: 'היתר בנייה מאושר ובתוקף.' },
          {
            key: 'sale_law_guarantees',
            name: 'פנקס שוברים וביטחונות חוק המכר',
            note: 'פנקס שוברי תשלום לחשבון הליווי, ערבויות חוק מכר ומכתב החרגה מותנה.',
          },
          {
            key: 'seller_undertaking',
            name: 'התחייבות מוכרים לרישום משכנתא',
            note: 'חתומה על ידי הקבלן ובהסכמת בעלי הקרקע הרשומים.',
          },
          {
            key: 'root_contract',
            name: 'חוזה רכישה / קומבינציה יסודי',
            note: 'חוזה הרכישה שנחתם בין הקבלן לבין בעלי הקרקע הרשומים.',
          },
          {
            key: 'caveat',
            name: 'רישום הערות אזהרה',
            note: 'לטובת הלווה ולטובת הבנק המלווה בטאבו.',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות ברשם המשכונות',
            note: 'שטר משכון והודעת משכון חתומים על זכויות הלווה.',
          },
          { ...REGISTRY_EXTRACT, note: 'נסח עיון עדכני ונקי מרשם המשכונות.' },
          { ...NOTARY_POWER, note: 'מייפה את כוחו של הבנק לביצוע פעולות רישום.' },
          { ...INSURANCE, note: 'ביטוח חיים ללווים וביטוח נכס לפי תאריך הכניסה.' },
          STANDING_ORDER,
        ],
      },
      {
        id: 'new_rmi',
        title: 'לקבלן זכויות חכירה או פיתוח ברשות מקרקעי ישראל (רמ"י)',
        short: 'לקבלן זכויות חכירה או פיתוח ברמ"י',
        documents: [
          { key: 'contract', name: 'חוזה רכישה', note: 'כולל את כל נספחיו החתומים.' },
          {
            key: 'rights_confirmation',
            name: 'אישור זכויות עדכני',
            note: 'מונפק מרשות מקרקעי ישראל (רמ"י) ו/או מהחברה המשכנת.',
          },
          {
            key: 'developer_lease',
            name: 'חוזה חכירה / פיתוח של הקבלן',
            note: 'העתק חוזה החכירה או הפיתוח של הקבלן מול המינהל.',
          },
          { key: 'building_permit', name: 'היתר בנייה', note: 'היתר בנייה מאושר ובתוקף.' },
          {
            key: 'sale_law_guarantees',
            name: 'פנקס שוברים וביטחונות חוק המכר',
            note: 'פנקס שוברי תשלום, ערבויות חוק מכר ומכתב החרגה מותנה.',
          },
          {
            key: 'seller_undertaking',
            name: 'התחייבות מוכרים לרישום משכנתא',
            note: 'התחייבות הקבלן להמצאת התחייבות לרישום משכנתא.',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות ברשם המשכונות',
            note: 'שטר משכון והודעת משכון על זכויות הלווה.',
          },
          REGISTRY_EXTRACT,
          { ...NOTARY_POWER, note: 'חתום ומאושר נוטריונית לטובת הבנק המלווה.' },
          INSURANCE,
          STANDING_ORDER,
        ],
      },
    ],
  },
  {
    id: 'second_hand',
    title: 'רכישת דירה יד 2',
    short: 'דירה יד 2',
    tagline: 'הדרישה נקבעת לפי המקום שבו רשומות הזכויות',
    gradient: 'from-violet-500 to-purple-600',
    registries: [
      {
        id: 'tabu',
        title: 'הנכס רשום בטאבו',
        description: 'לשכת רישום המקרקעין מנהלת את הזכויות, ואפשר להוציא עליו נסח טאבו.',
        scenarios: [
          {
            id: 'used_tabu_owner',
            title: 'זכויות הבעלות או החכירה לדורות רשומות ע"ש המוכר בטאבו',
            short: 'המוכר רשום כבעלים או כחוכר לדורות',
            documents: [
              { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום על כל נספחיו.' },
              {
                key: 'tabu',
                name: 'נסח טאבו עדכני ונקי',
                note: 'מציג את רישום הערת האזהרה לטובת הקונים ולטובת הבנק.',
              },
              {
                key: 'lease_term',
                name: 'תקופת חוזה חכירה',
                note: 'בנכס מוחכר: יתרת תקופת חכירה שלא תפחת מ-5 שנים.',
              },
              {
                key: 'seller_undertaking',
                name: 'התחייבות מוכרים לרישום משכנתא',
                note: 'טופס התחייבות רשמי חתום על ידי המוכרים.',
              },
              {
                key: 'caveat',
                name: 'רישום הערות אזהרה',
                note: 'לטובת הלווה ולטובת הבנק המלווה.',
              },
              {
                key: 'pledge_borrower',
                name: 'משכון זכויות ברשם המשכונות',
                note: 'שטר משכון והודעת משכון על זכויות הלווה.',
              },
              { ...REGISTRY_EXTRACT, note: 'נסח עיון עדכני ונקי מרשם המשכונות.' },
              { ...NOTARY_POWER, note: 'חתום ומאושר נוטריונית לטובת הבנק.' },
              APPRAISAL,
              { ...INSURANCE, note: 'ביטוח חיים ללווים וביטוח נכס מעודכן לתאריך הכניסה.' },
              STANDING_ORDER,
            ],
          },
          {
            id: 'used_tabu_caveat',
            title: 'רשומה הערת אזהרה בלבד לטובת המוכר בטאבו',
            short: 'למוכר הערת אזהרה בלבד — טרם נרשם כבעלים',
            documents: [
              { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום על כל נספחיו.' },
              { key: 'tabu', name: 'נסח טאבו עדכני ונקי', note: 'מציג את רישום הערות האזהרה.' },
              {
                key: 'lease_term',
                name: 'תקופת חוזה חכירה',
                note: 'יתרת תקופה שלא תפחת מ-5 שנים.',
              },
              {
                key: 'seller_undertaking',
                name: 'התחייבות מוכרים בתוספת חתימת הבעלים',
                note: 'התחייבות המוכרים לרישום משכנתא, בתוספת חתימת בעלי הקרקע הרשומים.',
              },
              {
                key: 'caveat',
                name: 'רישום הערות אזהרה',
                note: 'לטובת הלווה ולטובת הבנק בטאבו.',
              },
              {
                key: 'pledge_borrower',
                name: 'משכון זכויות הלווה',
                note: 'שטר משכון והודעת משכון על זכויות הלווה.',
              },
              {
                key: 'pledge_seller',
                name: 'משכון זכויות המוכר',
                note: 'שטר משכון והודעת משכון גם על זכויות המוכר.',
              },
              {
                ...REGISTRY_EXTRACT,
                note: 'נסח עיון עדכני ונקי, לאחר רישום משכונות הלווה והמוכר.',
              },
              {
                key: 'taxes_paid',
                name: 'אישור תשלום מיסים וגמר תשלום',
                note: 'אישור על גמר תשלום ומיסים של המוכר לבעל הקרקע.',
              },
              {
                key: 'notary_power_borrower',
                name: 'ייפוי כוח נוטריוני של הלווה',
                note: 'מייפה את כוחו של הבנק לרישום הבטוחות.',
              },
              {
                key: 'notary_power_owner',
                name: 'ייפוי כוח נוטריוני של בעל הקרקע',
                note: 'מיועד להעברת הזכויות מהבעלים למוכר.',
              },
              {
                key: 'lawyer_confirmation',
                name: 'אישור עו"ד מטפל',
                note: 'אישור עורך הדין המטפל ברישום ע"ש המוכר, על הפעולות הנדרשות והמועד הצפוי להשלמה.',
              },
              { ...APPRAISAL, note: 'שומה תקנית לבנק.' },
              { ...INSURANCE, note: 'ביטוח חיים וביטוח נכס מעודכן לתאריך הכניסה.' },
              STANDING_ORDER,
            ],
          },
        ],
      },
      {
        id: 'rmi',
        title: 'הנכס רשום ברמ"י / חברה משכנת',
        description: 'הזכויות מנוהלות ברשות מקרקעי ישראל או בחברה משכנת, ולא בלשכת רישום המקרקעין.',
        scenarios: [
          {
            id: 'used_rmi_lease',
            title: 'למוכר זכות חכירה רשומה ברמ"י / חברה משכנת',
            short: 'למוכר זכות חכירה רשומה',
            documents: [
              { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום על כל נספחיו.' },
              {
                key: 'rights_confirmation',
                name: 'אישור זכויות עדכני',
                note: 'מהמינהל (רמ"י) וגם מהחברה המשכנת.',
              },
              {
                key: 'seller_lease',
                name: 'חוזה חכירה של המוכרים',
                note: 'העתק חוזה החכירה של המוכר מול רמ"י.',
              },
              {
                key: 'seller_undertaking',
                name: 'התחייבות מוכרים להמצאת התחייבות',
                note: 'התחייבות המוכרים להמציא התחייבות לרישום משכנתא.',
              },
              {
                key: 'lawyer_confirmation',
                name: 'התחייבות / אישור עו"ד',
                note: 'אישור עו"ד להמצאת התחייבות לרישום משכנתא ע"ש הרוכשים.',
              },
              {
                key: 'pledge_borrower',
                name: 'משכון זכויות הלווה',
                note: 'שטר משכון והודעת משכון ברשם המשכונות.',
              },
              {
                key: 'pledge_seller',
                name: 'משכון זכויות המוכר',
                note: 'שטר משכון והודעת משכון ברשם המשכונות.',
              },
              {
                ...REGISTRY_EXTRACT,
                note: 'נסח עיון עדכני ונקי, לאחר רישום משכונות המוכרים והלווים.',
              },
              { ...NOTARY_POWER, note: 'לטובת הבנק המלווה.' },
              { ...APPRAISAL, note: 'הערכת שמאי מורשה.' },
              { ...INSURANCE, note: 'ביטוח חיים וביטוח נכס מעודכן לתאריך הכניסה.' },
              STANDING_ORDER,
            ],
          },
          {
            id: 'used_rmi_development',
            title: 'למוכר זכויות פיתוח בלבד ברמ"י',
            short: 'למוכר זכויות פיתוח בלבד',
            documents: [
              { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום על כל נספחיו.' },
              {
                key: 'rights_confirmation',
                name: 'אישור זכויות עדכני',
                note: 'מרמ"י וגם מהחברה המשכנת.',
              },
              {
                key: 'seller_development',
                name: 'חוזה פיתוח של המוכר',
                note: 'העתק חוזה הפיתוח מול רמ"י.',
              },
              {
                key: 'rmi_transfer_approval',
                name: 'אישור המינהל להעברת פיתוח',
                note: 'אישור רשמי מרמ"י להעברת זכויות הפיתוח מהמוכר לקונה.',
              },
              {
                key: 'seller_undertaking',
                name: 'התחייבות מוכרים להמצאת התחייבות',
                note: 'התחייבות להמצאת התחייבות לרישום משכנתא.',
              },
              {
                key: 'lawyer_confirmation',
                name: 'התחייבות / אישור עו"ד',
                note: 'אישור עו"ד להמצאת התחייבות לרישום משכנתא ע"ש הרוכשים.',
              },
              {
                key: 'pledge_both',
                name: 'משכון זכויות הלווה והמוכר',
                note: 'שטרי משכון והודעות משכון ברשם המשכונות.',
              },
              { ...REGISTRY_EXTRACT, note: 'נסח עיון עדכני ונקי מרשם המשכונות.' },
              { ...NOTARY_POWER, note: 'לטובת הבנק.' },
              { ...APPRAISAL, note: 'שומה תקנית לבנק.' },
              INSURANCE,
              STANDING_ORDER,
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'lot',
    title: 'רכישת מגרש לבנייה (יד 1 / יד 2)',
    short: 'רכישת מגרש',
    tagline: 'כאן נוספות בדיקות התב"ע, ההיטלים והייעוד למגורים',
    gradient: 'from-amber-500 to-orange-600',
    scenarios: [
      {
        id: 'lot_tabu',
        title: 'זכויות בעלות או חכירה לדורות רשומות ע"ש המוכר בטאבו',
        short: 'המוכר רשום כבעלים או כחוכר לדורות בטאבו',
        documents: [
          { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום.' },
          { key: 'tabu', name: 'נסח טאבו עדכני ונקי', note: 'מציג את רישום הערת האזהרה.' },
          {
            key: 'lease_term',
            name: 'תקופת חוזה חכירה',
            note: 'יתרת חכירה שלא תפחת מ-5 שנים.',
          },
          {
            key: 'seller_undertaking',
            name: 'התחייבות מוכרים לרישום משכנתא',
            note: 'טופס התחייבות חתום על ידי המוכר.',
          },
          { key: 'caveat', name: 'רישום הערות אזהרה', note: 'לטובת הלווה ולטובת הבנק.' },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות הלווה',
            note: 'שטר משכון והודעת משכון ברשם המשכונות.',
          },
          REGISTRY_EXTRACT,
          {
            key: 'taxes_paid',
            name: 'אישור תשלום מיסים',
            note: 'אישורי מס שבח ומס רכישה.',
          },
          {
            key: 'municipality',
            name: 'אישור הרשות המקומית',
            note: 'אישור עירייה או מועצה על היעדר חוב בהיטל השבחה.',
          },
          {
            key: 'planning_committee',
            name: 'אישור וועדה לתכנון ובנייה',
            note: 'אישור מוסמך לפי תב"ע, כי המגרש מיועד לבנייה למגורים.',
          },
          { ...NOTARY_POWER, note: 'חתום ומאושר נוטריונית.' },
          { ...APPRAISAL, note: 'שומת מגרש לבנייה.' },
          INSURANCE,
          STANDING_ORDER,
        ],
      },
      {
        id: 'lot_rmi',
        title: 'למוכר זכויות חכירה או פיתוח ברשות מקרקעי ישראל (רמ"י)',
        short: 'למוכר זכויות חכירה או פיתוח ברמ"י',
        documents: [
          { key: 'contract', name: 'חוזה רכישה', note: 'הסכם מכר חתום.' },
          {
            key: 'rights_confirmation',
            name: 'נסח טאבו / אישור זכויות',
            note: 'אישור זכויות מעודכן מרמ"י.',
          },
          {
            key: 'lease_term',
            name: 'תקופת חוזה חכירה',
            note: 'יתרת תקופה שלא תפחת מ-5 שנים.',
          },
          {
            key: 'rmi_transfer_approval',
            name: 'אישור הסכמת המינהל',
            note: 'בחוזה פיתוח: אישור רמ"י להעברת זכויות הפיתוח לרוכש.',
          },
          {
            key: 'seller_undertaking',
            name: 'התחייבות מוכרים להמצאת התחייבות',
            note: 'התחייבות המוכר להמצאת התחייבות לרישום משכנתא.',
          },
          {
            key: 'lawyer_confirmation',
            name: 'התחייבות / אישור עו"ד',
            note: 'אישור עו"ד להמצאת התחייבות לרישום משכנתא.',
          },
          {
            key: 'pledge_both',
            name: 'משכון זכויות הלווה והמוכר',
            note: 'שטרי משכון והודעות משכון ברשם המשכונות.',
          },
          { ...REGISTRY_EXTRACT, note: 'נסח עיון עדכני ונקי מרשם המשכונות.' },
          {
            key: 'planning_committee',
            name: 'אישור וועדה לתכנון ובנייה',
            note: 'אישור רשמי שהמגרש מיועד לבנייה למגורים.',
          },
          { ...NOTARY_POWER, note: 'לטובת הבנק.' },
          { ...APPRAISAL, note: 'הערכת שמאי לבנק.' },
          INSURANCE,
          STANDING_ORDER,
        ],
      },
    ],
  },
  {
    id: 'self_build',
    title: 'בנייה עצמית',
    short: 'בנייה עצמית',
    tagline: 'האשראי משוחרר במנות, לפי דו"חות התקדמות בנייה',
    gradient: 'from-emerald-500 to-teal-600',
    scenarios: [
      {
        id: 'build_tabu',
        title: 'זכויות בעלות או חכירה לדורות רשומות ע"ש הלווה בטאבו',
        short: 'הלווה רשום כבעלים או כחוכר לדורות בטאבו',
        documents: [
          {
            key: 'plans_permit',
            name: 'תוכניות והיתרי בנייה',
            note: 'תוכניות בנייה והיתר בנייה מאושרים ובתוקף ע"ש הלווים.',
          },
          {
            key: 'mortgage_registration',
            name: 'רישום משכנתא בפועל',
            note: 'רישום משכנתא בדרגה ראשונה לטובת הבנק בטאבו.',
          },
          {
            key: 'tabu',
            name: 'נסח טאבו עדכני ונקי',
            note: 'מונפק לאחר רישום המשכנתא לטובת הבנק.',
          },
          {
            key: 'appraisal_progress',
            name: 'שמאות מקרקעין ודו"חות התקדמות',
            note: 'שומה ראשונית ודו"חות התקדמות בנייה תקופתיים, לשחרור מנות האשראי.',
          },
          { ...INSURANCE, note: 'ביטוח חיים ללווים וביטוח נכס לפי תאריך הכניסה.' },
          STANDING_ORDER,
        ],
      },
      {
        id: 'build_rmi',
        title: 'ללווה זכויות חכירה או פיתוח ברמ"י',
        short: 'ללווה זכויות חכירה או פיתוח ברמ"י',
        documents: [
          {
            key: 'plans_permit',
            name: 'תוכניות והיתרי בנייה',
            note: 'היתר בנייה ותוכניות מאושרות ע"ש הלווים.',
          },
          {
            key: 'lease_term',
            name: 'חוזה פיתוח / חכירה',
            note: 'תקופת חוזה חכירה שלא תפחת מ-5 שנים.',
          },
          {
            key: 'rmi_undertaking',
            name: 'התחייבות לרישום משכנתא',
            note: 'טופס התחייבות חתום מרשות מקרקעי ישראל (רמ"י).',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות הלווה',
            note: 'שטר משכון והודעת משכון ברשם המשכונות.',
          },
          REGISTRY_EXTRACT,
          { ...NOTARY_POWER, note: 'חתום ומאושר נוטריונית.' },
          {
            key: 'appraisal_progress',
            name: 'שמאות ודו"חות התקדמות בנייה',
            note: 'שומת מגרש או בנייה ודו"חות שמאי תקופתיים, לשחרור המנות.',
          },
          INSURANCE,
          STANDING_ORDER,
        ],
      },
    ],
  },
  {
    id: 'any_purpose',
    title: 'הלוואה לכל מטרה בשעבוד נכס קיים',
    short: 'משכנתא לכל מטרה',
    tagline: 'נכס קיים משועבד, ובנוסף נדרשות אסמכתאות למטרת ההלוואה',
    gradient: 'from-rose-500 to-pink-600',
    scenarios: [
      {
        id: 'purpose_tabu',
        title: 'זכויות בעלות או חכירה לדורות רשומות ע"ש הלווה בטאבו',
        short: 'הלווה רשום כבעלים או כחוכר לדורות בטאבו',
        documents: [
          {
            key: 'rights_confirmation',
            name: 'אישור זכויות / נסח טאבו',
            note: 'נסח טאבו עדכני המציג בעלות מלאה של הלווה.',
          },
          {
            key: 'mortgage_registration',
            name: 'רישום משכנתא בפועל',
            note: 'רישום משכנתא בדרגה ראשונה לטובת הבנק בטאבו.',
          },
          {
            key: 'tabu',
            name: 'נסח טאבו עדכני ונקי',
            note: 'מונפק לאחר רישום המשכנתא לטובת הבנק.',
          },
          { ...APPRAISAL, note: 'הערכת שווי הנכס הקיים כבטוחה.' },
          { ...INSURANCE, note: 'ביטוח חיים וביטוח נכס.' },
          STANDING_ORDER,
          {
            key: 'purpose_evidence',
            name: 'אסמכתאות למטרת ההלוואה',
            note: 'מסמכים המראים את שימוש הכספים — שיפוץ, כיסוי חובות, רכישת נכס וכדומה.',
          },
        ],
      },
      {
        id: 'purpose_caveat',
        title: 'רשומה הערת אזהרה בלבד לטובת הלווה בטאבו',
        short: 'ללווה הערת אזהרה בלבד בטאבו',
        documents: [
          {
            key: 'rights_confirmation',
            name: 'אישור זכויות / נסח טאבו עדכני',
            note: 'מציג את רישום הבטוחות.',
          },
          {
            key: 'caveat',
            name: 'רישום הערת אזהרה לטובת הבנק',
            note: 'נרשמת מכוח התחייבות בעלי הקרקע.',
          },
          {
            key: 'borrower_contract',
            name: 'חוזה רכישה של הלווה',
            note: 'חוזה הרכישה שנחתם בין הלווה לבין בעל הקרקע.',
          },
          {
            key: 'payment_completed',
            name: 'אישור גמר תשלום',
            note: 'אישור בכתב מבעל הקרקע ששולמה מלוא התמורה עבור הרכישה.',
          },
          {
            key: 'notary_power_owner',
            name: 'ייפוי כוח נוטריוני מהבעלים',
            note: 'מיועד להעברת הזכויות מהבעלים ללווה.',
          },
          {
            key: 'lawyer_confirmation',
            name: 'אישור עו"ד מטפל',
            note: 'אישור עורך הדין המטפל ברישום הזכויות, המפרט את הפעולות והצפי לרישום הסופי.',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות הלווה',
            note: 'שטר משכון והודעת משכון ברשם המשכונות.',
          },
          { ...REGISTRY_EXTRACT, note: 'נסח עיון עדכני ונקי מרשם המשכונות.' },
          { ...APPRAISAL, note: 'שומה לבנק להערכת שווי הבטוחה.' },
          {
            key: 'notary_power_borrower',
            name: 'ייפוי כוח נוטריוני של הלווה',
            note: 'לטובת הבנק המלווה.',
          },
          { ...INSURANCE, note: 'ביטוח חיים וביטוח נכס.' },
          STANDING_ORDER,
          {
            key: 'purpose_evidence',
            name: 'אסמכתאות למטרת ההלוואה',
            note: 'הוכחות בכתב למטרת משיכת הכספים.',
          },
        ],
      },
      {
        id: 'purpose_rmi',
        title: 'ללווה זכויות חכירה או פיתוח ברמ"י',
        short: 'ללווה זכויות חכירה או פיתוח ברמ"י',
        documents: [
          {
            key: 'rights_confirmation',
            name: 'אישור זכויות עדכני',
            note: 'מונפק מרשות מקרקעי ישראל (רמ"י).',
          },
          {
            key: 'lease_term',
            name: 'תקופת חוזה חכירה',
            note: 'יתרת תקופה שלא תפחת מ-5 שנים.',
          },
          {
            key: 'rmi_undertaking',
            name: 'התחייבות לרישום משכנתא',
            note: 'התחייבות רשמית מרמ"י לרישום משכנתא לטובת הבנק.',
          },
          {
            key: 'pledge_borrower',
            name: 'משכון זכויות הלווה',
            note: 'שטר משכון והודעת משכון ברשם המשכונות.',
          },
          REGISTRY_EXTRACT,
          { ...APPRAISAL, note: 'הערכת שווי הבטוחה.' },
          { ...NOTARY_POWER, note: 'לטובת הבנק המלווה.' },
          { ...INSURANCE, note: 'ביטוח חיים וביטוח נכס.' },
          STANDING_ORDER,
          {
            key: 'purpose_evidence',
            name: 'אסמכתאות למטרת ההלוואה',
            note: 'הוכחות בכתב למטרת השימוש בכספים.',
          },
        ],
      },
    ],
  },
];

/** כל התרחישים של סוג עסקה, בלי קשר לשאלה אם הם מפוצלים לפי אופן רישום */
export function dealScenarios(deal: SigningDealType): SigningScenario[] {
  return deal.scenarios ?? (deal.registries ?? []).flatMap((registry) => registry.scenarios);
}

export function signingDealType(id: string | null): SigningDealType | null {
  if (!id) return null;
  return SIGNING_DEAL_TYPES.find((deal) => deal.id === id) ?? null;
}

export function signingRegistry(
  deal: SigningDealType | null,
  id: string | null
): SigningRegistry | null {
  if (!deal || !id) return null;
  return deal.registries?.find((registry) => registry.id === id) ?? null;
}

/** התרחיש עצמו, כשהוא באמת שייך לסוג העסקה שנבחר */
export function signingScenario(
  deal: SigningDealType | null,
  id: string | null
): SigningScenario | null {
  if (!deal || !id) return null;
  return dealScenarios(deal).find((scenario) => scenario.id === id) ?? null;
}

/** אופן הרישום שהתרחיש שייך לו, כדי לשחזר את הניווט מתוך הבחירה השמורה */
export function registryOfScenario(
  deal: SigningDealType,
  scenarioId: string
): SigningRegistry | null {
  return (
    deal.registries?.find((registry) =>
      registry.scenarios.some((scenario) => scenario.id === scenarioId)
    ) ?? null
  );
}

/** המפתח שבו נשמר סימון המסמך — ייחודי בין תרחישים */
export function signingDocumentKey(scenarioId: string, documentKey: string): string {
  return `${scenarioId}:${documentKey}`;
}

/** כל המפתחות האפשריים, כדי שסימון של תרחיש אחר לא יימחק בשמירה */
export const ALL_SIGNING_DOCUMENT_KEYS: string[] = SIGNING_DEAL_TYPES.flatMap((deal) =>
  dealScenarios(deal).flatMap((scenario) =>
    scenario.documents.map((document) => signingDocumentKey(scenario.id, document.key))
  )
);
