#!/usr/bin/env python3
"""Find the smallest star-branch tree defeating support ratio dominance.

The tree has a support vertex r, ell >= 1 pendant-leaf neighbours, and
additional neighbours c_i, where c_i is the centre of a star with m_i >= 1
leaves.  Deleting r gives

    E = (1+x)^ell product_i ((1+x)^m_i + x)
    J =             product_i  (1+x)^m_i.

We exhaust integer partitions of the star-leaf counts in increasing total
tree order and check E[k+1]J[k] - E[k]J[k+1].
"""

from __future__ import annotations

import argparse
import json
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


def binomial(n: int) -> list[int]:
    return [comb(n, k) for k in range(n + 1)]


def star(m: int) -> list[int]:
    p = binomial(m)
    p[1] += 1
    return p


def partitions_with_cost(cost: int, minimum: int = 1):
    """Yield nondecreasing m_i with sum_i (m_i+1) == cost."""
    yield ()
    for m in range(minimum, cost):
        branch_cost = m + 1
        if branch_cost > cost:
            break
        for rest in partitions_with_cost(cost - branch_cost, m):
            if rest or branch_cost == cost:
                yield (m,) + rest


def build(ell: int, branches: tuple[int, ...]) -> tuple[list[int], list[int]]:
    e = binomial(ell)
    j = [1]
    for m in branches:
        e = conv(e, star(m))
        j = conv(j, binomial(m))
    return e, j


def first_failure(e: list[int], j: list[int]):
    for k in range(max(len(e), len(j)) - 1):
        e0 = e[k] if k < len(e) else 0
        e1 = e[k + 1] if k + 1 < len(e) else 0
        j0 = j[k] if k < len(j) else 0
        j1 = j[k + 1] if k + 1 < len(j) else 0
        d = e1 * j0 - e0 * j1
        if d < 0:
            return k, d, e0, e1, j0, j1
    return None


def independence_polynomial(e: list[int], j: list[int]) -> list[int]:
    out = e + [0] * max(0, len(j) + 1 - len(e))
    for k, value in enumerate(j):
        out[k + 1] += value
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-max", type=int, default=45)
    ap.add_argument(
        "--prefix",
        action="store_true",
        help="Require a negative minor strictly before the first mode of E+xJ.",
    )
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    checked = 0
    witness = None
    for n in range(2, args.n_max + 1):
        # n = 1 (support vertex) + ell + sum_i(m_i+1).
        for ell in range(1, n):
            branch_cost = n - 1 - ell
            for branches in partitions_with_cost(branch_cost):
                if not branches and branch_cost:
                    continue
                checked += 1
                e, j = build(ell, branches)
                fail = first_failure(e, j)
                if fail is None:
                    continue
                ip = independence_polynomial(e, j)
                mode = max(range(len(ip)), key=ip.__getitem__)
                if args.prefix:
                    prefix_failures = []
                    for rank in range(mode):
                        e0 = e[rank] if rank < len(e) else 0
                        e1 = e[rank + 1] if rank + 1 < len(e) else 0
                        j0 = j[rank] if rank < len(j) else 0
                        j1 = j[rank + 1] if rank + 1 < len(j) else 0
                        delta = e1 * j0 - e0 * j1
                        if delta < 0:
                            prefix_failures.append(
                                (rank, delta, e0, e1, j0, j1)
                            )
                    if not prefix_failures:
                        continue
                    fail = prefix_failures[0]
                k, delta, e0, e1, j0, j1 = fail
                valleys = [
                    q
                    for q in range(1, len(ip) - 1)
                    if ip[q - 1] > ip[q] < ip[q + 1]
                ]
                witness = {
                    "tree_order": n,
                    "ell": ell,
                    "star_leaf_counts": list(branches),
                    "rank": k,
                    "mode": mode,
                    "rank_minus_mode": k - mode,
                    "minor": delta,
                    "E_k": e0,
                    "E_k1": e1,
                    "J_k": j0,
                    "J_k1": j1,
                    "independence_polynomial": ip,
                    "local_valleys": valleys,
                }
                break
            if witness:
                break
        if witness:
            break

    result = {
        "n_max": args.n_max,
        "prefix_required": args.prefix,
        "checked_instances": checked,
        "witness": witness,
        "status": "FAILURE_FOUND" if witness else "NO_FAILURE",
    }
    encoded = json.dumps(result, indent=2)
    if args.out:
        args.out.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)


if __name__ == "__main__":
    main()
