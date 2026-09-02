#!/usr/bin/env python3
"""Fail-closed gate for the e=6 quintic-star leaf-root orbit."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = "rank8_delta03_e6_quintic_star_leaf_n28_plus_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta03_e6_quintic_star_leaf_n28_plus_independent_audit_agent_20260825.json"
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_leaf_n28_plus_gate_exact_agent_20260825.json"
EXPECTED = {
    "prove_rank8_delta03_e6_quintic_star_leaf_n28_plus_agent_20260825.py":
        "C657006F7F9D23A0BDBB82B50E228A43E7A8B01479D43DA98BC2DBC6E30E1A58",
    PRODUCER_REPORT:
        "90FF1062BED69ADC418FD6331368B10C6CBFF202C57E35505B19263F0ED3B83D",
    "audit_rank8_delta03_e6_quintic_star_leaf_n28_plus_agent_20260825.py":
        "C113B2B55D23EAE611E03DAA39576B7882F25AAA3A8AAF85C7B5919EFBDF22CE",
    AUDIT_REPORT:
        "96011BED975A54B35190E231AC7F6253C68642A007FC620C68C6EB84FF720DDF",
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
    assert producer["status"] == "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS"
    assert audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS"
    assert audit["certificate_sha256"] == EXPECTED[PRODUCER_REPORT]
    assert producer["exact_scope"]["ranks"] == [0, 1, 2, 3]
    assert len(producer["cells"]) == len(audit["cell_replay"]) == 774

    expected_counts = {
        "selected_long_cells": 256,
        "selected_short_with_long_companion_cells": 504,
        "all_short_fixed_cells": 14,
        "selected_vs_companion_union_pairs": 46,
    }
    cover = producer["no_gap_cover"]
    assert cover["cover_cells"] == 774
    assert cover["counts"] == expected_counts
    assert cover["all_short_orders"] == [28, 31]
    assert cover["exhausts_n28_plus"] is True
    routing = audit["routing_ledger"]
    assert routing["cells"] == 774
    assert routing["selected_long"] == 256
    assert routing["selected_short_with_long_companion"] == 504
    assert routing["all_short_fixed"] == 14
    assert routing["pigeonhole"]["selected_vs_companion_union_pairs"] == 46

    expected_totals = {
        "0": (111888, "1/2633637888000"),
        "1": (111888, "1/2304433152000"),
        "2": (103838, "1/121927680000"),
        "3": (96149, "41/365783040000"),
    }
    for rank, (coefficients, minimum) in expected_totals.items():
        row = producer["rank_totals"][rank]
        assert row["cells"] == 774
        assert row["coefficients"] == coefficients
        assert row["negative_coefficients"] == row["zero_coefficients"] == 0
        assert row["minimum_coefficient"] == minimum
        replay = audit["rank_totals"][rank]
        assert replay["coefficients_replayed"] == replay["expected_coefficients"] == coefficients

    for index, (cell, replay) in enumerate(
        zip(producer["cells"], audit["cell_replay"], strict=True), start=1
    ):
        assert replay["cell_index"] == index
        for key in (
            "selected_kind", "selected_short", "other_long_count", "other_shorts",
            "shift_target", "shift", "variables",
        ):
            assert replay[key] == cell[key]
        assert len(replay["rank_digest_replay"]) == 4
        for rank_row in replay["rank_digest_replay"]:
            rank = str(rank_row["rank"])
            assert rank_row["digest_match"] is True
            assert rank_row["ordered_term_sha256"] == cell["ranks"][rank]["ordered_term_sha256"]
            assert cell["ranks"][rank]["negative_coefficients"] == 0
            assert cell["ranks"][rank]["zero_coefficients"] == 0

    coverage = audit["coverage_totals"]
    obligations = {
        "producer_status": True,
        "audit_status": True,
        "audit_pins_exact_producer": True,
        "structural_leaf_orbit_exact": producer["exact_scope"]["root"].endswith("unique leaf orbit"),
        "no_gap_774_cell_union": cover["exhausts_n28_plus"] is True,
        "routing_counts_replayed": routing["cells"] == 256 + 504 + 14,
        "pigeonhole_contrapositive_exact": routing["pigeonhole"]["distinct_pigeonhole_triples"] > 0,
        "four_ranks_every_cell": coverage["rank_cells"] == 3096,
        "universal_pair_split_exact": coverage["universal_pair_split_zero_identities"] == 17,
        "literal_interpolation_grid_exact": coverage["literal_interpolation_grid_points"] == 23774,
        "literal_grid_variants_exact": coverage["literal_interpolation_grid_variant_profiles"] == 34652,
        "literal_holdouts_exact": coverage["literal_holdout_points"] == 1892,
        "literal_holdout_variants_exact": coverage["literal_holdout_variant_profiles"] == 2540,
        "literal_profiles_exact": coverage["literal_profiles_total"] == 37192,
        "literal_forest_dp_runs_exact": coverage["literal_forest_dp_runs"] == 74384,
        "mixed_newton_entries_exact": coverage["mixed_newton_entries"] == 190192,
        "all_ordered_digests_replayed": coverage["ordered_term_digests_replayed"] == 3096,
        "all_ordered_coefficients_replayed": coverage["ordered_coefficients_replayed"] == 423763,
        "zero_digest_mismatch": coverage["digest_mismatches"] == 0,
        "zero_negative_coefficients": coverage["negative_coefficients"] == 0,
    }
    assert all(obligations.values()), obligations

    payload = {
        "schema": "rank8-delta03-e6-quintic-star-leaf-n28-plus-gate-v1",
        "status": "SEALED_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_LEAF_N28_PLUS",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": producer["exact_scope"],
        "cover": cover,
        "routing_ledger": routing,
        "proof_chain": [
            "the independently audited e=6 structural partition identifies skeleton01 and its unique leaf orbit",
            "774 exact short/long shifted orthants form a gap-free union for every rooted subdivision at n>=28",
            "all 423,763 stored power terms across Delta0..3 are strictly positive",
            "the independent audit proves 17 universal original-pair identities in free A,B,D variables",
            "literal adjacency-list endpoint-deletion DP reconstructs all eight source coordinates from 23,774 full interpolation-grid points",
            "1,892 extra mixed holdout points validate the reconstruction outside every interpolation tensor",
            "all 3,096 ordered rank-cell digests and 423,763 coefficients replay exactly",
        ],
        "rank_totals": producer["rank_totals"],
        "coverage": coverage,
        "fail_closed_exclusions": [
            "no center or pendant-interior root is imported into this leaf gate",
            "no root orbit of the other nine e=6 skeletons",
            "no leaf-extension increment or inserted-new-leaf value",
            "no complete e=6 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("cells", payload["cover"]["cover_cells"], flush=True)
    print("literal_profiles", payload["coverage"]["literal_profiles_total"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
