set -x
B=https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2
curl -sS -m 60 -H 'Accept: application/vnd.sdmx.structure+json;version=1.0' "$B/structure/dataflow/BOI.STATISTICS/*/latest" -o df.json; ls -la df.json; head -c 600 df.json; echo
python3 - <<'PY'
import json
d=json.load(open('df.json'))
dfs=d.get('data',{}).get('dataflows',[])
print('count',len(dfs))
for f in dfs:
    names=f.get('names') or {}
    n=f.get('name')
    print(f['id'],'|',n,'|',names.get('he',''))
PY
