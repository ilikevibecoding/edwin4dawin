#!/usr/bin/env python3
"""Independent no-gap audit of the alpha=4 fixed/full rank-eight cones."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT=Path(__file__).resolve().parent
CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json"
JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER=ROOT/"verify_rank8_exceptional_fixed_full.py"
HIGH=ROOT/"rank8_exceptional_fixed_high_exact_20260820_range_10_24.json"
LOW=ROOT/"rank8_exceptional_fixed_low_exact_20260820_range_10_24.json"
OUTPUT=ROOT/"rank8_exceptional_fixed_alpha4_independent_audit_exact_20260820.json"


def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main()->None:
    classification=json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"]=="PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_by_alpha"]["4"]==15
    assert classification["hashes"][JETS.name]==digest(JETS)
    rows=[]
    with JETS.open(newline="",encoding="utf-8") as handle:
        for index,row in enumerate(csv.DictReader(handle,delimiter="\t"),1):
            rows.append({
                "index":index,"alpha":int(row["alpha"]),
                "polynomial":[int(row[f"i{rank}"]) for rank in range(10)],
                "q8":int(row["q8"]),
            })
    alpha4=[row for row in rows if row["alpha"]==4]
    assert [row["index"] for row in alpha4]==list(range(10,25))
    expected_prefixes=[
        [1,5,6,4,1],[1,6,10,5,1],[1,6,10,6,1],[1,6,10,7,2],
        [1,7,15,10,1],[1,7,15,11,1],[1,7,15,11,2],
        [1,7,15,11,3],[1,7,15,12,3],[1,7,15,13,4],
        [1,8,21,20,5],[1,8,21,21,6],[1,8,21,21,7],
        [1,8,21,22,8],[1,8,21,23,9],
    ]
    assert [row["polynomial"][:5] for row in alpha4]==expected_prefixes
    assert all(row["polynomial"][5:]==[0]*5 for row in alpha4)
    assert [row["q8"] for row in alpha4]==[0]*15
    assert rows[8]["alpha"]==3 and rows[24]["alpha"]==5

    modes={}
    for mode,path in (("high",HIGH),("low",LOW)):
        report=json.loads(path.read_text(encoding="utf-8"))
        assert report["status"]==f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
        assert report["range_start"]==10 and report["range_stop"]==24
        assert report["exceptional_jet_total"]==1215 and report["cases"]==15
        assert [row["index"] for row in report["rows"]]==list(range(10,25))
        assert [row["alpha"] for row in report["rows"]]==[4]*15
        assert [row["fixed_Q8"] for row in report["rows"]]==[0]*15
        assert all(row["negative"]==0 and row["minimum"]==1 for row in report["rows"])
        assert report["statistics"]["negative"]==0
        assert report["statistics"]["minimum"]==1
        assert report["peak_private_bytes"]<1024**3
        assert report["hashes"][JETS.name]==digest(JETS)
        assert report["hashes"][CLASSIFICATION.name]==digest(CLASSIFICATION)
        assert report["hashes"][VERIFIER.name]==digest(VERIFIER)
        modes[mode]={
            "report":path.name,"report_sha256":digest(path),
            "cases":report["cases"],"terms":report["statistics"]["terms"],
            "negative_coefficients":report["statistics"]["negative"],
            "minimum_coefficient":report["statistics"]["minimum"],
            "maximum_coefficient":report["statistics"]["maximum"],
            "peak_private_bytes":report["peak_private_bytes"],
            "peak_private_GiB":report["peak_private_GiB"],
        }
    payload={
        "schema":"rank8-exceptional-fixed-alpha4-independent-audit-v1",
        "status":"PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA4_BOTH_FULL_CONES",
        "theorem":"Adjoining any exceptional connected-tree jet with alpha=4 to an abstract rank-eight high or low full factor preserves Q8.",
        "no_gap":{
            "classification_alpha4_count":15,"covered_database_indices":[10,24],
            "preceding_index_alpha":3,"following_index_alpha":5,"jets":alpha4,
        },
        "cones":modes,
        "totals":{
            "fixed_cone_cases":30,
            "symbolic_terms":modes["high"]["terms"]+modes["low"]["terms"],
            "negative_coefficients":0,"minimum_coefficient":1,
            "maximum_peak_private_bytes":max(modes["high"]["peak_private_bytes"],modes["low"]["peak_private_bytes"]),
        },
        "scope_warning":"This closes exactly the alpha=4 fixed/full class. It does not close any full/full cone, alpha>=5 fixed/full class, exceptional first crossing, connected Q8, or forest Q8.",
        "hashes":{
            CLASSIFICATION.name:digest(CLASSIFICATION),JETS.name:digest(JETS),
            VERIFIER.name:digest(VERIFIER),Path(__file__).name:digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"])
    print("REPORT",OUTPUT.name,digest(OUTPUT))


if __name__=="__main__":main()
