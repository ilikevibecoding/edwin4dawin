#!/usr/bin/env python3
"""Exact feasible-envelope replay of the residual mask-3 small-m jet boxes."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_agent as floor
import prove_rank8_forest16_f5_f6_ratio_agent as forest
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json"
PRIOR = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_agent.py":
        "D5903605EAE82AA236DE0D44AF18FF9FA8433FB893173E9E9BDA9A61623C4711",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json":
        "EA987A9B46FE22872462F97E03B1850965E4FFA7EB8BBF3EB405557FC1366933",
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py":
        "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(
    left: dict[tuple[int, int], Fraction],
    right: dict[tuple[int, int], Fraction],
) -> dict[tuple[int, int], Fraction]:
    answer: dict[tuple[int, int], Fraction] = {}
    for (li, lj), left_value in left.items():
        for (ri, rj), right_value in right.items():
            key = (li + ri, lj + rj)
            answer[key] = answer.get(key, Fraction(0)) + left_value * right_value
    return {key: value for key, value in answer.items() if value}


def powers(linear: dict[tuple[int, int], Fraction], maximum: int):
    answer = [{(0, 0): Fraction(1)}]
    for _ in range(maximum):
        answer.append(multiply(answer[-1], linear))
    return answer


def gap_envelope_controls(
    base_terms,
    inverse_t: Fraction,
    x_lower: Fraction,
    x_upper: Fraction,
    y_lower: Fraction,
    gap_over_cap: Fraction,
):
    """Controls where y=y_lower+(x-gap/cap-y_lower)V."""
    assert x_lower <= x_upper
    assert x_lower - gap_over_cap >= y_lower
    slope = x_upper - x_lower
    x_linear = {(0, 0): x_lower, (1, 0): slope}
    y_bilinear = {
        (0, 0): y_lower,
        (0, 1): x_lower - gap_over_cap - y_lower,
        (1, 1): slope,
    }
    x_linear = {key: value for key, value in x_linear.items() if value}
    y_bilinear = {key: value for key, value in y_bilinear.items() if value}
    x_powers = powers(x_linear, 4)
    y_powers = powers(y_bilinear, 5)
    collapsed = floor.collapsed_coefficients(base_terms, inverse_t)
    power: dict[tuple[int, int], Fraction] = {}
    for (xp, yp), coefficient in collapsed.items():
        product = multiply(x_powers[xp], y_powers[yp])
        for index, value in product.items():
            power[index] = power.get(index, Fraction(0)) + coefficient * value

    controls = {}
    for target in itertools.product(range(9), range(6)):
        total = Fraction(0)
        for source, coefficient in power.items():
            if source[0] <= target[0] and source[1] <= target[1]:
                total += coefficient * Fraction(
                    math.comb(target[0], source[0]), math.comb(8, source[0])
                ) * Fraction(
                    math.comb(target[1], source[1]), math.comb(5, source[1])
                )
        controls[target] = total
    return controls


def region_result(name: str, controls, interval):
    minimum_index, minimum_value = min(controls.items(), key=lambda item: item[1])
    negatives = [list(index) for index, value in sorted(controls.items()) if value < 0]
    return {
        "region": name,
        "x_interval": [str(value) for value in interval],
        "bernstein_degrees": [
            max(index[0] for index in controls),
            max(index[1] for index in controls),
        ],
        "controls": len(controls),
        "negative_controls": len(negatives),
        "minimum_control": str(minimum_value),
        "minimum_index": list(minimum_index),
        "negative_indices": negatives,
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    assert prior["counts"]["open_joint_jet_boxes"] == 14_402
    assert prior["counts"]["sealed_logical_branches"] == 75
    base_terms = base_polynomial().terms()
    peak = forest.gate()
    rows = []
    residuals = []
    controls_checked = 0
    region_boxes = 0
    shared_boundary_splits = 0
    for old in prior["residual_joint_jet_boxes"]:
        N, m, r = old["N"], old["m"], old["r"]
        jet = tuple(old["jet_f0_to_f6"])
        components = old["components"]
        assert old["branch"] == "f6_positive" and jet[6] > 0 and jet[5] > 0
        selected = N * N - 15 * N + 10
        x0 = Fraction(6, N - 5)
        x1 = Fraction(6 * N, selected)
        cap = floor.choose(N - 1, 6) + floor.choose(r - 1, 5)
        root_floor = floor.choose(r, 6)
        gap = floor.component_gap(jet, components, r)
        assert gap == old["component_gap"]
        y0 = Fraction(jet[5], cap)
        yf = Fraction(jet[5], root_floor)
        gap_ratio = Fraction(gap, cap)
        forced_x0 = max(x0, y0 + gap_ratio)
        crossover = yf + gap_ratio
        assert forced_x0 <= x1 and y0 <= yf
        inverse_t = Fraction(jet[6], jet[5])
        regions = []

        gap_end = min(x1, crossover)
        if forced_x0 <= gap_end:
            controls = gap_envelope_controls(
                base_terms, inverse_t, forced_x0, gap_end, y0, gap_ratio
            )
            regions.append(region_result("GAP_ACTIVE", controls, (forced_x0, gap_end)))
            controls_checked += len(controls)
            region_boxes += 1

        floor_start = max(forced_x0, crossover)
        if floor_start <= x1:
            controls = floor.rectangle_controls(
                base_terms, inverse_t, floor_start, x1, y0, yf
            )
            regions.append(region_result("ROOT_FLOOR_ACTIVE", controls, (floor_start, x1)))
            controls_checked += len(controls)
            region_boxes += 1

        assert regions
        if len(regions) == 2:
            assert regions[0]["x_interval"][1] == regions[1]["x_interval"][0]
            shared_boundary_splits += 1
        negative_regions = sum(region["negative_controls"] > 0 for region in regions)
        row = {
            "N": N,
            "m": m,
            "r": r,
            "branch": old["branch"],
            "components": components,
            "jet_f0_to_f6": list(jet),
            "component_gap": gap,
            "f6_over_f5": str(inverse_t),
            "y_lower_f5_over_d6_cap": str(y0),
            "y_root_floor": str(yf),
            "forced_x_lower": str(forced_x0),
            "crossover": str(crossover),
            "status": "SEALED" if negative_regions == 0 else "OPEN_FEASIBLE_ENVELOPE_BERNSTEIN_METHOD",
            "regions": regions,
        }
        rows.append(row)
        if negative_regions:
            residuals.append(row)
        if len(rows) % 500 == 0:
            peak = max(peak, forest.gate())

    branch_keys = sorted({(row["N"], row["m"], row["r"], row["branch"]) for row in rows})
    branch_rows = []
    for N, m, r, branch in branch_keys:
        subset = [row for row in rows if (row["N"], row["m"], row["r"], row["branch"]) == (N, m, r, branch)]
        open_count = sum(row["status"] != "SEALED" for row in subset)
        branch_rows.append(
            {
                "N": N,
                "m": m,
                "r": r,
                "branch": branch,
                "input_residual_jets": len(subset),
                "open_envelope_jets": open_count,
                "status": "SEALED" if open_count == 0 else "OPEN_FEASIBLE_ENVELOPE_BERNSTEIN_METHOD",
            }
        )
    peak = max(peak, forest.gate())
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-joint-jet-envelope-v1",
        "status": (
            "PASS_EXACT_MASK3_SMALL_M_ALL_14402_RESIDUAL_JETS_ENVELOPE_CLOSURE"
            if not residuals
            else "PASS_EXACT_PARTIAL_MASK3_SMALL_M_FEASIBLE_ENVELOPE_WITH_OPEN"
        ),
        "scope": (
            "Only the 14,402 exact jet rectangles left open by the root-floor "
            "producer, in five positive mask3 small-m logical branches."
        ),
        "method": (
            "The actual feasible domain obeys f5/d6<=min(f5/C(r,6), "
            "x-gap/d6cap), f5/d6>=f5/d6cap, and therefore "
            "x>=f5/d6cap+gap/d6cap.  It is split exactly at the rational "
            "crossover; the two closed subregions share only their boundary."
        ),
        "branch_rows": branch_rows,
        "rows": rows,
        "residual_envelope_jets": residuals,
        "counts": {
            "input_joint_jets": len(rows),
            "logical_branches": len(branch_rows),
            "region_boxes": region_boxes,
            "shared_boundary_splits": shared_boundary_splits,
            "bernstein_controls": controls_checked,
            "open_envelope_jets": len(residuals),
            "sealed_logical_branches": sum(row["status"] == "SEALED" for row in branch_rows),
        },
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": forest.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "Only a zero-residual branch plus an independent literal replay may "
            "be credited.  Any negative control remains a method obstruction, "
            "not a graph counterexample.  The small-m wing and full mask3 remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("JETS", len(rows), "REGIONS", region_boxes, "CONTROLS", controls_checked)
    print("SEALED_BRANCHES", payload["counts"]["sealed_logical_branches"], "OPEN_JETS", len(residuals))
    print("BRANCH_ROWS", branch_rows)
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
