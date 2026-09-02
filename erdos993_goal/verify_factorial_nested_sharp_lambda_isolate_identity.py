#!/usr/bin/env python3
"""Verify the factorial identity for isolate pruning of the sharp gap.

Let F be a forest with designated leaf l.  Add an isolated vertex z.
For the sharp Lambda recursion remainder E, the strengthened pruning
target is

    E_q(F+z,l)-E_q(F,l)-E_(q-1)(F,l) >= 0.

This script proves the exact factorial formula for that strong nested
remainder and replays it from exact forest moments.  It does not prove
the formula nonnegative.
"""

from __future__ import annotations

import argparse
import json
import random
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_edge_survival_ratio_dominance import random_forest
from scan_nested_sharp_lambda_forest_pruning import recursion_gap
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)
from verify_factorial_sharp_lambda_recursion_identity import (
    sharp_lambda_remainder,
)


def isolate_strong_remainder(
    q: int,
    Hp: int,
    A: int,
    B: int,
    C: int,
    Xp: int,
    X: int,
    ap: int,
    a: int,
    b: int,
    c: int,
    ep: int,
    e: int,
    rp: int,
    r: int,
) -> int:
    return q * (
        4 * A * a * q
        + 2 * A * a
        + 2 * A * ap * q * q
        - 8 * A * ap * q
        + 6 * A * ap
        + A * b * q
        + A * b
        - 3 * A * ep * q
        + 3 * A * ep
        - 3 * A * rp
        + B * a * q
        - 2 * B * ap * q
        + 2 * B * ap
        - C * ap * q
        + C * ap
        + 2 * Hp * a * q * q
        - 6 * Hp * a * q
        + 2 * Hp * ap * q * q
        - 2 * Hp * ap * q
        - 2 * Hp * b * q
        - 2 * Hp * b
        - Hp * c * q
        - 2 * Hp * c
        - 3 * Hp * e * q
        - 3 * Hp * r
        - 3 * X * ap * q
        + 3 * X * ap
        - 3 * Xp * a * q
        + 2 * a * a * q
        + 2 * a * b * q
        - 3 * a * q * rp
        - 2 * ap * b * q
        + 2 * ap * b
        - 2 * ap * c * q
        + 2 * ap * c
        - 3 * ap * q * r
        + 3 * ap * r
    )


def symbolic_verification() -> None:
    q = sp.symbols("q", integer=True, positive=True)
    Hp, A, B, C, Xp, X = sp.symbols("Hp A B C Xp X")
    ap, a, b, c, ep, e = sp.symbols("ap a b c ep e")
    rp, r = sp.symbols("rp r")

    old = sharp_lambda_remainder(q, A, B, C, X, a, b, c, e, r)
    with_isolate = sharp_lambda_remainder(
        q,
        A + q * Hp,
        B + (q + 1) * A,
        C + (q + 2) * B,
        X + q * Xp,
        a + (q - 1) * ap,
        b + q * a,
        c + (q + 1) * b,
        e + (q - 1) * ep,
        r + q * rp,
    )
    lower = sharp_lambda_remainder(
        q - 1,
        Hp,
        A,
        B,
        Xp,
        ap,
        a,
        b,
        ep,
        rp,
    )
    displayed = isolate_strong_remainder(
        q, Hp, A, B, C, Xp, X, ap, a, b, c, ep, e, rp, r
    )
    assert sp.expand(
        with_isolate - old - q**2 * lower - displayed
    ) == 0


def direct_audit(samples: int, maximum_order: int, seed: int) -> dict:
    rng = random.Random(seed)
    checked_forests = rank_checks = 0
    identity_failures: list[dict] = []
    negative_remainders: list[dict] = []
    minimum: tuple[int, dict] | None = None

    for sample in range(samples):
        base = random_forest(rng, 3, maximum_order)
        leaves = [v for v in base if base.degree(v) == 1]
        if not leaves:
            continue
        leaf = rng.choice(leaves)
        support = next(iter(base[leaf]))
        H = base.subgraph(set(base) - {leaf}).copy()
        G = base.subgraph(set(base) - {leaf, support}).copy()
        R = H.subgraph(
            set(H) - {support} - set(H[support])
        ).copy()

        f_h, g_h = factorial_sequences(H)
        f_g, g_g = factorial_sequences(G)
        f_r, _ = factorial_sequences(R)

        extended = base.copy()
        isolate = max(extended, default=-1) + 1
        extended.add_node(isolate)
        large = recursion_gap(extended, leaf)
        old = recursion_gap(base, leaf)

        ranks = set(large) | set(old) | {
            rank + 1 for rank in old
        }
        code = nx.to_graph6_bytes(
            base, header=False
        ).decode("ascii").strip()
        for q in sorted(rank for rank in ranks if rank >= 3):
            lower_formula = sharp_lambda_remainder(
                q - 1,
                at(f_h, q - 1),
                at(f_h, q),
                at(f_h, q + 1),
                at(g_h, q + 1),
                at(f_g, q - 2),
                at(f_g, q - 1),
                at(f_g, q),
                at(g_g, q),
                at(f_r, q - 1),
            )
            formula = isolate_strong_remainder(
                q,
                at(f_h, q - 1),
                at(f_h, q),
                at(f_h, q + 1),
                at(f_h, q + 2),
                at(g_h, q + 1),
                at(g_h, q + 2),
                at(f_g, q - 2),
                at(f_g, q - 1),
                at(f_g, q),
                at(f_g, q + 1),
                at(g_g, q),
                at(g_g, q + 1),
                at(f_r, q - 1),
                at(f_r, q),
            )
            direct = (
                factorial(q) ** 2
                * (
                large.get(q, 0)
                - old.get(q, 0)
                )
                - q**2 * lower_formula
            )
            record = {
                "sample": sample,
                "order": len(base),
                "graph6": code,
                "target_leaf": leaf,
                "rank_q": q,
                "factorial_strong_isolate_remainder": formula,
            }
            if formula != direct:
                identity_failures.append(
                    {**record, "direct_scaled_value": direct}
                )
            if formula < 0:
                negative_remainders.append(record)
            if minimum is None or formula < minimum[0]:
                minimum = (formula, record)
            rank_checks += 1
        checked_forests += 1

    return {
        "checked_forests": checked_forests,
        "rank_checks": rank_checks,
        "identity_failure_count": len(identity_failures),
        "identity_failures": identity_failures[:20],
        "negative_remainder_count": len(negative_remainders),
        "negative_remainders": negative_remainders[:20],
        "minimum_remainder": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=500)
    parser.add_argument("--maximum-order", type=int, default=100)
    parser.add_argument("--seed", type=int, default=994026)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "factorial_nested_sharp_lambda_isolate_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic_verification()
    audit = direct_audit(args.samples, args.maximum_order, args.seed)
    report = {
        "status": (
            "PASS_FACTORIAL_NESTED_SHARP_LAMBDA_ISOLATE_IDENTITY"
            if (
                not audit["identity_failure_count"]
                and not audit["negative_remainder_count"]
            )
            else "FAIL_FACTORIAL_NESTED_SHARP_LAMBDA_ISOLATE_IDENTITY"
        ),
        "symbolic_identity": True,
        **audit,
        "warning": (
            "The identity is proved algebraically. The nonnegative "
            "sample is evidence, not a general positivity proof."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
