#!/usr/bin/env python3
"""Fail-closed no-gap assembly of fifteen exact source-alpha12 shards."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
LABELS=("types73_94","types95_113","types114_129","types130_144","types145_157","types158_169","types170_181","types182_192","types193_202","types203_212","types213_221","types222_230","types231_238","types239_246","type247")
EXPECTED_RANGES=[[73,94],[95,113],[114,129],[130,144],[145,157],[158,169],[170,181],[182,192],[193,202],[203,212],[213,221],[222,230],[231,238],[239,246],[247,247]]
PROBE=ROOT/"probe_rank8_exceptional_first_crossing_alpha6_s12_shard_exact.py";AUDITOR=ROOT/"audit_rank8_exceptional_first_crossing_alpha6_s12_shard.py";OUTPUT=ROOT/"rank8_exceptional_first_crossing_alpha6_s12_complete_exact_20260820.json"
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def artifacts(label):
 stem=f"rank8_exceptional_first_crossing_alpha6_s12_{label}";return {"report":ROOT/f"{stem}_exact_20260820.json","database":ROOT/f"{stem}_keys_exact_20260820.sqlite3","audit":ROOT/f"{stem}_audit_exact_20260820.json"}
def main():
 reports=[];audits=[];hashes={PROBE.name:digest(PROBE),AUDITOR.name:digest(AUDITOR)}
 for label in LABELS:
  files=artifacts(label);report=json.loads(files["report"].read_text(encoding="utf-8"));audit=json.loads(files["audit"].read_text(encoding="utf-8"));assert report["status"]==f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S12_{label.upper()}" and audit["status"]==f"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S12_{label.upper()}_AUDIT";assert report["hashes"][files["database"].name]==digest(files["database"]);assert audit["hashes"][files["report"].name]==digest(files["report"]);assert audit["hashes"][files["database"].name]==digest(files["database"]);assert report["hashes"][PROBE.name]==digest(PROBE) and audit["hashes"][AUDITOR.name]==digest(AUDITOR)
  r,a=report["aggregate"],audit["shard"];assert (r["ordered_covering_checks"],r["distinct_crossing_jets"],r["canonical_key_to_product_collisions"],r["minimum_Q8"],r["maximum_Q8"])==(a["canonical_check_keys"],a["distinct_crossing_jets"],a["canonical_key_to_product_collisions"],a["minimum_Q8"],a["maximum_Q8"]);assert r["negative_Q8"]==a["negative_Q8"]==r["zero_Q8"]==a["zero_Q8"]==0;assert report["resources"]["peak_private_bytes"]<report["resources"]["abort_limit_private_bytes"] and audit["resources"]["peak_private_bytes"]<audit["resources"]["abort_limit_private_bytes"]
  for path in files.values():hashes[path.name]=digest(path)
  reports.append(report);audits.append(audit)
 ranges=[[r["aggregate"]["terminal_type_index_start"],r["aggregate"]["terminal_type_index_stop"]] for r in reports];assert ranges==EXPECTED_RANGES
 report_types=[row["terminal_type_index"] for r in reports for row in r["per_terminal_type"]];audit_types=[row["terminal_type_index"] for a in audits for row in a["shard"]["per_terminal_type"]];assert report_types==audit_types==list(range(73,248)) and len(set(report_types))==175
 for audit in audits:
  for row in audit["shard"]["per_terminal_type"]:
   relative=row["terminal_relative_alpha6_type"];assert row["independently_enumerated_multisets"]==30260+256*relative+relative*(relative+1)//2
 aggregate={"source_alpha":12,"terminal_alpha":6,"total_alpha":18,"terminal_type_index_start":73,"terminal_type_index_stop":247,"terminal_type_count":175,"independently_enumerated_multisets":sum(a["shard"]["independently_enumerated_multisets"] for a in audits),"canonical_checks":sum(r["aggregate"]["ordered_covering_checks"] for r in reports),"distinct_shard_product_jets_sum":sum(r["aggregate"]["distinct_crossing_jets"] for r in reports),"multiset_to_key_collisions":sum(a["shard"]["multiset_to_canonical_key_collisions"] for a in audits),"key_to_product_collisions_within_shards":sum(r["aggregate"]["canonical_key_to_product_collisions"] for r in reports),"negative_Q8":0,"zero_Q8":0,"minimum_Q8":min(r["aggregate"]["minimum_Q8"] for r in reports),"maximum_Q8":max(r["aggregate"]["maximum_Q8"] for r in reports)}
 assert aggregate=={"source_alpha":12,"terminal_alpha":6,"total_alpha":18,"terminal_type_index_start":73,"terminal_type_index_stop":247,"terminal_type_count":175,"independently_enumerated_multisets":10146500,"canonical_checks":7443922,"distinct_shard_product_jets_sum":7280065,"multiset_to_key_collisions":2702578,"key_to_product_collisions_within_shards":163857,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":1242957726,"maximum_Q8":99854115550464}
 payload={"schema":"rank8-exceptional-first-crossing-alpha6-s12-complete-v1","status":"PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE12_COMPLETE","theorem":"For every terminal exceptional alpha6 type73..247 and every source-alpha12 exceptional multiset using types at most the terminal type, the total-alpha18 product has Q8>0.","coverage":{"shard_ranges":ranges,"exact_union":[73,247],"overlaps":0,"gaps":0},"aggregate":aggregate,"shards":[{"label":label,"range":ranges[i],"report_status":reports[i]["status"],"audit_status":audits[i]["status"],"recurrence_peak_private_bytes":reports[i]["resources"]["peak_private_bytes"],"audit_peak_private_bytes":audits[i]["resources"]["peak_private_bytes"]} for i,label in enumerate(LABELS)],"scope_warning":"Exactly source alpha12 for terminal alpha6; source alpha13 excluded except separately sealed type247 pilot.","hashes":{**hashes,Path(__file__).name:digest(Path(__file__))}}
 OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);print(f"ranges={ranges} raw={aggregate['independently_enumerated_multisets']} checks={aggregate['canonical_checks']} negative=0 zero=0");print(f"assembly_sha256={digest(OUTPUT)}");return 0
if __name__=="__main__":raise SystemExit(main())
