B=https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2
try() { echo "=== $1"; code=$(curl -sS -m 60 -A 'Mozilla/5.0' -o out.bin -w '%{http_code} %{content_type}' "$1"); echo "$code size=$(wc -c <out.bin)"; head -c 400 out.bin; echo; }
try "$B/data/dataflow/BOI.STATISTICS/BR/1.0?lastNObservations=1&format=csv"
try "$B/structure/dataflow/BOI.STATISTICS"
try "$B/structure/dataflow/BOI.STATISTICS/*"
try "$B/structure/dataflow/BOI.STATISTICS/*/*"
try "$B/structure/dataflow/BOI.STATISTICS/*/latest?format=sdmx-json"
try "$B/structure/dataflow/*/*/*"
try "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/structure/dataflow/all/all/latest"
try "https://edge.boi.gov.il/FusionEdgeServer/ws/public/sdmxapi/rest/dataflow/BOI.STATISTICS"
try "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v1/dataflow/BOI.STATISTICS"
for u in "$B/structure/dataflow/BOI.STATISTICS" "$B/structure/dataflow/*/*/*" "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/structure/dataflow/all/all/latest"; do
 curl -sS -m 60 -A 'Mozilla/5.0' "$u" -o s.xml; if grep -q -i "dataflow" s.xml; then echo "### PARSE $u"; python3 - <<'PY'
import re
t=open('s.xml',encoding='utf-8',errors='ignore').read()
for m in re.finditer(r'<(?:str|structure):Dataflow[^>]*id="([^"]+)"(.*?)</(?:str|structure):Dataflow>',t,re.S):
    names=re.findall(r'<com:Name[^>]*xml:lang="(\w+)"[^>]*>([^<]*)<',m.group(2))
    print(m.group(1),'|',' / '.join(f'{l}:{n}' for l,n in names))
PY
 break; fi; done
