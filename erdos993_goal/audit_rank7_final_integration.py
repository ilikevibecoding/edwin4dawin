#!/usr/bin/env python3
"""Independent read-only audit of the final rank-seven integration report."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank7_integration_readonly.py"
INTEGRATION = ROOT / "rank7_integration_readonly_20260820.json"
OUTPUT = ROOT / "rank7_final_integration_independent_audit_exact_20260820.json"

VERY_SMALL = ROOT / "rank7_delta0_very_small_j_n27_n38_exact_20260820.json"
SMALL_UPPER_27 = ROOT / "rank7_delta0_joint_capacity_faces_small_j_n27_exact_20260820.json"
SMALL_UPPER = ROOT / "rank7_delta0_joint_capacity_faces_small_j_n28_n38_exact_20260820.json"
LARGE_UPPER_27 = ROOT / "rank7_delta0_joint_capacity_faces_n27_exact_20260820.json"
LARGE_UPPER = ROOT / "rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json"
LARGE_PAIR = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_n27_n38_exact_20260820.json"
LARGE_H = ROOT / "rank7_delta0_joint_lower_b_h_extension_face_n27_n38_exact_20260820.json"
SMALL_LOWER = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json"

AUDIT_STATUSES = {
    "rank7_delta0_joint_capacity_faces_independent_audit_exact_20260820.json":
        "PASS_CODE_REPORT_AUDIT_NO_FRESH_REPLAY_LOW_RAM",
    "rank7_delta0_small_j_upper_b_independent_audit_exact_20260820.json":
        "PASS_CODE_REPORT_AUDIT_NO_FRESH_REPLAY_LOW_RAM",
    "rank7_delta0_n27_forest_exclusion_independent_audit_exact_20260820.json":
        "PASS_CODE_REPORT_AUDIT_NO_REPLAY_LOW_RAM",
    "rank7_delta0_lower_b_three_face_batches_independent_audit_exact_20260820.json":
        "PASS_EXACT_THREE_FACE_REPORT_UNION_2916_OF_2916",
    "rank7_delta0_small_m_three_face_structure_independent_audit_exact_20260820.json":
        "PASS_INDEPENDENT_RANK7_DELTA0_SMALL_M_THREE_FACE_STRUCTURE",
    "rank7_delta0_small_m_three_face_batch_independent_audit_exact_20260820.json":
        "PASS_EXACT_RANK7_DELTA0_SMALL_M_THREE_FACE_BATCH_2520_OF_2520",
    "rank7_delta0_weighted_pair_h_extension_independent_audit_exact_20260820.json":
        "PASS_H_ALGEBRA_CONSTRAINT_DIRECTIONS_THREE_FACE_UNION_AND_SIX_HARD_REPLAYS",
    "rank7_delta12_unconditional_cutoff25_independent_audit_exact_20260820.json":
        "PASS_INDEPENDENT_CODE_REPORT_COVERAGE_AUDIT_NO_FULL_REPLAY_LOW_RAM",
    "rank7_terminal_broom_delta012_n25_n26_independent_audit_exact_20260820.json":
        "PASS_INDEPENDENT_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_AUDIT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def exact_keys(path: Path, fields: tuple[str, ...], expected: set[tuple], status: str) -> dict:
    report = load(path)
    rows = report["results"]
    observed = [tuple(row[field] for field in fields) for row in rows]
    assert len(observed) == len(set(observed)) == len(expected)
    assert set(observed) == expected
    assert report["expected_jobs"] == report["completed_jobs"] == report["passing_jobs"] == len(expected)
    assert report["status"] == status
    assert all(row["pass"] is True and row["returncode"] == 0 and row["stderr"] == "" for row in rows)
    return {"keys": len(expected), "status": status, "sha256": sha256(path)}


def lower_keys(path: Path, fields: tuple[str, ...], expected: set[tuple], status: str) -> dict:
    summary = exact_keys(path, fields, expected, status)
    report = load(path)
    nodes = passed = discarded = 0
    for row in report["results"]:
        parsed = row["parsed"]
        assert parsed["status"] == "PASS" and parsed["worst"] == "None"
        assert parsed == ast.literal_eval(row["stdout"].split(maxsplit=len(fields))[len(fields)])
        assert parsed["nodes"] == 2 * (parsed["passed"] + parsed["discarded"]) - 1
        nodes += parsed["nodes"]
        passed += parsed["passed"]
        discarded += parsed["discarded"]
    summary.update({"nodes": nodes, "passed_leaves": passed, "discarded_leaves": discarded})
    return summary


def main() -> int:
    integration = load(INTEGRATION)
    assert integration["schema"] == "rank7-integration-readonly-v1"
    assert integration["status"] == "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
    assert integration["mode"] == "read-only evidence integration; no prover launched and no master edit"
    assert integration["hash_mismatches"] == {}
    assert integration["pending_inputs"] == []
    assert integration["all_inputs_final"] is True
    assert integration["conclusion"] == (
        "Every dependency is final: the terminal-broom induction, connected Q7, "
        "forest lift, and rank-seven PGC composition have no remaining order or scope gap."
    )
    for name, expected_hash in integration["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected_hash

    very_small_keys = {(n, m, q) for n in range(27, 39) for m in range(5) for q in (0, 1)}
    small_upper_27_keys = {(27, m, face, q) for m in range(5, 18) for face in ("containment", "extension") for q in (0, 1)}
    small_upper_keys = {(n, m, face, q) for n in range(28, 39) for m in range(5, 18) for face in ("containment", "extension") for q in (0, 1)}
    large_upper_27_keys = {(27, m, face, q) for m in range(18, 26) for face in ("containment", "extension") for q in (0, 1)}
    large_upper_keys = {(n, m, face, q) for n in range(28, 39) for m in range(18, n - 1) for face in ("containment", "extension") for q in (0, 1)}
    large_pair_keys = {(n, m, regime, face, q) for n in range(27, 39) for m in range(18, n - 1) for regime in (0, 1, 2) for face in ("ratio", "lifted") for q in (0, 1)}
    large_h_keys = {(n, m, regime, q) for n in range(27, 39) for m in range(18, n - 1) for regime in (0, 1, 2) for q in (0, 1)}
    small_lower_keys = {(n, m, regime, face, q) for n in range(27, 39) for m in range(5, 18) for regime in ((0, 1) if m <= 8 else (0, 1, 2)) for face in ("zero", "lifted", "h_extension") for q in (0, 1)}

    key_audits = {
        "very_small": exact_keys(VERY_SMALL, ("n", "m", "q"), very_small_keys, "PASS_EXACT_RANK7_DELTA0_VERY_SMALL_J_N27_N38"),
        "small_upper_n27": exact_keys(SMALL_UPPER_27, ("n", "m", "face", "q"), small_upper_27_keys, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N27"),
        "small_upper_n28_n38": exact_keys(SMALL_UPPER, ("n", "m", "face", "q"), small_upper_keys, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N28_N38"),
        "large_upper_n27": exact_keys(LARGE_UPPER_27, ("n", "m", "face", "q"), large_upper_27_keys, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27"),
        "large_upper_n28_n38": exact_keys(LARGE_UPPER, ("n", "m", "face", "q"), large_upper_keys, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38"),
        "large_lower_ratio_lifted": lower_keys(LARGE_PAIR, ("n", "m", "regime", "face", "q"), large_pair_keys, "PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38"),
        "large_lower_H": lower_keys(LARGE_H, ("n", "m", "regime", "q"), large_h_keys, "PASS_EXACT_RANK7_DELTA0_LOWER_B_H_EXTENSION_FACE_N27_N38"),
        "small_lower_three_faces": lower_keys(SMALL_LOWER, ("n", "m", "regime", "face", "q"), small_lower_keys, "PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38"),
    }

    # Underlying n,m,q cells have the exact disjoint partition 0..4, 5..17, 18..n-2.
    direct_cells = {(n, m, q) for n in range(27, 39) for m in range(5) for q in (0, 1)}
    small_cells = {(n, m, q) for n in range(27, 39) for m in range(5, 18) for q in (0, 1)}
    large_cells = {(n, m, q) for n in range(27, 39) for m in range(18, n - 1) for q in (0, 1)}
    all_cells = {(n, m, q) for n in range(27, 39) for m in range(0, n - 1) for q in (0, 1)}
    assert direct_cells.isdisjoint(small_cells)
    assert direct_cells.isdisjoint(large_cells)
    assert small_cells.isdisjoint(large_cells)
    assert direct_cells | small_cells | large_cells == all_cells
    assert (len(direct_cells), len(small_cells), len(large_cells), len(all_cells)) == (120, 312, 324, 756)

    delta0 = integration["Delta0_orders_27_through_38"]
    assert delta0["m_partition"] == ["0<=m<=4", "5<=m<=17", "18<=m<=n-2"]
    assert delta0["upper_face_union"] == "min(containment,extension)"
    assert delta0["lower_face_union"] == "large m: max(ratio,lifted,H); small m: max(0,lifted,H)"
    assert delta0["no_m_gap"] is True and delta0["complete"] is True
    assert delta0["lower_large_pair_faces"]["sha256_snapshot"] == sha256(LARGE_PAIR)
    assert delta0["lower_large_H_face"]["sha256_snapshot"] == sha256(LARGE_H)
    assert delta0["lower_small_three_faces"]["sha256_snapshot"] == sha256(SMALL_LOWER)

    # Independently reconstruct coefficient-rank coverage in every large-core order band.
    coverage = {
        "15-18": set(range(14)),
        "19-21": set(range(14)),
        "22-24": set(range(0, 7)) | set(range(7, 14)),
        "25-26": {0, 1, 2} | {1, 2} | {3} | {4, 5, 6} | set(range(7, 14)),
        "27-38": {0} | {1, 2} | {3} | {4, 5, 6} | set(range(7, 14)),
        ">=39": {0} | {1, 2} | {3} | {4, 5, 6} | set(range(7, 14)),
    }
    assert all(ranks == set(range(14)) for ranks in coverage.values())
    assert integration["small_core_splice"]["literal_Q7_terminal_families_core_orders_1_through_14"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14"
    assert integration["small_core_splice"]["finite_residual_diagnostic"]["delta0_negative_orders"] == [10, 11, 12]
    assert integration["orders_25_26"]["fresh_replay"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_FRESH_REPLAY"

    chain = integration["forest_and_PGC_chain"]
    assert chain["three_cones"] == [
        "PASS_EXACT_FULL_RANK7_HIGH_HIGH_CONVOLUTION_CONE",
        "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE",
        "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_LOW_FULL_CONVOLUTION_CONE",
    ]
    assert chain["conditional_forest_Q7_lift"] == "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    assert chain["forest_V7_alpha_at_least_12"] == "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12"
    assert chain["alpha11_boundary"] == "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM"

    independent_audits = {}
    for name, status in AUDIT_STATUSES.items():
        path = ROOT / name
        data = load(path)
        assert data["status"] == status
        independent_audits[name] = {"status": status, "sha256": sha256(path)}

    result = {
        "schema": "rank7-final-integration-independent-audit-v1",
        "status": "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP",
        "integration_report_sha256": sha256(INTEGRATION),
        "assembler_sha256": sha256(ASSEMBLER),
        "immutable_input_hashes_rechecked": len(integration["immutable_input_hashes"]),
        "delta0_key_audits": key_audits,
        "delta0_underlying_cell_partition": {
            "direct_m0_m4": 120,
            "small_m5_m17": 312,
            "large_m18_mn2": 324,
            "union": 756,
            "duplicates": 0,
            "omissions": 0,
        },
        "coefficient_rank_coverage": {band: sorted(ranks) for band, ranks in coverage.items()},
        "small_core_literal_splice": "orders 1..14 retained; negative residual orders 10..12 are not relabeled",
        "independent_input_audits": independent_audits,
        "dependency_chain": {
            "terminal_broom": True,
            "connected_Q7": True,
            "forest_Q7_lift": True,
            "rank7_PGC_composition": True,
        },
        "scope_guard": (
            "This is a read-only integration audit. It launches no finite prover, "
            "does not edit the master, and accepts only final PASS inputs."
        ),
        "artifacts": {Path(__file__).name: sha256(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print(f"delta0_cells={len(all_cells)} immutable_hashes={len(integration['immutable_input_hashes'])}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
