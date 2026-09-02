#!/usr/bin/env python3
"""Probe a subset-pair decomposition of the star-root PIRD minor.

Expand

  K = sum_R x^|R| (1+x)^(M-A_R)

over sets R of selected star centres.  After combining the two
empty-centre contributions,

  B = (1+x)(K+xL)
    = (1+x)^(M+2)
      + sum_(R nonempty) x^|R| (1+x)^(M-A_R+1).

This script asks whether every diagonal term and every symmetrized
pair of subset terms is nonnegative in the ratio minor Delta(B,K).
"""

from __future__ import annotations

import argparse
import json
from itertools import combinations
from math import comb
from pathlib import Path

from find_min_star_root_pird_failure import partitions_with_cost


def shifted_binomial(shift: int, power: int) -> list[int]:
    return [0] * shift + [comb(power, j) for j in range(power + 1)]


def coefficient(poly: list[int], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def minor(p: list[int], q: list[int], k: int) -> int:
    return (
        coefficient(p, k + 1) * coefficient(q, k)
        - coefficient(p, k) * coefficient(q, k + 1)
    )


def components(branches: tuple[int, ...]):
    total_leaves = sum(branches)
    out = []
    for mask in range(1 << len(branches)):
        selected = [
            i for i in range(len(branches)) if mask & (1 << i)
        ]
        shift = len(selected)
        removed = sum(branches[i] for i in selected)
        g = shifted_binomial(shift, total_leaves - removed)
        b_extra = 2 if mask == 0 else 1
        f = shifted_binomial(
            shift,
            total_leaves - removed + b_extra,
        )
        out.append((mask, f, g))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=20)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = diagonal_checks = pair_checks = interval_checks = 0
    union_checks = intersection_checks = 0
    first_diagonal_failure = None
    first_pair_failure = None
    first_interval_failure = None
    first_union_failure = None
    first_intersection_failure = None
    first_slice_unimodality_failure = None
    first_slice_log_concavity_failure = None
    first_slice_ulc_failure = None
    first_slice_orientation_failure = None
    first_center_count_cumulative_failure = None
    minimum_empty_compensation_ratio = None
    minimum_empty_compensation_item = None

    for order in range(1, args.n_max + 1):
        for branches in partitions_with_cost(order - 1):
            instances += 1
            terms = components(branches)
            max_degree = max(
                max(len(f), len(g))
                for _, f, g in terms
            )
            bivariate: dict[tuple[int, int], int] = {}
            for mask_r, f_r, _ in terms:
                for mask_t, _, g_t in terms:
                    if mask_r & mask_t:
                        continue
                    for i, fi in enumerate(f_r):
                        if not fi:
                            continue
                        for j, gj in enumerate(g_t):
                            if gj:
                                bivariate[(i, j)] = (
                                    bivariate.get((i, j), 0)
                                    + fi * gj
                                )
            maximum_total = max(
                (i + j for i, j in bivariate),
                default=0,
            )
            for total in range(maximum_total + 1):
                values = [
                    bivariate.get((i, total - i), 0)
                    for i in range(total + 1)
                ]
                modes = [
                    i
                    for i, value in enumerate(values)
                    if value == max(values)
                ]
                if (
                    first_slice_orientation_failure is None
                    and max(modes) < (total + 1) // 2
                ):
                    first_slice_orientation_failure = {
                        "order": order,
                        "branches": list(branches),
                        "total_degree": total,
                        "values": values,
                        "modes": modes,
                    }
                first_mode = modes[0]
                if any(
                    values[i] > values[i + 1]
                    for i in range(first_mode)
                ) or any(
                    values[i] < values[i + 1]
                    for i in range(first_mode, total)
                ):
                    if first_slice_unimodality_failure is None:
                        first_slice_unimodality_failure = {
                            "order": order,
                            "branches": list(branches),
                            "total_degree": total,
                            "values": values,
                            "modes": modes,
                        }
                for i in range(1, total):
                    if values[i] * values[i] < values[i - 1] * values[i + 1]:
                        if first_slice_log_concavity_failure is None:
                            first_slice_log_concavity_failure = {
                                "order": order,
                                "branches": list(branches),
                                "total_degree": total,
                                "index": i,
                                "values": values,
                            }
                        break
                    if (
                        values[i] * values[i]
                        * i
                        * (total - i)
                        <
                        values[i - 1]
                        * values[i + 1]
                        * (i + 1)
                        * (total - i + 1)
                    ):
                        if first_slice_ulc_failure is None:
                            first_slice_ulc_failure = {
                                "order": order,
                                "branches": list(branches),
                                "total_degree": total,
                                "index": i,
                                "values": values,
                            }
                        break
            for k in range(max_degree):
                for mask, f, g in terms:
                    value = minor(f, g, k)
                    diagonal_checks += 1
                    if value < 0 and first_diagonal_failure is None:
                        first_diagonal_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "mask": mask,
                            "value": value,
                        }
                for (mask_r, f_r, g_r), (
                    mask_t,
                    f_t,
                    g_t,
                ) in combinations(terms, 2):
                    value = (
                        minor(f_r, g_t, k)
                        + minor(f_t, g_r, k)
                    )
                    pair_checks += 1
                    if value < 0 and first_pair_failure is None:
                        first_pair_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "mask_r": mask_r,
                            "mask_t": mask_t,
                            "value": value,
                        }
                interval_sums: dict[tuple[int, int], int] = {}
                for mask_r, f_r, _ in terms:
                    for mask_t, _, g_t in terms:
                        key = (mask_r & mask_t, mask_r | mask_t)
                        interval_sums[key] = (
                            interval_sums.get(key, 0)
                            + minor(f_r, g_t, k)
                        )
                for (intersection, union), value in interval_sums.items():
                    interval_checks += 1
                    if value < 0 and first_interval_failure is None:
                        first_interval_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "intersection": intersection,
                            "union": union,
                            "value": value,
                        }
                union_sums: dict[int, int] = {}
                intersection_sums: dict[int, int] = {}
                for (intersection, union), value in interval_sums.items():
                    union_sums[union] = union_sums.get(union, 0) + value
                    intersection_sums[intersection] = (
                        intersection_sums.get(intersection, 0) + value
                    )
                for union, value in union_sums.items():
                    union_checks += 1
                    if value < 0 and first_union_failure is None:
                        first_union_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "union": union,
                            "value": value,
                        }
                for intersection, value in intersection_sums.items():
                    intersection_checks += 1
                    if value < 0 and first_intersection_failure is None:
                        first_intersection_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "intersection": intersection,
                            "value": value,
                        }
                empty_base = 0
                for mask_r, f_r, g_r in terms:
                    for mask_t, f_t, g_t in terms:
                        if mask_r & mask_t:
                            continue
                        # Remove the special extra x(1+x)L from f_empty.
                        if mask_r == 0:
                            baseline_f_r = [
                                coefficient(g_r, j)
                                + coefficient(g_r, j - 1)
                                for j in range(len(g_r) + 1)
                            ]
                        else:
                            baseline_f_r = f_r
                        empty_base += minor(
                            baseline_f_r,
                            g_t,
                            k,
                        )
                empty_total = intersection_sums.get(0, 0)
                empty_extra = empty_total - empty_base
                if empty_extra < 0:
                    ratio = (empty_base, -empty_extra)
                    if (
                        minimum_empty_compensation_ratio is None
                        or ratio[0] * minimum_empty_compensation_ratio[1]
                        < minimum_empty_compensation_ratio[0] * ratio[1]
                    ):
                        minimum_empty_compensation_ratio = ratio
                        minimum_empty_compensation_item = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "empty_base": empty_base,
                            "empty_extra": empty_extra,
                            "empty_total": empty_total,
                        }
                by_center_count: dict[int, int] = {}
                for mask_r, f_r, _ in terms:
                    for mask_t, _, g_t in terms:
                        if mask_r & mask_t:
                            continue
                        center_count = (
                            mask_r.bit_count() + mask_t.bit_count()
                        )
                        by_center_count[center_count] = (
                            by_center_count.get(center_count, 0)
                            + minor(f_r, g_t, k)
                        )
                running = 0
                for center_count in sorted(by_center_count):
                    running += by_center_count[center_count]
                    if (
                        running < 0
                        and first_center_count_cumulative_failure is None
                    ):
                        first_center_count_cumulative_failure = {
                            "order": order,
                            "branches": list(branches),
                            "k": k,
                            "through_center_count": center_count,
                            "running_value": running,
                            "by_center_count": by_center_count,
                        }
            if first_union_failure and first_intersection_failure:
                break
        if first_union_failure and first_intersection_failure:
            break

    report = {
        "status": (
            "COARSE_DECOMPOSITIONS_FAILED"
            if first_union_failure and first_intersection_failure
            else "PASS_NOT_PROOF"
        ),
        "n_max": args.n_max,
        "instances": instances,
        "diagonal_checks": diagonal_checks,
        "pair_checks": pair_checks,
        "interval_checks": interval_checks,
        "union_checks": union_checks,
        "intersection_checks": intersection_checks,
        "first_diagonal_failure": first_diagonal_failure,
        "first_pair_failure": first_pair_failure,
        "first_interval_failure": first_interval_failure,
        "first_union_failure": first_union_failure,
        "first_intersection_failure": first_intersection_failure,
        "first_slice_unimodality_failure":
            first_slice_unimodality_failure,
        "first_slice_log_concavity_failure":
            first_slice_log_concavity_failure,
        "first_slice_ulc_failure":
            first_slice_ulc_failure,
        "first_slice_orientation_failure":
            first_slice_orientation_failure,
        "first_center_count_cumulative_failure":
            first_center_count_cumulative_failure,
        "minimum_empty_compensation": (
            None
            if minimum_empty_compensation_ratio is None
            else {
                "ratio_exact":
                    f"{minimum_empty_compensation_ratio[0]}/"
                    f"{minimum_empty_compensation_ratio[1]}",
                **minimum_empty_compensation_item,
            }
        ),
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if report["status"].endswith("FAILED") else 0


if __name__ == "__main__":
    raise SystemExit(main())
