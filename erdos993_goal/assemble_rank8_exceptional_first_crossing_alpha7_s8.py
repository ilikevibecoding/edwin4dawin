#!/usr/bin/env python3
"""Fail-closed assembly of complete terminal-alpha7/source8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json"
RANGES = [(248, 472), (473, 664), (665, 835), (836, 947)]
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_s8_complete_exact_20260820.json"


def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def paths(start, stop):
    stem = f"rank8_exceptional_first_crossing_alpha7_s8_types{start}_{stop}"
    return ROOT / f"{stem}_exact_20260820.json", ROOT / f"{stem}_keys_exact_20260820.sqlite3", ROOT / f"{stem}_audit_exact_20260820.json"


def main() -> int:
    design = json.loads(DESIGN.read_text(encoding="utf-8")); design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
    assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN") and design_audit["status"].startswith("PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT")
    cell = design["exact_counts"]["source_cells"]["8"]
    assert [(s["terminal_type_index_start"], s["terminal_type_index_stop"]) for s in cell["shards"]] == RANGES
    hashes = {DESIGN.name:digest(DESIGN), DESIGN_AUDIT.name:digest(DESIGN_AUDIT), Path(__file__).name:digest(Path(__file__))}
    raw=checks=products=raw_key=key_product=negative=zero=0; minimum=maximum=None; producer_seconds=audit_seconds=0.0; producer_peak=audit_peak=0; expected=248; shards=[]
    for start,stop in RANGES:
        assert start==expected; expected=stop+1
        report_path,database,audit_path=paths(start,stop); report=json.loads(report_path.read_text(encoding="utf-8")); audit=json.loads(audit_path.read_text(encoding="utf-8"))
        assert report["status"]=="PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE8_SHARD" and audit["status"]=="PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE8_SHARD_AUDIT"
        assert report["hashes"][database.name]==digest(database) and audit["hashes"][report_path.name]==digest(report_path) and audit["hashes"][database.name]==digest(database)
        assert report["resources"]["peak_private_bytes"]<448*1024**2 and audit["resources"]["peak_private_bytes"]<448*1024**2
        row=report["aggregate"]; audited=audit["shard"]
        pairs=(("independently_counted_raw_multisets","independently_enumerated_multisets"),("canonical_check_keys","canonical_check_keys"),("distinct_crossing_jets","distinct_crossing_jets"),("raw_to_canonical_compression","raw_to_canonical_compression"),("canonical_key_to_product_collisions","canonical_key_to_product_collisions"),("negative_Q8","negative_Q8"),("zero_Q8","zero_Q8"),("minimum_Q8","minimum_Q8"),("maximum_Q8","maximum_Q8"))
        for a,b in pairs: assert row[a]==audited[b]
        assert row["negative_Q8"]==row["zero_Q8"]==0 and row["minimum_Q8"]>0
        raw+=row["independently_counted_raw_multisets"]; checks+=row["canonical_check_keys"]; products+=row["distinct_crossing_jets"]; raw_key+=row["raw_to_canonical_compression"]; key_product+=row["canonical_key_to_product_collisions"]; negative+=row["negative_Q8"]; zero+=row["zero_Q8"]
        minimum=row["minimum_Q8"] if minimum is None else min(minimum,row["minimum_Q8"]); maximum=row["maximum_Q8"] if maximum is None else max(maximum,row["maximum_Q8"])
        producer_seconds+=report["resources"]["elapsed_seconds"]; audit_seconds+=audit["resources"]["elapsed_seconds"]; producer_peak=max(producer_peak,report["resources"]["peak_private_bytes"]); audit_peak=max(audit_peak,audit["resources"]["peak_private_bytes"])
        for path in (report_path,database,audit_path): hashes[path.name]=digest(path)
        shards.append({"terminal_type_index_start":start,"terminal_type_index_stop":stop,"raw_multisets":row["independently_counted_raw_multisets"],"canonical_checks":row["canonical_check_keys"],"products":row["distinct_crossing_jets"],"minimum_Q8":row["minimum_Q8"],"maximum_Q8":row["maximum_Q8"]})
    assert expected==948 and raw==cell["raw_multiset_crossing_count"]==2037000 and checks+raw_key==raw and products+key_product==checks and negative==zero==0
    aggregate={"independently_enumerated_multisets":raw,"canonical_check_keys":checks,"distinct_shard_product_jets_sum":products,"multiset_to_canonical_key_compression":raw_key,"canonical_key_to_product_compression_within_shards":key_product,"negative_Q8":negative,"zero_Q8":zero,"minimum_Q8":minimum,"maximum_Q8":maximum}
    payload={"schema":"rank8-exceptional-first-crossing-alpha7-s8-complete-v1","status":"PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE8_COMPLETE","theorem":"Every exceptional-only first crossing with terminal alpha7 and source alpha8 has literal Q8>0.","coverage":{"source_alpha":8,"terminal_alpha":7,"total_alpha":15,"terminal_type_indices":[248,947],"terminal_type_count":700,"shard_ranges":[list(r) for r in RANGES],"gaps":0,"overlaps":0},"aggregate":aggregate,"resources":{"workers":1,"fresh_process_per_shard_and_audit":True,"producer_elapsed_seconds_sum":producer_seconds,"audit_elapsed_seconds_sum":audit_seconds,"maximum_producer_peak_private_bytes":producer_peak,"maximum_producer_peak_private_MiB":producer_peak/1024**2,"maximum_audit_peak_private_bytes":audit_peak,"maximum_audit_peak_private_MiB":audit_peak/1024**2,"abort_limit_private_bytes":448*1024**2,"hard_limit_private_bytes":512*1024**2},"shards":shards,"scope_warning":"Completes only source alpha8 for terminal alpha7; stops before source9.","hashes":hashes}
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"]); print(f"raw={raw} checks={checks} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}"); print(f"assembly_sha256={digest(OUTPUT)}"); return 0


if __name__=="__main__": raise SystemExit(main())
