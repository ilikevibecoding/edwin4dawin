#!/usr/bin/env python3
"""Verify the factorial form of the recursive leaf-payment identity.

For n=q+1, put

    f_k(X) = k! i_k(X),
    g_k(X) = (k-2)! b_k(X),

where b_k counts k-vertex subsets inducing exactly one edge.  In
these coordinates the scaled strong residual is

    U~_n = (n-3)f_n^2 + f_(n+1)^2 - f_n f_(n+2)
           + 2 f_n g_(n+1) - 3 f_n g_(n+2) - 4 g_(n+1)^2.

The script symbolically expands the mixed remainder left after the
complete lower-rank reserve is removed, then checks the formula
against direct forest moment calculations on all rooted unlabeled
trees through a requested order.
"""

from __future__ import annotations

import argparse
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_denominator_free_leaf_monotonicity import (
    independence_and_edge_sequences,
    payment_residuals,
)


def at(values: list[int], index: int) -> int:
    return values[index] if 0 <= index < len(values) else 0


def factorial_sequences(graph: nx.Graph) -> tuple[list[int], list[int]]:
    if not graph:
        return [1], [0]
    independent, surviving_edges = independence_and_edge_sequences(graph)
    maximum = len(independent) + 2
    f = [factorial(k) * at(independent, k) for k in range(maximum)]
    g = [
        0
        if k < 2
        else factorial(k - 2) * at(surviving_edges, k - 2)
        for k in range(maximum)
    ]
    return f, g


def scaled_strong(
    n: int,
    f0: int,
    f1: int,
    f2: int,
    g1: int,
    g2: int,
) -> int:
    return (
        (n - 3) * f0 * f0
        + f1 * f1
        - f0 * f2
        + 2 * f0 * g1
        - 3 * f0 * g2
        - 4 * g1 * g1
    )


def mixed_remainder(
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
        + f1 * (2 * b * n + 2 * b)
        - f2 * a * n
        + g1 * (2 * a * n - 8 * d * n + 8 * d - 8 * r)
        - 3 * g2 * a * n
        + 2 * a * a * n * n
        - 7 * a * a * n
        + 3 * a * a
        - 4 * a * c * n
        + a * c
        + 2 * a * d * n
        - 2 * a * d
        - 6 * a * e * n
        + 3 * a * e
        + 2 * a * n * r
        - 3 * a * n * s
        + 4 * b * b * n
        - 8 * d * n * r
        + 8 * d * r
        - 4 * r * r
    )


def symbolic_verification() -> None:
    n = sp.symbols("n", integer=True, positive=True)
    f0, f1, f2, g1, g2 = sp.symbols("f0 f1 f2 g1 g2")
    a, b, c, d, e, r, s = sp.symbols("a b c d e r s")

    old = scaled_strong(n, f0, f1, f2, g1, g2)
    new = scaled_strong(
        n,
        f0 + n * a,
        f1 + (n + 1) * b,
        f2 + (n + 2) * c,
        g1 + (n - 1) * d + r,
        g2 + n * e + s,
    )
    lower_one_unit = (
        (n - 3) * a * a
        + b * b
        - a * c
        + 2 * a * d
        - 3 * a * e
        - 4 * d * d
    )
    expected = mixed_remainder(
        n, f0, f1, f2, g1, g2, a, b, c, d, e, r, s
    )
    assert sp.expand(new - old - (n - 1) ** 2 * lower_one_unit - expected) == 0


def direct_audit(maximum_order: int) -> dict:
    rooted_trees = rank_checks = recurrence_checks = 0
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
                extended = tree.copy()
                leaf = order
                extended.add_edge(root, leaf)
                deleted = tree.subgraph(set(tree) - {root}).copy()
                residual = tree.subgraph(
                    set(tree) - {root} - set(tree[root])
                ).copy()

                f_h, g_h = factorial_sequences(tree)
                f_g, g_g = factorial_sequences(deleted)
                f_r, _ = factorial_sequences(residual)

                strong_h, _, _ = payment_residuals(tree)
                strong_f, _, _ = payment_residuals(extended)
                _, reserve_g, _ = (
                    payment_residuals(deleted)
                    if deleted
                    else ({}, {}, {})
                )

                maximum_rank = max(
                    set(strong_h) | set(strong_f), default=1
                )
                for q in range(2, maximum_rank + 1):
                    n = q + 1
                    direct = (
                        strong_f.get(q, 0)
                        - strong_h.get(q, 0)
                        - reserve_g.get(q - 1, 0)
                    )
                    formula = mixed_remainder(
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
                    if formula != factorial(q) ** 2 * direct:
                        raise AssertionError(
                            (
                                "mixed remainder mismatch",
                                order,
                                root,
                                q,
                                formula,
                                factorial(q) ** 2 * direct,
                            )
                        )
                    record = {
                        "order": order,
                        "root": root,
                        "rank_q": q,
                        "mixed_remainder": formula,
                    }
                    if minimum is None or formula < minimum[0]:
                        minimum = (formula, record)
                    rank_checks += 1

                # Independently check the two clean factorial recurrences.
                f_f, g_f = factorial_sequences(extended)
                upper = max(len(f_f), len(f_h), len(f_g), len(f_r))
                for k in range(upper):
                    assert at(f_f, k) == at(f_h, k) + k * at(f_g, k - 1)
                    assert at(g_f, k) == (
                        at(g_h, k)
                        + (k - 2) * at(g_g, k - 1)
                        + at(f_r, k - 2)
                    )
                    recurrence_checks += 1

    return {
        "rooted_trees": rooted_trees,
        "rank_checks": rank_checks,
        "factorial_recurrence_checks": recurrence_checks,
        "minimum_mixed_remainder": (
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
            "factorial_recursive_leaf_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic_verification()
    audit = direct_audit(args.maximum_order)
    report = {
        "status": "PASS",
        "symbolic_identity": True,
        "maximum_unlabeled_tree_order": args.maximum_order,
        **audit,
        "warning": (
            "The identity and recurrence are proved algebraically. "
            "Nonnegativity of the displayed mixed remainder is still "
            "a conjectural proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
