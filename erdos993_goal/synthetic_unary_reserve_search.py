#!/usr/bin/env python3
"""Falsify abstract closure of the unary mixed reserve.

Actual planted tree states tested so far satisfy, in the prefix range of a
new unary parent,

    M_a(m,n) + 2 X(a,sigma(u);m,n) >= 0,             (UMR)

where a=F(A), u=F(U), A=U+xJ, and sigma(u)_k=k u_{k-1}.
UMR is twice as strong as needed when the mixed term is negative, since
the new q=1 ACWF target is M_a+X(a,sigma(u)).

This program feeds the same abstract forest-like child states used by the
branching falsifiers into UMR.  A failure is not a tree counterexample; it
identifies missing rooted-tree structure.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

from leaf_addition_pendant_decomposition_scan import mixed
from leaf_addition_pendant_monotonicity_scan import (
    add,
    coeff,
    factorial_transform,
)
from synthetic_child_weighted_closure_search import accepted_child


def minor(p: list[int], m: int, n: int) -> int:
    return (
        coeff(p, m) * coeff(p, n)
        - coeff(p, m + 1) * coeff(p, n - 1)
    )


def sigma(p: list[int]) -> list[int]:
    return [0] + [(k + 1) * value for k, value in enumerate(p)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--max-degree", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    counters = {
        "raw_children": 0,
        "accepted_children": 0,
        "rejected_child_cwf": 0,
        "prefix_checks": 0,
    }
    started = time.time()
    first_umr_failure = None
    first_required_failure = None

    for trial in range(args.trials):
        child = accepted_child(rng, args.max_degree, counters)
        U = child["U"]
        A = child["A"]
        parent_total = add(A, [0] + U)
        cutoff = (2 * (len(parent_total) - 1) + 1) // 3
        u = factorial_transform(U)
        a = factorial_transform(A)
        su = sigma(u)
        upper = max(len(a), len(su))
        for m in range(min(cutoff, upper + 1)):
            for n in range(m + 1):
                ma = minor(a, m, n)
                xas = mixed(a, su, m, n)
                umr = ma + 2 * xas
                required = ma + xas
                counters["prefix_checks"] += 1
                base = {
                    "trial": trial,
                    "m": m,
                    "n": n,
                    "cutoff": cutoff,
                    "M_A": ma,
                    "X_A_sigmaU": xas,
                    "UMR": umr,
                    "required_q1_ACWF": required,
                    "child": child,
                }
                if umr < 0 and first_umr_failure is None:
                    first_umr_failure = base
                if required < 0 and first_required_failure is None:
                    first_required_failure = base
        if first_required_failure is not None:
            break
        if (trial + 1) % 10_000 == 0:
            print(
                f"trials={trial + 1:,} checks={counters['prefix_checks']:,}",
                flush=True,
            )

    payload = {
        "status": (
            "required_unary_failure"
            if first_required_failure is not None
            else "no_required_unary_failure"
        ),
        "parameters": {
            "trials": args.trials,
            "max_degree": args.max_degree,
            "seed": args.seed,
        },
        "trials_completed": trial + 1,
        **counters,
        "first_UMR_failure": first_umr_failure,
        "first_required_q1_ACWF_failure": first_required_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if first_required_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
