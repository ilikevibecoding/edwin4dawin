#!/usr/bin/env python3
"""Exact C12 and half-local scan in the two-level star family.

Let T(m,t) be the tree with one central vertex, m support vertices, and
t leaves adjacent to each support.  For a leaf l with support p,

    G = T(m,t),
    T = G-l,
    F = G-{l,p}.

The script checks the half-curvature cascade and the stronger candidate
that at most half of the same-rank T reserve is needed to pay the rooted
local term.  It is a falsifier, not a proof.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def coefficient(poly: fmpz_poly, rank: int):
    return poly[rank] if 0 <= rank <= poly.degree() else 0


def reserve(poly: fmpz_poly, rank: int):
    return (
        rank * coefficient(poly, rank) ** 2
        + coefficient(poly, rank - 1) * coefficient(poly, rank)
        - (rank + 1)
        * coefficient(poly, rank - 1)
        * coefficient(poly, rank + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    numerator = int(numerator)
    denominator = int(denominator)
    shift = max(
        0,
        max(abs(numerator).bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def record_ratio(
    numerator,
    denominator,
    *,
    t: int,
    m: int,
    rank: int,
    alpha: int,
) -> dict:
    return {
        "t": t,
        "m": m,
        "rank": rank,
        "alpha": alpha,
        "numerator": str(numerator),
        "denominator": str(denominator),
        "decimal": stable_ratio(numerator, denominator),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-t", type=int, default=15)
    parser.add_argument("--max-m", type=int, default=100)
    parser.add_argument(
        "--max-rank",
        type=int,
        default=0,
        help="optional cap; zero checks the entire required prefix",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    checks = 0
    minimum_c12 = None
    maximum_fraction = None
    c12_failure = None
    half_local_failure = None
    negative_same_rank = None

    for t in range(1, args.max_t + 1):
        branch = (ONE + X) ** t + X
        shortened_branch = (ONE + X) ** (t - 1) + X
        for m in range(1, args.max_m + 1):
            full = branch**m + X * (ONE + X) ** (t * m)
            leaf_deleted = (
                shortened_branch * branch ** (m - 1)
                + X * (ONE + X) ** (t * m - 1)
            )
            pair_deleted = (ONE + X) ** (t - 1) * (
                branch ** (m - 1)
                + X * (ONE + X) ** (t * (m - 1))
            )

            alpha = t * m + 1
            cutoff = (2 * alpha + 1) // 3
            stop = (
                min(cutoff, args.max_rank + 1)
                if args.max_rank
                else cutoff
            )
            for rank in range(3, stop):
                lower_rank = rank - 1
                a = coefficient(leaf_deleted, lower_rank)
                ap = coefficient(leaf_deleted, rank)
                bm = coefficient(pair_deleted, lower_rank - 1)
                b = coefficient(pair_deleted, lower_rank)
                full_previous = coefficient(full, lower_rank)
                full_current = coefficient(full, rank)
                full_reserve = reserve(full, rank)
                reduced_reserve = reserve(
                    pair_deleted, lower_rank
                )
                same_rank_reserve = reserve(leaf_deleted, rank)
                if min(
                    a,
                    ap,
                    bm,
                    b,
                    full_previous,
                    full_current,
                ) <= 0:
                    continue

                c12_numerator = (
                    rank * full_reserve * bm * b
                )
                c12_denominator = (
                    lower_rank
                    * reduced_reserve
                    * full_previous
                    * full_current
                )
                if c12_denominator > 0:
                    item = record_ratio(
                        c12_numerator,
                        c12_denominator,
                        t=t,
                        m=m,
                        rank=rank,
                        alpha=alpha,
                    )
                    if (
                        minimum_c12 is None
                        or c12_numerator
                        * int(minimum_c12["denominator"])
                        < int(minimum_c12["numerator"])
                        * c12_denominator
                    ):
                        minimum_c12 = item
                    if (
                        2 * c12_numerator < c12_denominator
                        and c12_failure is None
                    ):
                        c12_failure = item

                ordinary_margin = (
                    rank * bm * full_reserve
                    - lower_rank
                    * full_previous
                    * reduced_reserve
                )
                total_over_same_numerator = (
                    a
                    * (
                        2 * ordinary_margin * b
                        + lower_rank
                        * (b - ap)
                        * reduced_reserve
                        * full_previous
                    )
                )
                total_over_same_denominator = (
                    2
                    * rank
                    * same_rank_reserve
                    * bm
                    * full_previous
                    * b
                )
                if total_over_same_denominator <= 0:
                    if negative_same_rank is None:
                        negative_same_rank = {
                            "t": t,
                            "m": m,
                            "rank": rank,
                            "alpha": alpha,
                            "same_rank_reserve": str(
                                same_rank_reserve
                            ),
                        }
                    continue

                fraction_numerator = (
                    total_over_same_denominator
                    - total_over_same_numerator
                )
                if fraction_numerator > 0:
                    item = record_ratio(
                        fraction_numerator,
                        total_over_same_denominator,
                        t=t,
                        m=m,
                        rank=rank,
                        alpha=alpha,
                    )
                    if (
                        maximum_fraction is None
                        or fraction_numerator
                        * int(maximum_fraction["denominator"])
                        > int(maximum_fraction["numerator"])
                        * total_over_same_denominator
                    ):
                        maximum_fraction = item
                    if (
                        2 * fraction_numerator
                        > total_over_same_denominator
                        and half_local_failure is None
                    ):
                        half_local_failure = item
                checks += 1

    payload = {
        "status": (
            "FAILURE"
            if c12_failure or half_local_failure
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            "max_t": args.max_t,
            "max_m": args.max_m,
            "max_rank": args.max_rank,
        },
        "checks": checks,
        "minimum_tau_ratio_G_over_F": minimum_c12,
        "maximum_same_rank_fraction_needed": maximum_fraction,
        "c12_failure": c12_failure,
        "half_local_failure": half_local_failure,
        "negative_same_rank_reserve": negative_same_rank,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(payload, indent=2))
    return 1 if payload["status"] == "FAILURE" else 0


if __name__ == "__main__":
    raise SystemExit(main())
