#!/usr/bin/env python3
"""Independent no-gap audit of the alpha=5 fixed/full rank-eight cones."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT=Path(__file__).resolve().parent
CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json"
JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER=ROOT/"verify_rank8_exceptional_fixed_full.py"
HIGH=ROOT/"rank8_exceptional_fixed_high_exact_20260820_range_25_72.json"
LOW=ROOT/"rank8_exceptional_fixed_low_exact_20260820_range_25_72.json"
OUTPUT=ROOT/"rank8_exceptional_fixed_alpha5_independent_audit_exact_20260820.json"


def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main()->None:
    classification=json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"]=="PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_by_alpha"]["5"]==48
    assert classification["hashes"][JETS.name]==digest(JETS)
    rows=[]
    with JETS.open(newline="",encoding="utf-8") as handle:
        for index,row in enumerate(csv.DictReader(handle,delimiter="\t"),1):
            polynomial=[int(row[f"i{rank}"]) for rank in range(10)]
            alpha=int(row["alpha"]); value=int(row["q8"])
            assert value==16*polynomial[8]**2-polynomial[7]*polynomial[8]-18*polynomial[7]*polynomial[9]
            rows.append({"index":index,"alpha":alpha,"polynomial":polynomial,"q8":value})
    alpha5=[row for row in rows if row["alpha"]==5]
    assert [row["index"] for row in alpha5]==list(range(25,73))
    assert len({tuple(row["polynomial"]) for row in alpha5})==48
    assert all(row["polynomial"][0]==1 and row["polynomial"][5]>0 for row in alpha5)
    assert all(row["polynomial"][6:]==[0]*4 for row in alpha5)
    assert [row["q8"] for row in alpha5]==[0]*48
    assert rows[23]["alpha"]==4 and rows[72]["alpha"]==6

    modes={}
    for mode,path in (("high",HIGH),("low",LOW)):
        report=json.loads(path.read_text(encoding="utf-8"))
        assert report["status"]==f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
        assert report["range_start"]==25 and report["range_stop"]==72
        assert report["exceptional_jet_total"]==1215 and report["cases"]==48
        assert [row["index"] for row in report["rows"]]==list(range(25,73))
        assert [row["alpha"] for row in report["rows"]]==[5]*48
        assert [row["fixed_Q8"] for row in report["rows"]]==[0]*48
        assert all(row["negative"]==0 and row["minimum"]==1 for row in report["rows"])
        assert report["statistics"]["negative"]==0 and report["statistics"]["minimum"]==1
        assert report["peak_private_bytes"]<1024**3
        assert report["hashes"][JETS.name]==digest(JETS)
        assert report["hashes"][CLASSIFICATION.name]==digest(CLASSIFICATION)
        assert report["hashes"][VERIFIER.name]==digest(VERIFIER)
        modes[mode]={
            "report":path.name,"report_sha256":digest(path),"cases":report["cases"],
            "terms":report["statistics"]["terms"],"negative_coefficients":0,
            "minimum_coefficient":report["statistics"]["minimum"],
            "maximum_coefficient":report["statistics"]["maximum"],
            "peak_private_bytes":report["peak_private_bytes"],"peak_private_GiB":report["peak_private_GiB"],
        }
    payload={
        "schema":"rank8-exceptional-fixed-alpha5-independent-audit-v1",
        "status":"PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA5_BOTH_FULL_CONES",
        "theorem":"Adjoining any exceptional connected-tree jet with alpha=5 to an abstract rank-eight high or low full factor preserves Q8.",
        "no_gap":{"classification_alpha5_count":48,"covered_database_indices":[25,72],"preceding_index_alpha":4,"following_index_alpha":6},
        "cones":modes,
        "totals":{
            "fixed_cone_cases":96,"symbolic_terms":modes["high"]["terms"]+modes["low"]["terms"],
            "negative_coefficients":0,"minimum_coefficient":1,
            "maximum_peak_private_bytes":max(modes["high"]["peak_private_bytes"],modes["low"]["peak_private_bytes"]),
        },
        "scope_warning":"This closes exactly the alpha=5 fixed/full class. It does not close any full/full cone, alpha>=6 fixed/full class, exceptional first crossing, connected Q8, or forest Q8.",
        "hashes":{CLASSIFICATION.name:digest(CLASSIFICATION),JETS.name:digest(JETS),VERIFIER.name:digest(VERIFIER),Path(__file__).name:digest(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"]); print("REPORT",OUTPUT.name,digest(OUTPUT))


if __name__=="__main__":main()
