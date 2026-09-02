#!/usr/bin/env python3
"""Falsify abstract branching closure of the child-weighted invariant.

For a rooted state with q children write A=U+D and

    u_k = k! [x^k] U,  d_k = k! [x^k] D.

The child-weighted factorial minor condition is

    (q-2) M_u(m,n) + q X_{u,d}(m,n) >= 0,  m >= n,

where

    M_u = u_m u_n-u_{m+1}u_{n-1},
    X   = u_m d_n+d_m u_n-u_{m+1}d_{n-1}-d_{m+1}u_{n-1}.

Exact scans show this for all planted no-unary trees tested.  This script
asks the sharper algebraic question: if several abstract child states obey
that condition (plus the other previously observed factorial conditions),
must their true rooted-tree combination obey it as well?

A counterexample here is not a tree counterexample.  It identifies an
additional structural hypothesis needed for an inductive proof.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

from synthetic_weighted_branching_search import (
    candidate_child,
    coeff,
    combine,
    factorial_transform,
    is_ulc_infinity,
)


def mixed_minor(p: list[int], q: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(q, n)
        + coeff(q, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(q, n - 1)
        - coeff(q, m + 1) * coeff(p, n - 1)
    )


def child_weighted_failure(
    u_coeff: list[int],
    d_coeff: list[int],
    children: int,
    diagonal_only: bool = False,
) -> dict | None:
    u = factorial_transform(u_coeff)
    d = factorial_transform(d_coeff)
    upper = max(len(u), len(d))
    for m in range(upper + 1):
        ns = (m,) if diagonal_only else range(m + 1)
        for n in ns:
            minor_u = (
                coeff(u, m) * coeff(u, n)
                - coeff(u, m + 1) * coeff(u, n - 1)
            )
            interaction = mixed_minor(u, d, m, n)
            gap = (children - 2) * minor_u + children * interaction
            if gap < 0:
                return {
                    "m": m,
                    "n": n,
                    "minor_u": minor_u,
                    "interaction": interaction,
                    "gap": gap,
                }
    return None


def accepted_child(
    rng: random.Random,
    max_degree: int,
    counters: dict,
) -> dict:
    while True:
        child = candidate_child(rng, max_degree)
        counters["raw_children"] += 1
        failure = child_weighted_failure(
            child["U"], child["D"], child["q"]
        )
        if failure is None:
            counters["accepted_children"] += 1
            return child
        counters["rejected_child_cwf"] += 1


def prefix_diagonal_failure(
    u_coeff: list[int],
    d_coeff: list[int],
    children: int,
    alpha_a: int,
) -> dict | None:
    """Check CWF diagonal only through the known decreasing-tail cutoff."""
    u = factorial_transform(u_coeff)
    d = factorial_transform(d_coeff)
    cutoff = (2 * alpha_a + 1) // 3
    # Ordered LC of A is needed at coefficient rank k+1, k <= L-2.
    # The CWF implication uses its diagonal at the same rank k.
    for k in range(min(cutoff, max(len(u), len(d)))):
        minor_u = coeff(u, k) ** 2 - coeff(u, k + 1) * coeff(u, k - 1)
        interaction = mixed_minor(u, d, k, k)
        gap = (children - 2) * minor_u + children * interaction
        if gap < 0:
            return {
                "k": k,
                "cutoff": cutoff,
                "minor_u": minor_u,
                "interaction": interaction,
                "gap": gap,
            }
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--max-degree", type=int, default=12)
    parser.add_argument("--max-children", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("synthetic_child_weighted_closure.json"),
    )
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    counters = {
        "raw_children": 0,
        "accepted_children": 0,
        "rejected_child_cwf": 0,
    }
    first_full = None
    first_diagonal = None
    first_prefix_diagonal = None
    first_parent_ulc = None
    full_checks = 0

    for trial in range(args.trials):
        count = rng.randint(2, args.max_children)
        children = [
            accepted_child(rng, args.max_degree, counters)
            for _ in range(count)
        ]
        parent = combine(children)
        upper = max(len(parent["U"]), len(parent["D"]))
        full_checks += (upper + 1) * (upper + 2) // 2

        failure = child_weighted_failure(
            parent["U"], parent["D"], count
        )
        if failure is not None and first_full is None:
            first_full = {
                "trial": trial,
                "parent_children": count,
                "children": children,
                "parent": parent,
                **failure,
            }

        failure = child_weighted_failure(
            parent["U"], parent["D"], count, diagonal_only=True
        )
        if failure is not None and first_diagonal is None:
            first_diagonal = {
                "trial": trial,
                "parent_children": count,
                "children": children,
                "parent": parent,
                **failure,
            }

        alpha_a = len(parent["A"]) - 1
        failure = prefix_diagonal_failure(
            parent["U"], parent["D"], count, alpha_a
        )
        if failure is not None and first_prefix_diagonal is None:
            first_prefix_diagonal = {
                "trial": trial,
                "alpha_A": alpha_a,
                "parent_children": count,
                "children": children,
                "parent": parent,
                **failure,
            }

        if first_parent_ulc is None and not is_ulc_infinity(parent["A"]):
            first_parent_ulc = {
                "trial": trial,
                "parent_children": count,
                "children": children,
                "parent": parent,
            }

        # Full closure failure is expected to be easier than a diagonal one.
        # Continue until the prefix implication itself fails or all trials run.
        if first_prefix_diagonal is not None:
            break
        if (trial + 1) % 10_000 == 0:
            print(
                f"trials={trial + 1:,} accepted={counters['accepted_children']:,} "
                f"rejected={counters['rejected_child_cwf']:,} "
                f"full_checks={full_checks:,}",
                flush=True,
            )

    payload = {
        "status": (
            "prefix_diagonal_closure_failure"
            if first_prefix_diagonal is not None
            else "no_prefix_diagonal_closure_failure"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        **counters,
        "parent_full_minor_checks": full_checks,
        "first_full_cwf_failure": first_full,
        "first_diagonal_cwf_failure": first_diagonal,
        "first_prefix_diagonal_cwf_failure": first_prefix_diagonal,
        "first_parent_ulc_failure": first_parent_ulc,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_prefix_diagonal is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
