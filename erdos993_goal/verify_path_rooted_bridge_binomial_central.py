#!/usr/bin/env python3
"""Verify all-rank rooted-bridge centrality for endpoint-rooted paths."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp


def symbolic_factorization() -> bool:
    n, i, j = sp.symbols("n i j", integer=True)

    def mu(rank):
        return (
            (n - 2 * rank + 1)
            * (n - 2 * rank)
            / (n - rank + 1)
        )

    def rho(rank):
        return rank / (n - rank + 1)

    difference = (
        mu(i) * (1 - rho(i + 1) * rho(j - 1))
        - mu(j - 1) * (1 - rho(i) * rho(j))
    )
    xi = (
        4 * i * j
        - 4 * i * n
        - 4 * i
        - 4 * j * n
        + 3 * n**2
        + 5 * n
    )
    claimed = (
        (n + 1)
        * (i - j + 1)
        * (i + j - n - 1)
        * xi
        / (
            (i - n)
            * (i - n - 1)
            * (j - n - 2)
            * (j - n - 1)
        )
    )
    return sp.factor(difference - claimed) == 0


def choose(order: int, rank: int) -> int:
    return (
        math.comb(order, rank)
        if 0 <= rank <= order
        else 0
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=500)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "path_rooted_bridge_binomial_central_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_factorization()
    checks = 0
    first_failure = None

    for order in range(1, args.max_order + 1):
        alpha = (order + 1) // 2

        def p(rank: int) -> int:
            return choose(order - rank + 1, rank)

        def q(rank: int) -> int:
            return choose(order - rank, rank - 1)

        for i in range(alpha + 1):
            for j in range(i + 1, alpha + 1):
                current = p(i) * p(j) - q(i) * q(j)
                following = (
                    p(i + 1) * p(j - 1)
                    - q(i + 1) * q(j - 1)
                )
                checks += 1
                if j * current > (i + 1) * following:
                    first_failure = {
                        "order": order,
                        "i": i,
                        "j": j,
                        "left": j * current,
                        "right": (i + 1) * following,
                    }
                    break
            if first_failure:
                break
        if first_failure:
            break

    passed = symbolic and first_failure is None
    report = {
        "status": "PASS" if passed else "FAIL",
        "symbolic_factorization": symbolic,
        "max_path_order": args.max_order,
        "exact_index_checks": checks,
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
