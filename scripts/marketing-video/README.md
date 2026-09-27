# סרטון השיווק (עם קריינות)

סרטון שיווק והדגמה של כשתיים וחצי דקות, 1920x1080, מצולם מהממשק האמיתי עם נתוני הדגמה בלבד.
הוא אינו חלק מהאתר: הקבצים נבנים ב-`.marketing-work/` (מחוץ ל-git).

1. **צילום** — `record.mjs`: כל סצנה מוקלטת בנפרד. מסכי האזור האישי רצים בארגז החול של ההדגמה
   `marketing` (`src/demo/catalog/flows/marketing.ts`), כולל שני מסכים שנוספו לסרטון:
   `/demo/authorization-letters` ו-`/demo/completed`.
2. **תסריט** — `script.json`: הטקסט של הקריינות, הכותרות והסדר.
3. **קריינות** — `tts.mjs` (Google Cloud Text-to-Speech, `GOOGLE_TTS_KEY`), או הקלטה עצמית:
   קובץ `.marketing-work/voice/<id>.wav` לכל קטע.
4. **מוזיקה** — `music.py`: מסונתזת מקומית, בלי זכויות של צד שלישי.
5. **עריכה** — `compose.mjs` + `composer.html`: כל פריים מצויר כפונקציה של הזמן; אורך כל קטע נקבע
   לפי הקריינות, והצילום מואץ בהתאם. הפלט: `mashkalanta-marketing.mp4` וכתוביות `.srt`.

```bash
npx next build && npx next start &
npm i --no-save playwright-core@1.56.1 @fontsource/assistant
pip install imageio-ffmpeg numpy scipy
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
node scripts/marketing-video/record.mjs
GOOGLE_TTS_KEY=... node scripts/marketing-video/tts.mjs
python3 scripts/marketing-video/music.py 220
node scripts/marketing-video/compose.mjs      # PREVIEW=1 לטיוטה מהירה
```

נתוני בנק ישראל בסרטון מגיעים מ-`scripts/promo-video/market-snapshot.json`.
