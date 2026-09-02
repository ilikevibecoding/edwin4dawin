#!/usr/bin/env python3
"""Exact scans of the support-vertex ratio-dominance invariant.

At a support vertex r, delete r.  Take one isolated distinguished root
(the pendant neighbour of r), and s further components that are stars
K_{1,m_i}, distinguished at their centres.  Then

    E(x) = (1+x)^ell prod_i ((1+x)^m_i + x),
    J(x) =             prod_i  (1+x)^m_i.

The conjectured local invariant is

    E[k+1] J[k] - E[k] J[k+1] >= 0.

This script scans uniform and heterogeneous star-branch families exactly.
"""

from __future__ import annotations

import argparse
import json
import random
from math import comb
from pathlib import Path


def conv(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b):
                if bj:
                    out[i + j] += ai * bj
    return out


def binomial_poly(n: int) -> list[int]:
    return [comb(n, k) for k in range(n + 1)]


def star_poly(m: int) -> list[int]:
    p = binomial_poly(m)
    if len(p) < 2:
        p.append(0)
    p[1] += 1
    return p


def instance(ell: int, branches: list[int]) -> tuple[list[int], list[int]]:
    e = binomial_poly(ell)
    j = [1]
    for m in branches:
        e = conv(e, star_poly(m))
        j = conv(j, binomial_poly(m))
    return e, j


def minors(e: list[int], j: list[int]) -> list[int]:
    out = []
    for k in range(max(len(e), len(j))):
        e0 = e[k] if k < len(e) else 0
        e1 = e[k + 1] if k + 1 < len(e) else 0
        j0 = j[k] if k < len(j) else 0
        j1 = j[k + 1] if k + 1 < len(j) else 0
        out.append(e1 * j0 - e0 * j1)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--s-max", type=int, default=30)
    ap.add_argument("--m-max", type=int, default=50)
    ap.add_argument("--random", type=int, default=10000)
    ap.add_argument("--seed", type=int, default=993)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    checked_instances = 0
    checked_minors = 0
    minimum = None
    witness = None
    failures = []
    prefix_failures = []
    minimum_offset = None
    minimum_offset_witness = None

    def check(ell: int, branches: list[int], family: str) -> None:
        nonlocal checked_instances, checked_minors, minimum, witness
        nonlocal minimum_offset, minimum_offset_witness
        e, j = instance(ell, branches)
        ds = minors(e, j)
        full = e + [0] * max(0, len(j) + 1 - len(e))
        for index, value in enumerate(j):
            full[index + 1] += value
        mode = max(range(len(full)), key=full.__getitem__)
        checked_instances += 1
        checked_minors += len(ds)
        local_min = min(ds)
        k = ds.index(local_min)
        if minimum is None or local_min < minimum:
            minimum = local_min
            witness = {
                "family": family,
                "ell": ell,
                "branches": branches,
                "rank": k,
                "mode": mode,
                "rank_minus_mode": k - mode,
                "minor": local_min,
                "E_k": e[k] if k < len(e) else 0,
                "E_k1": e[k + 1] if k + 1 < len(e) else 0,
                "J_k": j[k] if k < len(j) else 0,
                "J_k1": j[k + 1] if k + 1 < len(j) else 0,
            }
        if local_min < 0 and len(failures) < 20:
            failures.append(
                {
                    "family": family,
                    "ell": ell,
                    "branches": branches,
                    "rank": k,
                    "mode": mode,
                    "rank_minus_mode": k - mode,
                    "minor": local_min,
                }
            )
        negative_ranks = [rank for rank, value in enumerate(ds) if value < 0]
        if negative_ranks:
            first = negative_ranks[0]
            offset = first - mode
            if minimum_offset is None or offset < minimum_offset:
                minimum_offset = offset
                minimum_offset_witness = {
                    "family": family,
                    "ell": ell,
                    "branches": branches,
                    "rank": first,
                    "mode": mode,
                    "rank_minus_mode": offset,
                    "minor": ds[first],
                }
            if first < mode and len(prefix_failures) < 20:
                prefix_failures.append(
                    {
                        "family": family,
                        "ell": ell,
                        "branches": branches,
                        "rank": first,
                        "mode": mode,
                        "minor": ds[first],
                    }
                )

    for ell in range(1, 5):
        for s in range(args.s_max + 1):
            for m in range(1, args.m_max + 1):
                check(ell, [m] * s, "uniform")

    rng = random.Random(args.seed)
    for _ in range(args.random):
        ell = rng.randint(1, 5)
        s = rng.randint(0, args.s_max)
        branches = [rng.randint(1, args.m_max) for _ in range(s)]
        check(ell, branches, "heterogeneous")

    result = {
        "parameters": vars(args) | {"out": str(args.out) if args.out else None},
        "checked_instances": checked_instances,
        "checked_minors": checked_minors,
        "failure_count_recorded": len(failures),
        "minimum": minimum,
        "minimum_witness": witness,
        "failures": failures,
        "prefix_failure_count_recorded": len(prefix_failures),
        "prefix_failures": prefix_failures,
        "minimum_rank_minus_mode": minimum_offset,
        "minimum_rank_minus_mode_witness": minimum_offset_witness,
        "all_rank_status": "PASS" if not failures else "FAIL",
        "prefix_status": "PASS" if not prefix_failures else "FAIL",
    }
    encoded = json.dumps(result, indent=2)
    if args.out:
        args.out.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)


if __name__ == "__main__":
    main()
