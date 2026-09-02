#!/usr/bin/env python3
"""Exact degree-ULC and telescoped covariance-envelope replay.

The algebraic lemmas recorded in the companion note are all-order.  The
path-source TP2/ULC hypotheses and final scalar comparison are checked here
exactly on the 953 currently required windows; those checks are finite.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from verify_affine_bridge_laguerre_jensen_reduction import (
    atom_weighted_value,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_degree_covariance_envelope_exact_20260813.json"

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(100_000)


def frac_record(value: Fraction, metadata: dict | None = None) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **(metadata or {}),
    }


def merged_q(n: int, h: int, alpha: int, t: int) -> Fraction:
    return Fraction(
        (h + 1) ** 2 * (n - h + 1) * (n - h - 1),
        h * (h + 2) * (n - h) ** 2,
    ) * Fraction(
        ((alpha - h) ** 2 - 1) * (t + h + 1) ** 2,
        (alpha - h) ** 2 * (t + h) * (t + h + 2),
    )


def main() -> None:
    hard = json.loads(SOURCE.read_text(encoding="utf-8"))
    cores = {
        (package, parity): reserve_core(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    }

    windows = 0
    ulc_checks = 0
    ulc_failures = 0
    slope_checks = 0
    slope_monotonicity_failures = 0
    merged_slope_bound_failures = 0
    budget_failures = 0
    minimum_budget = None
    maximum_x_slope_fraction = None
    maximum_y_slope_fraction = None

    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]

        sources = defaultdict(int)
        for monomial, coefficient in cores[package, parity].terms():
            p, q, c_power, m_power, x_power = monomial
            value = (
                int(coefficient)
                * c_value**c_power
                * m_value**m_power
                * x_value**x_power
            )
            if value:
                sources[p, q] += value

        if package == "group":
            outer_a = 2 * c_value + m_value + x_value - 1
            outer_b = 2 * m_value + parity + 1
        else:
            outer_a = m_value + x_value - 1
            outer_b = 2 * m_value + parity
        E = 2 * outer_a + outer_b

        degree_support = sorted({p + q for p, q in sources})
        d_min, d_max = degree_support[0], degree_support[-1]
        L = d_max - d_min
        assert degree_support == list(range(d_min, d_max + 1))
        assert (package, d_min, d_max, L) in {
            ("group", 8, 16, 8),
            ("bottom", 9, 20, 11),
        }

        for order in record["orders"]:
            if not order["negative_h"]:
                continue
            terminal_negative = max(order["negative_h"])
            if terminal_negative < 3:
                continue
            n = order["r"] + 1
            D = m_value + n + 4

            for ell in range(1, terminal_negative - 1):
                h = terminal_negative - ell - 1
                rows = defaultdict(lambda: [0, 0, 0])
                for (p, q), source_weight in sources.items():
                    d = p + q
                    for v in range(outer_b + 1):
                        alpha = D - p - v
                        beta = D - q - outer_b + v
                        if alpha < 0 or beta < 0:
                            continue
                        weight = source_weight * math.comb(outer_b, v)
                        for index, j in enumerate(range(h - 1, h + 2)):
                            rows[d][index] += weight * atom_weighted_value(
                                n,
                                outer_a + v,
                                outer_a + outer_b - v,
                                alpha,
                                beta,
                                j,
                            )

                assert all(all(rows[d]) for d in degree_support)
                windows += 1

                # ULC means row[d]/binom(L,d-d_min) is log-concave.
                for d in range(d_min + 1, d_max):
                    k = d - d_min
                    left = (
                        rows[d][0] ** 2
                        * math.comb(L, k - 1)
                        * math.comb(L, k + 1)
                    )
                    right = (
                        rows[d - 1][0]
                        * rows[d + 1][0]
                        * math.comb(L, k) ** 2
                    )
                    ulc_checks += 1
                    if left < right:
                        ulc_failures += 1

                ratios = {
                    d: (
                        Fraction(rows[d][1], rows[d][0]),
                        Fraction(rows[d][2], rows[d][1]),
                    )
                    for d in degree_support
                }

                merged_x_bounds = []
                merged_y_bounds = []
                for d in range(d_min, d_max):
                    x0, y0 = ratios[d]
                    x1, y1 = ratios[d + 1]
                    slope_checks += 1
                    if x0 < x1 or y0 < y1:
                        slope_monotonicity_failures += 1

                    alpha_d = 2 * D - d - outer_b
                    t_d = E - alpha_d
                    bx = Fraction(E + 1, (alpha_d - h) * (t_d + h))
                    by = Fraction(
                        E + 1,
                        (alpha_d - h - 1) * (t_d + h + 1),
                    )
                    merged_x_bounds.append(bx)
                    merged_y_bounds.append(by)
                    actual_x = x0 / x1 - 1
                    actual_y = y0 / y1 - 1
                    if actual_x > bx or actual_y > by:
                        merged_slope_bound_failures += 1

                    x_fraction = actual_x / bx
                    y_fraction = actual_y / by
                    meta = {
                        "package": package,
                        "parity": parity,
                        "c": c_value if package == "group" else None,
                        "m": m_value,
                        "x": x_value,
                        "n": n,
                        "h": h,
                        "degree": d,
                    }
                    if (
                        maximum_x_slope_fraction is None
                        or x_fraction > maximum_x_slope_fraction[0]
                    ):
                        maximum_x_slope_fraction = (x_fraction, meta)
                    if (
                        maximum_y_slope_fraction is None
                        or y_fraction > maximum_y_slope_fraction[0]
                    ):
                        maximum_y_slope_fraction = (y_fraction, meta)

                # The products of 1+b_d telescope.  These are exact upper
                # bounds for Lip(x)/min(x) and Lip(y)/min(y), conditional on
                # the just-checked monotonicity and merged-slope hypotheses.
                alpha_last = 2 * D - d_max - outer_b
                t_last = E - alpha_last
                A = alpha_last - h
                B = t_last + h
                B0 = B - L
                rel_lip_x = Fraction(
                    (E + 1) * B,
                    (A + 1) * B0 * (B0 + 1),
                )
                rel_lip_y = Fraction(
                    (E + 1) * (B + 1),
                    A * (B0 + 1) * (B0 + 2),
                )

                # Normalized ULC gives Var(degree)<=L/4.  The independent
                # copy Lipschitz identity then gives this covariance bound.
                covariance_bound = Fraction(L, 4) * rel_lip_x * rel_lip_y

                # If the scalar split bound C>=1-1/(hE^2) holds, the weakest
                # fibre is at d_max and has at least this quotient.
                lambda_bound = merged_q(n, h, alpha_last, t_last) * (
                    1 - Fraction(1, h * E * E)
                )
                certificate = lambda_bound / (1 + covariance_bound) ** 3
                if certificate < 1:
                    budget_failures += 1

                metadata = {
                    "package": package,
                    "parity": parity,
                    "c": c_value if package == "group" else None,
                    "m": m_value,
                    "x": x_value,
                    "n": n,
                    "h": h,
                    "E": E,
                    "degree_min": d_min,
                    "degree_max": d_max,
                    "L": L,
                    "lambda_bound": frac_record(lambda_bound),
                    "relative_lipschitz_x_bound": frac_record(rel_lip_x),
                    "relative_lipschitz_y_bound": frac_record(rel_lip_y),
                    "covariance_inflation_minus_one_bound": frac_record(
                        covariance_bound
                    ),
                }
                if minimum_budget is None or certificate < minimum_budget[0]:
                    minimum_budget = (certificate, metadata)

    assert windows == 953
    assert ulc_checks == 9341
    assert slope_checks == 10294
    assert ulc_failures == 0
    assert slope_monotonicity_failures == 0
    assert merged_slope_bound_failures == 0
    assert budget_failures == 0

    result = {
        "status": "PASS_EXACT_DEGREE_ULC_AND_TELESCOPED_COVARIANCE_ENVELOPE",
        "all_order_lemmas": [
            "A ULC law of order L has Var(D)<=mu(1-mu/L)<=L/4.",
            "For monotone Lx,Ly-Lipschitz functions, Cov(x(D),y(D))<=Lx*Ly*Var(D).",
            "If adjacent relative slopes are bounded by the merged slopes, their products telescope to RX=(E+1)B/((A+1)(B-L)(B-L+1)) and RY=(E+1)(B+1)/(A(B-L+1)(B-L+2)).",
        ],
        "required_windows_checked": windows,
        "normalized_degree_ulc_checks": ulc_checks,
        "normalized_degree_ulc_failures": ulc_failures,
        "adjacent_degree_slope_checks": slope_checks,
        "slope_monotonicity_failures": slope_monotonicity_failures,
        "merged_slope_bound_failures": merged_slope_bound_failures,
        "conditional_budget_failures": budget_failures,
        "maximum_x_actual_over_merged_slope": frac_record(
            maximum_x_slope_fraction[0], maximum_x_slope_fraction[1]
        ),
        "maximum_y_actual_over_merged_slope": frac_record(
            maximum_y_slope_fraction[0], maximum_y_slope_fraction[1]
        ),
        "minimum_conditional_budget_certificate": {
            **frac_record(minimum_budget[0]),
            **minimum_budget[1],
        },
        "warning": (
            "The variance, covariance, and telescoping implications are all-order. "
            "ULC, adjacent-degree monotonicity/slope domination, the scalar split "
            "bound, and the final comparison remain path-specific all-order "
            "targets. Their checks here are exact finite evidence on 953 windows."
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    result["sha256"] = {
        SOURCE.name: hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
        OUTPUT.name: hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
