#!/usr/bin/env python3
"""Exact coefficientwise producer for the x>=y four-gap right block.

Write N=k+x and M=k+y.  On x>=y, every factor in R/L is at most
M/N, so R/L <= (M/N)^(k-1) <= (M/N)^7 for k>=8.  Also T/L is at
least the first four positive terms of its exact product expansion.
After splitting on the signs of gamma and delta, the four reserves
checked below are therefore rigorous lower bounds for

    beta*(T/L) - gamma - delta*(R/L).

All arithmetic and coefficient tests are exact over QQ.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import CACHE, load_rows


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def summary(value):
    if value == 0:
        return {
            "status": "zero",
            "numerator_terms": 0,
            "denominator_terms": 0,
        }
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    numerator_origin = value.numer.to_dict().get((0, 0, 0), QQ.zero)
    denominator_origin = value.denom.to_dict().get((0, 0, 0), QQ.zero)
    coefficientwise_nonnegative = (
        denominator_origin > 0
        and all(coefficient > 0 for coefficient in numerator)
        and all(coefficient > 0 for coefficient in denominator)
    )
    status = (
        "positive" if coefficientwise_nonnegative and numerator_origin > 0 else
        "nonnegative" if coefficientwise_nonnegative else
        "mixed"
    )
    return {
        "status": status,
        "numerator_terms": len(numerator),
        "numerator_minimum": str(min(numerator)),
        "numerator_origin": str(numerator_origin),
        "numerator_ordered_sha256": ordered_hash(numerator),
        "denominator_terms": len(denominator),
        "denominator_minimum": str(min(denominator)),
        "denominator_origin": str(denominator_origin),
        "denominator_ordered_sha256": ordered_hash(denominator),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--stop-index", type=int)
    arguments = parser.parse_args()

    assert CACHE.exists()
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
    lower_high = high(lower)
    ratio7_high = high((M / N) ** 7)
    lower_summary = summary(lower_high)
    ratio7_summary = summary(ratio7_high)
    assert lower_summary["status"] == "positive"
    assert ratio7_summary["status"] == "positive"

    sign_definite = {"positive", "nonnegative"}
    acceptable = {"positive", "nonnegative"}
    results = []
    failures = []
    for index in range(start, stop + 1):
        key = keys[index - 1]
        beta = high(rows[("T", "R")].get(key, F.zero))
        gamma = high(-rows[("L", "R")].get(key, F.zero))
        delta = high(-rows[("R", "R")].get(key, F.zero))
        beta_lower = beta * lower_high
        delta_ratio7 = delta * ratio7_high
        checks = {
            "beta": summary(beta),
            "gamma": summary(gamma),
            "minus_gamma": summary(-gamma),
            "delta": summary(delta),
            "minus_delta": summary(-delta),
            "gamma_nonnegative_delta_nonnegative_reserve": summary(
                beta_lower - gamma - delta_ratio7
            ),
            "gamma_negative_delta_nonnegative_reserve": summary(
                beta_lower - delta_ratio7
            ),
            "gamma_nonnegative_delta_negative_reserve": summary(beta_lower - gamma),
            "gamma_negative_delta_negative_reserve": summary(beta_lower),
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
        row = {
            "index": index,
            "key": list(key),
            "passed": passed,
            "sign_possibilities": {
                "gamma_nonnegative": gamma_nonnegative_possible,
                "gamma_negative": gamma_negative_possible,
                "delta_nonnegative": delta_nonnegative_possible,
                "delta_negative": delta_negative_possible,
            },
            "cases": cases,
            "checks": checks,
        }
        results.append(row)
        if not passed:
            failures.append(row)
        print(
            "ROW", index, tuple(key), "PASS" if passed else "MIXED",
            "FAILED_CASES", [name for name, ok in cases.items() if not ok],
            flush=True,
        )

    payload = {
        "schema": "uniform-low-high-four-gap-high-tight-ratio-root-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "status": (
            "PASS_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_SHARD"
            if not failures else "MIXED_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_SHARD"
        ),
        "parameters": {
            "rank_minimum": 8,
            "start_index": start,
            "stop_index": stop,
            "total_keys": len(keys),
            "lower_product_terms": 4,
            "right_over_left_exponent": 7,
            "chart": "k=8+u, x=y+z, u,y,z>=0",
        },
        "inequalities": {
            "right_over_left": "R/L <= (M/N)^(k-1) <= (M/N)^7",
            "T_over_left": "T/L >= sum_{j=0}^3 falling(k-1,j)/j!*(M/N)^j",
            "N": "k+x",
            "M": "k+y",
        },
        "fixed_bounds": {"lower": lower_summary, "ratio7": ratio7_summary},
        "failure_count": len(failures),
        "cache": {"path": CACHE.name, "sha256": sha256(CACHE)},
        "source_sha256": sha256(Path(__file__).resolve()),
        "results": results,
    }
    output = ROOT / (
        "uniform_low_high_four_gap_high_tight_ratio_root_20260827_"
        f"{start:03d}_{stop:03d}.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("REPORT", output.name, sha256(output), flush=True)
    print(payload["status"], "PASS", len(results) - len(failures), "MIXED", len(failures), flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
