#!/usr/bin/env python3
"""Audit C12 auxiliary comparisons in the exact two-level tree family."""

from __future__ import annotations

import argparse
import json
import sys
import time
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly


sys.set_int_max_str_digits(0)

X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def coefficient(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def sigma(poly, rank: int) -> Fraction:
    previous = coefficient(poly, rank - 1)
    current = coefficient(poly, rank)
    following = coefficient(poly, rank + 1)
    return (
        1
        + Fraction(rank * current, previous)
        - Fraction((rank + 1) * following, current)
    )


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-t", type=int, default=1)
    parser.add_argument("--max-t", type=int, default=30)
    parser.add_argument("--max-m", type=int, default=300)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument(
        "--all-ranks",
        action="store_true",
        help="scan every internal rank instead of the required prefix",
    )
    parser.add_argument(
        "--tail-ranks",
        type=int,
        default=0,
        help="zero checks the full prefix; positive checks only this many top ranks",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    checks = 0
    names = (
        "one_vertex_curvature",
        "lower_sandwich",
        "upper_sandwich",
        "one_step_upper",
        "ordinary_ratio_drop",
        "two_to_one_curvature",
        "weighted_likelihood_deficit",
        "simple_weighted_deficit",
        "linear_compensation",
        "ISO_reserve_cascade",
        "strong_ISO_reserve_cascade",
        "half_pointed_SR_lower_bound",
        "adaptive_pointed_SR_lower_bound",
        "CLC_margin",
    )
    minima: dict[str, tuple[Fraction, dict] | None] = {
        name: None for name in names
    }
    failures: dict[str, dict | None] = {
        name: None for name in names
    }
    failures_by_alpha_gap: dict[str, dict[int, int]] = {
        name: {} for name in names
    }
    maximum_clc_ratio = None
    maximum_clc_item = None

    for t in range(args.min_t, args.max_t + 1):
        branch = (ONE + X) ** t + X
        shortened = (ONE + X) ** (t - 1) + X
        for m in range(1, args.max_m + 1):
            full = branch**m + X * (ONE + X) ** (t * m)
            leaf_deleted = (
                shortened * branch ** (m - 1)
                + X * (ONE + X) ** (t * m - 1)
            )
            pair_deleted = (ONE + X) ** (t - 1) * (
                branch ** (m - 1)
                + X * (ONE + X) ** (t * (m - 1))
            )
            alpha = t * m + 1
            order = 1 + m * (t + 1)
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            start = args.min_rank
            if args.tail_ranks:
                start = max(start, cutoff - args.tail_ranks)
            stop = alpha if args.all_ranks else cutoff

            for rank in range(start, stop):
                r = rank - 1
                a = coefficient(leaf_deleted, r)
                ap = coefficient(leaf_deleted, rank)
                bm = coefficient(pair_deleted, r - 1)
                b = coefficient(pair_deleted, r)
                bp = coefficient(pair_deleted, rank)
                bpp = coefficient(pair_deleted, rank + 1)
                app = coefficient(leaf_deleted, rank + 1)
                if min(a, ap, bm, b, bp) <= 0:
                    continue
                checks += 1
                u = Fraction(r * b, bm)
                w = Fraction(rank * bp, b)
                v = Fraction(rank * ap, a)
                q_t = sigma(leaf_deleted, rank)
                q_f = sigma(pair_deleted, r)
                eta = rank * q_t - r * q_f
                lower = v - w
                upper = Fraction(rank, r) * u - v
                x_ratio = u / r
                ordinary_drop = x_ratio + q_f - 1
                epsilon = max(Fraction(0), -lower)
                theta = Fraction(bm, a + bm)
                clc_left = (
                    Fraction(r, rank) * v * q_f
                    + Fraction(2, rank) * v * eta
                )
                clc_right = (
                    2
                    * theta
                    * epsilon
                    * (2 * ordinary_drop + epsilon)
                )
                two_to_one_curvature = r * q_f + 2 * eta
                weighted_likelihood_deficit = v - r * epsilon
                simple_weighted_deficit = Fraction(
                    b - r * (a - b), b
                )
                linear_compensation = (
                    v * two_to_one_curvature
                    - 2 * rank * r * epsilon
                )
                iso_reserve_t = rank - v + v * q_t
                iso_reserve_f = r - u + u * q_f
                one_step_deficit = u + 1 - v
                iso_reserve_cascade = (
                    2 * rank * iso_reserve_t
                    - r * v * iso_reserve_f / u
                )
                strong_iso_reserve_cascade = (
                    iso_reserve_cascade
                    - (r + 2 + Fraction(r * r, u))
                    * one_step_deficit
                    - 2 * rank * r * epsilon
                )
                z_f = Fraction((rank + 1) * bpp, bp)
                iso_reserve_f_next = (
                    rank + w * w - w * z_f
                )
                # With A=B+xC, H=B-C is the full terminal-neighbor
                # hit event (the sibling leaves together with the
                # possible nonleaf neighbor of the support).
                c_r = ap - bp
                c_next = app - bpp
                rho_r = Fraction(b - c_r, b)
                rho_next = Fraction(bp - c_next, bp)
                burden_next = (
                    rank * (w + 1) * rho_r
                    - (rank + 1) * w * rho_next
                )
                pointed_denominator_next = (
                    w + rank * (1 - rho_r)
                )
                pointed_threshold_bracket = (
                    r * v * iso_reserve_f / u
                    + (r + 2 + Fraction(r * r, u))
                    * one_step_deficit
                    + 2 * rank * r * epsilon
                    - 2
                    * rank
                    * (
                        rank
                        + v
                        * (q_f - 1 - one_step_deficit)
                    )
                )
                pointed_threshold = (
                    pointed_denominator_next
                    * pointed_threshold_bracket
                    / (2 * rank * v)
                )
                half_pointed_margin = (
                    iso_reserve_f_next / 2
                    - pointed_threshold
                )
                adaptive_pointed_lower = (
                    iso_reserve_f_next - burden_next
                    if burden_next <= 0
                    else iso_reserve_f_next / 2
                )
                adaptive_pointed_margin = (
                    adaptive_pointed_lower - pointed_threshold
                )
                values = {
                    "one_vertex_curvature": eta,
                    "lower_sandwich": lower,
                    "upper_sandwich": upper,
                    "one_step_upper": u + 1 - v,
                    "ordinary_ratio_drop": ordinary_drop,
                    "two_to_one_curvature":
                        two_to_one_curvature,
                    "weighted_likelihood_deficit":
                        weighted_likelihood_deficit,
                    "simple_weighted_deficit":
                        simple_weighted_deficit,
                    "linear_compensation":
                        linear_compensation,
                    "ISO_reserve_cascade":
                        iso_reserve_cascade,
                    "CLC_margin": clc_left - clc_right,
                }
                if u >= r:
                    values["strong_ISO_reserve_cascade"] = (
                        strong_iso_reserve_cascade
                    )
                    values["half_pointed_SR_lower_bound"] = (
                        half_pointed_margin
                    )
                    values["adaptive_pointed_SR_lower_bound"] = (
                        adaptive_pointed_margin
                    )
                item = {
                    "t": t,
                    "m": m,
                    "order": order,
                    "alpha": alpha,
                    "rank": rank,
                    "cutoff": cutoff,
                    "u": str(u),
                    "w": str(w),
                    "v": str(v),
                    "q_T": str(q_t),
                    "q_F": str(q_f),
                    "eta": str(eta),
                    "epsilon": str(epsilon),
                    "M": str(ordinary_drop),
                    "CLC_left": str(clc_left),
                    "CLC_right": str(clc_right),
                    "two_to_one_curvature":
                        str(two_to_one_curvature),
                    "weighted_likelihood_deficit":
                        str(weighted_likelihood_deficit),
                    "simple_weighted_deficit":
                        str(simple_weighted_deficit),
                    "linear_compensation":
                        str(linear_compensation),
                    "ISO_reserve_T": str(iso_reserve_t),
                    "ISO_reserve_F": str(iso_reserve_f),
                    "ISO_reserve_cascade":
                        str(iso_reserve_cascade),
                    "strong_ISO_reserve_cascade":
                        str(strong_iso_reserve_cascade),
                    "next_pointed_burden": str(burden_next),
                    "next_ISO_reserve": str(
                        iso_reserve_f_next
                    ),
                    "pointed_SR_threshold": str(
                        pointed_threshold
                    ),
                    "half_pointed_SR_lower_bound": str(
                        half_pointed_margin
                    ),
                    "adaptive_pointed_SR_lower_bound": str(
                        adaptive_pointed_margin
                    ),
                }
                for name, value in values.items():
                    old = minima[name]
                    if old is None or value < old[0]:
                        minima[name] = (value, item)
                    if value < 0 and failures[name] is None:
                        failures[name] = item
                    if value < 0:
                        gap_counts = failures_by_alpha_gap[name]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )
                if clc_left > 0:
                    ratio = clc_right / clc_left
                    if (
                        maximum_clc_ratio is None
                        or ratio > maximum_clc_ratio
                    ):
                        maximum_clc_ratio = ratio
                        maximum_clc_item = item
        print(f"t={t} checks={checks:,}", flush=True)

    report_minima = {}
    for name, entry in minima.items():
        if entry is None:
            report_minima[name] = None
        else:
            value, item = entry
            report_minima[name] = {
                "exact": str(value),
                "decimal": float(value),
                "witness": item,
            }
    report = {
        "status": (
            "FAIL_AUXILIARY"
            if any(failures.values())
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "minima": report_minima,
        "first_failures": failures,
        "failures_by_alpha_gap": {
            name: {
                str(gap): count
                for gap, count in sorted(counts.items())
            }
            for name, counts in failures_by_alpha_gap.items()
        },
        "maximum_CLC_right_over_left": (
            None
            if maximum_clc_ratio is None
            else {
                "exact": str(maximum_clc_ratio),
                "decimal": float(maximum_clc_ratio),
                "witness": maximum_clc_item,
            }
        ),
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checks": checks,
                "minimum_decimals": {
                    name: (
                        None if item is None else item["decimal"]
                    )
                    for name, item in report_minima.items()
                },
                "failure_flags": {
                    name: item is not None
                    for name, item in failures.items()
                },
                "maximum_CLC_right_over_left": (
                    None
                    if maximum_clc_ratio is None
                    else float(maximum_clc_ratio)
                ),
                "elapsed_seconds": report["elapsed_seconds"],
                "report": str(args.out),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
