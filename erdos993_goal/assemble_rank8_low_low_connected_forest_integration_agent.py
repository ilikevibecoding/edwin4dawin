#!/usr/bin/env python3
"""Read-only, fail-closed rank-eight low/low integration gate.

This checker never edits a sealed certificate.  It hash-pins the two completed
low/low endpoint packages and the current connected/forest dependency chain.
When the final a2/a3 redistribution theorem appears, it independently checks
its complete finite universe and promotes only the low/low-cone input.  It does
not promote connected Q8, forest Q8, rank-eight PGC, or Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_low_low_connected_forest_integration_agent_20260822.json"
BRIDGE = ROOT / "rank8_low_low_full_cone_a23_redistribution_theorem_agent_20260822.json"
INTERIOR = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_exact_20260822.json"

EXPECTED = {
    # Completed low/low endpoint at a2=b2=0 and its independent audit.
    "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json":
        "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
    "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json":
        "51EF34F786D4E472C2392766EDF5007EE5CCE5636C53EF81D2426B569D732A79",
    # Opposite a3=b3=0 endpoint and its independent audit.
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json":
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
    "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json":
        "784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE",
    # Bridge identity, independent replay, optimized-engine equivalence, and gate.
    "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json":
        "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
    "rank8_low_low_a23_probe_replay_agent_20260822.json":
        "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB",
    "rank8_low_low_a23_fast_equivalence_agent_20260822.json":
        "5B86012EB36F5C007715736921A0B204802340AD37F7484BFD068EBAAF6D1617",
    "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py":
        "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    "probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent.py":
        "9EF1B74971804AE64647D74F6F5C9FCC6F3082B3CC2A2780D7B6D761BDF6CD46",
    "verify_rank8_low_low_a23_redistribution_cells_fast_agent.py":
        "72B9AA226C20933E8737B1E88A749459ABE6FD265DBDEDFFCB4FA3493580A61D",
    "assemble_rank8_low_low_a23_redistribution_theorem_agent.py":
        "1144B7F9102A817D58AF49DB9C0951B0ECC151418C35968A4C18AE019D97DBD8",
    # Current connected-Q8 chain.
    "rank8_connected_q8_integration_readonly_20260820.json":
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "rank8_connected_integration_bridge1_refresh_exact_20260821.json":
        "C70B0D45C5FAA46D1755A6ADA14B035CCE47DBE233EE5CA714CB4C8C29AC7316",
    "rank8_connected_integration_bridge1_refresh_independent_audit_exact_20260821.json":
        "3D8DC6FA6AEC1D616DA34886DE3B0890627EBEDD42BDC6405846094553EA993C",
    "rank7_final_integration_independent_audit_exact_20260820.json":
        "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    "rank8_delta5_delta4_full_branch_independent_audit_20260820.json":
        "55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D",
    # Other forest-lift inputs already discharged.
    "rank8_high_high_mlr_convolution_exact_20260820.json":
        "B3C617BB8B46E7C4C830882F12A1A6000388588F759B35FC53AD4FF300C9B6FF",
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json":
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
    "rank8_low_high_full_cone_direct_h_exact_20260821.json":
        "DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5",
    "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json":
        "EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5",
    "rank8_forest_lift_lane_independent_audit_exact_20260820.json":
        "6DC960E80727BF64941C9F0C02AC37E459F5444DB986DD780B8A22829F371FA0",
    "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json":
        "591A2793682BF79D0E1241258DB1F0F385B94219577FDFC00C3705DA3FA6E2EF",
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json":
        "7CF5B21D18CD0D9B208F1D36ABC2E8FEF4947F942CBC291872705B99AB1E5768",
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json":
        "9B9CA836AB13AE52D969F681C6DFF8E0CD9FB01B74E85E32E7165076E80F2E0E",
    # Downstream rank-eight PGC inputs already discharged.
    "rank8_v8_alpha14_finite_reduction_exact_20260816.json":
        "6E7706445F2AB7161880489E8EDA56AE5F6395620545B813DE0D6E83D6133BF3",
    "rank8_pgc_matching_quotient_boundary_exact_20260817.json":
        "E61C51E0D37569C617DBE23AC3E88BA1A89DD188B3FC629264303714D1679A85",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_statistics(statistics: dict) -> None:
    require(statistics["negative"] == 0, "negative bridge coefficient")
    require(statistics["first_negative"] is None, "bridge first_negative populated")
    if statistics["terms"]:
        require(statistics["minimum"] > 0, "bridge nonempty row is not positive")
        require(statistics["maximum"] >= statistics["minimum"], "bridge min/max")
    else:
        require(statistics["minimum"] is None, "empty bridge row minimum")
        require(statistics["maximum"] is None, "empty bridge row maximum")


FULL_INTERIOR_POSITIONS = (
    (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1),
)
LABELS = {
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
}


def required_positions(p_exponent: int, q_exponent: int):
    if p_exponent and q_exponent:
        return FULL_INTERIOR_POSITIONS
    if p_exponent:
        return ((1, 0),)
    if q_exponent:
        return ((0, 1),)
    return ()


def validate_fixed_chain(actual: dict[str, str]) -> dict:
    gap0 = load("rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json")
    gap0_audit = load("rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json")
    early = load("rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json")
    early_audit = load("rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json")
    identity = load("rank8_low_low_a23_redistribution_identity_support_agent_20260822.json")
    replay = load("rank8_low_low_a23_probe_replay_agent_20260822.json")
    equivalence = load("rank8_low_low_a23_fast_equivalence_agent_20260822.json")

    require(gap0["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE", "gap0 endpoint")
    require(gap0["inherited_suffix_cells"] == 90, "gap0 inherited cells")
    require(gap0["computed_positive_early_support_cells"] == 558, "gap0 computed cells")
    require(gap0["total_disjoint_outer_cells"] == 648, "gap0 universe")
    require(gap0_audit["status"] == "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT", "gap0 audit")
    require(gap0_audit["complete_target_universe"] == 558, "gap0 audit universe")
    require(gap0_audit["total_disjoint_outer_cells"] == 648, "gap0 audit total")
    require(gap0_audit["recomputed_total_exact_coefficients"] == gap0["total_exact_coefficients"], "gap0 coefficient total")
    require(early["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID", "early endpoint")
    require("a3=b3=0" in early["theorem"], "early endpoint scope")
    require(early["outer_cells"] == 182, "early endpoint universe")
    require(early_audit["status"] == "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT", "early audit")
    require(early_audit["negative_coefficients"] == 0, "early negatives")
    require(identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT", "bridge identity")
    require(identity["raw_auxiliary_redistribution_degree"] == [2, 2], "bridge degree")
    require(identity["support"]["P_exponents"] == [0, 9], "bridge P support")
    require(identity["support"]["Q_exponents"] == [0, 8], "bridge Q support")
    require(replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY", "bridge replay")
    require(replay["row_builder_replay"]["exact_equalities"] == 126, "bridge row replay")
    require(replay["bernstein_conversion_replay"]["exact_position_equalities"] == 18, "bridge Bernstein replay")
    require(equivalence["status"] == "PASS_EXACT_A23_FAST_PROBE_EQUIVALENCE_AUDIT", "fast bridge equivalence")
    require(all(row["exact_parsed_output_match"] for row in equivalence["sealed_output_replays"]), "fast replay mismatch")

    connected = load("rank8_connected_q8_integration_readonly_20260820.json")
    connected_refresh = load("rank8_connected_integration_bridge1_refresh_exact_20260821.json")
    connected_refresh_audit = load("rank8_connected_integration_bridge1_refresh_independent_audit_exact_20260821.json")
    rank7 = load("rank7_final_integration_independent_audit_exact_20260820.json")
    delta45 = load("rank8_delta5_delta4_full_branch_independent_audit_20260820.json")
    require(connected["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS", "connected integration status")
    require(connected["connected_Q8_complete"] is False, "connected Q8 incorrectly complete")
    require(connected["all_order_residual_coefficients"]["closed_ranks"] == list(range(4, 16)), "closed residual ranks")
    require(connected["all_order_residual_coefficients"]["missing_ranks"] == [0, 1, 2, 3], "missing residual ranks")
    require(connected["exact_connected_Q8_gap"]["coefficient_ranks"] == [0, 1, 2, 3], "connected gap ranks")
    require(connected_refresh["status"] == "PASS_REFRESHED_RANK8_CONNECTED_INTEGRATION_BRIDGE1_DELTA2", "connected refresh")
    require(connected_refresh["base_integration_sha256"] == actual["rank8_connected_q8_integration_readonly_20260820.json"], "connected refresh base")
    require(connected_refresh["connected_Q8_complete"] is False, "refresh incorrectly completes Q8")
    require(connected_refresh_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_CONNECTED_INTEGRATION_BRIDGE1_REFRESH", "connected refresh audit")
    require(connected_refresh_audit["connected_Q8_complete"] is False, "refresh audit incorrectly completes Q8")
    require(rank7["status"] == "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP", "rank7 dependency")
    require(all(rank7["dependency_chain"].values()), "rank7 dependency chain")
    require(delta45["status"] == "PASS_INDEPENDENT_SCOPE_AND_INTEGRITY_AUDIT", "Delta4/5 audit")
    require(delta45["delta4"]["remaining_boxes"] == [], "Delta4 boxes remain")
    require("unconditionally" in delta45["delta4"]["all_order_conclusion"], "Delta4 conditional")

    high_high = load("rank8_high_high_mlr_convolution_exact_20260820.json")
    high_high_audit = load("rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json")
    low_high = load("rank8_low_high_full_cone_direct_h_exact_20260821.json")
    low_high_audit = load("rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json")
    forest_reduction = load("rank8_forest_lift_lane_independent_audit_exact_20260820.json")
    fixed_full = load("rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json")
    first7 = load("rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json")
    first7_audit = load("rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json")
    v8 = load("rank8_v8_alpha14_finite_reduction_exact_20260816.json")
    boundary = load("rank8_pgc_matching_quotient_boundary_exact_20260817.json")
    require(high_high["status"] == "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE", "high/high cone")
    require(high_high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE", "high/high audit")
    require(low_high["status"] == "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE", "low/high cone")
    require(low_high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE", "low/high audit")
    require(forest_reduction["status"] == "PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES", "forest reduction")
    require(forest_reduction["full_factor_cones"]["pair_cases"] == ["high/high", "low/high", "low/low"], "forest cone trichotomy")
    require(fixed_full["status"] == "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_COMPLETE", "fixed/full integration")
    require(fixed_full["fixed_full_obligation"]["status"] == "COMPLETE", "fixed/full incomplete")
    require(fixed_full["fixed_full_obligation"]["remaining_fixed_full_jets"] == 0, "fixed/full jets remain")
    require(first7["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_COMPLETE", "first crossing alpha7")
    require(first7["coverage"]["source_terminal_cells"] == 4900, "first crossing alpha7 cells")
    require(first7_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_ASSEMBLY_AUDIT", "first crossing audit")
    require(first7_audit["remaining_scope"]["exceptional_first_crossing_terminal_alpha"] == [8, 9], "first crossing remainder")
    require(v8["status"] == "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS", "forest V8")
    require(boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS", "rank8 boundary")

    return {
        "connected": connected,
        "connected_refresh": connected_refresh,
        "forest_reduction": forest_reduction,
    }


def validate_finished_bridge(actual: dict[str, str]) -> dict:
    require(INTERIOR.exists(), f"bridge exists without {INTERIOR.name}")
    interior = json.loads(INTERIOR.read_text(encoding="utf-8"))
    require(interior["status"] == "PASS_EXACT_A23_REDISTRIBUTION_NEW_BERNSTEIN_CELLS", "interior status")
    require(interior["source_sha256"] == actual["verify_rank8_low_low_a23_redistribution_cells_fast_agent.py"], "interior source")
    require(interior["expansion_units"] == 89, "interior expansion units")
    require(interior["new_Bernstein_position_cells"] == 521, "interior position cells")
    require(len(interior["rows"]) == 89, "interior row count")
    seen = set()
    position_count = 0
    for row in interior["rows"]:
        key = row["p_exponent"], row["q_exponent"]
        require(key not in seen and key != (0, 0), "duplicate/origin interior row")
        seen.add(key)
        expected_positions = required_positions(*key)
        positions = tuple(
            (item["left_bernstein_index"], item["right_bernstein_index"])
            for item in row["positions"]
        )
        require(positions == expected_positions, f"interior positions {key}")
        require(row["pass"] is True, f"interior row failure {key}")
        position_count += len(positions)
        for position in row["positions"]:
            require(position["pass"] is True, f"interior position failure {key}")
            require(set(position["rows"]) == LABELS, f"interior labels {key}")
            for statistics in position["rows"].values():
                validate_statistics(statistics)
    require(seen == {(p, q) for p in range(10) for q in range(9) if p or q}, "interior universe")
    require(position_count == 521, "interior position total")
    for statistics in interior["global_aggregates"].values():
        require(statistics["negative"] == 0, "interior aggregate negative")
        if statistics["terms"]:
            require(statistics["minimum"] > 0, "interior aggregate minimum")

    bridge = json.loads(BRIDGE.read_text(encoding="utf-8"))
    require(bridge["schema"] == "rank8-low-low-full-cone-a23-redistribution-theorem-agent-v1", "bridge schema")
    require(bridge["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_CONE_A23_REDISTRIBUTION", "bridge status")
    require(bridge["source_sha256"] == actual["assemble_rank8_low_low_a23_redistribution_theorem_agent.py"], "bridge source")
    require(bridge["proof"]["degree"] == [2, 2], "bridge degree")
    require(bridge["proof"]["bernstein_scaling"] == 4, "bridge scaling")
    require(bridge["proof"]["new_positions"] == INTERIOR.name, "bridge interior name")
    require(bridge["proof"]["new_position_cells"] == 521, "bridge position count")
    require(bridge["proof"]["compressed_expansion_units"] == 89, "bridge expansion count")
    require(bridge["support"] == {"P": [0, 9], "Q": [0, 8]}, "bridge support")
    require(bridge["immutable_inputs"][INTERIOR.name] == sha256(INTERIOR), "bridge interior hash")
    fixed_bridge_inputs = {
        "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json",
        "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json",
        "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json",
        "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json",
        "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json",
        "rank8_low_low_a23_probe_replay_agent_20260822.json",
    }
    for name in fixed_bridge_inputs:
        require(bridge["immutable_inputs"][name] == actual[name], f"bridge input hash {name}")
    for statistics in bridge["interior_global_aggregates"].values():
        require(statistics["negative"] == 0, "bridge aggregate negative")
        if statistics["terms"]:
            require(statistics["minimum"] > 0, "bridge aggregate minimum")
    require(bridge["interior_total_exact_coefficients"] == interior["total_exact_coefficients"], "bridge coefficient total")
    return {
        "ready": True,
        "status": bridge["status"],
        "report": BRIDGE.name,
        "report_sha256": sha256(BRIDGE),
        "interior_report": INTERIOR.name,
        "interior_report_sha256": sha256(INTERIOR),
        "independent_universe_recheck": {
            "expansion_units": 89,
            "new_Bernstein_position_cells": 521,
            "negative_coefficients": 0,
        },
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    require(actual == EXPECTED, "immutable input hash mismatch")
    chain = validate_fixed_chain(actual)

    if BRIDGE.exists():
        bridge_state = validate_finished_bridge(actual)
        status = "PASS_EXACT_LOW_LOW_INPUT_INTEGRATED_PENDING_CONNECTED_AND_FIRST_CROSSING"
        low_low_closed = True
    else:
        require(not INTERIOR.exists(), "complete interior exists but bridge theorem was not assembled")
        bridge_state = {
            "ready": False,
            "status": "WAITING_FOR_EXACT_A23_BRIDGE_THEOREM",
            "expected_report": BRIDGE.name,
            "expected_status": "PASS_EXACT_RANK8_LOW_LOW_FULL_CONE_A23_REDISTRIBUTION",
            "expected_interior_report": INTERIOR.name,
            "acceptance_contract": {
                "redistribution": "P=a2+a3 and Q=b2+b3",
                "tensor_degree": [2, 2],
                "support": {"P": [0, 9], "Q": [0, 8]},
                "compressed_expansion_units": 89,
                "new_Bernstein_position_cells": 521,
                "negative_coefficients": 0,
                "endpoint_a3_b3_zero_sha256": actual["rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"],
                "endpoint_a2_b2_zero_sha256": actual["rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"],
            },
        }
        status = "WAITING_FOR_EXACT_LOW_LOW_A23_BRIDGE"
        low_low_closed = False

    connected = chain["connected"]
    payload = {
        "schema": "rank8-low-low-connected-forest-integration-agent-v1",
        "status": status,
        "low_low_insertion_point": {
            "conditional_forest_lift_input": "the low/low member of the exhaustive high/high, low/high, low/low full/full cone trichotomy",
            "already_closed_sibling_cones": ["high/high", "low/high"],
            "completed_endpoint_faces": [
                {
                    "scope": "a3=b3=0 full-early suffix-4/5 endpoint",
                    "report": "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json",
                    "sha256": actual["rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"],
                },
                {
                    "scope": "a2=b2=0 suffix-3/gap-zero endpoint",
                    "report": "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json",
                    "sha256": actual["rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"],
                },
            ],
            "bridge": bridge_state,
            "full_low_low_cone_closed": low_low_closed,
        },
        "proven_closures": {
            "rank7_dependency": "final all-order rank-seven terminal/connected/forest/PGC chain is complete",
            "connected_terminal_upper_block": "Delta4 through Delta15 are nonnegative for every rooted tree core, all orders",
            "connected_finite_splice": "literal small/exceptional families and every rooted core through order 26 are exact no-gap theorems",
            "connected_structural_subfamilies": [
                "paths (degree surplus e=0) for Delta0..3, all orders in the analytic range",
                "subdivided claws (e=1) for Delta0..3, all orders in the analytic range",
                "all e=2 double claws through order 30, plus the hash-pinned all-order e=2 subfamilies in the connected integration",
            ],
            "forest_lower_gaps": "supplied by the completed rank-seven all-forest theorem chain",
            "forest_full_full_cones": {
                "high/high": True,
                "low/high": True,
                "low/low": low_low_closed,
            },
            "forest_fixed_exceptional_full": "complete for all 1,215 classified exceptional jets and both full cones",
            "forest_exceptional_first_crossing": "exactly complete through terminal alpha seven",
            "rank8_V8": "Q-independent residual V8 is proved for every forest with alpha at least 14",
            "rank8_PGC_boundary": "the coupled alpha(G)=13,14 all-forest boundary is proved",
        },
        "exact_remaining_after_low_low_closes": {
            "connected_Q8": {
                "target": "Delta^j R_1>=0 for j=0,1,2,3 on every rooted tree core of order n>=27",
                "why_sufficient": "orders through 26 and Delta4..15 are already exact; Newton reconstruction then yields the connected Q8 input for alpha at least 14",
                "current_structural_remainder": connected["exact_connected_Q8_gap"]["remaining_structural_layer_after_exact_faces"],
                "bridge1_Delta2_refinement": chain["connected_refresh"]["updated_Delta2_pendant_remainder"],
                "complete": False,
            },
            "forest_Q8": {
                "connected_input": "connected Q8 for every tree with alpha at least 14",
                "exceptional_first_crossing": {
                    "remaining_cells": 2159,
                    "terminal_alpha_8": {
                        "cells": 2024,
                        "source_alpha": [6, 13],
                        "terminal_type_indices": [948, 1200],
                    },
                    "terminal_alpha_9": {
                        "cells": 135,
                        "source_alpha": [5, 13],
                        "terminal_type_indices": [1201, 1215],
                    },
                    "total_alpha_range": [14, 22],
                },
                "conditional_assembly": "once connected Q8 and these first crossings are proved, the already completed lower gaps, three full/full cones, and fixed/full theorem imply Q8(F)>=0 for every forest with alpha(F)>=14",
                "complete": False,
            },
            "rank8_PGC_downstream": "after forest Q8 closes, the separated pendant identity plus the proved all-forest V8 theorem closes alpha(G)>=15; alpha(G)=13,14 is already closed by the coupled boundary theorem",
        },
        "finite_evidence_not_promoted": [
            "the forest Q8 census through order 20 (413,145 alpha>=14 rows, no failure) is finite evidence, not an all-order forest theorem",
            "bounded literal tree scans outside the sealed no-gap order/family theorems do not close Delta0..3",
            "negative relaxed/enclosure points in the Delta0..3 reductions are proof-route obstructions, not tree counterexamples",
            "a partial a2/a3 bridge checkpoint, if present, is not a low/low theorem until all 89 expansion units and 521 new Bernstein positions pass",
        ],
        "strongest_current_claim": (
            "The two complementary exact low/low endpoint faces and every fixed prerequisite in the rank-eight "
            "integration chain are hash-pinned; the integration gate is waiting for the complete a2/a3 bridge."
            if not low_low_closed else
            "The full rank-eight low/low convolution cone is an accepted exact input. The remaining rank-eight "
            "obligations are general connected Delta0..3 and the exceptional-only terminal-alpha-8/9 first crossings."
        ),
        "connected_Q8_complete": False,
        "forest_Q8_complete": False,
        "rank8_PGC_complete": False,
        "problem_993_solved": False,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This integration report does not claim connected Q8, forest Q8, rank-eight PGC, or Erdos Problem 993.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
