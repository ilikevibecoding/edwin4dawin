#!/usr/bin/env python3
"""Assemble the four exact Delta3 live-path tensors for every n>=28."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_attachment_floor_n28plus_assembled_root_20260825.json"
EXPECTED = {
    "rank8_delta3_lcross_k1_attachment_floor_n28plus_exact_agent_20260825.json": "C195C2B3E1EE9542ADA98BAF28496BDD71F0F8A1FEBCAAE6D6166F82A74A9BAA",
    "rank8_delta3_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json": "A4D1341BA9328B27D040D4AB1A14CB09ABF047803E026FB8170B7B7AE2D80BEA",
    "rank8_delta3_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json": "9FF88BC019B8564E383774400A4DFF55F68769BE49F8B2292CC97CC5A275176E",
    "rank8_delta3_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json": "7293186F612ED942DB4FB7ABC3A23FA7A9E741302C0AD69EE563260BA4C6B0C7",
    "certify_rank8_delta23_live_path_attachment_floor_box_fast_root.py": "9ECDF89738A6EE10500012BC1424F53AC7A1C570033A760235FB419B8F23F40D",
    "certify_rank8_delta23_live_path_attachment_floor_box_agent.py": "F0024AEFEE3790D2FC5B77F61226DCD56E6C63C1F61358A8B4EB9ADE8B604669",
    "tensor_bernstein_flint_matrix_root.py": "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "audit_rank8_delta23_live_path_attachment_floor_box_mappings_agent.py": "C2396D33FBF3E3266AC056C1AC8AC02D2CBF7894C4E26D83654830DC04D62A11",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json": "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "verify_rank8_q8_terminal_delta3_reduction.py": "E69B4E8E4D19D1C5AFCC966EE81476583CBA7C9DC86F5E1489FE09169F5AC0A0",
    "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json": "EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26",
    "verify_rank8_root_deletion_attachment_floor_root.py": "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json": "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "audit_rank8_root_deletion_attachment_floor_root.py": "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json": "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "verify_rank8_n28_tight_coordinate_chords_root.py": "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json": "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    mapping = load(
        "rank8_delta23_live_path_attachment_floor_box_mappings_"
        "independent_audit_agent_20260825.json"
    )
    reduction = load(
        "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    )
    floor = load("rank8_root_deletion_attachment_floor_exact_root_20260825.json")
    floor_audit = load(
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    chords = load("rank8_n28_tight_coordinate_chords_exact_root_20260825.json")
    assert mapping["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    )
    assert reduction["status"] == (
        "PASS_EXACT_RANK8_TERMINAL_DELTA3_BOUNDED_REDUCTION_WITH_ENCLOSURE_OBSTRUCTION"
    )
    assert floor["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert chords["status"] == "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS"
    assert reduction["rank6_defect_reduction"]["endpoints"] == [
        "c7=(12*c6^2/c5-c6)/14 (k=1)",
        "c7=(12*c6^2/c5-7*c6)/14 (k=7)",
    ]

    rows = []
    combinations = set()
    aggregate = {"boxes": 0, "coefficients": 0, "negative": 0, "zero": 0, "positive": 0}
    for piece in ("lcross", "ucap"):
        for k in (1, 7):
            name = (
                f"rank8_delta3_{piece}_k{k}_attachment_floor_"
                "n28plus_exact_agent_20260825.json"
            )
            report = load(name)
            assert report["status"] == "PASS_EXACT_DELTA3_LIVE_PATH_WITH_ATTACHMENT_FLOOR"
            assert report["Delta"] == 3
            assert report["D6_k"] == k
            assert report["capacity_piece"] == piece
            assert report["order_domain"] == "single compactified n>=28 domain"
            assert report["mapped_degrees"] == [38, 12, 12, 11, 8, 2]
            assert report["bernstein_coefficients"] == 2_135_484
            assert report["coefficient_sign_counts"] == {
                "negative": 0, "zero": 0, "positive": 2_135_484,
            }
            assert report["source_sha256"] == actual[
                "certify_rank8_delta23_live_path_attachment_floor_box_fast_root.py"
            ]
            assert report["immutable_inputs"][
                "certify_rank8_delta23_live_path_attachment_floor_box_agent.py"
            ] == actual["certify_rank8_delta23_live_path_attachment_floor_box_agent.py"]
            assert report["immutable_inputs"]["tensor_bernstein_flint_matrix_root.py"] == actual[
                "tensor_bernstein_flint_matrix_root.py"
            ]
            combinations.add((k, piece))
            counts = report["coefficient_sign_counts"]
            aggregate["boxes"] += 1
            aggregate["coefficients"] += report["bernstein_coefficients"]
            for key in ("negative", "zero", "positive"):
                aggregate[key] += counts[key]
            rows.append({
                "D6_k": k,
                "capacity_piece": piece,
                "report": name,
                "report_sha256": actual[name],
                "minimum": report["minimum"],
                "minimum_index": report["minimum_index"],
            })
    assert combinations == {(1, "lcross"), (1, "ucap"), (7, "lcross"), (7, "ucap")}
    assert aggregate == {
        "boxes": 4, "coefficients": 8_541_936,
        "negative": 0, "zero": 0, "positive": 8_541_936,
    }

    payload = {
        "schema": "rank8-delta3-attachment-floor-n28plus-assembled-v1",
        "status": "PASS_EXACT_RANK8_DELTA3_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N28_PLUS",
        "theorem": (
            "For every rooted tree core of order n>=28, the rank-eight "
            "terminal Delta3 residual is nonnegative throughout the exact "
            "rank-six defect interval and root-capacity polygon."
        ),
        "logical_bridge": [
            "The structural reduction is concave across the rank-six defect interval, leaving k=1 and k=7.",
            "The root polygon reduces to lower-cross and upper-capacity paths plus endpoints.",
            "The attachment-incidence theorem gives h7/c7>=(n-19)/(n-12)>=9/16, excluding the h7=0 face.",
            "Lower-cross at ratio one includes the full-root endpoint; upper-capacity at ratio one includes the upper junction.",
            "The four exact tensors cover both live paths at both defect endpoints on one compactified n>=28 domain.",
        ],
        "coordinate_domain": mapping["single_domain"],
        "coordinate_chords": mapping["coordinate_chords"],
        "path_endpoint_coverage": mapping["endpoint_coverage"],
        "tensor_rows": rows,
        "aggregate": aggregate,
        "proof_boundary": (
            "This closes the reduced Delta3 terminal gate only for n>=28. "
            "It does not close Delta2, the other increment geometries, "
            "connected Q8, forest Q8, or Problem 993 by itself."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("BOXES", aggregate["boxes"], "COEFFICIENTS", aggregate["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
