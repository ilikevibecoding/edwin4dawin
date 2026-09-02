#!/usr/bin/env python3
"""Exact Q-leaf-monotonicity scan on the two-level Galvin family.

For T(m,t), test adding a leaf at each of the three vertex orbits:
central vertex, support vertex, and outer leaf.  Coefficients are evaluated
by positive binomial sums without expanding the full polynomial.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from math import comb


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def old_coefficient(m: int, t: int, rank: int) -> int:
    if rank < 0:
        return 0
    total = choose(m * t, rank - 1)
    for occupied_supports in range(0, min(m, rank) + 1):
        total += (
            comb(m, occupied_supports)
            * choose(
                t * (m - occupied_supports),
                rank - occupied_supports,
            )
        )
    return total


def deletion_coefficient(
    m: int, t: int, orbit: str, rank: int
) -> int:
    if rank < 0:
        return 0
    if orbit == "central":
        total = 0
        for occupied_supports in range(0, min(m, rank) + 1):
            total += (
                comb(m, occupied_supports)
                * choose(
                    t * (m - occupied_supports),
                    rank - occupied_supports,
                )
            )
        return total

    if orbit == "support":
        # (1+x)^t A_t^(m-1) + x(1+x)^(tm)
        total = choose(m * t, rank - 1)
        for occupied_supports in range(
            0, min(m - 1, rank) + 1
        ):
            total += (
                comb(m - 1, occupied_supports)
                * choose(
                    t * (m - occupied_supports),
                    rank - occupied_supports,
                )
            )
        return total

    if orbit == "leaf":
        # A_(t-1) A_t^(m-1) + x(1+x)^(tm-1).
        total = choose(m * t - 1, rank - 1)
        for occupied_supports in range(
            0, min(m - 1, rank) + 1
        ):
            base = comb(m - 1, occupied_supports)
            remaining_leaves = t * (m - 1 - occupied_supports)
            total += base * choose(
                remaining_leaves + t - 1,
                rank - occupied_supports,
            )
            total += base * choose(
                remaining_leaves,
                rank - occupied_supports - 1,
            )
        return total

    raise ValueError(orbit)


def q_reserve(pm: int, p0: int, pp: int, rank: int) -> int:
    return (
        2 * rank * p0 * p0
        - pm * p0
        - 2 * (rank + 1) * pm * pp
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-m", type=int, default=120)
    parser.add_argument("--max-t", type=int, default=15)
    parser.add_argument("--window", type=int, default=10)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    checks = 0
    boundary_checks = 0
    first_negative_delta = None
    first_negative_boundary = None
    smallest_delta = None
    smallest_boundary = None

    for t in range(1, args.max_t + 1):
        for m in range(1, args.max_m + 1):
            old_alpha = m * t + 1
            old_cutoff = (2 * old_alpha + 1) // 3
            for orbit in ("central", "support", "leaf"):
                if orbit == "leaf" and t < 1:
                    continue
                deletion_alpha = {
                    "central": m * t,
                    "support": m * t + 1,
                    "leaf": m * t,
                }[orbit]
                new_alpha = max(old_alpha, deletion_alpha + 1)
                new_cutoff = (2 * new_alpha + 1) // 3
                first_rank = max(3, new_cutoff - args.window)

                old_values = {
                    rank: old_coefficient(m, t, rank)
                    for rank in range(first_rank - 1, new_cutoff + 1)
                }
                deletion_values = {
                    rank: deletion_coefficient(m, t, orbit, rank)
                    for rank in range(first_rank - 2, new_cutoff)
                }
                new_values = {
                    rank: old_values[rank]
                    + deletion_values.get(rank - 1, 0)
                    for rank in range(first_rank - 1, new_cutoff + 1)
                }

                for rank in range(first_rank, min(old_cutoff, new_cutoff)):
                    checks += 1
                    old_q = q_reserve(
                        old_values[rank - 1],
                        old_values[rank],
                        old_values[rank + 1],
                        rank,
                    )
                    new_q = q_reserve(
                        new_values[rank - 1],
                        new_values[rank],
                        new_values[rank + 1],
                        rank,
                    )
                    item = {
                        "m": m,
                        "t": t,
                        "orbit": orbit,
                        "old_order": 1 + m * (t + 1),
                        "old_alpha": old_alpha,
                        "new_alpha": new_alpha,
                        "rank": rank,
                        "old_cutoff": old_cutoff,
                        "new_cutoff": new_cutoff,
                        "old_Q": old_q,
                        "new_Q": new_q,
                        "delta_Q": new_q - old_q,
                    }
                    if (
                        smallest_delta is None
                        or item["delta_Q"] < smallest_delta["delta_Q"]
                    ):
                        smallest_delta = item
                    if (
                        item["delta_Q"] < 0
                        and first_negative_delta is None
                    ):
                        first_negative_delta = item

                if new_cutoff == old_cutoff + 1 and old_cutoff >= 3:
                    boundary_checks += 1
                    rank = old_cutoff
                    boundary_q = q_reserve(
                        new_values[rank - 1],
                        new_values[rank],
                        new_values[rank + 1],
                        rank,
                    )
                    item = {
                        "m": m,
                        "t": t,
                        "orbit": orbit,
                        "old_order": 1 + m * (t + 1),
                        "old_alpha": old_alpha,
                        "new_alpha": new_alpha,
                        "rank": rank,
                        "old_cutoff": old_cutoff,
                        "new_cutoff": new_cutoff,
                        "new_boundary_Q": boundary_q,
                    }
                    if (
                        smallest_boundary is None
                        or boundary_q
                        < smallest_boundary["new_boundary_Q"]
                    ):
                        smallest_boundary = item
                    if boundary_q < 0 and first_negative_boundary is None:
                        first_negative_boundary = item

        print(
            f"t={t}: checks={checks:,}, boundary={boundary_checks:,}, "
            f"delta failure={first_negative_delta is not None}, "
            f"boundary failure={first_negative_boundary is not None}",
            flush=True,
        )

    report = {
        "status": (
            "FAIL"
            if first_negative_delta or first_negative_boundary
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            "max_m": args.max_m,
            "max_t": args.max_t,
            "window": args.window,
        },
        "checks": checks,
        "boundary_checks": boundary_checks,
        "first_negative_delta": first_negative_delta,
        "first_negative_boundary": first_negative_boundary,
        "smallest_delta": smallest_delta,
        "smallest_boundary": smallest_boundary,
    }
    if args.output:
        args.output.write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps(report, indent=2), flush=True)
    raise SystemExit(1 if report["status"] == "FAIL" else 0)


if __name__ == "__main__":
    main()
