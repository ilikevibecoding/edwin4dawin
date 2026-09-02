#!/usr/bin/env python3
"""Exact rooted-product amplification search for Erdős Problem 993.

Let H be the certified 102-vertex tree whose independence polynomial A has
a strict log-concavity failure at its top index.  For a rooted tree (G, r),
put

    E = I(G-r),              J = I(G-N[r]).

The rooted product obtained by identifying r in one copy of G with every
vertex of H is again a tree, and its independence polynomial is

    sum_k A[k] x^k J(x)^k E(x)^(102-k).

This program enumerates non-isomorphic gadget trees and every root, merges
duplicate exact (E,J) states, and scores the resulting (usually much larger)
trees for a strict ascent after their first strict descent.  All polynomial
arithmetic and every coefficient comparison are exact.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from verify_perfect_matching_lc_failure import decorated_polynomial
from verify_strong_lc_32_tree import EXPECTED as STRONG_LC_32_POLYNOMIAL


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
BASE_ORDER = 102
BASE_POLYNOMIAL = decorated_polynomial()
BASE_DEGREE = len(BASE_POLYNOMIAL) - 1
STRONG_LC_32_ORDER = 32


def rooted_pair(
    adjacency: list[list[int]], root: int
) -> tuple[Poly, Poly]:
    """Return E=I(G-r) and J=I(G-N[r]) by rooted tree DP."""

    parent = [-2] * len(adjacency)
    parent[root] = -1
    order = [root]
    for vertex in order:
        for child in adjacency[vertex]:
            if parent[child] == -2:
                parent[child] = vertex
                order.append(child)

    excluded: dict[int, Poly] = {}
    forbidden: dict[int, Poly] = {}
    for vertex in reversed(order):
        e_poly = Poly([1])
        j_poly = Poly([1])
        for child in adjacency[vertex]:
            if parent[child] == vertex:
                e_poly *= excluded[child] + X * forbidden[child]
                j_poly *= excluded[child]
        excluded[vertex] = e_poly
        forbidden[vertex] = j_poly
    return excluded[root], forbidden[root]


def rooted_product_polynomial(
    e_poly: Poly,
    j_poly: Poly,
    base_polynomial: list[int] = BASE_POLYNOMIAL,
    base_order: int = BASE_ORDER,
) -> Poly:
    """Evaluate the exact homogeneous rooted-product transform."""

    base_degree = len(base_polynomial) - 1
    # Put A=xJ and B=E.  First evaluate the homogeneous degree-d part
    #
    #     H(A,B) = sum_(k=0)^d a_k A^k B^(d-k)
    #
    # by Horner's rule, then multiply by B^(n-d).  This is exactly the
    # displayed rooted-product formula, but avoids dozens of products
    # between already-large powers when the gadget scan reaches order 9+.
    a_poly = X * j_poly
    homogeneous = Poly([base_polynomial[-1]])
    b_power = Poly([1])
    for k in range(base_degree - 1, -1, -1):
        b_power *= e_poly
        homogeneous = (
            a_poly * homogeneous + base_polynomial[k] * b_power
        )
    return homogeneous * (e_poly ** (base_order - base_degree))


def better(left: dict, right: dict | None) -> bool:
    if right is None:
        return True
    left_ratio = left["profile"]["best_post_descent_ratio"]
    right_ratio = right["profile"]["best_post_descent_ratio"]
    if left_ratio is None:
        return False
    if right_ratio is None:
        return True
    return (
        left_ratio["numerator"] * right_ratio["denominator"]
        > right_ratio["numerator"] * left_ratio["denominator"]
    )


def write_checkpoint(
    output: Path,
    *,
    status: str,
    parameters: dict,
    tested_states: int,
    duplicate_states: int,
    completed_order: int,
    champion: dict | None,
    started: float,
    witness: dict | None = None,
) -> None:
    payload = {
        "status": status,
        "parameters": parameters,
        "tested_states": tested_states,
        "duplicate_states": duplicate_states,
        "completed_gadget_order": completed_order,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    if witness is not None:
        payload["witness"] = witness
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gadget-order-min", type=int, default=1)
    parser.add_argument("--gadget-order-max", type=int, default=10)
    parser.add_argument(
        "--base",
        choices=("perfect_matching_102", "strong_lc_32"),
        default="perfect_matching_102",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("rooted_product_amplification_search.json"),
    )
    args = parser.parse_args()
    if args.base == "perfect_matching_102":
        base_polynomial = BASE_POLYNOMIAL
        base_order = BASE_ORDER
    else:
        base_polynomial = STRONG_LC_32_POLYNOMIAL
        base_order = STRONG_LC_32_ORDER
    parameters = {
        "gadget_order_min": args.gadget_order_min,
        "gadget_order_max": args.gadget_order_max,
        "base": args.base,
        "base_order": base_order,
        "base_degree": len(base_polynomial) - 1,
    }

    seen: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()
    champion = None
    tested_states = 0
    duplicate_states = 0
    started = time.time()

    for gadget_order in range(
        args.gadget_order_min, args.gadget_order_max + 1
    ):
        new_at_order = 0
        graphs = (
            [nx.empty_graph(1)]
            if gadget_order == 1
            else nx.nonisomorphic_trees(gadget_order)
        )
        for graph in graphs:
            adjacency = [
                sorted(graph.neighbors(vertex))
                for vertex in range(gadget_order)
            ]
            edges = sorted([int(u), int(v)] for u, v in graph.edges())
            for root in range(gadget_order):
                e_poly, j_poly = rooted_pair(adjacency, root)
                state = (
                    tuple(int(value) for value in e_poly),
                    tuple(int(value) for value in j_poly),
                )
                if state in seen:
                    duplicate_states += 1
                    continue
                seen.add(state)
                new_at_order += 1
                tested_states += 1

                transformed = rooted_product_polynomial(
                    e_poly,
                    j_poly,
                    base_polynomial=base_polynomial,
                    base_order=base_order,
                )
                result_profile = profile(transformed)
                record = {
                    "gadget_order": gadget_order,
                    "gadget_root": root,
                    "gadget_edges": edges,
                    "E": list(state[0]),
                    "J": list(state[1]),
                    "base": args.base,
                    "rooted_product_order": base_order * gadget_order,
                    "rooted_product_degree": len(transformed) - 1,
                    "profile": result_profile,
                }
                if better(record, champion):
                    champion = record
                    ratio = result_profile["best_post_descent_ratio"]
                    print(
                        "champion "
                        f"states={tested_states} gadget_order={gadget_order} "
                        f"root={root} ratio={ratio['decimal']:.15f} "
                        f"first_descent={result_profile['first_descent']}",
                        flush=True,
                    )

                if not result_profile["unimodal"]:
                    first_descent = result_profile["first_descent"]
                    ascent = result_profile["first_post_descent_ascent"]
                    relevant = sorted(
                        {
                            first_descent,
                            first_descent + 1,
                            ascent,
                            ascent + 1,
                        }
                    )
                    record["witness_coefficients"] = {
                        str(index): int(transformed[index])
                        for index in relevant
                    }
                    write_checkpoint(
                        args.output,
                        status="counterexample",
                        parameters=parameters,
                        tested_states=tested_states,
                        duplicate_states=duplicate_states,
                        completed_order=gadget_order - 1,
                        champion=champion,
                        started=started,
                        witness=record,
                    )
                    print(
                        f"EXACT COUNTEREXAMPLE at gadget order {gadget_order}",
                        flush=True,
                    )
                    return 1

        write_checkpoint(
            args.output,
            status="running",
            parameters=parameters,
            tested_states=tested_states,
            duplicate_states=duplicate_states,
            completed_order=gadget_order,
            champion=champion,
            started=started,
        )
        print(
            f"completed gadget_order={gadget_order} "
            f"new_states={new_at_order} total_states={tested_states} "
            f"elapsed={time.time() - started:.3f}s",
            flush=True,
        )

    write_checkpoint(
        args.output,
        status="no_counterexample",
        parameters=parameters,
        tested_states=tested_states,
        duplicate_states=duplicate_states,
        completed_order=args.gadget_order_max,
        champion=champion,
        started=started,
    )
    print("no counterexample in requested range", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
