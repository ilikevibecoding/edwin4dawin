#!/usr/bin/env python3
"""Stress the pointed ISO inequality after adjoining isolated vertices."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)


def conv(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    return out


def coeff(poly, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-core-order", type=int, default=12)
    parser.add_argument("--max-isolates", type=int, default=50)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = checks = failures = 0
    maximum_ratio = None
    maximum_item = None
    minimum_margin = None
    minimum_item = None
    rank_weighted_failures = 0
    first_rank_weighted_failure = None
    maximum_rank_weighted_ratio = None
    maximum_rank_weighted_item = None

    for order in range(1, args.max_core_order + 1):
        tree_iter = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree_index, tree in enumerate(tree_iter):
            engine = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            core_b = list(engine.polynomial(full_mask))
            code = graph6(tree)
            for root in tree:
                root_mask = full_mask ^ (1 << engine.position[root])
                core_c = list(engine.polynomial(root_mask))
                core_h = [
                    coeff(core_b, j) - coeff(core_c, j)
                    for j in range(len(core_b))
                ]
                for isolates in range(args.max_isolates + 1):
                    factor = [comb(isolates, j) for j in range(isolates + 1)]
                    b_poly = conv(core_b, factor)
                    h_poly = conv(core_h, factor)
                    instances += 1
                    for r in range(1, len(b_poly)):
                        bm = coeff(b_poly, r - 1)
                        b = coeff(b_poly, r)
                        bp = coeff(b_poly, r + 1)
                        if min(bm, b) <= 0:
                            continue
                        u = Fraction(r * b, bm)
                        if u < r:
                            continue
                        checks += 1
                        rho_m = Fraction(coeff(h_poly, r - 1), bm)
                        rho = Fraction(coeff(h_poly, r), b)
                        reserve = Fraction(
                            r
                            * (
                                r * b * b
                                + bm * bm
                                - (r + 1) * bm * bp
                            ),
                            bm * bm,
                        )
                        burden = (
                            r * (u + 1) * rho_m
                            - (r + 1) * u * rho
                        )
                        margin = reserve - 2 * burden
                        rank_weighted_margin = reserve - r * burden
                        item = {
                            "core_order": order,
                            "tree_index": tree_index,
                            "graph6": code,
                            "root": root,
                            "isolates": isolates,
                            "total_order": order + isolates,
                            "rank_r": r,
                            "u": str(u),
                            "ISO_reserve": str(reserve),
                            "occupancy_burden": str(burden),
                            "pointed_ISO_margin": str(margin),
                            "rank_weighted_pointed_margin":
                                str(rank_weighted_margin),
                        }
                        if margin < 0:
                            failures += 1
                        if rank_weighted_margin < 0:
                            rank_weighted_failures += 1
                            if first_rank_weighted_failure is None:
                                first_rank_weighted_failure = item
                        if minimum_margin is None or margin < minimum_margin:
                            minimum_margin, minimum_item = margin, item
                        if burden > 0 and reserve > 0:
                            ratio = burden / reserve
                            if maximum_ratio is None or ratio > maximum_ratio:
                                maximum_ratio, maximum_item = ratio, item
                            weighted_ratio = r * ratio
                            if (
                                maximum_rank_weighted_ratio is None
                                or weighted_ratio
                                > maximum_rank_weighted_ratio
                            ):
                                maximum_rank_weighted_ratio = (
                                    weighted_ratio
                                )
                                maximum_rank_weighted_item = item
        print(
            f"core_n={order}: instances={instances:,} "
            f"checks={checks:,} failures={failures:,}",
            flush=True,
        )

    def encode(value, item):
        if value is None:
            return None
        return {"exact": str(value), "float": float(value), **item}

    report = {
        "max_core_order": args.max_core_order,
        "max_isolates": args.max_isolates,
        "instances": instances,
        "u_ge_r_checks": checks,
        "failures": failures,
        "rank_weighted_failures": rank_weighted_failures,
        "first_rank_weighted_failure": first_rank_weighted_failure,
        "maximum_burden_to_reserve": encode(
            maximum_ratio, maximum_item
        ),
        "minimum_pointed_ISO_margin": encode(
            minimum_margin, minimum_item
        ),
        "maximum_rank_times_burden_to_reserve": encode(
            maximum_rank_weighted_ratio,
            maximum_rank_weighted_item,
        ),
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
