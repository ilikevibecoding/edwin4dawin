#!/usr/bin/env python3
"""Verify the exact rank-5 leaf-induction reduction.

Let B be a tree, let p be a vertex, let D=B-p, and obtain G from B by
adjoining a new leaf at p.  Put

    a=i_4(B), b=i_5(B), c=i_6(B),
    d=i_3(D), e=i_4(D), f=i_5(D).

This script verifies

    Q_5(G)-Q_5(B) = d Q_5(B)/a + M/(5ad),

where M is the explicit rooted rank-4 payment defined below.  It can
also exhaustively test M and the rank-5 increment on unlabeled trees.

The exhaustive calculation is evidence, not a proof of M>=0 in all
orders.  The symbolic identity itself is exact.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass

import networkx as nx
import sympy as sp

from scan_fixed_rank_leaf_curvature_fast import all_root_states


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


def q5(polynomial) -> int:
    a = coefficient(polynomial, 4)
    b = coefficient(polynomial, 5)
    c = coefficient(polynomial, 6)
    return 10 * b * b - a * b - 12 * a * c


def q4_window(d: int, e: int, f: int) -> int:
    return 8 * e * e - d * e - 10 * d * f


def rooted_payment(
    a: int,
    b: int,
    d: int,
    e: int,
    f: int,
) -> int:
    q4 = q4_window(d, e, f)
    cross_error = (
        a * d * e * (a + d + 2 * e)
        + 2 * a * a * e * e
        - 50 * (b * d - a * e) ** 2
    )
    return 6 * a * (a + d) * q4 + cross_error


def symbolic_identity() -> None:
    a, b, c, d, e, f = sp.symbols(
        "a b c d e f", positive=True
    )
    old = 10 * b**2 - a * b - 12 * a * c
    new = (
        10 * (b + e) ** 2
        - (a + d) * (b + e)
        - 12 * (a + d) * (c + f)
    )
    delta = sp.expand(new - old)
    q4 = 8 * e**2 - d * e - 10 * d * f
    cross_error = (
        a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 50 * (b * d - a * e) ** 2
    )
    payment = 6 * a * (a + d) * q4 + cross_error
    assert sp.factor(delta - d * old / a - payment / (5 * a * d)) == 0


@dataclass
class Minimum:
    value: int
    tree_index: int
    vertex: int
    graph6: str
    window: tuple[int, int, int, int, int]


EXPECTED_PAYMENT_MINIMA = {
    10: 6_630_400,
    11: 144_818_450,
    12: 1_486_036_600,
    13: 10_735_454_100,
    14: 60_041_672_950,
    15: 280_061_275_500,
    16: 1_085_100_687_000,
    17: 3_643_641_110_080,
}

EXPECTED_INCREMENT_MINIMA = {
    10: 1_114,
    11: 7_599,
    12: 30_286,
    13: 94_983,
    14: 244_492,
    15: 554_988,
    16: 1_154_302,
    17: 2_209_040,
}


def exhaustive(max_order: int) -> None:
    for order in range(10, max_order + 1):
        minimum_payment = None
        minimum_increment = None
        trees = 0
        attachments = 0
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            root_deleted, whole = all_root_states(tree, 6)
            old = q5(whole)
            for vertex, deleted in root_deleted.items():
                attachments += 1
                a = coefficient(whole, 4)
                b = coefficient(whole, 5)
                d = coefficient(deleted, 3)
                e = coefficient(deleted, 4)
                f = coefficient(deleted, 5)
                if a == 0 or d == 0:
                    continue
                code = (
                    nx.to_graph6_bytes(tree, header=False)
                    .decode("ascii")
                    .strip()
                )
                payment = rooted_payment(a, b, d, e, f)
                payment_item = Minimum(
                    payment,
                    tree_index,
                    vertex,
                    code,
                    (a, b, d, e, f),
                )
                if (
                    minimum_payment is None
                    or payment < minimum_payment.value
                ):
                    minimum_payment = payment_item

                extended = list(whole)
                extended.extend([0] * (7 - len(extended)))
                for rank in range(1, 7):
                    extended[rank] += coefficient(deleted, rank - 1)
                increment = q5(extended) - old
                increment_item = Minimum(
                    increment,
                    tree_index,
                    vertex,
                    code,
                    (a, b, d, e, f),
                )
                if (
                    minimum_increment is None
                    or increment < minimum_increment.value
                ):
                    minimum_increment = increment_item

        assert minimum_payment is not None
        assert minimum_increment is not None
        if order in EXPECTED_PAYMENT_MINIMA:
            assert (
                minimum_payment.value
                == EXPECTED_PAYMENT_MINIMA[order]
            )
            assert (
                minimum_increment.value
                == EXPECTED_INCREMENT_MINIMA[order]
            )
        print(
            f"n={order} trees={trees:,} attachments={attachments:,} "
            f"min_M={minimum_payment.value} "
            f"min_delta_Q5={minimum_increment.value}",
            flush=True,
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=17)
    parser.add_argument("--identity-only", action="store_true")
    args = parser.parse_args()
    symbolic_identity()
    print("rank-5 leaf-induction identity: PASS")
    if not args.identity_only:
        exhaustive(args.max_order)
        print("finite rooted-payment test: PASS_NOT_PROOF")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
