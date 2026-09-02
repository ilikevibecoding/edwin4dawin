#!/usr/bin/env python3
"""Exact high-chart diagnosis using the tight seventh-power R/L bound.

On x >= y, put N=k+x and M=k+y.  Then every factor in R/L is at
most M/N, hence R/L <= (M/N)^(k-1) <= (M/N)^7 for k >= 8.
The script coefficientwise-checks the resulting four gamma/delta sign cases.
"""

from __future__ import annotations

import argparse
import math

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import load_rows
from scan_uniform_low_high_four_gap_high_block_root import summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--stop-index", type=int)
    arguments = parser.parse_args()

    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    start = max(1, arguments.start_index)
    stop = min(len(keys), arguments.stop_index or len(keys))
    assert start <= stop

    H, u, base, gap = field("u,y,z", QQ)

    def high(value):
        return H.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): base.as_expr() + gap.as_expr(),
            y.as_expr(): base.as_expr(),
        }))

    N, M = k + x, k + y
    lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (M / N) ** power / math.factorial(power)
        for power in range(4)
    )
    ratio7 = (M / N) ** 7
    sign_definite = {"positive", "nonnegative"}
    acceptable = {"positive", "nonnegative"}
    failures = []
    for index in range(start, stop + 1):
        key = keys[index - 1]
        beta = rows[("T", "R")].get(key, F.zero)
        gamma = -rows[("L", "R")].get(key, F.zero)
        delta = -rows[("R", "R")].get(key, F.zero)
        checks = {
            "beta": summary(high(beta)),
            "gamma": summary(high(gamma)),
            "minus_gamma": summary(high(-gamma)),
            "delta": summary(high(delta)),
            "minus_delta": summary(high(-delta)),
            "gamma_nonnegative_delta_nonnegative_reserve": summary(
                high(beta * lower - gamma - delta * ratio7)
            ),
            "gamma_negative_delta_nonnegative_reserve": summary(
                high(beta * lower - delta * ratio7)
            ),
            "gamma_nonnegative_delta_negative_reserve": summary(
                high(beta * lower - gamma)
            ),
            "gamma_negative_delta_negative_reserve": summary(high(beta * lower)),
        }
        gamma_nonnegative_possible = checks["minus_gamma"]["status"] not in sign_definite
        gamma_negative_possible = checks["gamma"]["status"] not in sign_definite
        delta_nonnegative_possible = checks["minus_delta"]["status"] not in sign_definite
        delta_negative_possible = checks["delta"]["status"] not in sign_definite
        cases = {
            "gamma_nonnegative_delta_nonnegative": (
                not (gamma_nonnegative_possible and delta_nonnegative_possible)
                or checks["gamma_nonnegative_delta_nonnegative_reserve"]["status"] in acceptable
            ),
            "gamma_negative_delta_nonnegative": (
                not (gamma_negative_possible and delta_nonnegative_possible)
                or checks["gamma_negative_delta_nonnegative_reserve"]["status"] in acceptable
            ),
            "gamma_nonnegative_delta_negative": (
                not (gamma_nonnegative_possible and delta_negative_possible)
                or checks["gamma_nonnegative_delta_negative_reserve"]["status"] in acceptable
            ),
            "gamma_negative_delta_negative": (
                not (gamma_negative_possible and delta_negative_possible)
                or checks["gamma_negative_delta_negative_reserve"]["status"] in acceptable
            ),
        }
        passed = checks["beta"]["status"] in acceptable and all(cases.values())
        failed_cases = [name for name, case_passed in cases.items() if not case_passed]
        if not passed:
            failures.append((index, tuple(key), failed_cases, checks))
        print(
            "ROW", index, tuple(key), "PASS" if passed else "MIXED",
            "FAILED_CASES", failed_cases,
            flush=True,
        )

    print("PASS", stop - start + 1 - len(failures), "MIXED", len(failures), flush=True)
    for index, key, failed_cases, checks in failures:
        print("FAILURE", index, key, failed_cases, flush=True)
        for name in failed_cases:
            print("  ", name, checks[name + "_reserve"], flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
