#!/usr/bin/env python3
"""Falsify an abstract weighted-minor branching closure.

For P=sum p_k x^k put h_k(P)=k! p_k and

    WM_P(m,n)=h_m h_n-h_{m+1}h_{n-1},  m>=n.

A rooted state has A=U+D, D=xJ.  Exact no-unary HIT data suggest

    WM_A(m,n) >= WM_D(m,n)                         (WMD)

for every ordered pair.  Its diagonal implies ULC(infinity), hence the
ordered log-concavity inequality needed in the Erdős-993 prefix program.

This script generates abstract coefficient states satisfying ULC(infinity),
WMD, the exact first two forest coefficients, and the order-three
forest-moment tests, then combines at least two children by the true rooted
recurrence.  A failure shows which extra tree structure a proof needs.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from math import comb, factorial, isqrt
from pathlib import Path

from synthetic_branching_identity_search import (
    forest_first3_valid,
)
from toeplitz_pair_closure_search import add, mul, partial_failure, shift


def coeff(p: list[int], k: int) -> int:
    return p[k] if 0 <= k < len(p) else 0


def is_ulc_infinity(p: list[int]) -> bool:
    return all(
        k * coeff(p, k) ** 2
        >= (k + 1) * coeff(p, k - 1) * coeff(p, k + 1)
        for k in range(1, len(p))
    )


def weighted_minor(p: list[int], m: int, n: int) -> int:
    return (
        factorial(m)
        * factorial(n)
        * coeff(p, m)
        * coeff(p, n)
        - factorial(m + 1)
        * factorial(n - 1)
        * coeff(p, m + 1)
        * coeff(p, n - 1)
        if n > 0
        else factorial(m) * coeff(p, m) * coeff(p, 0)
    )


def weighted_invariant_failure(
    a: list[int], d: list[int]
) -> dict | None:
    upper = max(len(a), len(d))
    for m in range(upper + 1):
        for n in range(m + 1):
            reserve = weighted_minor(a, m, n) - weighted_minor(d, m, n)
            if reserve < 0:
                return {"m": m, "n": n, "reserve": reserve}
    return None


def factorial_transform(p: list[int]) -> list[int]:
    return [factorial(k) * value for k, value in enumerate(p)]


def weighted_partial_failure(
    p: list[int], q: list[int]
) -> dict | None:
    return partial_failure(factorial_transform(p), factorial_transform(q))


def ceil_sqrt_ratio(numerator: int, denominator: int) -> int:
    q, r = divmod(numerator, denominator)
    root = isqrt(q)
    while root * root * denominator < numerator:
        root += 1
    return root


def extend_ulc_forest_like(
    rng: random.Random, prefix: list[int], vertices: int, degree: int
) -> list[int] | None:
    p = prefix[:]
    while len(p) - 1 < degree:
        k = len(p)
        lower = comb(degree, k)
        upper = comb(vertices, k)
        if len(p) >= 2:
            # New a_k must satisfy ULC(infinity) at rank k-1.
            upper = min(
                upper,
                (k - 1) * p[-1] * p[-1] // (k * p[-2]),
            )
        if k < degree:
            # Leave room for unavoidable a_{k+1} >= C(degree,k+1).
            lower = max(
                lower,
                ceil_sqrt_ratio(
                    (k + 1)
                    * p[-1]
                    * comb(degree, k + 1),
                    k,
                ),
            )
        if lower > upper:
            return None
        if rng.random() < 0.65:
            low = max(lower, upper - max(1, upper // 8))
            p.append(rng.randint(low, upper))
        else:
            p.append(rng.randint(lower, upper))
    return p


def candidate_child(
    rng: random.Random, max_degree: int, max_attempts: int = 100_000
) -> dict:
    for _ in range(max_attempts):
        n = rng.randint(2, min(2 * max_degree, 100))
        q = rng.randint(2, min(n, 12))
        j_vertices = n - q
        u2 = comb(n, 2) - j_vertices
        alpha_u = rng.randint((n + 1) // 2, min(n, max_degree))
        u = extend_ulc_forest_like(rng, [1, n, u2], n, alpha_u)
        if u is None or not forest_first3_valid(u, n):
            continue
        if j_vertices == 0:
            j = [1]
        else:
            alpha_j = rng.randint(
                (j_vertices + 1) // 2,
                min(j_vertices, max_degree - 1),
            )
            j = extend_ulc_forest_like(
                rng, [1, j_vertices], j_vertices, alpha_j
            )
            if j is None or not forest_first3_valid(j, j_vertices):
                continue
        d = shift(j)
        a = add(u, d)
        v = add(a, d)
        if not all(is_ulc_infinity(p) for p in (u, j, a, v)):
            continue
        if weighted_invariant_failure(a, d) is not None:
            continue
        # Exact no-unary states satisfy the stronger triple condition:
        # after factorial scaling, A, U, and V are pairwise partially
        # synchronized.
        if any(
            weighted_partial_failure(p, q) is not None
            for p, q in ((a, u), (a, v), (u, v))
        ):
            continue
        return {
            "N": n,
            "q": q,
            "U": u,
            "J": j,
            "D": d,
            "A": a,
            "V": v,
        }
    raise RuntimeError("could not generate a weighted child state")


def combine(children: list[dict]) -> dict:
    u = [1]
    j = [1]
    for child in children:
        u = mul(u, child["A"])
        j = mul(j, child["U"])
    d = shift(j)
    a = add(u, d)
    return {"U": u, "J": j, "D": d, "A": a, "V": add(a, d)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--max-degree", type=int, default=12)
    parser.add_argument("--max-children", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("synthetic_weighted_branching_search.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.time()
    first = None
    first_ulc = None
    first_prefix_ulc = None
    first_parent_triple_failure = None
    generated = 0
    checks = 0
    for trial in range(args.trials):
        count = rng.randint(2, args.max_children)
        children = [
            candidate_child(rng, args.max_degree) for _ in range(count)
        ]
        generated += count
        parent = combine(children)
        for name in ("U", "J", "A", "V"):
            if (
                first_ulc is None
                and not is_ulc_infinity(parent[name])
            ):
                first_ulc = {
                    "trial": trial,
                    "failed_polynomial": name,
                    "children": children,
                    "parent": parent,
                }
                break
        for left, right in (("A", "U"), ("A", "V"), ("U", "V")):
            failure = weighted_partial_failure(
                parent[left], parent[right]
            )
            if failure is not None:
                if first_parent_triple_failure is None:
                    first_parent_triple_failure = {
                        "trial": trial,
                        "pair": [left, right],
                        "children": children,
                        "parent": parent,
                        **failure,
                    }
                break
        alpha = len(parent["A"]) - 1
        cutoff = (2 * alpha + 1) // 3
        for k in range(1, min(cutoff, len(parent["A"]) - 1)):
            a = parent["A"]
            gap = (
                k * a[k] * a[k]
                - (k + 1) * a[k - 1] * a[k + 1]
            )
            if gap < 0:
                first_prefix_ulc = {
                    "trial": trial,
                    "alpha": alpha,
                    "cutoff": cutoff,
                    "k": k,
                    "gap": gap,
                    "children": children,
                    "parent": parent,
                }
                break
        failure = weighted_invariant_failure(parent["A"], parent["D"])
        upper = max(len(parent["A"]), len(parent["D"]))
        checks += (upper + 1) * (upper + 2) // 2
        if failure is not None and first is None:
            first = {
                "trial": trial,
                "children": children,
                "parent": parent,
                **failure,
            }
        if first_prefix_ulc is not None:
            break
        if (trial + 1) % 10_000 == 0:
            print(
                f"trials={trial + 1:,} children={generated:,} "
                f"checks={checks:,}",
                flush=True,
            )

    payload = {
        "status": (
            "prefix_ulc_counterexample"
            if first_prefix_ulc
            else "no_prefix_ulc_failure"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        "children_generated": generated,
        "weighted_minor_checks": checks,
        "first_weighted_invariant_failure": first,
        "first_parent_ulc_failure": first_ulc,
        "first_parent_prefix_ulc_failure": first_prefix_ulc,
        "first_parent_triple_failure": first_parent_triple_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix_ulc else 0


if __name__ == "__main__":
    raise SystemExit(main())
