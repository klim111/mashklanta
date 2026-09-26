B=https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS
echo "== filter test"
time curl -sS -m 120 -A 'Mozilla/5.0' -o f1.csv -w '%{http_code}\n' "$B/BIR_MRTG_99/1.0?c%5BSERIES_CODE%5D=BNK_99034_LR_BIR_MRTG_63&format=csv"; wc -l f1.csv; head -3 f1.csv; tail -2 f1.csv
time curl -sS -m 120 -A 'Mozilla/5.0' -o f2.csv -w '%{http_code}\n' "$B/BIR_MRTG_99/1.0?c%5BBS_ITEM%5D=A2C&c%5BPTI%5D=P01&c%5BLTV%5D=L0&format=csv"; wc -l f2.csv
time curl -sS -m 180 -A 'Mozilla/5.0' -o all.csv -w '%{http_code}\n' "$B/BIR_MRTG_99/1.0?format=csv"; wc -lc all.csv
python3 <<'PY'
import csv,collections
rows=list(csv.DictReader(open('all.csv',encoding='utf-8')))
by=collections.defaultdict(list)
meta={}
for r in rows:
    by[r['SERIES_CODE']].append((r['TIME_PERIOD'],r['OBS_VALUE']))
    meta[r['SERIES_CODE']]=r
keydims=['BIR_COVERAGE','INDEXATION_TYPE','IR_FV_TYPE','DATA_TYPE','BS_ITEM','LTV','PTI','PROPERTY_VALUE']
for s,obs in sorted(by.items(), key=lambda kv:[meta[kv[0]][d] for d in keydims]):
    m=meta[s]
    if m['BS_ITEM'] not in('A2C','A2CX2') or m['LTV']!='L0' or m['PTI']!='P01' or m['PROPERTY_VALUE'] not in('A',''): continue
    obs.sort(); nonempty=[o for o in obs if o[1]!='']
    print(s,' '.join(m[d] for d in keydims),'first',nonempty[0] if nonempty else None,'last',nonempty[-3:] if nonempty else None,'n',len(obs),'lastperiod',obs[-1][0])
for code in ['BNK_99034_LR_BIR_MRTG_63','BNK_99034_LR_BIR_MRTG_897','BNK_99034_LR_BIR_MRTG_52','BNK_99034_LR_BIR_MRTG_896','BNK_99034_LR_BIR_MRTG_31','BNK_99034_LR_BIR_MRTG_32']:
    yr=collections.defaultdict(lambda:[0,0])
    for p,v in by.get(code,[]):
        if v=='': continue
        yr[p[:4]][0]+=float(v); yr[p[:4]][1]+=1
    print('YEARLY',code,{y:(round(a),n) for y,(a,n) in sorted(yr.items())})
PY
