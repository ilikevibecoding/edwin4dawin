#!/usr/bin/env python3
"""Verify the factorial identity for the sharp mixed/Lambda bridge.

For n=q+1, the candidate bridge is

    M_q(H,v) >= (2q+1) Lambda_q(H-v).

This script proves by symbolic expansion the displayed factorial
formula for its remainder and independently checks it from forest
moments on every rooted unlabeled tree through a requested order.
It does not prove nonnegativity of the remainder.
"""

from __future__ import annotations

import argparse
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_mixed_payment_lambda_bridge import lambda_values, mixed_payment
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
    mixed_remainder,
)


def sharp_bridge_remainder(
    n: int,
    f0: int,
    f1: int,
    f2: int,
    g1: int,
    g2: int,
    a: int,
    b: int,
    c: int,
    d: int,
    e: int,
    r: int,
    s: int,
) -> int:
    return (
        f0
        * (
            2 * a * n * n
            - 6 * a * n
            - c * n
            - 2 * c
            + 2 * d * n
            - 2 * d
            - 3 * e * n
            + 2 * r
            - 3 * s
        )
        + 2 * b * (n + 1) * f1
        - a * n * f2
        + g1 * (2 * a * n - 8 * d * n + 8 * d - 8 * r)
        - 3 * a * n * g2
        + a
        * (
            -2 * c * n
            + 2 * d * n
            - 2 * d
            + 2 * n * r
            - 3 * n * s
        )
        + (2 * n + 1) * b * b
        - 8 * (n - 1) * d * r
        - 4 * r * r
    )


def symbolic_verification() -> None:
    n = sp.symbols("n", integer=True, positive=True)
    f0, f1, f2, g1, g2 = sp.symbols("f0 f1 f2 g1 g2")
    a, b, c, d, e, r, s = sp.symbols("a b c d e r s")

    mixed = mixed_remainder(
        n, f0, f1, f2, g1, g2, a, b, c, d, e, r, s
    )
    scaled_lambda = (n - 3) * a * a + b * b - a * c - 3 * a * e
    displayed = sharp_bridge_remainder(
        n, f0, f1, f2, g1, g2, a, b, c, d, e, r, s
    )
    assert sp.expand(mixed - (2 * n - 1) * scaled_lambda - displayed) == 0


def direct_audit(maximum_order: int) -> dict:
    rooted_trees = rank_checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None

    for order in range(1, maximum_order + 1):
        trees = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree0 in trees:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                rooted_trees += 1
                deleted = tree.subgraph(set(tree) - {root}).copy()
                residual = tree.subgraph(
                    set(tree) - {root} - set(tree[root])
                ).copy()

                f_h, g_h = factorial_sequences(tree)
                f_g, g_g = factorial_sequences(deleted)
                f_r, _ = factorial_sequences(residual)
                mixed = mixed_payment(tree, root)
                lam = lambda_values(deleted)

                for q in sorted(set(mixed) | set(lam)):
                    n = q + 1
                    formula = sharp_bridge_remainder(
                        n,
                        at(f_h, n),
                        at(f_h, n + 1),
                        at(f_h, n + 2),
                        at(g_h, n + 1),
                        at(g_h, n + 2),
                        at(f_g, n - 1),
                        at(f_g, n),
                        at(f_g, n + 1),
                        at(g_g, n),
                        at(g_g, n + 1),
                        at(f_r, n - 1),
                        at(f_r, n),
                    )
                    direct = factorial(q) ** 2 * (
                        mixed.get(q, 0) - (2 * q + 1) * lam.get(q, 0)
                    )
                    record = {
                        "order": order,
                        "root": root,
                        "rank_q": q,
                        "factorial_sharp_bridge_remainder": formula,
                    }
                    if formula != direct:
                        failures.append(
                            {
                                **record,
                                "direct_scaled_value": direct,
                            }
                        )
                    if minimum is None or formula < minimum[0]:
                        minimum = (formula, record)
                    rank_checks += 1

    return {
        "rooted_trees": rooted_trees,
        "rank_checks": rank_checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minimum_remainder": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=10)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "factorial_sharp_lambda_bridge_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic_verification()
    audit = direct_audit(args.maximum_order)
    report = {
        "status": (
            "PASS_FACTORIAL_SHARP_LAMBDA_BRIDGE_IDENTITY"
            if not audit["failure_count"]
            else "FAIL_FACTORIAL_SHARP_LAMBDA_BRIDGE_IDENTITY"
        ),
        "symbolic_identity": True,
        "maximum_unlabeled_tree_order": args.maximum_order,
        **audit,
        "warning": (
            "The identity is proved algebraically. Nonnegativity of "
            "the displayed remainder remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
