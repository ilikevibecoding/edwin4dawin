#!/usr/bin/env python3
"""Exact replay for the 2026-08-13 literature/final-route audit.

This script verifies the Schur-minor decomposition of the PGC functional,
the claw obstruction, the nested-PF no-go arithmetic, and an exact bounded
tree-pendant audit of the normalized Schur cross-rank term.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent


def coeff(poly: tuple[int, ...], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def add(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        coeff(a, i) + coeff(b, i) for i in range(max(len(a), len(b)))
    )


def multiply(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return tuple(out)


def independence_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    answer = (1,)
    for vertices in nx.connected_components(graph):
        tree = graph.subgraph(vertices)
        root = next(iter(vertices))

        def rooted(v: int, parent: int | None) -> tuple[tuple[int, ...], tuple[int, ...]]:
            excluded = (1,)
            included = (0, 1)
            for child in tree[v]:
                if child == parent:
                    continue
                child_excluded, child_included = rooted(child, v)
                excluded = multiply(excluded, add(child_excluded, child_included))
                included = multiply(included, child_excluded)
            return excluded, included

        excluded, included = rooted(root, None)
        answer = multiply(answer, add(excluded, included))
    return answer


def delta(poly: tuple[int, ...], k: int) -> int:
    return coeff(poly, k) ** 2 - coeff(poly, k - 1) * coeff(poly, k + 1)


def reserve(poly: tuple[int, ...], k: int) -> int:
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def h(poly: tuple[int, ...], k: int) -> Fraction:
    return Fraction(k * reserve(poly, k), coeff(poly, k - 1))


def normalized_schur(poly: tuple[int, ...], k: int) -> Fraction:
    return Fraction(k * k * delta(poly, k), coeff(poly, k - 1))


def first_difference(poly: tuple[int, ...], k: int) -> int:
    return k * (coeff(poly, k) - coeff(poly, k + 1))


def frac_json(value: Fraction) -> dict[str, int | str]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "text": str(value),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "final_route_literature_schur_lift_exact_20260813.json",
    )
    args = parser.parse_args()
    assert 2 <= args.max_order <= 18

    # Formal polynomial identity behind the new route.
    k, rkm1, rk, rkp1 = sp.symbols("k rkm1 rk rkp1")
    reserve_symbolic = k * rk**2 + rkm1 * rk - (k + 1) * rkm1 * rkp1
    decomposed = k * (rk**2 - rkm1 * rkp1) + rkm1 * (rk - rkp1)
    assert sp.expand(reserve_symbolic - decomposed) == 0

    # The claw itself prevents a universal exact polynomial-preserving
    # transformation from trees to claw-free graphs.
    x = sp.symbols("x")
    claw = x**3 + 3 * x**2 + 4 * x + 1
    claw_discriminant = int(sp.discriminant(claw, x))
    assert claw_discriminant == -31

    # Strong nested-PF algebra from the component-separated no-go note.
    nested_p = (1, 354, 3141, 4199, 1376)
    nested_b = (1, 352, 2756, 1376)
    nested_k = 2
    nested_schur = normalized_schur(nested_p, nested_k) - normalized_schur(
        nested_b, nested_k - 1
    )
    nested_first = first_difference(nested_p, nested_k) - first_difference(
        nested_b, nested_k - 1
    )
    nested_pgc = h(nested_p, nested_k) - h(nested_b, nested_k - 1)
    assert nested_schur == Fraction(-1561442, 59)
    assert nested_first == 288
    assert nested_pgc == Fraction(-1544450, 59)
    assert nested_schur + nested_first == nested_pgc

    # Exact bounded forest-specific test of the new normalized-Schur term.
    tree_count = 0
    pendant_instances = 0
    rank_checks = 0
    failure = None
    minimum = None
    minimum_item = None
    minimum_first = None
    minimum_first_item = None
    for n in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(n):
            tree_count += 1
            full = independence_polynomial(tree)
            alpha = len(full) - 1
            cutoff = (2 * alpha + 1) // 3
            for leaf in (v for v in tree if tree.degree(v) == 1):
                support = next(iter(tree[leaf]))
                reduced_graph = tree.copy()
                reduced_graph.remove_nodes_from((leaf, support))
                reduced = independence_polynomial(reduced_graph)
                pendant_instances += 1
                for rank in range(2, cutoff):
                    rank_checks += 1
                    schur_margin = normalized_schur(
                        full, rank
                    ) - normalized_schur(reduced, rank - 1)
                    first_margin = first_difference(
                        full, rank
                    ) - first_difference(reduced, rank - 1)
                    pgc_margin = h(full, rank) - h(reduced, rank - 1)
                    assert schur_margin + first_margin == pgc_margin
                    item = {
                        "order": n,
                        "edges": sorted(sorted(edge) for edge in tree.edges()),
                        "leaf": leaf,
                        "support": support,
                        "rank": rank,
                        "cutoff": cutoff,
                        "full": full,
                        "reduced": reduced,
                        "normalized_schur_margin": frac_json(schur_margin),
                        "first_difference_margin": first_margin,
                        "pgc_margin": frac_json(pgc_margin),
                    }
                    if schur_margin < 0 and failure is None:
                        failure = item
                    if minimum is None or schur_margin < minimum:
                        minimum = schur_margin
                        minimum_item = item
                    if minimum_first is None or first_margin < minimum_first:
                        minimum_first = first_margin
                        minimum_first_item = item

    assert failure is None
    assert minimum is not None and minimum_item is not None
    if args.max_order >= 5:
        assert minimum == Fraction(34, 5)
    assert minimum_first is not None and minimum_first_item is not None

    result = {
        "status": "PASS_EXACT_NOT_PROOF",
        "identity": {
            "formula": "H_k(r)=k^2*(r_k^2-r_(k-1)r_(k+1))/r_(k-1)+k*(r_k-r_(k+1))",
            "symbolic_remainder": "0",
        },
        "claw_free_exact_preservation_nogo": {
            "tree": "K_1,3",
            "independence_polynomial": [1, 4, 3, 1],
            "discriminant": claw_discriminant,
        },
        "nested_pf_abstract_nogo": {
            "P": nested_p,
            "B": nested_b,
            "rank": nested_k,
            "normalized_schur_margin": frac_json(nested_schur),
            "first_difference_margin": nested_first,
            "pgc_margin": frac_json(nested_pgc),
            "forest_realizable": False,
        },
        "bounded_tree_pendant_audit": {
            "max_order": args.max_order,
            "unlabeled_trees_orders_2_to_max": tree_count,
            "pendant_instances_with_multiplicity": pendant_instances,
            "required_prefix_rank_checks": rank_checks,
            "normalized_schur_failure": failure,
            "minimum_normalized_schur_margin": minimum_item,
            "minimum_first_difference_margin": minimum_first_item,
            "scope": "finite evidence only",
        },
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print("PASS_EXACT_NOT_PROOF")
    print(f"output={args.output}")
    print(f"output_sha256={digest}")
    print(f"trees={tree_count} pendant_instances={pendant_instances} rank_checks={rank_checks}")
    print(f"minimum_normalized_schur_margin={minimum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
