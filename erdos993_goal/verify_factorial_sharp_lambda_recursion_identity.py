#!/usr/bin/env python3
"""Verify the factorial identity for the sharp Lambda leaf recursion.

Let F be obtained from H by attaching a new leaf at v, put
G=H-v and R=H-N_H[v].  The candidate inequality is

    Lambda_q(F)-Lambda_q(H)
      >= Lambda_(q-1)(G)+i_q(F)^2-i_q(H)^2.

This script proves by symbolic expansion the exact factorial formula
for the difference between the two sides and independently replays
the formula from forest moments on every leaf of every unlabeled tree
through a requested order.  It does not prove that the remainder is
nonnegative.
"""

from __future__ import annotations

import argparse
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_uniform_shift_moment_recursion import values
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


def scaled_lambda(
    q: int,
    f0: int,
    f1: int,
    f2: int,
    g2: int,
) -> int:
    """Return q!^2 Lambda_q in factorial coordinates."""
    return (
        (q - 2) * f0 * f0
        + f1 * f1
        - f0 * f2
        - 3 * f0 * g2
    )


def sharp_lambda_remainder(
    q: int,
    A: int,
    B: int,
    C: int,
    X: int,
    a: int,
    b: int,
    c: int,
    e: int,
    r: int,
) -> int:
    """The displayed q!^2-scaled sharp-recursion remainder."""
    return (
        A
        * (
            2 * a * q * q
            - 6 * a * q
            - c * q
            - 2 * c
            - 3 * e * q
            - 3 * r
        )
        + 2 * (q + 1) * B * b
        - q * a * C
        - 3 * q * a * X
        - 2 * q * a * c
        - 3 * q * a * r
        + (2 * q + 1) * b * b
    )


def symbolic_verification() -> None:
    q = sp.symbols("q", integer=True, positive=True)
    A, B, C, X = sp.symbols("A B C X")
    a, b, c, e, r = sp.symbols("a b c e r")

    old = scaled_lambda(q, A, B, C, X)
    new = scaled_lambda(
        q,
        A + q * a,
        B + (q + 1) * b,
        C + (q + 2) * c,
        X + q * e + r,
    )
    lower = scaled_lambda(q - 1, a, b, c, e)
    count_square_increment = (A + q * a) ** 2 - A**2
    displayed = sharp_lambda_remainder(
        q, A, B, C, X, a, b, c, e, r
    )
    assert sp.expand(
        new
        - old
        - q**2 * lower
        - count_square_increment
        - displayed
    ) == 0


def direct_audit(maximum_order: int) -> dict:
    checked_trees = checked_leaves = rank_checks = 0
    identity_failures: list[dict] = []
    negativity_witnesses: list[dict] = []
    minimum: tuple[int, dict] | None = None

    for order in range(2, maximum_order + 1):
        order_trees = 0
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            order_trees += 1
            checked_trees += 1

            for leaf in [v for v in tree if tree.degree(v) == 1]:
                support = next(iter(tree[leaf]))
                H = tree.subgraph(set(tree) - {leaf}).copy()
                G = H.subgraph(set(H) - {support}).copy()
                R = H.subgraph(
                    set(H) - {support} - set(H[support])
                ).copy()

                f_h, g_h = factorial_sequences(H)
                f_g, g_g = factorial_sequences(G)
                f_r, _ = factorial_sequences(R)

                lambda_f = values(tree)
                lambda_h = values(H) if H else {}
                lambda_g = values(G) if G else {}

                ranks = sorted(
                    q
                    for q in set(lambda_f) | set(lambda_h)
                    if q >= 3
                )
                for q in ranks:
                    formula = sharp_lambda_remainder(
                        q,
                        at(f_h, q),
                        at(f_h, q + 1),
                        at(f_h, q + 2),
                        at(g_h, q + 2),
                        at(f_g, q - 1),
                        at(f_g, q),
                        at(f_g, q + 1),
                        at(g_g, q + 1),
                        at(f_r, q),
                    )

                    full_lambda = lambda_f.get(q, (0, 0, 0, 0))[0]
                    old_lambda = lambda_h.get(q, (0, 0, 0, 0))[0]
                    lower_lambda = lambda_g.get(
                        q - 1, (0, 0, 0, 0)
                    )[0]
                    full_count = lambda_f.get(
                        q, (0, 0, 0, 0)
                    )[3]
                    old_count = lambda_h.get(
                        q, (0, 0, 0, 0)
                    )[3]
                    direct = factorial(q) ** 2 * (
                        full_lambda
                        - old_lambda
                        - lower_lambda
                        - full_count**2
                        + old_count**2
                    )
                    record = {
                        "order": order,
                        "graph6": code,
                        "leaf": leaf,
                        "support": support,
                        "rank_q": q,
                        "factorial_sharp_lambda_remainder": formula,
                    }
                    if formula != direct:
                        identity_failures.append(
                            {
                                **record,
                                "direct_scaled_value": direct,
                            }
                        )
                    if formula < 0:
                        negativity_witnesses.append(record)
                    if minimum is None or formula < minimum[0]:
                        minimum = (formula, record)
                    rank_checks += 1
                checked_leaves += 1

        print(
            f"order={order} trees={order_trees} "
            f"rank_checks={rank_checks} "
            f"identity_failures={len(identity_failures)}",
            flush=True,
        )

    return {
        "checked_trees": checked_trees,
        "checked_leaves": checked_leaves,
        "rank_checks": rank_checks,
        "identity_failure_count": len(identity_failures),
        "identity_failures": identity_failures[:20],
        "negative_remainder_count": len(negativity_witnesses),
        "negative_remainders": negativity_witnesses[:20],
        "minimum_remainder": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=11)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "factorial_sharp_lambda_recursion_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic_verification()
    audit = direct_audit(args.maximum_order)
    report = {
        "status": (
            "PASS_FACTORIAL_SHARP_LAMBDA_RECURSION_IDENTITY"
            if (
                not audit["identity_failure_count"]
                and not audit["negative_remainder_count"]
            )
            else "FAIL_FACTORIAL_SHARP_LAMBDA_RECURSION_IDENTITY"
        ),
        "symbolic_identity": True,
        "maximum_unlabeled_tree_order": args.maximum_order,
        **audit,
        "warning": (
            "The identity is proved algebraically. Its nonnegative "
            "finite census is evidence, not a general positivity proof."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
