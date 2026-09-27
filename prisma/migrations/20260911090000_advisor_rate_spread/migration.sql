-- המרווח שהיועץ שמר מעל העוגן של בנק ישראל.
-- ריק עבור ריביות שנשמרו לפני הפירוק לעוגן ומרווח; שם ממשיכים להשתמש ב-rate.
ALTER TABLE "AdvisorRateDefault" ADD COLUMN "spread" DOUBLE PRECISION;
