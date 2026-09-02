#!/usr/bin/env python3
"""Exact replay for the rank-two forest Schur-payment theorem.

The theorem is all-order in the number of forest vertices, but only at
rank k=2.  The second half of the script audits the same proposed payment
at every required PGC rank for every forest-polynomial pendant pair through
the requested finite order.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial


Polynomial = tuple[int, ...]
ROOT = Path(__file__).resolve().parent


def coeff(poly: Polynomial, k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def delta(poly: Polynomial, k: int) -> int:
    return coeff(poly, k) ** 2 - coeff(poly, k - 1) * coeff(poly, k + 1)


def normalized_schur(poly: Polynomial, k: int) -> Fraction:
    return Fraction(k * k * delta(poly, k), coeff(poly, k - 1))


def frac(value: Fraction) -> dict[str, int | str]:
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
        default=ROOT / "rank2_component_schur_payment_exact_20260813.json",
    )
    args = parser.parse_args()
    assert 4 <= args.max_order <= 18

    # Exact six-scalar form of the normalized cross-rank Schur payment.
    k, a, s, u, v, q0, q1, q2 = sp.symbols(
        "k a s u v q0 q1 q2", nonzero=True
    )
    bkm2, bkm1, bk, bkp1 = a, a * s, a * s * u, a * s * u * v
    pkm1 = a * (1 + s + q0)
    pk = a * s * (1 + u + q1)
    pkp1 = a * s * u * (1 + v + q2)
    full_ns = k**2 * (pk**2 / pkm1 - pkp1)
    reduced_ns = (k - 1) ** 2 * (bkm1**2 / bkm2 - bk)
    scalar = k**2 * (
        s * (1 + u + q1) ** 2 / (1 + s + q0)
        - u * (1 + v + q2)
    ) - (k - 1) ** 2 * (s - u)
    assert sp.factor(full_ns - reduced_ns - bkm1 * scalar) == 0

    # Symbolic rank-two count.  P is the independence polynomial of a
    # forest G on n vertices and m edges.  The support of the pendant leaf
    # has degree d, and W=sum_v binomial(deg(v),2).
    n, m, d, W = sp.symbols("n m d W", integer=True, positive=True)
    choose2 = lambda z: z * (z - 1) / 2
    choose3 = lambda z: z * (z - 1) * (z - 2) / 6
    p1 = n
    p2 = choose2(n) - m
    p3 = choose3(n) - m * (n - 2) + W
    b1 = n - 2
    b2 = choose2(n - 2) - (m - d)
    cleared = sp.factor(4 * (p2**2 - p1 * p3) - n * (b1**2 - b2))
    cleared6 = sp.expand(6 * cleared)
    expected = (
        2 * n**4
        - 3 * n**3
        + 7 * n**2
        - 6 * n
        + 24 * m**2
        - 30 * m * n
        + 6 * d * n
        - 24 * W * n
    )
    assert sp.expand(cleared6 - expected) == 0

    # W <= C(m,2), then monotonicity in 0 <= m <= n-1, then d >= 1.
    after_w = sp.expand(expected.subs(W, m * (m - 1) / 2))
    after_m = sp.factor(after_w.subs(m, n - 1))
    final_bound = sp.factor(after_m.subs(d, 1))
    assert final_bound == (n - 4) * (n - 2) * (2 * n**2 - 3 * n + 3)
    assert sp.simplify(
        sp.diff(after_w, m) + 6 * (4 * m * n - 8 * m + 3 * n)
    ) == 0

    # The coarse final lower bound is used only for n>=4.  The complete
    # pendant-forest list at orders two and three is immediate.
    small_order_margins = {
        "K2": normalized_schur((1, 2), 2) - normalized_schur((1,), 1),
        "P3": normalized_schur((1, 3, 1), 2)
        - normalized_schur((1, 1), 1),
        "K2_disjoint_K1": normalized_schur((1, 3, 2), 2)
        - normalized_schur((1, 1), 1),
    }
    assert small_order_margins == {
        "K2": Fraction(0),
        "P3": Fraction(1, 3),
        "K2_disjoint_K1": Fraction(13, 3),
    }

    # Enumerate distinct tree polynomials and distinct pendant deletion
    # pairs, then multiply by every admissible forest polynomial.  This is
    # exhaustive for polynomial data of pendant edges in forests.
    tree_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    pendant_pairs: list[set[tuple[Polynomial, Polynomial]]] = [
        set() for _ in range(args.max_order + 1)
    ]
    tree_counts = [0] * (args.max_order + 1)
    tree_polynomials[1].add((1, 1))
    tree_counts[1] = 1
    for order in range(2, args.max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            tree_counts[order] += 1
            ip = MaskIndependencePolynomial(tree)
            full_mask = (1 << order) - 1
            full = ip.polynomial(full_mask)
            tree_polynomials[order].add(full)
            for leaf in (vertex for vertex in tree if tree.degree(vertex) == 1):
                support = next(iter(tree.neighbors(leaf)))
                deletion_mask = (
                    full_mask
                    ^ (1 << ip.position[leaf])
                    ^ (1 << ip.position[support])
                )
                pendant_pairs[order].add((full, ip.polynomial(deletion_mask)))

    forest_polynomials: list[set[Polynomial]] = [
        set() for _ in range(args.max_order + 1)
    ]
    forest_polynomials[0].add((1,))
    for order in range(1, args.max_order + 1):
        generated: set[Polynomial] = set()
        for component_order in range(1, order + 1):
            for component in tree_polynomials[component_order]:
                for rest in forest_polynomials[order - component_order]:
                    generated.add(multiply(component, rest))
        forest_polynomials[order] = generated

    pair_instances = 0
    rank_checks = 0
    rank2_checks = 0
    failure = None
    minimum: Fraction | None = None
    minimum_item = None
    for component_order in range(2, args.max_order + 1):
        for component, deletion in pendant_pairs[component_order]:
            for common_order in range(args.max_order - component_order + 1):
                for common in forest_polynomials[common_order]:
                    pair_instances += 1
                    full = multiply(component, common)
                    reduced = multiply(deletion, common)
                    alpha = len(full) - 1
                    cutoff = (2 * alpha + 1) // 3
                    for rank in range(2, cutoff):
                        rank_checks += 1
                        if rank == 2:
                            rank2_checks += 1
                        margin = normalized_schur(full, rank) - normalized_schur(
                            reduced, rank - 1
                        )
                        item = {
                            "total_order": component_order + common_order,
                            "component_order": component_order,
                            "common_order": common_order,
                            "rank": rank,
                            "alpha": alpha,
                            "component": component,
                            "component_deletion": deletion,
                            "common": common,
                            "full": full,
                            "reduced": reduced,
                            "normalized_schur_margin": frac(margin),
                        }
                        if margin < 0 and failure is None:
                            failure = item
                        if minimum is None or margin < minimum:
                            minimum = margin
                            minimum_item = item

    assert failure is None
    assert minimum is not None and minimum_item is not None
    if args.max_order >= 5:
        assert minimum == Fraction(34, 5)

    result = {
        "status": "PASS_RANK2_THEOREM_AND_BOUNDED_ALL_RANK_AUDIT_NOT_PGC_PROOF",
        "theorem": {
            "scope": "every forest G with a pendant edge, n>=2, rank k=2",
            "normalized_schur_statement": (
                "4*Delta_2(I(G))/i_1(G) >= "
                "Delta_1(I(G-{leaf,support}))/i_0(G-{leaf,support})"
            ),
            "six_scalar_statement": (
                "4*(s*(1+u+q1)^2/(1+s+q0)-u*(1+v+q2)) >= s-u"
            ),
            "cleared_exact_numerator_times_6": str(expected),
            "forest_bounds": [
                "W=sum_v binomial(deg(v),2) <= binomial(m,2)",
                "m <= n-1",
                "d=deg(support) >= 1",
            ],
            "final_nonnegative_lower_bound_times_6": str(final_bound),
            "orders_2_and_3_direct_margins": {
                name: frac(value) for name, value in small_order_margins.items()
            },
        },
        "bounded_all_rank_audit": {
            "max_order": args.max_order,
            "unlabeled_trees_by_order": tree_counts,
            "tree_polynomials_by_order": [len(x) for x in tree_polynomials],
            "pendant_pairs_by_order": [len(x) for x in pendant_pairs],
            "forest_polynomials_by_order": [len(x) for x in forest_polynomials],
            "pair_instances": pair_instances,
            "required_prefix_rank_checks": rank_checks,
            "rank2_checks": rank2_checks,
            "failure": failure,
            "minimum": minimum_item,
            "scope": "finite evidence only for ranks k>=3",
        },
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(result["status"])
    print(f"output={args.output}")
    print(f"output_sha256={digest}")
    print(f"pair_instances={pair_instances} rank_checks={rank_checks}")
    print(f"minimum_normalized_schur_margin={minimum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
