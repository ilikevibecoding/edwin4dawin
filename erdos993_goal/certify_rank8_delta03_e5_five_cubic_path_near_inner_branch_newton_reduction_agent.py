#!/usr/bin/env python3
"""Exact transfer/Newton reduction for five_cubic_path:near_inner_branch."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "newton_reduction_exact_agent_20260825.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_agent.py":
        "D821830BA6231141FE89FF57DB1AA335733981C12181CA3DE8700169276F2CFB",
    "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json":
        "486EC23ECDC5E10DF58E2B98A6511EC5194AAC94D472F802492BA9FAAB12863D",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    outer = json.loads(
        (ROOT / "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert outer["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
        "OUTER_BRANCH_TRANSFER_NEWTON_REDUCTION"
    )
    counts = outer["quotient_counts"]
    orders = outer["all_short_order_distribution"]
    assert counts == {
        "all_short": 228_709_656,
        "order27": 933_773,
        "finite": 226_246_180,
        "mixed": 872_753_895,
        "all_long": 1,
        "total": 1_101_463_552,
        "rays": 872_753_896,
    }

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    row = next(
        item for item in partition["root_location_partitions"]
        if item["root_location_orbit"] == "five_cubic_path:near_inner_branch"
    )
    assert row["stabilizer_order"] == 4 and row["coordinate_count"] == 11
    assert row["coordinate_patterns"] == counts["total"]
    assert row["all_short_literal_patterns"] == counts["all_short"]
    assert row["all_short_patterns_order27"] == counts["order27"]
    assert row["all_short_patterns_n28_plus"] == counts["finite"]
    assert row["mixed_long_short_patterns"] == counts["mixed"]
    assert row["all_long_patterns"] == counts["all_long"]
    assert row["all_short_order_distribution"] == orders
    assert outer["integer_newton_matrix_determinant"] == 1

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-near-inner-branch-"
            "newton-reduction-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "NEAR_INNER_BRANCH_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "five_cubic_path:near_inner_branch",
        "quotient_formula": outer["quotient_formula"],
        "coordinate_order": (
            "root-side center-inner spine, inner pendant, inner-outer spine, "
            "outer pendants low,high; remote analog; center pendant"
        ),
        "order_formula": outer["order_formula"],
        "quotient_counts": counts,
        "all_short_order_distribution": orders,
        "graded_path_transfer": outer["graded_path_transfer"],
        "degree_bounds": outer["degree_bounds"],
        "newton_gate": outer["newton_gate"],
        "integer_newton_matrix_determinant": 1,
        "shared_order27_evidence": outer["shared_order27_evidence"],
        "coordinate_partition_equivalence": (
            "Outer-branch and near-inner-branch roots have the same order-4 "
            "stabilizer action on the same ordered pair of five-coordinate "
            "halves and center pendant; only the root-deleted transfer changes."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction only; no n>=28 sign claim. Full near-inner primary "
            "and independent literal audit remain required."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
