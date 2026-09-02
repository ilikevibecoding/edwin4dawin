#!/usr/bin/env python3
"""Exact scan of the pendant reserve under one ordinary leaf addition.

Let F be a tree with a marked root, augmented by q-1 isolated marked
vertices.  Put

    B = I(F),                 D = x I(F - all marked vertices),
    P = (1+x)^R (B+D),        S = xB.

The pendant child-weighted factorial reserve at rank k is

    Q_R(P,S;k) = (R-1) M(FP;k) + (R+1) X(FP,FS;k),

where F multiplies the coefficient of x^j by j!, M is the diagonal
Toeplitz minor, and X is the symmetric mixed diagonal minor.

For every non-root leaf w of a tree T, this script compares the state
of T-w with the state of T.  It checks the candidate monotonicity

    Q_R(T;k) >= Q_R(T-w;k)

at every rank.  It also records the most negative polarization term in

    Q_R(z+e;k)-Q_R(z;k) = Q_R(e;k) + cross_R(z,e;k)

and the largest exact compensation ratio -cross_R/Q_R(e).
"""

from __future__ import annotations

import argparse
import json
import time
from fractions import Fraction
from functools import lru_cache
from math import comb, factorial
from pathlib import Path

import networkx as nx


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return trim(out)


def sub(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] -= value
    return trim(out)


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, avalue in enumerate(a):
        for j, bvalue in enumerate(b):
            out[i + j] += avalue * bvalue
    return trim(out)


def trim(a: list[int]) -> list[int]:
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return a


def coeff(a: list[int], k: int) -> int:
    return a[k] if 0 <= k < len(a) else 0


def factorial_transform(a: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(a)]


def reserve_factorial(p: list[int], s: list[int], R: int, k: int) -> int:
    minor = coeff(p, k) ** 2 - coeff(p, k + 1) * coeff(p, k - 1)
    mixed = (
        2 * coeff(p, k) * coeff(s, k)
        - coeff(p, k + 1) * coeff(s, k - 1)
        - coeff(s, k + 1) * coeff(p, k - 1)
    )
    return (R - 1) * minor + (R + 1) * mixed


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode("ascii").strip()


