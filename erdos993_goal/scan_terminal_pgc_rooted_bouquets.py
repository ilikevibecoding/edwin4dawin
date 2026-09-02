#!/usr/bin/env python3
"""Exact terminal-PGC scan over bouquets of every small rooted tree.

For a rooted tree ``(T,r)``, let

    A = I(T),             E = I(T-r).

Attach ``a`` copies of ``(T,r)`` to a new centre and also attach one
terminal support having ``m`` leaf children.  At one of those leaves,

    Q = A^a ((1+x)^m+x) + x E^a (1+x)^m,
    B = (1+x)^(m-1) (A^a+xE^a).

The script enumerates all distinct polynomial states (A,E) arising from
rooted unlabeled trees through a specified order and tests the last
required prefix rank, or every required prefix rank, exactly.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from functools import lru_cache
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def trim(values: list[int]) -> tuple[int, ...]:
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return tuple(values)


class IndependencePolynomials:
    def __init__(self, graph: nx.Graph):
        self.nodes = list(graph)
        self.adjacency = [0] * len(self.nodes)
        position = {vertex: i for i, vertex in enumerate(self.nodes)}
        for vertex in self.nodes:
            i = position[vertex]
            for neighbor in graph[vertex]:
                self.adjacency[i] |= 1 << position[neighbor]

    @lru_cache(maxsize=None)
    def polynomial(self, mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        without_vertex = mask ^ bit
        excluded = self.polynomial(without_vertex)
        included_base = self.polynomial(
            without_vertex & ~self.adjacency[vertex]
        )
        included = (0,) + included_base
        result = [0] * max(len(excluded), len(included))
        for i, value in enumerate(excluded):
            result[i] += value
        for i, value in enumerate(included):
            result[i] += value
        return trim(result)


def rooted_states(max_order: int):
    unique: dict[tuple[tuple[int, ...], tuple[int, ...]], dict] = {}
    for order in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree in trees:
            engine = IndependencePolynomials(tree)
            full_mask = (1 << order) - 1
            total = engine.polynomial(full_mask)
            graph6 = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                excluded = engine.polynomial(full_mask ^ (1 << root))
                key = (total, excluded)
                unique.setdefault(
                    key,
                    {
                        "rooted_tree_order": order,
                        "root": root,
                        "graph6": graph6,
                        "total": list(total),
                        "excluded": list(excluded),
                    },
                )
    return list(unique.values())


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: Poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(0, max(numerator.bit_length(), denominator.bit_length()) - 52)
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root-order-max", type=int, default=10)
    parser.add_argument("--a-max", type=int, default=100)
    parser.add_argument("--m-max", type=int, default=15)
    parser.add_argument("--order-max", type=int, default=5000)
    parser.add_argument(
        "--state-index",
        type=int,
        help="scan only this 1-based index in the distinct rooted-state list",
    )
    parser.add_argument("--boundary-only", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    all_states = rooted_states(args.root_order_max)
    states = (
        [all_states[args.state_index - 1]]
        if args.state_index is not None
        else all_states
    )
    binomials = [(ONE + X) ** m for m in range(args.m_max + 1)]
    cases = 0
    rank_checks = 0
    closest_pair = None
    closest = None
    failure = None
    scaled_curvature_failure = None
    two_thirds_curvature_failure = None
    high_occupancy_scaled_curvature_failure = None
    closest_scaled_curvature_pair = None
    closest_scaled_curvature = None

    for state_index, state in enumerate(states, start=1):
        total = Poly(state["total"])
        excluded = Poly(state["excluded"])
        total_power = ONE
        excluded_power = ONE
        rooted_order = state["rooted_tree_order"]
        for branches in range(1, args.a_max + 1):
            total_power *= total
            excluded_power *= excluded
            for terminal_leaves in range(1, args.m_max + 1):
                order = 2 + branches * rooted_order + terminal_leaves
                if order > args.order_max:
                    break
                kernel = binomials[terminal_leaves]
                full = total_power * (kernel + X) + X * excluded_power * kernel
                deletion = binomials[terminal_leaves - 1] * (
                    total_power + X * excluded_power
                )
                cutoff = (2 * full.degree() + 1) // 3
                cases += 1
                ranks = (
                    [cutoff - 1]
                    if args.boundary_only and cutoff >= 3
                    else range(2, cutoff)
                )
                for k in ranks:
                    left = int(k * coeff(deletion, k - 2) * reserve(full, k))
                    right = int(
                        (k - 1)
                        * coeff(full, k - 1)
                        * reserve(deletion, k - 1)
                    )
                    difference = left - right
                    rank_checks += 1
                    item = {
                        "rooted_state": state,
                        "branches": branches,
                        "terminal_leaves": terminal_leaves,
                        "order": order,
                        "alpha": full.degree(),
                        "rank": k,
                        "cutoff": cutoff,
                    }
                    scaled_curvature_left = int(
                        k
                        * reserve(full, k)
                        * coeff(deletion, k - 2)
                        * coeff(deletion, k - 1)
                    )
                    scaled_curvature_right = int(
                        (k - 1)
                        * reserve(deletion, k - 1)
                        * coeff(full, k - 1)
                        * coeff(full, k)
                    )
                    if (
                        k >= 3
                        and scaled_curvature_left
                        < scaled_curvature_right
                        and scaled_curvature_failure is None
                    ):
                        scaled_curvature_failure = item | {
                            "scaled_curvature_left":
                                scaled_curvature_left,
                            "scaled_curvature_right":
                                scaled_curvature_right,
                            "scaled_curvature_difference":
                                scaled_curvature_left
                                - scaled_curvature_right,
                            "scaled_curvature_left_over_right":
                                stable_ratio(
                                    scaled_curvature_left,
                                    scaled_curvature_right,
                                ),
                            "leaf_occupancy": stable_ratio(
                                int(coeff(deletion, k - 1)),
                                int(coeff(full, k)),
                            ),
                        }
                    if (
                        k >= 3
                        and 3 * scaled_curvature_left
                        < 2 * scaled_curvature_right
                        and two_thirds_curvature_failure is None
                    ):
                        two_thirds_curvature_failure = item
                    if (
                        k >= 3
                        and 2 * coeff(deletion, k - 1)
                        >= coeff(full, k)
                        and scaled_curvature_left
                        < scaled_curvature_right
                        and
                        high_occupancy_scaled_curvature_failure is None
                    ):
                        high_occupancy_scaled_curvature_failure = item
                    if (
                        scaled_curvature_left > 0
                        and scaled_curvature_right > 0
                    ):
                        scaled_curvature_pair = (
                            scaled_curvature_left,
                            scaled_curvature_right,
                        )
                        if (
                            closest_scaled_curvature_pair is None
                            or
                            scaled_curvature_left
                            * closest_scaled_curvature_pair[1]
                            < closest_scaled_curvature_pair[0]
                            * scaled_curvature_right
                        ):
                            closest_scaled_curvature_pair = (
                                scaled_curvature_pair
                            )
                            closest_scaled_curvature = item | {
                                "scaled_curvature_left_over_right":
                                    stable_ratio(
                                        scaled_curvature_left,
                                        scaled_curvature_right,
                                    )
                            }
                    if difference < 0:
                        failure = item | {
                            "left": left,
                            "right": right,
                            "difference": difference,
                        }
                        break
                    if left > 0 and right >= 0:
                        pair = (right, left)
                        if (
                            closest_pair is None
                            or right * closest_pair[1] > closest_pair[0] * left
                        ):
                            closest_pair = pair
                            closest = item | {
                                "right_over_left": stable_ratio(right, left),
                                "margin_digits": len(str(difference)),
                                "left_digits": len(str(left)),
                            }
                if failure:
                    break
            if failure:
                break
        if state_index % 25 == 0 or failure or state_index == len(states):
            print(
                f"state={state_index:,}/{len(states):,}: "
                f"cases={cases:,}, checks={rank_checks:,}, "
                f"closest={closest['right_over_left']:.12g}",
                flush=True,
            )
        if failure:
            break

    report = {
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "distinct_rooted_polynomial_states": len(all_states),
        "scanned_rooted_polynomial_states": len(states),
        "cases": cases,
        "rank_checks": rank_checks,
        "closest": closest,
        "failure": failure,
        "scaled_curvature_failure": scaled_curvature_failure,
        "two_thirds_curvature_failure":
            two_thirds_curvature_failure,
        "high_occupancy_scaled_curvature_failure":
            high_occupancy_scaled_curvature_failure,
        "closest_scaled_curvature": closest_scaled_curvature,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
