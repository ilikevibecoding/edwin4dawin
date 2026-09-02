#!/usr/bin/env python3
"""Exact terminal-PGC scan of the fork-bouquet family.

A central vertex has ``a`` identical branches.  Each branch root has ``s``
leaf children and one path of ``l`` further vertices.  The center also has
one support child with ``m`` leaf children; PGC is tested at a leaf of this
terminal star.

The order-15 tight finite witness is (a,l,s,m)=(2,3,1,3), so this family is
designed to scale the currently strongest observed terminal configuration.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def path_polynomial(vertices: int) -> Poly:
    if vertices <= 0:
        return ONE
    previous, current = ONE, ONE + X
    for _ in range(2, vertices + 1):
        previous, current = current, current + X * previous
    return current


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: Poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(0, max(numerator.bit_length(), denominator.bit_length()) - 52)
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--a-max", type=int, default=100)
    parser.add_argument("--l-max", type=int, default=20)
    parser.add_argument("--s-max", type=int, default=5)
    parser.add_argument("--m-max", type=int, default=12)
    parser.add_argument("--order-max", type=int, default=3000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    cases = 0
    rank_checks = 0
    failure = None
    closest_pair = None
    closest = None

    for length in range(1, args.l_max + 1):
        path_l = path_polynomial(length)
        path_previous = path_polynomial(length - 1)
        for leaves_at_fork in range(0, args.s_max + 1):
            free_fork = (ONE + X) ** leaves_at_fork * path_l
            fork = free_fork + X * path_previous
            fork_power = ONE
            free_power = ONE
            for branches in range(1, args.a_max + 1):
                fork_power *= fork
                free_power *= free_fork
                base_order = 1 + branches * (
                    1 + leaves_at_fork + length
                )
                for terminal_leaves in range(1, args.m_max + 1):
                    order = base_order + 1 + terminal_leaves
                    if order > args.order_max:
                        break
                    star = (ONE + X) ** terminal_leaves + X
                    full = (
                        fork_power * star
                        + X
                        * free_power
                        * (ONE + X) ** terminal_leaves
                    )
                    remainder = fork_power + X * free_power
                    deletion = (
                        (ONE + X) ** (terminal_leaves - 1)
                        * remainder
                    )
                    assert full.degree() == deletion.degree() + 1
                    cutoff = (2 * full.degree() + 1) // 3
                    cases += 1

                    for k in range(2, cutoff):
                        left = int(
                            k
                            * coeff(deletion, k - 2)
                            * reserve(full, k)
                        )
                        right = int(
                            (k - 1)
                            * coeff(full, k - 1)
                            * reserve(deletion, k - 1)
                        )
                        difference = left - right
                        rank_checks += 1
                        item = {
                            "parameters": {
                                "branches": branches,
                                "path_vertices": length,
                                "fork_leaves": leaves_at_fork,
                                "terminal_leaves": terminal_leaves,
                            },
                            "order": order,
                            "alpha": full.degree(),
                            "rank": k,
                            "cutoff": cutoff,
                        }
                        if difference < 0:
                            failure = item | {
                                "left": left,
                                "right": right,
                                "difference": difference,
                                "full": [int(full[j]) for j in range(len(full))],
                                "deletion": [
                                    int(deletion[j])
                                    for j in range(len(deletion))
                                ],
                            }
                            break
                        if left > 0 and right >= 0:
                            pair = (right, left)
                            if (
                                closest_pair is None
                                or right * closest_pair[1]
                                > closest_pair[0] * left
                            ):
                                closest_pair = pair
                                closest = item | {
                                    "right_over_left": stable_ratio(
                                        right, left
                                    ),
                                    "margin_digits": len(str(difference)),
                                    "left_digits": len(str(left)),
                                }
                    if failure:
                        break
                if failure:
                    break
            if failure:
                break
        print(
            f"length={length}: cases={cases:,}, checks={rank_checks:,}, "
            f"closest={closest['right_over_left']:.12g}",
            flush=True,
        )
        if failure:
            break

    report = {
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "cases": cases,
        "rank_checks": rank_checks,
        "closest": closest,
        "failure": failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