class MaskIndependencePolynomial:
    """All induced-subgraph independence polynomials of one small graph."""

    def __init__(self, graph: nx.Graph):
        self.nodes = list(graph)
        self.position = {vertex: i for i, vertex in enumerate(self.nodes)}
        self.adjacency = [0] * len(self.nodes)
        for vertex in self.nodes:
            i = self.position[vertex]
            for neighbor in graph[vertex]:
                self.adjacency[i] |= 1 << self.position[neighbor]

    @lru_cache(maxsize=None)
    def polynomial(self, mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        excluded = self.polynomial(mask ^ bit)
        included_base = self.polynomial(
            mask & ~bit & ~self.adjacency[vertex]
        )
        included = (0,) + included_base
        size = max(len(excluded), len(included))
        result = [0] * size
        for i, value in enumerate(excluded):
            result[i] += value
        for i, value in enumerate(included):
            result[i] += value
        return tuple(trim(result))


def state_pair(
    whole_ip: list[int],
    root_deleted_ip: list[int],
    q: int,
    R: int,
) -> tuple[list[int], list[int]]:
    isolated_marked = [comb(q - 1, j) for j in range(q)]
    b = mul(isolated_marked, whole_ip)
    d = [0] + root_deleted_ip
    kernel = [comb(R, j) for j in range(R + 1)]
    p = mul(kernel, add(b, d))
    s = [0] + b
    return p, s


def ratio_payload(value: Fraction) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=12)
    parser.add_argument("--q-values", default="2,3,5,8")
    parser.add_argument("--R-values", default="2,3,5,8")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    q_values = [int(item) for item in args.q_values.split(",")]
    R_values = [int(item) for item in args.R_values.split(",")]

    started = time.time()
    comparisons = 0
    state_comparisons = 0
    negative_cross_terms = 0
    first_monotonicity_failure = None
    first_negative_cross = None
    worst_cross = None
    max_ratio = Fraction(0)
    max_ratio_witness = None
    per_order = []

    for n in range(2, args.max_order + 1):
        order_trees = 0
        order_states = 0
        order_comparisons = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(n)):
            order_trees += 1
            tree_code = graph6(tree)
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << n) - 1
            full_poly = list(ip.polynomial(full_mask))
            leaves = [v for v, degree in tree.degree if degree == 1]

            for root in tree:
                root_bit = 1 << ip.position[root]
                root_deleted = list(ip.polynomial(full_mask ^ root_bit))
                for leaf in leaves:
                    if leaf == root:
                        continue
                    parent = next(tree.neighbors(leaf))
                    if parent == root:
                        continue
                    leaf_bit = 1 << ip.position[leaf]
                    old_mask = full_mask ^ leaf_bit
                    old_poly = list(ip.polynomial(old_mask))
                    old_root_deleted = list(
                        ip.polynomial(old_mask ^ root_bit)
                    )
                    order_states += 1
                    state_comparisons += 1

                    for q in q_values:
                        for R in R_values:
                            old_p, old_s = state_pair(
                                old_poly, old_root_deleted, q, R
                            )
                            new_p, new_s = state_pair(
                                full_poly, root_deleted, q, R
                            )
                            increment_p = sub(new_p, old_p)
                            increment_s = sub(new_s, old_s)
                            old_pf = factorial_transform(old_p)
                            old_sf = factorial_transform(old_s)
                            new_pf = factorial_transform(new_p)
                            new_sf = factorial_transform(new_s)
                            increment_pf = factorial_transform(increment_p)
                            increment_sf = factorial_transform(increment_s)
                            upper = max(
                                len(new_p),
                                len(new_s),
                                len(old_p),
                                len(old_s),
                            )
                            for k in range(upper + 1):
                                old_value = reserve_factorial(
                                    old_pf, old_sf, R, k
                                )
                                new_value = reserve_factorial(
                                    new_pf, new_sf, R, k
                                )
                                increment_value = reserve_factorial(
                                    increment_pf, increment_sf, R, k
                                )
                                delta = new_value - old_value
                                cross = delta - increment_value
                                comparisons += 1
                                order_comparisons += 1

                                if delta < 0 or cross < 0:
                                    common = {
                                        "order": n,
                                        "tree_index": tree_index,
                                        "graph6": tree_code,
                                        "root": root,
                                        "leaf": leaf,
                                        "parent": parent,
                                        "q": q,
                                        "R": R,
                                        "rank": k,
                                        "old_reserve": old_value,
                                        "new_reserve": new_value,
                                        "delta": delta,
                                        "increment_reserve": (
                                            increment_value
                                        ),
                                        "cross": cross,
                                    }
                                    if (
                                        delta < 0
                                        and first_monotonicity_failure is None
                                    ):
                                        first_monotonicity_failure = common
                                if cross < 0:
                                    negative_cross_terms += 1
                                    if first_negative_cross is None:
                                        first_negative_cross = common
                                    if (
                                        worst_cross is None
                                        or cross < worst_cross["cross"]
                                    ):
                                        worst_cross = common
                                    if increment_value > 0:
                                        ratio = Fraction(
                                            -cross, increment_value
                                        )
                                        if ratio > max_ratio:
                                            max_ratio = ratio
                                            max_ratio_witness = common

        per_order.append(
            {
                "order": n,
                "trees": order_trees,
                "root_leaf_states": order_states,
                "rank_comparisons": order_comparisons,
            }
        )
        print(
            f"n={n}: trees={order_trees:,} "
            f"root-leaf states={order_states:,} "
            f"rank comparisons={order_comparisons:,}",
            flush=True,
        )
        if first_monotonicity_failure is not None:
            break

    payload = {
        "status": (
            "monotonicity_failure"
            if first_monotonicity_failure is not None
            else "no_monotonicity_failure"
        ),
        "parameters": {
            "max_order": args.max_order,
            "q_values": q_values,
            "R_values": R_values,
        },
        "totals": {
            "root_leaf_states": state_comparisons,
            "rank_comparisons": comparisons,
            "negative_cross_terms": negative_cross_terms,
        },
        "first_monotonicity_failure": first_monotonicity_failure,
        "first_negative_cross": first_negative_cross,
        "most_negative_cross": worst_cross,
        "maximum_compensation_ratio": ratio_payload(max_ratio),
        "maximum_compensation_ratio_witness": max_ratio_witness,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_monotonicity_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
