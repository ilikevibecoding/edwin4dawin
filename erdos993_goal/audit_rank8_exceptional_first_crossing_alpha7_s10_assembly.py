#!/usr/bin/env python3
"""Independent rehash/SQLite/no-gap audit of complete alpha7/source10."""
from __future__ import annotations
import csv,hashlib,json,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parent;ASSEMBLER=ROOT/"assemble_rank8_exceptional_first_crossing_alpha7_s10.py";ASSEMBLY=ROOT/"rank8_exceptional_first_crossing_alpha7_s10_complete_exact_20260820.json";DESIGN=ROOT/"rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json";JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";OUTPUT=ROOT/"rank8_exceptional_first_crossing_alpha7_s10_complete_audit_exact_20260820.json"
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def paths(s,t):
 stem=f"rank8_exceptional_first_crossing_alpha7_s10_types{s}_{t}";return ROOT/f"{stem}_exact_20260820.json",ROOT/f"{stem}_keys_exact_20260820.sqlite3",ROOT/f"{stem}_audit_exact_20260820.json"
def main()->int:
 assembly=json.loads(ASSEMBLY.read_text(encoding="utf-8"));design=json.loads(DESIGN.read_text(encoding="utf-8"));assert assembly["status"]=="PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE10_COMPLETE"and assembly["hashes"][ASSEMBLER.name]==digest(ASSEMBLER);ranges=[(x["terminal_type_index_start"],x["terminal_type_index_stop"])for x in design["exact_counts"]["source_cells"]["10"]["shards"]];assert len(ranges)==25
 with JETS.open(newline="",encoding="utf-8")as h:rows=list(csv.DictReader(h,delimiter="\t"))
 c=[0]*11;c[0]=1
 for row in rows[:247]:
  w=int(row["alpha"])
  for alpha in range(w,11):c[alpha]+=c[alpha-w]
 assert(c[10],c[3])==(14047,13)
 expected=248;raw=keys=products=rk=kp=0;mn=mx=None;hashes={ASSEMBLER.name:digest(ASSEMBLER),ASSEMBLY.name:digest(ASSEMBLY),DESIGN.name:digest(DESIGN),JETS.name:digest(JETS),Path(__file__).name:digest(Path(__file__))}
 for s,t in ranges:
  assert s==expected;expected=t+1;rp,db,aup=paths(s,t)
  for p in(rp,db,aup):assert assembly["hashes"][p.name]==digest(p);hashes[p.name]=digest(p)
  con=sqlite3.connect(db);dk=con.execute("SELECT COUNT(*)FROM keys").fetchone()[0];dp=con.execute("SELECT COUNT(*)FROM products").fetchone()[0];assert con.execute("SELECT MIN(largest_type),MAX(largest_type),COUNT(DISTINCT largest_type)FROM keys").fetchone()==(s,t,t-s+1);neg=con.execute("SELECT COUNT(*)FROM keys WHERE CAST(q8 AS INTEGER)<0").fetchone()[0];zero=con.execute("SELECT COUNT(*)FROM keys WHERE CAST(q8 AS INTEGER)=0").fetchone()[0];dmin=con.execute("SELECT MIN(CAST(q8 AS INTEGER))FROM keys").fetchone()[0];dmax=con.execute("SELECT MAX(CAST(q8 AS INTEGER))FROM keys").fetchone()[0];con.close();r=json.loads(rp.read_text(encoding="utf-8"));a=json.loads(aup.read_text(encoding="utf-8"));x=r["aggregate"];assert dk==x["canonical_check_keys"]==a["shard"]["canonical_check_keys"]and dp==x["distinct_crossing_jets"]==a["shard"]["distinct_crossing_jets"]and neg==zero==x["negative_Q8"]==x["zero_Q8"]==0 and dmin==x["minimum_Q8"]and dmax==x["maximum_Q8"];sr=sum(14047+13*(i-247)for i in range(s,t+1));assert sr==x["independently_counted_raw_multisets"]==a["shard"]["independently_enumerated_multisets"];raw+=sr;keys+=dk;products+=dp;rk+=sr-dk;kp+=dk-dp;mn=dmin if mn is None else min(mn,dmin);mx=dmax if mx is None else max(mx,dmax)
 assert expected==948;agg=assembly["aggregate"];assert(raw,keys,products,rk,kp,mn,mx)==(13022450,agg["canonical_check_keys"],agg["distinct_shard_product_jets_sum"],agg["multiset_to_canonical_key_compression"],agg["canonical_key_to_product_compression_within_shards"],agg["minimum_Q8"],agg["maximum_Q8"])and agg["negative_Q8"]==agg["zero_Q8"]==0
 payload={"schema":"rank8-exceptional-first-crossing-alpha7-s10-complete-audit-v1","status":"PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE10_ASSEMBLY_AUDIT","method":"rehash/query all25 triples, independently derive c10=14047,c3=13 and formula14047+13L, reconstruct exact union","coverage":{"source_alpha":10,"terminal_alpha":7,"terminal_type_indices":[248,947],"terminal_type_count":700,"shards":25,"gaps":0,"overlaps":0},"aggregate":agg,"scope_warning":"Stops before source11.","hashes":hashes};OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);print(f"raw={raw} checks={keys} products={products} neg=0 zero=0 min_Q8={mn} max_Q8={mx}");print(f"audit_sha256={digest(OUTPUT)}");return 0
if __name__=="__main__":raise SystemExit(main())
