#!/usr/bin/env python3
"""Exact terminal x-s split scan on Galvin's non-LC tree family.

For

    E_t=(1+2x)^t,
    A_t=E_t+x(1+x)^t,
    B=I(T_{m,t})=A_t^m+xE_t^m,

the script attaches a two-vertex terminal path at four natural root
types of T_{m,t}.  It checks the terminal quarter-payment inequality and
the proposed dimensionless sufficient conditions

    1/3 <= x <= 3/2,
    x <= 1  =>  s <= 4x-1,
    x >= 1  =>  x(3s+20) <= 36.

These imply the factor-three payment bound

    s(1-x)^2 <= 1/3.

The stronger factor-four bound is retained as a diagnostic; it is known
to fail within this family.

at every required prefix rank.  All decisions use exact integers.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])
ONE_PLUS_X = Poly([1, 1])


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def stable_ratio(numerator: int, denominator: int) -> float:
    if numerator == 0:
        return 0.0
    sign = -1.0 if numerator < 0 else 1.0
    numerator = abs(numerator)
    shift = max(
        0,
        max(numerator.bit_length(), denominator.bit_length()) - 52,
    )
    return sign * (numerator >> shift) / (denominator >> shift)


def better_ratio(
    numerator: int,
    denominator: int,
    incumbent: tuple[int, int] | None,
    *,
    larger: bool,
) -> bool:
    if denominator <= 0:
        return False
    if incumbent is None:
        return True
    old_num, old_den = incumbent
    comparison = numerator * old_den - old_num * denominator
    return comparison > 0 if larger else comparison < 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--t-min", type=int, default=2)
    ap.add_argument("--t-max", type=int, default=20)
    ap.add_argument("--m-min", type=int, default=1)
    ap.add_argument("--m-max", type=int, default=200)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    started = time.time()
    checked_cases = 0
    checked_rooted_ranks = 0
    failures = {
        "terminal_cross": None,
        "terminal_quarter_payment": None,
        "terminal_third_payment": None,
        "x_below_one_third": None,
        "x_above_three_halves": None,
        "s_above_four_x_minus_one_when_x_at_most_one": None,
        "x_times_three_s_plus_twenty_above_36": None,
    }
    component_first = {
        "m_above_two": None,
        "sigma_below_one": None,
        "negative_unit_mean_gap_below_minus_one": None,
        "negative_triple_resource": None,
    }
    extrema_pairs: dict[str, tuple[int, int] | None] = {
        "minimum_x": None,
        "maximum_x": None,
        "maximum_s": None,
        "maximum_s_minus_four_x_plus_one": None,
        "maximum_quarter_ratio": None,
    }
    extrema: dict[str, dict | None] = {
        key: None for key in extrema_pairs
    }
    per_t = []

    for t in range(args.t_min, args.t_max + 1):
        e = (ONE + 2 * X) ** t
        e_previous = (ONE + 2 * X) ** (t - 1)
        a = e + X * ONE_PLUS_X**t
        a_previous = e_previous + X * ONE_PLUS_X ** (t - 1)
        support_deleted_state = ONE_PLUS_X * e_previous
        leaf_deleted_state = (
            support_deleted_state + X * ONE_PLUS_X ** (t - 1)
        )

        e_power = ONE
        a_power = ONE
        t_cases = 0
        t_ranks = 0
        for m_parameter in range(1, args.m_max + 1):
            previous_e_power = e_power
            previous_a_power = a_power
            e_power *= e
            a_power *= a
            if m_parameter < args.m_min:
                continue

            tree = a_power + X * e_power
            root_deletions = {
                "outer": a_power,
                "center": (
                    e * previous_a_power + X * e_power
                ),
                "support": ONE_PLUS_X * (
                    a_previous * previous_a_power
                    + X * e_previous * previous_e_power
                ),
                "terminal_leaf": (
                    leaf_deleted_state * previous_a_power
                    + X * support_deleted_state * previous_e_power
                ),
            }
            alpha = m_parameter * (t + 1)
            assert tree.degree() == alpha
            cutoff = (2 * (alpha + 1) + 1) // 3
            checked_cases += 1
            t_cases += 1

            for root_type, deletion in root_deletions.items():
                for r in range(1, cutoff - 1):
                    bm = int(coeff(tree, r - 1))
                    b = int(coeff(tree, r))
                    bp = int(coeff(tree, r + 1))
                    cm = int(coeff(deletion, r - 1))
                    c = int(coeff(deletion, r))
                    if bm <= 0 or b <= 0:
                        continue

                    cross = b * c - bp * cm
                    gsb = (
                        r * b * b
                        + bm * b
                        - (r + 1) * bm * bp
                    )
                    a_clear = (
                        2 * b * b + b * cm + (r + 1) * cross
                    )
                    lambda_clear = (
                        2 * b * b + b * cm + 2 * (r + 1) * cross
                    )
                    x_num = (b + cm) * gsb
                    x_den = bm * a_clear
                    s_num = bm * a_clear * a_clear
                    s_den = (
                        b
                        * b
                        * (b + cm + bm)
                        * lambda_clear
                    )
                    mean_clear = bm * a_clear - (b + cm) * gsb
                    mean_numerator = mean_clear // b
                    assert mean_numerator * b == mean_clear
                    # M = mean_clear / b, so the b^2 factors cancel.
                    quarter_num = mean_clear * mean_clear
                    quarter_den = (
                        bm
                        * (b + cm + bm)
                        * lambda_clear
                        * b
                        * b
                    )
                    checked_rooted_ranks += 1
                    t_ranks += 1

                    common = {
                        "t": t,
                        "m": m_parameter,
                        "order": 1 + m_parameter * (1 + 2 * t),
                        "alpha": alpha,
                        "root_type": root_type,
                        "rank_r": r,
                        "terminal_path_cutoff": cutoff,
                        "x": stable_ratio(x_num, x_den),
                        "s": stable_ratio(s_num, s_den),
                        "quarter_ratio": stable_ratio(
                            quarter_num, quarter_den
                        ),
                    }

                    checks = (
                        ("terminal_cross", cross < 0),
                        (
                            "terminal_quarter_payment",
                            4 * quarter_num > quarter_den,
                        ),
                        (
                            "terminal_third_payment",
                            3 * quarter_num > quarter_den,
                        ),
                        ("x_below_one_third", 3 * x_num < x_den),
                        ("x_above_three_halves", 2 * x_num > 3 * x_den),
                        (
                            "s_above_four_x_minus_one_when_x_at_most_one",
                            x_num <= x_den
                            and s_num * x_den
                            > s_den * (4 * x_num - x_den),
                        ),
                        (
                            "x_times_three_s_plus_twenty_above_36",
                            x_num >= x_den
                            and x_num * (3 * s_num + 20 * s_den)
                            > 36 * x_den * s_den,
                        ),
                    )
                    for name, failed in checks:
                        if failed and failures[name] is None:
                            failures[name] = common

                    if (
                        2 * b < bm
                        and component_first["m_above_two"] is None
                    ):
                        component_first["m_above_two"] = common
                    if (
                        gsb < bm * b
                        and component_first["sigma_below_one"] is None
                    ):
                        component_first["sigma_below_one"] = common
                    mean_denominator = bm * (b + cm)
                    if (
                        mean_numerator < -mean_denominator
                        and component_first[
                            "negative_unit_mean_gap_below_minus_one"
                        ]
                        is None
                    ):
                        component_first[
                            "negative_unit_mean_gap_below_minus_one"
                        ] = common
                    triple_resource_gap = (
                        (b + cm + bm) * lambda_clear
                        - 3 * bm * (b + cm) * (b + cm)
                    )
                    if (
                        mean_numerator <= 0
                        and triple_resource_gap < 0
                        and component_first["negative_triple_resource"]
                        is None
                    ):
                        component_first["negative_triple_resource"] = common

                    split_margin_num = (
                        s_num * x_den
                        - s_den * (4 * x_num - x_den)
                    )
                    split_margin_den = s_den * x_den
                    candidates = {
                        "minimum_x": (x_num, x_den, False),
                        "maximum_x": (x_num, x_den, True),
                        "maximum_s": (s_num, s_den, True),
                        "maximum_s_minus_four_x_plus_one": (
                            split_margin_num,
                            split_margin_den,
                            True,
                        ),
                        "maximum_quarter_ratio": (
                            quarter_num,
                            quarter_den,
                            True,
                        ),
                    }
                    for name, (numerator, denominator, larger) in (
                        candidates.items()
                    ):
                        if better_ratio(
                            numerator,
                            denominator,
                            extrema_pairs[name],
                            larger=larger,
                        ):
                            extrema_pairs[name] = (numerator, denominator)
                            extrema[name] = common | {
                                "value": stable_ratio(
                                    numerator, denominator
                                )
                            }

        per_t.append(
            {"t": t, "cases": t_cases, "rooted_ranks": t_ranks}
        )
        print(
            f"t={t}: cases={t_cases:,}, rooted ranks={t_ranks:,}, "
            f"min x={extrema['minimum_x']['value']:.12g}, "
            f"max split margin="
            f"{extrema['maximum_s_minus_four_x_plus_one']['value']:.12g}",
            flush=True,
        )

    diagnostic_only = {"terminal_quarter_payment"}
    decisive_failure = next(
        (
            value
            for name, value in failures.items()
            if name not in diagnostic_only and value is not None
        ),
        None,
    )
    report = {
        "claim_tested": (
            "Terminal x-s split and quarter-payment on four rooted states "
            "of Galvin T_(m,t)."
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "exact_integer_arithmetic": True,
        "checked_cases": checked_cases,
        "checked_rooted_ranks": checked_rooted_ranks,
        "failures": failures,
        "component_first": component_first,
        "extrema": extrema,
        "per_t": per_t,
        "status": "FAIL" if decisive_failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checked_cases": checked_cases,
                "checked_rooted_ranks": checked_rooted_ranks,
                "failures": failures,
                "component_first": component_first,
                "extrema": extrema,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if decisive_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
