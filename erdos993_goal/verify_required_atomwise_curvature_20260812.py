#!/usr/bin/env python3
"""Exact census of adjacent curvature for every required active path atom.

This is deliberately separate from the main Laguerre--Jensen replay so the
four-million-incidence audit can be run independently.  Repeated parameter
tuples are memoized; all comparisons use Python integers.
"""

from __future__ import annotations

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
OUTPUT = ROOT / "required_atomwise_curvature_exact_20260812.json"


def adjacent_numerator(
    n: int, h: int, A: int, B: int, alpha: int, beta: int
) -> tuple[int, tuple[int, int, int, int]]:
    row = tuple(
        atom_weighted_value(n, A, B, alpha, beta, j)
        for j in range(h - 1, h + 3)
    )
    assert all(row)
    return row[1] ** 3 * row[3] - row[0] * row[2] ** 3, row


def main() -> None:
    hard = json.loads(HARD_SOURCE.read_text(encoding="utf-8"))
    cores = {
        (package, parity): reserve_core(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    }
    cache: dict[tuple[int, int, int, int, int, int], tuple[int, tuple[int, ...]]] = {}
    incidence_count = 0
    safe_incidence_count = 0
    bad_incidence_count = 0
    zero_incidence_count = 0
    minimum_quotient = None
    minimum_metadata = None
    bad_examples = []
    source_counts = defaultdict(lambda: {"active": 0, "bad": 0})

    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]
        source_coefficients = defaultdict(int)
        for monomial, coefficient in cores[package, parity].terms():
            p, q, c_power, m_power, x_power = monomial
            specialized = (
                int(coefficient)
                * c_value**c_power
                * m_value**m_power
                * x_value**x_power
            )
            source_coefficients[p, q] += specialized

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
                for (p, q), coefficient in source_coefficients.items():
                    if not coefficient:
                        continue
                    source_key = f"{package}:{parity}:{p}:{q}"
                    for v in range(outer_b + 1):
                        A = outer_a + v
                        B = outer_a + outer_b - v
                        alpha = target - p - v
                        beta = target - q - outer_b + v
                        if alpha < 0 or beta < 0:
                            continue
                        support_low = max(0, alpha - A) + max(0, beta - B)
                        support_high = alpha + beta
                        if not (support_low <= h - 1 <= support_high):
                            continue

                        incidence_count += 1
                        source_counts[source_key]["active"] += 1
                        key = (n, h, A, B, alpha, beta)
                        if key not in cache:
                            cache[key] = adjacent_numerator(*key)
                        numerator, row = cache[key]
                        denominator = row[0] * row[2] ** 3
                        if numerator > 0:
                            safe_incidence_count += 1
                        elif numerator == 0:
                            zero_incidence_count += 1
                        else:
                            bad_incidence_count += 1
                            source_counts[source_key]["bad"] += 1
                            if len(bad_examples) < 20:
                                bad_examples.append(
                                    {
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
                                        "numerator": numerator,
                                    }
                                )

                        # Compare quotient = 1 + numerator/denominator exactly.
                        if (
                            minimum_quotient is None
                            or (denominator + numerator) * minimum_quotient[1]
                            < minimum_quotient[0] * denominator
                        ):
                            minimum_quotient = (denominator + numerator, denominator)
                            minimum_metadata = {
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

    assert incidence_count == 4_062_983
    result = {
        "status": "PASS_REQUIRED_ATOMWISE_CURVATURE_CENSUS",
        "active_atom_window_incidences": incidence_count,
        "unique_atom_window_parameter_tuples": len(cache),
        "strictly_safe_incidences": safe_incidence_count,
        "equality_incidences": zero_incidence_count,
        "bad_incidences": bad_incidence_count,
        "bad_examples": bad_examples,
        "minimum_adjacent_quotient": {
            "numerator": minimum_quotient[0],
            "denominator": minimum_quotient[1],
            "decimal": minimum_quotient[0] / minimum_quotient[1],
            **minimum_metadata,
        },
        "source_terms_with_bad_incidences": {
            key: value for key, value in source_counts.items() if value["bad"]
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
