B=https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2
for DF in BIR_MRTG_99 BMB_99; do
echo "######## $DF"
curl -sS -m 120 -A 'Mozilla/5.0' "$B/data/dataflow/BOI.STATISTICS/$DF/1.0?lastNObservations=1&format=csv" -o $DF.csv
echo "rows=$(wc -l < $DF.csv)"; head -1 $DF.csv
curl -sS -m 120 -A 'Mozilla/5.0' "$B/structure/dataflow/BOI.STATISTICS/$DF/latest?references=all&detail=full" -o $DF.xml
echo "xml size $(wc -c < $DF.xml)"
python3 - "$DF" <<'PY'
import csv,re,sys,collections
df=sys.argv[1]
t=open(df+'.xml',encoding='utf-8',errors='ignore').read()
# codelists
cls={}
for m in re.finditer(r'<str:Codelist[^>]*id="([^"]+)"(.*?)</str:Codelist>',t,re.S):
    codes={}
    for c in re.finditer(r'<str:Code[^>]*id="([^"]+)"(.*?)</str:Code>',m.group(2),re.S):
        he=re.search(r'<com:Name xml:lang="he">([^<]*)<',c.group(2)); en=re.search(r'<com:Name xml:lang="en">([^<]*)<',c.group(2))
        codes[c.group(1)]=(he.group(1) if he else '')+' | '+(en.group(1) if en else '')
    cls[m.group(1)]=codes
rows=list(csv.DictReader(open(df+'.csv',encoding='utf-8')))
dims=[k for k in rows[0].keys() if k not in('SERIES_CODE','TIME_PERIOD','OBS_VALUE','RELEASE_STATUS','CONF_STATUS','PUB_WEBSITE','UNIT_MULT','DATA_SOURCE','TIME_COLLECT')] if rows else []
print('DIMS',dims)
used=collections.defaultdict(set)
for r in rows:
    for d in dims: used[d].add(r[d])
def label(v):
    for cl in cls.values():
        if v in cl: return cl[v]
    return ''
for d in dims:
    print('DIM',d)
    for v in sorted(used[d]): print('   ',v,'=',label(v))
for r in rows:
    print('S',r['SERIES_CODE'],r.get('FREQ'),r['TIME_PERIOD'],r['OBS_VALUE'],'|',' '.join(r[d] for d in dims if d!='FREQ'))
PY
done
