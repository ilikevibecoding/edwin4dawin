#!/usr/bin/env python3
"""Independent fail-closed audit of source-alpha11 seven-shard assembly."""
from __future__ import annotations
import hashlib,json,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parent;ASSEMBLER=ROOT/"assemble_rank8_exceptional_first_crossing_alpha6_s11.py";ASSEMBLY=ROOT/"rank8_exceptional_first_crossing_alpha6_s11_complete_exact_20260820.json";OUTPUT=ROOT/"rank8_exceptional_first_crossing_alpha6_s11_complete_audit_exact_20260820.json"
LABELS=("types73_115","types116_149","types150_177","types178_202","types203_225","types226_246","type247")
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def artifacts(label):
    stem=f"rank8_exceptional_first_crossing_alpha6_s11_{label}";return {"report":ROOT/f"{stem}_exact_20260820.json","database":ROOT/f"{stem}_keys_exact_20260820.sqlite3","audit":ROOT/f"{stem}_audit_exact_20260820.json"}
def main():
    assembly=json.loads(ASSEMBLY.read_text(encoding="utf-8"));assert assembly["status"]=="PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE11_COMPLETE" and assembly["hashes"][ASSEMBLER.name]==digest(ASSEMBLER)
    ranges=[];raw=checks=products_sum=multiset_collisions=key_product_collisions=0;minimum=maximum=None;hashes={ASSEMBLY.name:digest(ASSEMBLY),ASSEMBLER.name:digest(ASSEMBLER)}
    for label in LABELS:
        files=artifacts(label)
        for path in files.values():assert assembly["hashes"][path.name]==digest(path);hashes[path.name]=digest(path)
        report=json.loads(files["report"].read_text(encoding="utf-8"));audit=json.loads(files["audit"].read_text(encoding="utf-8"));shard_range=[report["aggregate"]["terminal_type_index_start"],report["aggregate"]["terminal_type_index_stop"]];ranges.append(shard_range);expected=list(range(shard_range[0],shard_range[1]+1))
        assert [row["terminal_type_index"] for row in report["per_terminal_type"]]==expected and [row["terminal_type_index"] for row in audit["shard"]["per_terminal_type"]]==expected
        for row in audit["shard"]["per_terminal_type"]:assert row["independently_enumerated_multisets"]==14554+123*row["terminal_relative_alpha6_type"]
        with sqlite3.connect(files["database"]) as c:
            db_checks=c.execute("SELECT COUNT(*) FROM keys").fetchone()[0];db_products=c.execute("SELECT COUNT(*) FROM products").fetchone()[0];db_types=[row[0] for row in c.execute("SELECT DISTINCT largest_type FROM keys ORDER BY largest_type")];db_nonpositive=c.execute("SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER)<=0").fetchone()[0];db_min,db_max=c.execute("SELECT MIN(CAST(q8 AS INTEGER)),MAX(CAST(q8 AS INTEGER)) FROM keys").fetchone()
        assert db_types==expected and db_nonpositive==0;assert db_checks==report["aggregate"]["ordered_covering_checks"]==audit["shard"]["canonical_check_keys"];assert db_products==report["aggregate"]["distinct_crossing_jets"]==audit["shard"]["distinct_crossing_jets"];assert db_min==report["aggregate"]["minimum_Q8"]==audit["shard"]["minimum_Q8"] and db_max==report["aggregate"]["maximum_Q8"]==audit["shard"]["maximum_Q8"]
        raw+=audit["shard"]["independently_enumerated_multisets"];checks+=db_checks;products_sum+=db_products;multiset_collisions+=audit["shard"]["multiset_to_canonical_key_collisions"];key_product_collisions+=db_checks-db_products;minimum=db_min if minimum is None else min(minimum,db_min);maximum=db_max if maximum is None else max(maximum,db_max)
    assert ranges==[[73,115],[116,149],[150,177],[178,202],[203,225],[226,246],[247,247]];exact=[value for start,stop in ranges for value in range(start,stop+1)];assert exact==list(range(73,248)) and len(set(exact))==175
    aggregate={"independently_enumerated_multisets":raw,"canonical_checks":checks,"distinct_shard_product_jets_sum":products_sum,"multiset_to_key_collisions":multiset_collisions,"key_to_product_collisions_within_shards":key_product_collisions,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":minimum,"maximum_Q8":maximum}
    for key,value in aggregate.items():assert assembly["aggregate"][key]==value
    assert aggregate=={"independently_enumerated_multisets":4441150,"canonical_checks":3414804,"distinct_shard_product_jets_sum":3279910,"multiset_to_key_collisions":1026346,"key_to_product_collisions_within_shards":134894,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":430703190,"maximum_Q8":32598866127960}
    payload={"schema":"rank8-exceptional-first-crossing-alpha6-s11-complete-assembly-audit-v1","status":"PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE11_ASSEMBLY_AUDIT","coverage":{"shard_ranges":ranges,"exact_union":[73,247],"overlaps":0,"gaps":0},"aggregate":aggregate,"method":"rehash all shard artifacts, rederive exponent counts, query all SQLite key/product/type/sign/extrema fields, reconstruct exact terminal union","scope_warning":"Closes source alpha11 only; source alpha12 excluded.","hashes":{**hashes,Path(__file__).name:digest(Path(__file__))}}
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);print(f"ranges={ranges} raw={raw} checks={checks} products_sum={products_sum} negative=0 zero=0");print(f"audit_sha256={digest(OUTPUT)}");return 0
if __name__=="__main__":raise SystemExit(main())
