#!/usr/bin/env python3
"""Exact required-window census for the affine Laguerre--Jensen atoms.

This replay distinguishes the 953 left windows actually used by the
offset-two reflection certificate from a previously quoted diagnostic point
at h=15.  Every arithmetic comparison is over Python integers.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

from verify_affine_bridge_laguerre_jensen_reduction import (
    atom_weighted_value,
    choose,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
HARD_SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_required_window_curvature_exact_20260813.json"


def quotient_record(numerator: int, denominator: int, metadata: dict) -> dict:
    return {
        "numerator": numerator,
        "denominator": denominator,
        "decimal": numerator / denominator,
        **metadata,
    }


def update_minimum(current, numerator: int, denominator: int, metadata: dict):
    if current is None or numerator * current[1] < current[0] * denominator:
        return numerator, denominator, metadata
    return current


def four_layers(n: int, h: int, A: int, B: int, alpha: int, beta: int):
    return tuple(
        atom_weighted_value(n, A, B, alpha, beta, j)
        for j in range(h - 1, h + 3)
    )


def adjacent_quotient(row: tuple[int, ...]) -> tuple[int, int]:
    # K_h/K_(h+1)=a_h^3 a_(h+2)/(a_(h-1) a_(h+1)^3).
    return row[1] ** 3 * row[3], row[0] * row[2] ** 3


def specialized_sources(core, package, c_value, m_value, x_value):
    sources = defaultdict(int)
    for monomial, coefficient in core.terms():
        p, q, c_power, m_power, x_power = monomial
        value = (
            int(coefficient)
            * c_value**c_power
            * m_value**m_power
            * x_value**x_power
        )
        sources[p, q] += value
    return {key: value for key, value in sources.items() if value}


def main() -> None:
    hard = json.loads(HARD_SOURCE.read_text(encoding="utf-8"))
    cores = {
        (package, parity): reserve_core(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    }

    windows = 0
    birth_windows = 0
    no_birth_windows = 0
    atom_incidences = 0
    atom_failures = 0
    fiber_incidences = 0
    fiber_failures = 0
    minimum_atom = None
    minimum_fiber = {}
    minimum_room = None
    maximum_room = None
    minimum_q = None
    maximum_capacity_slope = None

    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]
        sources = specialized_sources(
            cores[package, parity], package, c_value, m_value, x_value
        )
        if package == "group":
            outer_a = 2 * c_value + m_value + x_value - 1
            outer_b = 2 * m_value + parity + 1
        else:
            outer_a = m_value + x_value - 1
            outer_b = 2 * m_value + parity

        for order in record["orders"]:
            if not order["negative_h"]:
                continue
            terminal_negative = max(order["negative_h"])
            if terminal_negative < 3:
                continue
            n = order["r"] + 1
            target = m_value + n + 4
            for ell in range(1, terminal_negative - 1):
                h = terminal_negative - ell - 1
                room = n - 2 * h - 2
                minimum_room = room if minimum_room is None else min(minimum_room, room)
                maximum_room = room if maximum_room is None else max(maximum_room, room)
                windows += 1
                window_has_birth = False

                for (p, q), source_coefficient in sources.items():
                    del source_coefficient  # Positive scaling cancels in curvature.
                    fiber = [0, 0, 0, 0]
                    fiber_active = False
                    for v in range(outer_b + 1):
                        A = outer_a + v
                        B = outer_a + outer_b - v
                        alpha = target - p - v
                        beta = target - q - outer_b + v
                        if alpha < 0 or beta < 0:
                            continue
                        row = four_layers(n, h, A, B, alpha, beta)
                        if not row[0]:
                            if any(row[1:]):
                                window_has_birth = True
                            continue
                        assert all(row), "A required-window atom died in four layers"
                        fiber_active = True
                        atom_incidences += 1
                        numerator, denominator = adjacent_quotient(row)
                        if numerator < denominator:
                            atom_failures += 1
                        metadata = {
                            "package": package,
                            "parity": parity,
                            "c": c_value if package == "group" else None,
                            "m": m_value,
                            "x": x_value,
                            "n": n,
                            "h": h,
                            "p": p,
                            "q": q,
                            "v": v,
                            "A": A,
                            "B": B,
                            "alpha": alpha,
                            "beta": beta,
                        }
                        minimum_atom = update_minimum(
                            minimum_atom, numerator, denominator, metadata
                        )

                        degree_q = alpha + beta - n - 2 * h
                        total_excess = A + B - alpha - beta
                        minimum_q = (
                            degree_q if minimum_q is None else min(minimum_q, degree_q)
                        )
                        slope = (total_excess - 2 * h + room - 1) // room
                        maximum_capacity_slope = (
                            slope
                            if maximum_capacity_slope is None
                            else max(maximum_capacity_slope, slope)
                        )
                        branch_weight = choose(outer_b, v)
                        for index in range(4):
                            fiber[index] += branch_weight * row[index]

                    if fiber_active:
                        assert all(fiber)
                        fiber_incidences += 1
                        numerator, denominator = adjacent_quotient(tuple(fiber))
                        if numerator < denominator:
                            fiber_failures += 1
                        family = f"{package}:{parity}"
                        metadata = {
                            "package": package,
                            "parity": parity,
                            "c": c_value if package == "group" else None,
                            "m": m_value,
                            "x": x_value,
                            "n": n,
                            "h": h,
                            "p": p,
                            "q": q,
                        }
                        minimum_fiber[family] = update_minimum(
                            minimum_fiber.get(family), numerator, denominator, metadata
                        )

                if window_has_birth:
                    birth_windows += 1
                else:
                    no_birth_windows += 1

    assert windows == 953
    assert birth_windows == 209
    assert no_birth_windows == 744
    assert atom_incidences == 4_062_983
    assert atom_failures == 0
    assert fiber_incidences == 97_608
    assert fiber_failures == 0
    assert (minimum_room, maximum_room) == (12, 47)
    assert minimum_q == 1
    assert maximum_capacity_slope == 11

    # Reconstruct the old diagnostic point exactly.  It has 82 unsafe atoms,
    # but its order has no negative Euler layer, so it is not one of the 953
    # windows required by the reflection certificate.
    old_record = next(
        record
        for record in hard["records"]
        if record["package"] == "group"
        and record["parity"] == 0
        and record["c"] == 30
        and record["m"] == 3
        and record["x"] == 0
    )
    old_n = 32
    old_h = 15
    old_order = old_record["orders"][old_n - 1]
    assert old_order["negative_h"] == []
    old_sources = specialized_sources(cores["group", 0], "group", 30, 3, 0)
    old_outer_a = 62
    old_outer_b = 7
    old_target = 3 + old_n + 4
    old_active = 0
    old_failures = 0
    for p, q in old_sources:
        for v in range(old_outer_b + 1):
            alpha = old_target - p - v
            beta = old_target - q - old_outer_b + v
            if alpha < 0 or beta < 0:
                continue
            row = four_layers(
                old_n,
                old_h,
                old_outer_a + v,
                old_outer_a + old_outer_b - v,
                alpha,
                beta,
            )
            if not row[0]:
                continue
            assert all(row)
            old_active += 1
            numerator, denominator = adjacent_quotient(row)
            old_failures += numerator < denominator
    assert old_active == 528
    assert old_failures == 82

    # Splitting does not monotonically improve the merged one-colour slack.
    # This is a genuine required bottom/odd atom; both split and merged rows
    # are safe, but the split-to-merged quotient is strictly below one.
    split_cell = (42, 1, 53, 54, 41, 41)
    n, h, A, B, alpha, beta = split_cell
    split_row = four_layers(*split_cell)
    gamma = alpha + beta
    merged_row = tuple(
        choose(n, j) * 2**j * choose(A + B, gamma - j)
        for j in range(h - 1, h + 3)
    )
    split_num, split_den = adjacent_quotient(split_row)
    merged_num, merged_den = adjacent_quotient(merged_row)
    correction_num = split_num * merged_den
    correction_den = split_den * merged_num
    assert split_num > split_den
    assert merged_num > merged_den
    assert correction_num < correction_den

    result = {
        "status": "PASS_EXACT_REQUIRED_WINDOW_ATOM_AND_FIBER_CURVATURE_CENSUS",
        "required_windows": windows,
        "birth_windows": birth_windows,
        "no_birth_windows": no_birth_windows,
        "required_room_range_n_minus_2h_minus_2": [minimum_room, maximum_room],
        "minimum_degree_surplus_q": minimum_q,
        "maximum_exact_capacity_slope": maximum_capacity_slope,
        "active_atom_window_incidences": atom_incidences,
        "atom_adjacent_curvature_failures": atom_failures,
        "minimum_atom_adjacent_quotient": quotient_record(*minimum_atom),
        "active_source_v_fibers": fiber_incidences,
        "fiber_adjacent_curvature_failures": fiber_failures,
        "minimum_fiber_adjacent_quotient_by_family": {
            family: quotient_record(*value)
            for family, value in sorted(minimum_fiber.items())
        },
        "old_82_failure_diagnostic": {
            "package": "group",
            "parity": 0,
            "c": 30,
            "m": 3,
            "x": 0,
            "n": old_n,
            "h": old_h,
            "active_atoms": old_active,
            "unsafe_atoms": old_failures,
            "negative_euler_layers_at_this_order": old_order["negative_h"],
            "in_required_reflection_scope": False,
        },
        "monotone_split_counterexample": {
            "required_path_metadata": {
                "package": "bottom",
                "parity": 1,
                "m": 3,
                "x": 48,
                "n": 42,
                "h": 1,
                "p": 5,
                "q": 4,
                "v": 3,
            },
            "parameters_n_h_A_B_alpha_beta": list(split_cell),
            "split_row": list(split_row),
            "merged_row": list(merged_row),
            "split_adjacent_quotient": quotient_record(split_num, split_den, {}),
            "merged_adjacent_quotient": quotient_record(merged_num, merged_den, {}),
            "split_to_merged_correction": quotient_record(
                correction_num, correction_den, {}
            ),
            "conclusion": (
                "Both rows are safe, but splitting slightly reduces the exact "
                "third-difference slack; a proof must bound the loss rather than "
                "claim it is nonnegative."
            ),
        },
        "warning": (
            "The census is exact finite evidence on the currently required hard "
            "records.  It corrects the scope of the old 82-failure diagnostic but "
            "is not an all-order proof of atom or mixture curvature."
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["sha256"] = {
        HARD_SOURCE.name: hashlib.sha256(HARD_SOURCE.read_bytes()).hexdigest().upper(),
        OUTPUT.name: hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
