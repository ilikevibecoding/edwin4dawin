#!/usr/bin/env python3
"""Assemble the complete all-order Delta3 e=1 old-root near=0 theorem."""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_complete_exact_agent_20260825.json"
EXTENSIONS = ("root", "short", "long")
PINNED = {
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "rank8_e1_old_root_increment_ordered_delta3_root_near0_exact_20260820.json":
        "98364D5B0F8D6070B2811FCE6A30CA646B91A9449E3FC63F0B1F18CD372FD9D7",
    "rank8_e1_old_root_increment_ordered_delta3_short_near0_exact_20260820.json":
        "4745DBC973D6B0E4EFC96A0B36D6C7D42533DE5C75B1E38567640E0DF54B8693",
    "rank8_e1_old_root_increment_ordered_delta3_long_near0_exact_20260820.json":
        "37428897176667DB1801497F33F3CE3B7403D5062F78416865503FC47B0ACE36",
    "prove_rank8_delta3_e1_old_root_near0_univariate_refinement_agent_20260825.py":
        "5AEF4E1B84BA5CFDF4089B95EB91784C07EA3EA9B33C892C54B0043961D7D91C",
    "rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json":
        "0B1D9CD86342ADF42B20CFDD9C4BD430CDAF8313B92E04932B6855E9D7333720",
    "prove_rank8_delta3_e1_old_root_near0_bivariate_refinement_agent_20260825.py":
        "DEA9F19F7E287D0D2C7F294B971BD7A619EEDAE63BC3D2FC78EF7AFE668FA3CF",
    "rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json":
        "F9882287EA8FC1C53092A74F73FA85FACEC1404C5D54BE49F25FD2433702250C",
    "probe_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py":
        "E36870C886CA7EED1D80BD124AE2623B67592E7A74BB8996520C84D362FB0CA3",
    "rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json":
        "1682DE8796B348A077D6CC1BA3570AB139B84BD43A6B7938B80571065A498E55",
    "seal_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py":
        "35EBEDB859E38F2C0AD821A6B409F739B590D6806DE0651E477561A37A9829B0",
    "rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json":
        "4433216055285ACCE541C2256F5A8EB549336A6B8FD2A6ACF38794856BC3D97A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    univariate = load("rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json")
    bivariate = load("rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json")
    trivariate = load("rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json")
    assert univariate["status"] == "PASS_EXACT_ALL_30_OBSTRUCTED_UNIVARIATE_RAYS"
    assert bivariate["status"] == "PASS_EXACT_ALL_24_OBSTRUCTED_BIVARIATE_CELLS"
    assert trivariate["status"] == "PASS_EXACT_DELTA3_NEAR0_TAIL19_TRIVARIATE_CELL_ALL_EXTENSIONS"

    summary = {}
    for extension in EXTENSIONS:
        original = load(f"rank8_e1_old_root_increment_ordered_delta3_{extension}_near0_exact_20260820.json")
        assert original["cells"] == 120
        passing = [row for row in original["cell_rows"] if row["negative"] == 0]
        obstructed = [row for row in original["cell_rows"] if row["negative"] > 0]
        assert len(passing) == 101 and len(obstructed) == 19
        assert all(int(row["origin_coefficient"]) > 0 for row in passing)
        assert all(int(row["minimum_sampled_increment"]) > 0 for row in passing)
        by_dimension = Counter(row["dimension"] for row in obstructed)
        assert by_dimension == Counter({1: 10, 2: 8, 3: 1})
        uni_labels = {
            row["original_cell_label"]
            for row in univariate["rows"] if row["extension"] == extension
        }
        bi_labels = {
            row["original_cell_label"]
            for row in bivariate["rows"] if row["extension"] == extension
        }
        tri_labels = {"tail>=19"}
        assert uni_labels == {row["label"] for row in obstructed if row["dimension"] == 1}
        assert bi_labels == {row["label"] for row in obstructed if row["dimension"] == 2}
        assert tri_labels == {row["label"] for row in obstructed if row["dimension"] == 3}
        assert not (uni_labels & bi_labels or uni_labels & tri_labels or bi_labels & tri_labels)
        assert len(uni_labels | bi_labels | tri_labels) == 19
        summary[extension] = {
            "original_partition_cells": 120,
            "originally_passing": 101,
            "newly_closed_univariate": len(uni_labels),
            "newly_closed_bivariate": len(bi_labels),
            "newly_closed_trivariate": len(tri_labels),
            "remaining": 0,
        }

    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-complete-agent-v1",
        "status": "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR0_ALL_ORDER_ALL_EXTENSIONS",
        "theorem": (
            "Let T be a subdivided claw of order at least 23. Root T at the "
            "first vertex of any arm adjacent to the center (near=0), and extend "
            "any one of its three arms by one leaf. Then the rank-eight terminal "
            "residual's Delta3 old-root increment is strictly positive."
        ),
        "ordered_parameterization": {
            "root_arm_length": "tail+1",
            "shorter_other_arm_length": "short+1",
            "longer_other_arm_length": "short+difference+1",
            "source_order_condition": "tail+2*short+difference>=19",
            "parameters": "tail,short,difference are nonnegative integers",
        },
        "no_gap_original_partition": [
            "tail>=19",
            "fixed tail<19 and short>=ceil((19-tail)/2)",
            "fixed tail<19, fixed smaller short, and difference>=19-tail-2*short",
        ],
        "extension_orbits": {
            "root": "extend the arm containing the old root",
            "short": "extend the shorter of the other two arms",
            "long": "extend the longer of the other two arms",
        },
        "cell_accounting": summary,
        "strictness": (
            "Every original passing cell and every refined subcell has positive "
            "Newton origin and no negative Newton coefficient; hence every "
            "admissible integer increment is strictly positive."
        ),
        "dependency_sha256": actual,
        "proof_boundary": (
            "This seals Delta3 only for the e=1 subdivided-claw old-root orbit "
            "with near=0.  Old roots farther down an arm, arbitrary trees, the "
            "Delta2/3 inserted-leaf gates, full Q8/PGC, forest unimodality, and "
            "Problem 993 remain outside this theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("CELL_ACCOUNTING", summary)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
