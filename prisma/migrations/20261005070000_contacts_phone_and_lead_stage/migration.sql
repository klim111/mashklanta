-- אנשי הקשר של הלקוח (טאב "אנשי הקשר"): טלפון, ומייל שאינו חובה כשיש טלפון.
-- והשלב בתהליך שממנו נשלחה פנייה ליועץ.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "ConversationRecipient" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "ConversationRecipient" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "AdvisorLead" ADD COLUMN IF NOT EXISTS "stage" TEXT;
