cat > probe.ts <<'TS'
import { fetchMortgageMarket } from './src/lib/boi-mortgage-market';
fetchMortgageMarket().then((s) => console.log('SNAPSHOT_JSON ' + JSON.stringify(s))).catch((e) => { console.error(e); process.exit(1); });
TS
npx -y tsx@4 probe.ts
