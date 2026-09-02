#!/usr/bin/env python3
"""Exact terminal-prefix audit of the three-comparison C12 reduction.

For each selected terminal support p of a 60-vertex PatternBoost tree,
choose one adjacent leaf l and form T=G-l and F=G-{l,p}.  Check only
the unsolved order-sensitive ranks k>=7.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import X, coeff, tree_polynomial


ONE = fmpz_poly([1])


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def sigma(poly, rank: int) -> Fraction:
    previous = int(coeff(poly, rank - 1))
    current = int(coeff(poly, rank))
    following = int(coeff(poly, rank + 1))
    return (
        1
        + Fraction(rank * current, previous)
        - Fraction((rank + 1) * following, current)
    )


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(
            value.numerator.bit_length(),
            value.denominator.bit_length(),
        )
        - 52,
    )
    return (
        value.numerator >> shift
    ) / (value.denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43_595)
    parser.add_argument("--supports", type=int, default=3)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument(
        "--all-ranks",
        action="store_true",
        help="scan every internal rank instead of the required prefix",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rng = random.Random(args.seed)
    support_checks = 0
    rank_checks = 0
    first_failures = {
        "one_vertex_curvature": None,
        "lower_sandwich": None,
        "upper_sandwich": None,
        "one_step_upper": None,
        "drift_absent_component": None,
        "drift_present_component": None,
        "weighted_likelihood_deficit": None,
        "curvature_floor_seven": None,
        "linear_compensation": None,
        "ISO_reserve_T": None,
        "ISO_reserve_F": None,
        "ISO_reserve_cascade": None,
        "strong_ISO_reserve_cascade": None,
        "half_pointed_SR_lower_bound": None,
        "adaptive_pointed_SR_lower_bound": None,
        "T_curvature_floor_two": None,
        "c12": None,
        "half_local": None,
    }
    failures_by_alpha_gap: dict[str, dict[int, int]] = {
        name: {} for name in first_failures
    }
    minima: dict[str, tuple[Fraction, dict] | None] = {
        "one_vertex_curvature": None,
        "lower_sandwich": None,
        "upper_sandwich": None,
        "one_step_upper": None,
        "drift_absent_component": None,
        "drift_present_component": None,
        "weighted_likelihood_deficit": None,
        "curvature_floor_seven": None,
        "linear_compensation": None,
        "ISO_reserve_T": None,
        "ISO_reserve_F": None,
        "ISO_reserve_cascade": None,
        "strong_ISO_reserve_cascade": None,
        "half_pointed_SR_lower_bound": None,
        "adaptive_pointed_SR_lower_bound": None,
        "T_curvature_floor_two": None,
        "c12": None,
        "half_local": None,
    }

    def update(name: str, value: Fraction, item: dict) -> None:
        old = minima[name]
        if old is None or value < old[0]:
            minima[name] = (value, item)
        if value < 0 and first_failures[name] is None:
            first_failures[name] = item

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        full = fmpz_poly(record["polynomial"])
        alpha = full.degree()
        order = len(adjacency)
        cutoff = ceil_div(alpha * (order - 1), alpha + order)
        terminal_supports = []
        for support, neighbors in enumerate(adjacency):
            leaves = [
                neighbor
                for neighbor in neighbors
                if len(adjacency[neighbor]) == 1
            ]
            nonleaf_count = sum(
                len(adjacency[neighbor]) > 1 for neighbor in neighbors
            )
            if leaves and nonleaf_count <= 1:
                terminal_supports.append((support, leaves[0]))
        selected = (
            terminal_supports
            if len(terminal_supports) <= args.supports
            else rng.sample(terminal_supports, args.supports)
        )

        for support, leaf in selected:
            support_checks += 1
            t_poly = tree_polynomial(adjacency, deleted=leaf)
            delete_support = tree_polynomial(
                adjacency, deleted=support
            )
            f_poly = delete_support // (ONE + X)
            assert full == t_poly + X * f_poly
            assert f_poly.degree() == alpha - 1

            rank_stop = alpha if args.all_ranks else cutoff
            for rank in range(args.min_rank, rank_stop):
                r = rank - 1
                a = int(coeff(t_poly, r))
                ap = int(coeff(t_poly, rank))
                app = int(coeff(t_poly, rank + 1))
                bm = int(coeff(f_poly, r - 1))
                b = int(coeff(f_poly, r))
                bp = int(coeff(f_poly, rank))
                bpp = int(coeff(f_poly, rank + 1))
                if min(a, ap, bm, b, bp) <= 0:
                    continue
                rank_checks += 1
                u = Fraction(r * b, bm)
                w = Fraction(rank * bp, b)
                v = Fraction(rank * ap, a)
                y = Fraction((rank + 1) * app, ap)
                q_t = v - y + 1
                q_f = u - w + 1
                s = Fraction(b, a)
                theta = Fraction(bm, a + bm)
                gap = v - Fraction(rank, r) * u
                ordinary = (
                    v * q_t
                    + 2 * s * q_f
                    + s * u / r
                    - s
                    - theta * gap**2
                )
                same_rank = 2 * rank * v * q_t
                local = (
                    2 * rank * (ordinary - v * q_t)
                    + r * (rank * s - v) * q_f
                )
                eta = rank * q_t - r * q_f
                likelihood_deficit = max(Fraction(0), w - v)
                two_to_one_curvature = r * q_f + 2 * eta
                iso_reserve_t = rank - v + v * q_t
                iso_reserve_f = r - u + u * q_f
                one_step_deficit = u + 1 - v
                c_previous = a - b
                c_current = ap - bp
                drift_absent_component = (
                    q_f - Fraction(c_current, b)
                )
                drift_present_component = (
                    u
                    + 1
                    - Fraction(r * c_current, c_previous)
                    if c_previous
                    else None
                )
                iso_reserve_cascade = (
                    2 * rank * iso_reserve_t
                    - r * v * iso_reserve_f / u
                )
                strong_iso_reserve_cascade = (
                    iso_reserve_cascade
                    - (r + 2 + Fraction(r * r, u))
                    * one_step_deficit
                    - 2 * rank * r * likelihood_deficit
                )
                z_f = Fraction((rank + 1) * bpp, bp)
                iso_reserve_f_next = (
                    rank + w * w - w * z_f
                )
                # A=B+xC, while H=B-C counts rank-j sets in F
                # hitting the terminal neighbor set.
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
                    + 2 * rank * r * likelihood_deficit
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
                    "lower_sandwich": v - w,
                    "upper_sandwich":
                        Fraction(rank, r) * u - v,
                    "one_step_upper": u + 1 - v,
                    "drift_absent_component":
                        drift_absent_component,
                    "weighted_likelihood_deficit":
                        v - r * likelihood_deficit,
                    "curvature_floor_seven":
                        two_to_one_curvature - 7,
                    "linear_compensation":
                        v * two_to_one_curvature
                        - 2 * rank * r * likelihood_deficit,
                    "ISO_reserve_T": iso_reserve_t,
                    "ISO_reserve_F": iso_reserve_f,
                    "ISO_reserve_cascade":
                        iso_reserve_cascade,
                    "T_curvature_floor_two": q_t - 2,
                    "c12": same_rank + local,
                    "half_local": same_rank / 2 + local,
                }
                if drift_present_component is not None:
                    values["drift_present_component"] = (
                        drift_present_component
                    )
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
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "support": support,
                    "leaf": leaf,
                    "order": order,
                    "alpha": alpha,
                    "z": 2 * alpha - order,
                    "rank": rank,
                    "cutoff": cutoff,
                    "u": str(u),
                    "w": str(w),
                    "v": str(v),
                    "q_T": str(q_t),
                    "q_F": str(q_f),
                    "likelihood_deficit":
                        str(likelihood_deficit),
                    "two_to_one_curvature":
                        str(two_to_one_curvature),
                    "next_pointed_burden": str(burden_next),
                    "next_ISO_reserve": str(
                        iso_reserve_f_next
                    ),
                    "pointed_SR_threshold": str(
                        pointed_threshold
                    ),
                    "values": {
                        name: str(value)
                        for name, value in values.items()
                    },
                    "prufer_code_one_based":
                        record["prufer_code_one_based"],
                }
                for name, value in values.items():
                    update(name, value, item)
                    if value < 0:
                        gap_counts = failures_by_alpha_gap[name]
                        gap_counts[alpha - rank] = (
                            gap_counts.get(alpha - rank, 0) + 1
                        )

        if (record_index + 1) % 5000 == 0:
            print(
                f"records={record_index + 1:,}, "
                f"supports={support_checks:,}, ranks={rank_checks:,}",
                flush=True,
            )

    materialized = {}
    for name, entry in minima.items():
        if entry is None:
            materialized[name] = None
        else:
            value, item = entry
            materialized[name] = {
                "exact": str(value),
                "decimal": stable_float(value),
                "witness": item,
            }
    report = {
        "status": (
            "FAIL"
            if any(first_failures.values())
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {
            "corpus": str(args.corpus),
            "out": str(args.out),
        },
        "records": len(records),
        "support_checks": support_checks,
        "rank_checks": rank_checks,
        "minima": materialized,
        "first_failures": first_failures,
        "failures_by_alpha_gap": {
            name: {
                str(gap): count
                for gap, count in sorted(counts.items())
            }
            for name, counts in failures_by_alpha_gap.items()
        },
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "records": len(records),
                "support_checks": support_checks,
                "rank_checks": rank_checks,
                "minimum_decimals": {
                    name: (
                        None if entry is None else entry["decimal"]
                    )
                    for name, entry in materialized.items()
                },
                "failures": {
                    name: item is not None
                    for name, item in first_failures.items()
                },
                "elapsed_seconds": report["elapsed_seconds"],
                "report": str(args.out),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
