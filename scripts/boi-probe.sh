B=https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS
echo "== multi filter"
time curl -sS -m 120 -o m.csv -w '%{http_code}\n' "$B/BIR_MRTG_99/1.0?c%5BSERIES_CODE%5D=BNK_99034_LR_BIR_MRTG_63,BNK_99034_LR_BIR_MRTG_897,BNK_99034_LR_BIR_MRTG_467&startPeriod=2025-01&format=csv"; cut -d, -f1 m.csv | sort | uniq -c
echo "== multi filter plus"
curl -sS -m 120 -o m2.csv -w '%{http_code}\n' "$B/BIR_MRTG_99/1.0?c%5BSERIES_CODE%5D=BNK_99034_LR_BIR_MRTG_63+BNK_99034_LR_BIR_MRTG_897&startPeriod=2026-01&format=csv"; cut -d, -f1 m2.csv | sort | uniq -c
echo "== BR list"
curl -sS -m 60 "$B/BR/1.0?lastNObservations=1&format=csv" | cut -d, -f1-4,10,11
echo "== BIR housing-ish"
curl -sS -m 120 "$B/BIR/1.0?lastNObservations=1&format=csv" -o bir.csv; wc -l bir.csv; head -1 bir.csv
python3 - <<'PY'
import csv
rows=list(csv.DictReader(open('bir.csv',encoding='utf-8')))
for r in rows:
    s=','.join(r.values())
    if 'A2C' in s or 'MRTG' in s or 'PRIME' in s.upper():
        print(r['SERIES_CODE'], r.get('BS_ITEM'), r.get('INDEXATION_TYPE'), r.get('IR_FV_TYPE'), r.get('DATA_TYPE'), r['TIME_PERIOD'], r['OBS_VALUE'])
print('bs items', sorted(set(r.get('BS_ITEM','') for r in rows)))
PY
echo "== MRTG NI V anywhere recent"
curl -sS -m 180 "$B/BIR_MRTG_99/1.0?c%5BINDEXATION_TYPE%5D=NI&c%5BIR_FV_TYPE%5D=V&startPeriod=2026-01&format=csv" | cut -d, -f1,4-11,26,27 | awk -F, '{print $1,$2,$3,$4,$5,$6,$8,$9,$10}' | sort -u -k1,1 | head -40
