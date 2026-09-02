#!/usr/bin/env python3
"""Independent audit of complete source-alpha13 assembly, including sealed pilot."""
from __future__ import annotations
import hashlib,json,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parent;ASSEMBLER=ROOT/"assemble_rank8_exceptional_first_crossing_alpha6_s13.py";ASSEMBLY=ROOT/"rank8_exceptional_first_crossing_alpha6_s13_complete_exact_20260820.json";OUTPUT=ROOT/"rank8_exceptional_first_crossing_alpha6_s13_complete_audit_exact_20260820.json"
LABELS=("types73_83","types84_93","types94_102","types103_110","types111_118","types119_125","types126_132","types133_139","types140_145","types146_151","types152_157","types158_163","types164_168","types169_173","types174_178","types179_183","types184_188","types189_193","types194_197","types198_201","types202_205","types206_209","types210_213","types214_217","types218_221","types222_225","types226_229","types230_233","types234_237","types238_240","types241_243","types244_246")
PILOT_REPORT=ROOT/"rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json";PILOT_DB=ROOT/"rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3";PILOT_AUDIT=ROOT/"rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json"
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def artifacts(label):
 stem=f"rank8_exceptional_first_crossing_alpha6_s13_{label}";return {"report":ROOT/f"{stem}_exact_20260820.json","database":ROOT/f"{stem}_keys_exact_20260820.sqlite3","audit":ROOT/f"{stem}_audit_exact_20260820.json"}
def query_database(path,expected):
 with sqlite3.connect(path) as c:
  checks=c.execute("SELECT COUNT(*) FROM keys").fetchone()[0];products=c.execute("SELECT COUNT(*) FROM products").fetchone()[0];types=[row[0] for row in c.execute("SELECT DISTINCT largest_type FROM keys ORDER BY largest_type")];nonpositive=c.execute("SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER)<=0").fetchone()[0];minimum,maximum=c.execute("SELECT MIN(CAST(q8 AS INTEGER)),MAX(CAST(q8 AS INTEGER)) FROM keys").fetchone()
 assert types==expected and nonpositive==0;return checks,products,minimum,maximum
def main():
 assembly=json.loads(ASSEMBLY.read_text(encoding="utf-8"));assert assembly["status"]=="PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE13_COMPLETE" and assembly["hashes"][ASSEMBLER.name]==digest(ASSEMBLER);hashes={ASSEMBLY.name:digest(ASSEMBLY),ASSEMBLER.name:digest(ASSEMBLER)};all_types=[];raw=checks=products_sum=multiset_collisions=key_product_collisions=0;minimum=maximum=None
 for label in LABELS:
  files=artifacts(label)
  for path in files.values():assert assembly["hashes"][path.name]==digest(path);hashes[path.name]=digest(path)
  report=json.loads(files["report"].read_text(encoding="utf-8"));audit=json.loads(files["audit"].read_text(encoding="utf-8"));start,stop=report["aggregate"]["terminal_type_index_start"],report["aggregate"]["terminal_type_index_stop"];expected=list(range(start,stop+1));assert [row["terminal_type_index"] for row in report["per_terminal_type"]]==expected and [row["terminal_type_index"] for row in audit["shard"]["per_terminal_type"]]==expected
  for row in audit["shard"]["per_terminal_type"]:
   L=row["terminal_relative_alpha6_type"];assert row["independently_enumerated_multisets"]==63606+575*L+L*(L+1)
  dc,dp,dmin,dmax=query_database(files["database"],expected);assert dc==report["aggregate"]["ordered_covering_checks"]==audit["shard"]["canonical_check_keys"] and dp==report["aggregate"]["distinct_crossing_jets"]==audit["shard"]["distinct_crossing_jets"] and dmin==report["aggregate"]["minimum_Q8"]==audit["shard"]["minimum_Q8"] and dmax==report["aggregate"]["maximum_Q8"]==audit["shard"]["maximum_Q8"]
  all_types.extend(expected);raw+=audit["shard"]["independently_enumerated_multisets"];checks+=dc;products_sum+=dp;multiset_collisions+=audit["shard"]["multiset_to_canonical_key_collisions"];key_product_collisions+=dc-dp;minimum=dmin if minimum is None else min(minimum,dmin);maximum=dmax if maximum is None else max(maximum,dmax)
 for path in (PILOT_REPORT,PILOT_DB,PILOT_AUDIT):assert assembly["hashes"][path.name]==digest(path);hashes[path.name]=digest(path)
 pilot=json.loads(PILOT_REPORT.read_text(encoding="utf-8"));audit=json.loads(PILOT_AUDIT.read_text(encoding="utf-8"));dc,dp,dmin,dmax=query_database(PILOT_DB,[247]);assert dc==pilot["cell"]["ordered_covering_checks"]==audit["cell"]["canonical_check_keys"] and dp==pilot["cell"]["distinct_crossing_jets"]==audit["cell"]["distinct_crossing_jets"] and dmin==pilot["cell"]["minimum_Q8"]==audit["cell"]["minimum_Q8"] and dmax==pilot["cell"]["maximum_Q8"]==audit["cell"]["maximum_Q8"] and audit["cell"]["independently_enumerated_multisets"]==195031
 all_types.append(247);raw+=audit["cell"]["independently_enumerated_multisets"];checks+=dc;products_sum+=dp;multiset_collisions+=audit["cell"]["multiset_to_canonical_key_collisions"];key_product_collisions+=dc-dp;minimum=min(minimum,dmin);maximum=max(maximum,dmax)
 assert all_types==list(range(73,248)) and len(set(all_types))==175;aggregate={"independently_enumerated_multisets":raw,"canonical_checks":checks,"distinct_shard_product_jets_sum":products_sum,"multiset_to_key_collisions":multiset_collisions,"key_to_product_collisions_within_shards":key_product_collisions,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":minimum,"maximum_Q8":maximum}
 for key,value in aggregate.items():assert assembly["aggregate"][key]==value
 assert aggregate=={"independently_enumerated_multisets":21803250,"canonical_checks":15156851,"distinct_shard_product_jets_sum":14940421,"multiset_to_key_collisions":6646399,"key_to_product_collisions_within_shards":216430,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":3524647923,"maximum_Q8":282462928635888}
 payload={"schema":"rank8-exceptional-first-crossing-alpha6-s13-complete-assembly-audit-v1","status":"PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE13_ASSEMBLY_AUDIT","coverage":{"exact_union":[73,247],"overlaps":0,"gaps":0,"type247_reused_without_rerun":True},"aggregate":aggregate,"method":"rehash all new artifacts and sealed pilot; independently query all 33 SQLite databases for types, counts, sign and extrema; reconstruct exact union","scope_warning":"Completes source alpha13 for terminal alpha6; stops before terminal alpha7.","hashes":{**hashes,Path(__file__).name:digest(Path(__file__))}}
 OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);print(f"types={len(all_types)} raw={raw} checks={checks} products_sum={products_sum} negative=0 zero=0 reused_type247=true");print(f"audit_sha256={digest(OUTPUT)}");return 0
if __name__=="__main__":raise SystemExit(main())
