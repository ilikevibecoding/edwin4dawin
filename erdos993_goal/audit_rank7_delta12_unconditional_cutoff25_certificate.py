#!/usr/bin/env python3
"""Independent low-memory audit of the unconditional Delta1/Delta2 package.

No Bernstein tensor is rebuilt.  The audit regenerates the residual coverage
cut, the 98-row capacity partition, and the 472 fixed ordered keys; validates
every stored cell structurally; and checks the full hash join, including the
prior lower-d cutoff logs which the original assembler did not enumerate.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from fractions import Fraction as F
from math import comb, prod
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank7_delta12_unconditional_cutoff25_independent_audit_exact_20260820.json"

FILES = {
    "theorem_report": "rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json",
    "theorem_assembler": "verify_rank7_terminal_broom_delta12_unconditional_cutoff25.py",
    "theorem_note": "RANK7_TERMINAL_BROOM_DELTA12_UNCONDITIONAL_CUTOFF25_THEOREM_2026-08-20.md",
    "fixed_report": "rank7_delta12_complementary_capacity_fixed_exact_20260820.json",
    "fixed_prover": "prove_rank7_delta12_complementary_capacity_fixed.py",
    "fixed_runner": "run_rank7_delta12_complementary_capacity_fixed_batch.py",
    "structure_report": "rank7_delta12_complementary_capacity_structure_exact_20260820.json",
    "structure_verifier": "verify_rank7_delta12_complementary_capacity_structure.py",
    "residual_report": "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json",
    "residual_generator": "prove_rank7_rooted_cross_residual_after_b2_4.py",
    "inventory": "rank7_delta012_cutoff25_inventory_20260820.json",
    "cutoff_source": "prove_rank7_terminal_broom_delta0_large.py",
    "cutoff_probe": "probe_rank7_terminal_broom_delta012_cutoff.py",
    "concavity_log": "rank7_root_z_concavity_cutoff25_exact_20260820.log",
    "concavity_probe": "probe_rank7_terminal_broom_root_z_concavity_cutoff.py",
    "large_c7_report": "rank7_rooted_cross_large_order_exact_20260816.json",
    "large_c7_prover": "prove_rank7_rooted_cross_large_order.py",
}

EXPECTED_SHA256 = {
    "theorem_report": "81B99AC71502FBC48077D3600855C6AA22B61BE49129755C38FD1EFEA56BE0C9",
    "theorem_assembler": "230A7132A0491DE26BA423168D04DB189F2CFBB733086E9E82B4E16F27C462E8",
    "theorem_note": "2E5E395067083B42B92B68756F17FC091BEDCF6EF305DCAEBC4AEB956268A7BC",
    "fixed_report": "3851B082A8AD23194DD36E4866F3556BE2F43F972BCE951658E8C76FAB49473F",
    "fixed_prover": "E40E3AA63FB6D357ABF258E09F4F4A6BD115FB50D745E37545CD74172FF9E5B8",
    "fixed_runner": "9FFB30B735D7446B00FEAAA46902DECC012AADBED9BFF9ACF7D09EE070C907C4",
    "structure_report": "FB06CE7BAEC5D9A40EF1988252EA2072FD5A2CEE46CE7C6B05FB11DC3D524AB9",
    "structure_verifier": "429DF51A9A6E786F3F2DACE33E517D93A062F0B6D56D2CDB674B7E779AB6BF0E",
    "residual_report": "EBF9369561D528A94FA08846E6BF465DB7485D3DF271E462C63DF48E5473587D",
    "residual_generator": "AE419372C407D451EB47F45F6981416C423A9D3CD2DCDC006D27F4DF2CA914C7",
    "inventory": "6FB609317E30E2802F95B38F3EDB8939524628545B65702FC4DB8C11D6F188D3",
    "cutoff_source": "8A0DCAD0CD8BAE64337A7D2E2D663499842069532D873A3C2CC271CED9163C20",
    "cutoff_probe": "795709FD4514581CD0B5329DD1870922C8498F995D648CBDC81A0D3A90614795",
    "concavity_log": "94B480ED5777982C95D74A0A1CD2759A67FD3DFA0FBD5887445EF0A17FF4EE0F",
    "concavity_probe": "4F038788E9DB18D37396EF5DE2F7257D221EADFAF6AF81447E7D2467181CB2D0",
    "large_c7_report": "094FDAAA63B21F845B7265377246C2F3FB56998F1F61012851065EA30A05AADA",
    "large_c7_prover": "52427CE277941FE7D2891584E5AD939694E5A82BB3647DD2A7AA98F782971930",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def transfer(mu4: F) -> F:
    integer = mu4.numerator // mu4.denominator
    assert integer >= 3
    phi = F((integer - 1) * (integer - 2), 2) + (mu4 - integer) * (integer - 1)
    sharp = 2 * phi / mu4
    smooth = mu4 - 3 + F(2, 1) / mu4
    assert sharp >= smooth
    return sharp


def i4_ceiling(order: int, b2: int) -> int:
    edge_incidence = comb(order - 1, 4)
    inclusion_exclusion = (
        comb(order, 4)
        - (order - 1) * comb(order - 2, 2)
        + comb(order - 1, 2)
        + (order - 4) * (b2 + order - 2)
        - (order - 3 + b2)
    )
    result = min(edge_incidence, inclusion_exclusion)
    assert result > 0
    return result


def scalar(order: int, root_degree: int, b2: int) -> F:
    path_endpoint = F((order - 7) * (order - 8), order - 3)
    curvature_coefficient = F(order**3 - 8 * order**2 - 19 * order + 302, 6)
    mu4 = path_endpoint + curvature_coefficient * b2 / (
        (order - 3) * i4_ceiling(order, b2)
    )
    x = transfer(mu4) / 6
    extension_ceiling = F(order - root_degree - 5, 5)
    return 1 + 2 * x - 28 * (extension_ceiling - x) / (1 + extension_ceiling)


def b2_bounds(order: int, root_degree: int) -> tuple[int, int]:
    root_excess = root_degree - 1
    remaining_excess = order - root_degree - 1
    return (
        comb(root_excess, 2),
        comb(root_excess, 2) + comb(remaining_excess, 2),
    )


def audit_residual_cut(report: dict) -> dict:
    assert report["status"] == "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4"
    regenerated_cells = []
    regenerated_curvature = []
    for order in range(23, 39):
        order_row = {"order": order, "root_degrees": []}
        for root_degree in range(1, 10):
            lower, upper = b2_bounds(order, root_degree)
            threshold = next(
                (
                    value
                    for value in range(lower, upper + 1)
                    if scalar(order, root_degree, value) > 0
                ),
                None,
            )
            if threshold is not None:
                assert all(
                    scalar(order, root_degree, value) > 0
                    for value in range(threshold, upper + 1)
                )
            order_row["root_degrees"].append(
                {
                    "root_degree": root_degree,
                    "structural_B2_min": lower,
                    "structural_B2_max": upper,
                    "curvature_closes_from_B2": threshold,
                }
            )
            uncovered_lower = max(5, lower)
            uncovered_upper = upper if threshold is None else min(upper, threshold - 1)
            if uncovered_lower <= uncovered_upper:
                regenerated_cells.append(
                    {
                        "order": order,
                        "root_degree": root_degree,
                        "B2_min": uncovered_lower,
                        "B2_max": uncovered_upper,
                        "integer_levels": uncovered_upper - uncovered_lower + 1,
                    }
                )
        regenerated_curvature.append(order_row)

    assert report["curvature_rows"] == regenerated_curvature
    assert report["residual"]["cells"] == regenerated_cells
    assert len(regenerated_cells) == 83
    assert sum(row["integer_levels"] for row in regenerated_cells) == 18_517
    by_order = []
    for order in range(23, 39):
        cells = [row for row in regenerated_cells if row["order"] == order]
        by_order.append(
            {
                "order": order,
                "residual_root_degree_cells": len(cells),
                "integer_levels": sum(row["integer_levels"] for row in cells),
            }
        )
    assert report["residual"]["by_order"] == by_order
    assert report["residual"]["cell_count"] == 83
    assert report["residual"]["integer_parameter_levels"] == 18_517

    prerequisite_hashes = {}
    for prerequisite in report["prerequisites"]:
        path = ROOT / prerequisite["file"]
        actual = sha(path)
        assert actual == prerequisite["sha256"].upper()
        source = load(prerequisite["file"])
        assert source["status"] == prerequisite["status"]
        prerequisite_hashes[prerequisite["file"]] = actual

    band = [row for row in regenerated_cells if 25 <= row["order"] <= 38]
    assert len(band) == 69
    assert len({(row["order"], row["root_degree"]) for row in band}) == 69
    assert all(1 <= row["root_degree"] <= 7 for row in band)
    assert sum(row["integer_levels"] for row in band) == 16_290
    return {
        "full_cut_cells_regenerated": 83,
        "full_cut_integer_levels": 18_517,
        "band25_38_pairs": 69,
        "band25_38_integer_levels": 16_290,
        "band25_38_pairs_r_le_4": sum(row["root_degree"] <= 4 for row in band),
        "band25_38_pairs_r_ge_5": sum(row["root_degree"] >= 5 for row in band),
        "all_band_root_degrees_at_most_7": True,
        "curvature_rows_exact_match": True,
        "residual_cells_exact_match": True,
        "prerequisite_hashes": prerequisite_hashes,
        "pairs": [(row["order"], row["root_degree"]) for row in band],
    }


def structure_row(n: int, root_degree: int) -> dict:
    t_n = F((n - 7) * (n - 8), n - 3)
    y_low = F(5, n - 4)
    y_high = F(5, 1) / t_n
    z_high = y_high / (1 - F(1, 6) - y_high / 2)
    m = n - root_degree - 1
    switch = F(m - 4, m + 1)
    y_switch = 1 - switch
    mass = 1 - F(comb(m, 4), comb(n - 4, 5))
    if root_degree <= 4:
        assert y_low >= y_switch
        branches = [
            {
                "name": "containment",
                "s_interval": ["1-y", str(switch)],
                "d_endpoint": "1-s*z",
            },
            {
                "name": "extension",
                "s_interval": [str(switch), "1"],
                "d_endpoint": "1-z*(m-4)*(1-s)/5",
            },
        ]
        reason = "a<=c4 gives s>=1-y; y>=5/(n-4)>=5/(m+1)"
    else:
        assert mass >= switch
        branches = [
            {
                "name": "extension_mass",
                "s_interval": [str(mass), "1"],
                "d_endpoint": "1-z*(m-4)*(1-s)/5",
            }
        ]
        reason = "a<=C(m,4), c5>=C(n-4,5) give s>=mass>=switch"
    margin = F(1, 2) - z_high * switch
    assert margin >= 0
    return {
        "n": n,
        "root_degree": root_degree,
        "m": m,
        "switch_s": str(switch),
        "switch_y": str(y_switch),
        "mass_s_floor": str(mass),
        "y_box": [str(y_low), str(y_high)],
        "z_box_upper": str(z_high),
        "half_retention_margin_at_switch": str(margin),
        "s_floor_reason": reason,
        "branches": branches,
    }


def audit_structure(report: dict) -> dict:
    assert report["schema"] == "rank7-delta12-complementary-capacity-structure-v1"
    assert report["status"] == "PASS_EXACT_COMPLEMENTARY_CAPACITY_AND_SWITCH_PARTITION"
    assert report["scope"] == "integer n=25..38 and root degree 1..7"
    assert report["source_sha256"] == EXPECTED_SHA256["structure_verifier"]
    expected = [structure_row(n, r) for n in range(25, 39) for r in range(1, 8)]
    assert report["rows"] == expected
    assert report["row_count"] == len(expected) == 98
    assert report["branch_intervals"] == sum(len(row["branches"]) for row in expected) == 154

    d_margins = [
        (F(row["half_retention_margin_at_switch"]), row["n"], row["root_degree"])
        for row in expected
    ]
    s_margins = []
    for row in expected:
        floor = (
            1 - F(row["y_box"][1])
            if row["root_degree"] <= 4
            else F(row["mass_s_floor"])
        )
        assert floor >= F(1, 2)
        s_margins.append((floor - F(1, 2), row["n"], row["root_degree"], floor))
    min_d = min(d_margins)
    min_s = min(s_margins)
    assert min_d == (F(31, 480), 25, 1)
    assert min_s == (F(43, 306), 25, 1, F(98, 153))

    # Solve s=(m-4)(1-s)/5 independently.  Below this point containment
    # is the smaller b ceiling; above it extension is the smaller ceiling.
    for m in range(17, 37):
        switch = F(m - 4, m + 1)
        assert switch == F(m - 4, 5) * (1 - switch)
        assert (switch - F(1, 10)) < F(m - 4, 5) * (1 - (switch - F(1, 10)))
        assert (switch + F(1, 10)) > F(m - 4, 5) * (1 - (switch + F(1, 10)))
    return {
        "rows_exactly_regenerated": 98,
        "branch_intervals_exactly_regenerated": 154,
        "switch_identity": "s0=(m-4)/(m+1)",
        "active_face_below_switch": "containment b<=h5",
        "active_face_above_switch": "extension 5b<=(m-4)a",
        "minimum_actual_d_minus_half": str(min_d[0]),
        "minimum_actual_d_margin_key": {"n": min_d[1], "root_degree": min_d[2]},
        "minimum_actual_s_minus_half": str(min_s[0]),
        "minimum_actual_s": str(min_s[3]),
        "minimum_actual_s_margin_key": {"n": min_s[1], "root_degree": min_s[2]},
        "half_retention_scope_note": (
            "The margins use the realizable universal y/z band.  The rank-2 "
            "Bernstein box is a larger positivity relaxation and need not "
            "itself preserve d>=1/2 at every nonrealizable corner."
        ),
    }


def audit_fixed_batch(batch: dict, pairs: list[tuple[int, int]]) -> dict:
    assert batch["schema"] == "rank7-delta12-complementary-capacity-fixed-v1"
    assert batch["status"] == "PASS"
    assert batch["scope"] == (
        "lower-d complementary-capacity faces in the exact residual "
        "root-degree cells, integer n=25..38"
    )
    assert batch["source_sha256"] == EXPECTED_SHA256["fixed_prover"]
    assert batch["runner_sha256"] == EXPECTED_SHA256["fixed_runner"]
    assert batch["residual_input_sha256"] == EXPECTED_SHA256["residual_report"]

    expected = []
    for rank in (1, 2):
        for n, root_degree in pairs:
            branches = (
                ("containment", "extension")
                if root_degree <= 4
                else ("extension_mass",)
            )
            for branch in branches:
                for q_endpoint in (0, 1):
                    expected.append((rank, n, root_degree, branch, q_endpoint))
    assert len(expected) == 472
    assert batch["expected_cells"] == 472
    assert batch["completed_cells"] == 472
    assert batch["passing_cells"] == 472
    assert len(batch["cells"]) == 472

    fieldset = {
        "branch", "denominator_coefficients", "denominator_degrees",
        "denominator_minimum", "denominator_minimum_index", "m", "n",
        "numerator_coefficients", "numerator_degrees", "numerator_minimum",
        "numerator_minimum_index", "numerator_terms", "q_endpoint", "rank",
        "root_degree", "status",
    }
    actual = []
    for row in batch["cells"]:
        assert set(row) == fieldset
        key = (row["rank"], row["n"], row["root_degree"], row["branch"], row["q_endpoint"])
        actual.append(key)
        assert row["m"] == row["n"] - row["root_degree"] - 1
        assert row["status"] == "PASS"
        assert F(row["numerator_minimum"]) > 0
        assert F(row["denominator_minimum"]) > 0
        for prefix in ("numerator", "denominator"):
            degrees = row[f"{prefix}_degrees"]
            index = row[f"{prefix}_minimum_index"]
            count = row[f"{prefix}_coefficients"]
            assert all(type(item) is int and item >= 0 for item in degrees)
            assert all(type(item) is int and item >= 0 for item in index)
            assert len(index) == len(degrees)
            assert all(item <= degree for item, degree in zip(index, degrees))
            assert count == prod(degree + 1 for degree in degrees)
        assert 1 <= row["numerator_terms"] <= row["numerator_coefficients"]
    assert actual == expected
    assert len(set(actual)) == 472
    counts_rank = Counter(row[0] for row in actual)
    counts_branch = Counter(row[3] for row in actual)
    counts_q = Counter(row[4] for row in actual)
    assert counts_rank == {1: 236, 2: 236}
    assert counts_branch == {"containment": 196, "extension": 196, "extension_mass": 80}
    assert counts_q == {0: 236, 1: 236}
    return {
        "expected_and_observed_ordered_keys": 472,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_cells": 0,
        "cells_by_rank": {str(k): v for k, v in sorted(counts_rank.items())},
        "cells_by_branch": dict(sorted(counts_branch.items())),
        "cells_by_q_endpoint": {str(k): v for k, v in sorted(counts_q.items())},
        "all_numerator_minima_strictly_positive": True,
        "all_denominator_minima_strictly_positive": True,
        "all_tensor_dimensions_and_minimum_indices_valid": True,
    }


def audit_cutoff_inventory(inventory: dict) -> dict:
    assert inventory["schema"] == "rank7-terminal-broom-delta012-cutoff-inventory-v1"
    assert inventory["cutoff"] == 25
    assert inventory["source_sha256"].upper() == EXPECTED_SHA256["cutoff_source"]
    assert inventory["probe_sha256"].upper() == EXPECTED_SHA256["cutoff_probe"]
    assert inventory["branch_count"] == len(inventory["branches"]) == 24
    rank12 = [row for row in inventory["branches"] if row["rank"] in (1, 2)]
    assert len(rank12) == 16
    expected = {
        (rank, case, q, d)
        for rank in (1, 2)
        for case in ("small", "large")
        for q in (0, 1)
        for d in (0, 1)
    }
    actual = {(row["rank"], row["case"], row["q_endpoint"], row["d_endpoint"]) for row in rank12}
    assert actual == expected
    assert len(actual) == len(rank12)
    hashes = {}
    for row in rank12:
        assert row["status"] == "PASS"
        assert row["returncode"] == 0
        path = ROOT / row["log"]
        actual_hash = sha(path)
        assert actual_hash == row["sha256"].upper()
        lines = path.read_text(encoding="utf-8").splitlines()
        assert lines[-len(row["final_lines"]):] == row["final_lines"]
        marker = (
            f"PASS_DELTA012_CUTOFF_PROBE 25 {row['rank']} {row['case']} "
            f"{row['q_endpoint']} {row['d_endpoint']}"
        )
        assert lines[-1] == marker
        hashes[row["log"]] = actual_hash
    upper = [row for row in rank12 if row["d_endpoint"] == 1]
    lower = [row for row in rank12 if row["d_endpoint"] == 0]
    assert len(upper) == len(lower) == 8
    return {
        "rank12_boxes_checked": 16,
        "rooted_c7_lower_d_boxes": 8,
        "unconditional_upper_d_boxes": 8,
        "exact_rank_case_q_d_product": True,
        "all_status_pass_and_returncode_zero": True,
        "all_log_tails_and_markers_exact": True,
        "log_sha256": hashes,
        "inventory_status_note": (
            "The global inventory is INCOMPLETE only because two rank-zero "
            "cells are inconclusive; its complete rank-one/rank-two subset "
            "used here has 16/16 PASS."
        ),
    }


def audit_concavity_log() -> dict:
    lines = (ROOT / FILES["concavity_log"]).read_text(encoding="utf-8").splitlines()
    pattern = re.compile(r"rank ([0-6]) (h5|h6|c7) terms ([1-9][0-9]*) negative 0")
    parsed = []
    for line in lines[:-1]:
        match = pattern.fullmatch(line)
        assert match is not None
        parsed.append((int(match.group(1)), match.group(2), int(match.group(3))))
    assert lines[-1] == "PASS_ROOT_Z_CONCAVITY_CUTOFF 25"
    assert len(parsed) == 21
    assert {(rank, coordinate) for rank, coordinate, _ in parsed} == {
        (rank, coordinate)
        for rank in range(7)
        for coordinate in ("h5", "h6", "c7")
    }
    return {
        "coordinate_checks": 21,
        "all_negative_coefficient_counts_zero": True,
        "exact_final_marker": lines[-1],
    }


def audit_theorem_report(report: dict, actual_hashes: dict[str, str]) -> dict:
    assert report["schema"] == "rank7-terminal-broom-delta12-unconditional-cutoff25-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA1_DELTA2_UNCONDITIONAL_N_AT_LEAST_25"
    assert report["complementary_capacity_cells"] == {
        "expected": 472,
        "orders": "25..38",
        "passing": 472,
        "q_endpoints_per_face": 2,
        "ranks": [1, 2],
    }
    assert report["prior_upper_d_boxes"] == 8
    expected_artifacts = {
        FILES["inventory"], FILES["residual_report"], FILES["structure_report"],
        FILES["structure_verifier"], FILES["fixed_report"], FILES["fixed_prover"],
        FILES["fixed_runner"], FILES["concavity_log"], FILES["concavity_probe"],
    }
    assert set(report["artifacts_sha256"]) == expected_artifacts
    for name, embedded in report["artifacts_sha256"].items():
        assert sha(ROOT / name) == embedded.upper()

    large_c7 = load(FILES["large_c7_report"])
    assert large_c7["status"] == "PASS_EXACT_RANK7_ROOTED_CROSS_FOR_ALL_TREES_N_AT_LEAST_39"
    assert large_c7["minimum_order"] == 39
    return {
        "embedded_artifacts_checked": len(expected_artifacts),
        "all_embedded_artifact_hashes_match": True,
        "theorem_report_hash": actual_hashes["theorem_report"],
        "theorem_assembler_hash": actual_hashes["theorem_assembler"],
        "large_order_rooted_c7_status_checked": True,
        "large_order_rooted_c7_minimum_order": 39,
    }


def main() -> int:
    actual_hashes = {key: sha(ROOT / name) for key, name in FILES.items()}
    assert actual_hashes == EXPECTED_SHA256

    theorem = load(FILES["theorem_report"])
    residual = load(FILES["residual_report"])
    structure = load(FILES["structure_report"])
    fixed = load(FILES["fixed_report"])
    inventory = load(FILES["inventory"])

    residual_audit = audit_residual_cut(residual)
    structure_audit = audit_structure(structure)
    fixed_audit = audit_fixed_batch(fixed, [tuple(pair) for pair in residual_audit["pairs"]])
    inventory_audit = audit_cutoff_inventory(inventory)
    concavity_audit = audit_concavity_log()
    theorem_audit = audit_theorem_report(theorem, actual_hashes)

    output = {
        "schema": "rank7-delta12-unconditional-cutoff25-independent-audit-v1",
        "status": "PASS_INDEPENDENT_CODE_REPORT_COVERAGE_AUDIT_NO_FULL_REPLAY_LOW_RAM",
        "fresh_bernstein_replay": {
            "performed": False,
            "reason": "Free RAM was below the parent-specified 5 GiB replay threshold.",
        },
        "hash_integrity": actual_hashes,
        "theorem_report_integrity": theorem_audit,
        "residual_coverage_cut_regeneration": residual_audit,
        "complementary_capacity_structure_regeneration": structure_audit,
        "fixed_472_cell_integrity": fixed_audit,
        "prior_cutoff_rank12_box_integrity": inventory_audit,
        "root_concavity_log_integrity": concavity_audit,
        "coverage_join": {
            "n_at_least_39": (
                "all roots have rooted C7 by the checked large-order report; "
                "the eight lower-d and eight upper-d cutoff boxes cover both "
                "d endpoints and both q endpoints for ranks 1 and 2"
            ),
            "n_25_through_38_rooted_c7_covered_complement": (
                "the exactly regenerated residual cut identifies the complement; "
                "there the same 16 prior rank1/rank2 cutoff boxes cover both d endpoints"
            ),
            "n_25_through_38_rooted_c7_residual": (
                "69 exact (n,r) pairs and their 16290 B2 levels are independent "
                "of the fixed prover's B2-free variables; 472 new lower-d face/q/rank "
                "cells plus eight unconditional upper-d boxes cover both d endpoints"
            ),
            "no_order_root_degree_b2_d_q_gap": True,
        },
        "scope_guard": (
            "This independently audits the Delta1/Delta2 terminal-broom residual "
            "theorem only; it does not certify Delta0, connected-tree Q7, or the "
            "full Erdos Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output["status"])
    print("fixed keys=472; residual pairs=69; residual B2 levels=16290")
    print("output", OUTPUT.name, sha(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
