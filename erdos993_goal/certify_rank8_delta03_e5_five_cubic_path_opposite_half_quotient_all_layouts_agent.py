#!/usr/bin/env python3
"""Exact all-layout domain certificate for opposite-half message reuse.

This certificate pins the canonical quotient, its independent literal audit,
the four production row adapters/formulas, and the CUDA raw-order fingerprint
probe.  It proves that the designated opposite half enters each residual only
through one ``far_parts`` message pair, while all selected-side coordinates
remain in the grouping key unchanged.

The certificate is for computational acceleration only.  Original exhaustive
domain counts remain the proof scope; no root orbits are identified and no
residual sign is credited here.
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path

import numpy as np

import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_"
    "exact_agent_20260825.json"
)
EXPECTED = {
    "certify_rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_agent.py":
        "F72BF76B0C2A32BFFE15FDCF13E9F0CDD1AE61A541519A90FCF3E3DA6876695D",
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_exact_agent_20260825.json":
        "E0E9C25CA2725C9C4A7B2FEBFAC7BB4D35BCB36FD12DBEF118430834CFB8FDAB",
    "audit_rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_literal_agent.py":
        "8F5EDA6BFD274085F11A0B6DAC1E2484AD3644AFE0CECFAC57A2D765A2DD1088",
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_literal_audit_agent_20260825.json":
        "DC7F2800B649AF48BC27C7EE63CCF858A61E8E5C06B5A8B973730FD8298F05B9",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "probe_rank8_delta03_e5_five_cubic_path_opposite_half_quotient_cuda_fingerprint_agent.py":
        "EE4A93FAD1D7EDF3C9A1AACC33FE4CAD4B7E433A6D7ACCA5B837108AE1269FB1",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_cuda_fingerprint_probe_agent_20260825.json":
        "742272EDD19F2EA8EB0B34C7AC9FB43063B19D641213B41368DCE8F60F6EE2AA",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py":
        "AD84186A273F8D8B2DCF6ED4CC90F1D5AAED5BA9B501D333BB397178E0771E7F",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "scan_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_rays_agent.py":
        "D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE",
    "scan_rank8_delta03_e5_five_cubic_path_inner_spine_internal_cuda_rays_agent.py":
        "4D38D7CC637066E36DF6289498D8925AA146B3DED7C8599404B46A65B987E16E",
    "scan_rank8_delta03_e5_five_cubic_path_outer_spine_internal_cuda_rays_agent.py":
        "D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD",
    "scan_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_cuda_rays_agent.py":
        "9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37",
    "rank8_delta03_e5_five_cubic_path_inner_spine_internal_newton_reduction_exact_agent_20260825.json":
        "1F1466B78B327DC06255B21E09765DCBA7B8AF226342FDE2EC1EC3D69861810E",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260825.json":
        "0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_index(node: ast.AST) -> int | None:
    if not isinstance(node, ast.Subscript):
        return None
    if not isinstance(node.value, ast.Name) or node.value.id != "lengths":
        return None
    value = node.slice
    if isinstance(value, ast.Constant) and isinstance(value.value, int):
        return value.value
    return None


def formula_opposite_contract(path: Path, opposite_start: int) -> dict:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    root_function = next(
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "root_polynomials"
    )
    calls = [
        node
        for node in ast.walk(root_function)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "base"
        and node.func.attr == "far_parts"
    ]
    assert len(calls) == 1
    call = calls[0]
    expected_indices = list(range(opposite_start, opposite_start + 5))
    assert [literal_index(argument) for argument in call.args[:5]] == expected_indices

    parents: dict[ast.AST, ast.AST] = {}
    for parent in ast.walk(root_function):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent
    uses = []
    for node in ast.walk(root_function):
        index = literal_index(node)
        if index not in expected_indices:
            continue
        ancestor: ast.AST | None = node
        inside_far_parts = False
        while ancestor in parents:
            ancestor = parents[ancestor]
            if ancestor is call:
                inside_far_parts = True
                break
            if isinstance(ancestor, ast.Call):
                break
        assert inside_far_parts
        uses.append(index)
    assert sorted(uses) == expected_indices

    evaluate = next(
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "evaluate_kernel"
    )
    evaluate_text = ast.unparse(evaluate)
    assert "lengths[varying_rows[row]] += shift_rows[row] + point" in evaluate_text
    assert "root_polynomials(lengths, whole, deleted)" in evaluate_text
    return {
        "formula_source": path.name,
        "opposite_columns": expected_indices,
        "one_far_parts_call": True,
        "opposite_columns_used_nowhere_else_in_root_polynomials": True,
        "ray_offset_applied_before_root_polynomials": True,
    }


def adapter_contract(path: Path, expected_assignment: str) -> dict:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    normalized = ast.unparse(tree)
    assert expected_assignment in normalized
    return {
        "adapter_source": path.name,
        "normalized_opposite_half_assignment": expected_assignment,
    }


def reduction_counts(name: str) -> dict:
    path = ROOT / (
        f"rank8_delta03_e5_five_cubic_path_{name}_"
        "newton_reduction_exact_agent_20260825.json"
    )
    report = json.loads(path.read_text(encoding="utf-8"))
    counts = report["quotient_counts"]
    assert counts["total"] == counts["rays"] + counts["all_short"]
    assert counts["rays"] == counts["mixed"] + counts["all_long"]
    assert counts["all_long"] == 1
    return counts


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    probe = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_cuda_"
            "fingerprint_probe_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert probe["status"] == (
        "PASS_EXACT_LEGACY_RAW_ORDER_FINGERPRINT_PRESERVING_"
        "OPPOSITE_HALF_QUOTIENT_PROBE_NO_PROOF_CREDIT"
    )
    assert all(probe["checks"].values())

    tables = quotient.load_tables()
    static_classes = len(np.unique(tables.static_representatives))
    long_indices = np.flatnonzero(tables.first_long >= 0)
    short_indices = np.flatnonzero(tables.first_long < 0)
    dynamic_classes = len(np.unique(tables.dynamic_representatives[long_indices]))
    all_short_static_classes = len(
        np.unique(tables.static_representatives[short_indices])
    )
    assert (
        len(tables.halves),
        len(long_indices),
        len(short_indices),
        static_classes,
        dynamic_classes,
        all_short_static_classes,
    ) == (12_544, 6_370, 6_174, 9_091, 4_075, 5_283)

    formula_contracts = {
        "inner_pendant_internal": formula_opposite_contract(
            ROOT / "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py",
            5,
        ),
        "inner_spine_internal": formula_opposite_contract(
            ROOT / "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py",
            7,
        ),
        "outer_spine_internal": formula_opposite_contract(
            ROOT / "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py",
            7,
        ),
        "outer_pendant_internal": formula_opposite_contract(
            ROOT / "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py",
            5,
        ),
    }
    adapter_contracts = {
        "inner_pendant_internal": adapter_contract(
            ROOT / "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py",
            "rows[:, 5:10] = halves[selected_right]",
        ),
        "inner_spine_internal": adapter_contract(
            ROOT / "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py",
            "rows[:, 7:12] = halves[right[selector]]",
        ),
        "outer_spine_internal": {
            **adapter_contract(
                ROOT / "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py",
                "rows[:, 7:12] = halves[right[selector]]",
            ),
            "delegating_adapter_source": (
                "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py"
            ),
        },
        "outer_pendant_internal": adapter_contract(
            ROOT / "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py",
            "rows[:, 5:10] = halves[opposite[selector]]",
        ),
    }

    counts = {
        name: reduction_counts(name)
        for name in (
            "inner_pendant_internal",
            "inner_spine_internal",
            "outer_spine_internal",
            "outer_pendant_internal",
        )
    }
    # Exact product decompositions of the original raw domains.
    assert counts["inner_pendant_internal"]["total"] == 12_544 * 12_544 * 56
    assert counts["inner_spine_internal"]["total"] == 10_976 * 12_544 * 64
    assert counts["outer_spine_internal"]["total"] == 10_976 * 12_544 * 64
    assert counts["outer_pendant_internal"]["total"] == 21_952 * 12_544 * 56

    # Per selected context, the opposite half is the only quotient factor.
    # Pendant layouts have 42 later-all-short and 14 later-long split states.
    inner_raw_rays = (
        6_370 * 56 * 12_544
        + 6_174 * (42 * 6_370 + 14 * 12_544)
    )
    inner_groups = (
        6_370 * 56 * 9_091
        + 6_174 * (42 * 4_075 + 14 * (4_075 + 5_283))
    )
    outer_raw_rays = (
        11_368 * 56 * 12_544
        + 10_584 * (42 * 6_370 + 14 * 12_544)
    )
    outer_groups = (
        11_368 * 56 * 9_091
        + 10_584 * (42 * 4_075 + 14 * (4_075 + 5_283))
    )
    # Spine selected context includes both gap coordinates.  There are no
    # coordinates after its opposite half.
    spine_selected_short = 5_292 * 7 * 7
    spine_selected_total = 10_976 * 8 * 8
    spine_selected_long = spine_selected_total - spine_selected_short
    spine_raw_rays = (
        spine_selected_long * 12_544 + spine_selected_short * 6_370
    )
    spine_groups = (
        spine_selected_long * 9_091 + spine_selected_short * 4_075
    )
    assert inner_raw_rays == counts["inner_pendant_internal"]["rays"]
    assert outer_raw_rays == counts["outer_pendant_internal"]["rays"]
    assert spine_raw_rays == counts["inner_spine_internal"]["rays"]
    assert spine_raw_rays == counts["outer_spine_internal"]["rays"]

    grouped_domains = {
        "inner_pendant_internal": {
            "raw_formula_rows": inner_raw_rays,
            "global_context_local_quotient_rows": inner_groups,
        },
        "inner_spine_internal": {
            "raw_formula_rows": spine_raw_rays,
            "global_context_local_quotient_rows": spine_groups,
        },
        "outer_spine_internal": {
            "raw_formula_rows": spine_raw_rays,
            "global_context_local_quotient_rows": spine_groups,
        },
        "outer_pendant_internal": {
            "raw_formula_rows": outer_raw_rays,
            "global_context_local_quotient_rows": outer_groups,
        },
    }
    for values in grouped_domains.values():
        values["formula_rows_saved"] = (
            values["raw_formula_rows"]
            - values["global_context_local_quotient_rows"]
        )
        values["quotient_fraction"] = (
            values["global_context_local_quotient_rows"]
            / values["raw_formula_rows"]
        )
        values["batch_boundary_guard"] = (
            "Production groups only within each original 750,000-pattern "
            "batch; the displayed global count is an acceleration ceiling, "
            "not a replacement domain count."
        )

    for layout, batches in probe["production_batch_mapping_replays"].items():
        assert len(batches) == 2
        for batch in batches:
            assert batch["multiplicity_sum"] == batch["raw_rays"]
            assert batch["raw_rays"] >= batch["quotient_groups"]
            assert len(batch["raw_to_group_mapping_sha256"]) == 64
        cuda_check = probe["cuda_equivalence_checks"][layout]
        assert cuda_check[
            "legacy_newton_residues_equal_expanded_group_residues"
        ]
        assert cuda_check[
            "legacy_classifier_codes_equal_expanded_group_codes"
        ]
        assert cuda_check["legacy_per_raw_row_seeded_fingerprint_equal"]
        assert cuda_check["multiplicity_sum"] == cuda_check["raw_rows"]

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-opposite-half-quotient-"
            "all-layouts-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PINNED_ALL_LAYOUT_OPPOSITE_HALF_COMPUTATIONAL_"
            "QUOTIENT_NO_ORBIT_SIGN_CREDIT"
        ),
        "canonical_quotient": {
            "raw_half_states": len(tables.halves),
            "long_half_states": len(long_indices),
            "all_short_half_states": len(short_indices),
            "static_classes": static_classes,
            "dynamic_offset_curve_classes": dynamic_classes,
            "all_short_static_classes": all_short_static_classes,
            "mapping_arrays_sha256": tables.mapping_arrays_sha256,
        },
        "formula_opposite_half_contracts": formula_contracts,
        "adapter_orientation_contracts": adapter_contracts,
        "original_exhaustive_domain_counts": counts,
        "grouped_formula_evaluation_domains": grouped_domains,
        "fingerprint_evidence": {
            "probe_report_sha256": actual[
                "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_cuda_fingerprint_probe_agent_20260825.json"
            ],
            "production_batch_mapping_replays": (
                probe["production_batch_mapping_replays"]
            ),
            "raw_order_residue_classifier_fingerprint_equivalence": True,
        },
        "coverage_guards": {
            "selected_side_orientation_and_coordinates_preserved": True,
            "every_original_raw_pattern_retains_its_original_domain_index": True,
            "every_raw_ray_has_one_explicit_batch_local_group_index": True,
            "group_multiplicities_recover_every_original_raw_ray": True,
            "orders_and_newton_shifts_preserved_by_equal_half_sums": True,
            "all_short_finite_and_order27_counts_not_quotiented": True,
            "legacy_batch_fingerprint_runs_only_after_raw_order_expansion": True,
            "original_exhaustive_counts_remain_downstream_proof_counts": True,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Pinned computational acceleration only. The quotient is local "
            "to an unselected opposite message factor; it proves neither an "
            "orbit symmetry nor a residual sign. Original raw counts and "
            "batch boundaries remain independently replayable."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("RAW_RAYS", sum(v["raw_formula_rows"] for v in grouped_domains.values()))
    print(
        "GLOBAL_QUOTIENT_ROWS",
        sum(v["global_context_local_quotient_rows"] for v in grouped_domains.values()),
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
