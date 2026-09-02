#!/usr/bin/env python3
"""Fail-closed gate for the e=6 quintic-star center-root orbit."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = "rank8_delta03_e6_quintic_star_center_n28_plus_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta03_e6_quintic_star_center_n28_plus_independent_audit_agent_20260825.json"
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_center_n28_plus_gate_exact_agent_20260825.json"
EXPECTED = {
    "prove_rank8_delta03_e6_quintic_star_center_n28_plus_agent_20260825.py":
        "D0F02C2F85C8A4B2C37CB1B48A26C5C13854E7EC9B4B0A679B580A49EBDD1556",
    PRODUCER_REPORT:
        "58F96E12D4F158F49F192F5B8086BE7B804B68FC78B690CE579BE1F0E2F9AD16",
    "audit_rank8_delta03_e6_quintic_star_center_n28_plus_agent_20260825.py":
        "28F29E1ADF4C430845D459C04B91B28F128DDB336CA13D11F226004CBF9F65A1",
    AUDIT_REPORT:
        "282BF13261F6E9B3576573171BF0C5D1821C55F9745ED6824C0C93CEF19ADAEF",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json":
        "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307",
    "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json":
        "247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F",
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
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    producer = load(PRODUCER_REPORT)
    audit = load(AUDIT_REPORT)
    assert producer["status"] == "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS"
    assert audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS"
    assert audit["certificate_sha256"] == EXPECTED[PRODUCER_REPORT]
    assert producer["exact_scope"]["ranks"] == [0, 1, 2, 3]
    assert len(producer["cells"]) == len(audit["cell_replay"]) == 217

    expected_partition = {"5": 1, "4": 6, "3": 21, "2": 56, "1": 126, "0": 7}
    assert producer["no_gap_partition"]["cells_by_long_arm_count"] == expected_partition
    assert producer["no_gap_partition"]["pairwise_disjoint"] is True
    assert producer["no_gap_partition"]["exhausts_n28_plus"] is True
    assert len(producer["no_gap_partition"]["all_short_cells"]) == 7

    expected_totals = {
        "0": (20125, "1/2633637888000"),
        "1": (20125, "1/2304433152000"),
        "2": (18781, "1/121927680000"),
        "3": (17492, "41/365783040000"),
    }
    for rank, (coefficients, minimum) in expected_totals.items():
        row = producer["rank_totals"][rank]
        assert row["cells"] == 217
        assert row["coefficients"] == coefficients
        assert row["negative_coefficients"] == row["zero_coefficients"] == 0
        assert row["minimum_coefficient"] == minimum
        replay = audit["rank_totals"][rank]
        assert replay["coefficients_replayed"] == replay["expected_coefficients"] == coefficients

    for index, (cell, replay) in enumerate(zip(producer["cells"], audit["cell_replay"], strict=True), start=1):
        assert replay["cell_index"] == index
        assert replay["long_arms"] == cell["long_arms"]
        assert replay["short_arms"] == cell["short_arms"]
        assert replay["shift"] == cell["shift"]
        assert len(replay["rank_digest_replay"]) == 4
        for rank_row in replay["rank_digest_replay"]:
            rank = str(rank_row["rank"])
            assert rank_row["digest_match"] is True
            assert rank_row["ordered_term_sha256"] == cell["ranks"][rank]["ordered_term_sha256"]
            assert cell["ranks"][rank]["negative_coefficients"] == 0
            assert cell["ranks"][rank]["zero_coefficients"] == 0
            assert int(cell["ranks"][rank]["constant_coefficient"].split('/')[0]) > 0

    coverage = audit["coverage_totals"]
    obligations = {
        "producer_status": True,
        "audit_status": True,
        "audit_pins_corrected_producer": True,
        "structural_orbit_exact": producer["exact_scope"]["skeleton"].startswith("e6_skeleton_01"),
        "no_gap_217_cell_partition": producer["no_gap_partition"]["exhausts_n28_plus"] is True,
        "four_ranks_every_cell": coverage["rank_cells"] == 868,
        "pair_split_identities_exact": coverage["pair_split_identities"] == 102,
        "literal_uniqueness_grid_exact": coverage["literal_uniqueness_grid_points"] == 4561,
        "literal_split_profiles_exact": coverage["literal_split_variant_profiles"] == 8901,
        "literal_forest_dp_runs_exact": coverage["logical_literal_forest_dp_runs"] == 17802,
        "profile_coordinate_comparisons_exact": coverage["profile_coordinate_comparisons"] == 71208,
        "all_ordered_digests_replayed": coverage["ordered_term_digests_replayed"] == 868,
        "all_ordered_coefficients_replayed": coverage["ordered_coefficients_replayed"] == 76523,
        "zero_digest_mismatch": coverage["digest_mismatches"] == 0,
        "zero_negative_coefficients": coverage["negative_coefficients"] == 0,
    }
    assert all(obligations.values()), obligations

    payload = {
        "schema": "rank8-delta03-e6-quintic-star-center-n28-plus-gate-v1",
        "status": "SEALED_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": producer["exact_scope"],
        "partition": producer["no_gap_partition"],
        "proof_chain": [
            "the independently audited e=6 structural partition identifies skeleton01 and its unique center orbit",
            "217 disjoint short/long symmetry cells exhaust every five-arm subdivision at n>=28",
            "all 76,523 exact power coefficients across Delta0..3 are strictly positive",
            "independent audit proves 102 original pair-split identities without producer compression",
            "independent direct five-path reconstruction matches all 868 ordered coefficient digests",
            "literal adjacency-list/include-exclude DP agrees on 8,901 split-variant rooted profiles",
        ],
        "rank_totals": producer["rank_totals"],
        "coverage": coverage,
        "fail_closed_exclusions": [
            "no leaf or pendant-interior root of skeleton01",
            "no root orbit of the other nine e=6 skeletons",
            "no leaf-extension increment or inserted-new-leaf value",
            "no complete e=6 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("cells", payload["partition"]["total_cells"], flush=True)
    print("literal_profiles", payload["coverage"]["literal_split_variant_profiles"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
