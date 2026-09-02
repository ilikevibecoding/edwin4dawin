#!/usr/bin/env python3
"""Checkpointed exact adversarial audit of arbitrary PF-factor compatibility.

This is route evidence, not an all-parameter theorem.  Every case uses exact
rational construction and rational root isolation for the current window row
and its equal-degree shifted adjacent row.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import time
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial
from verify_two_outlier_adjacent_cubic_common_interlacing import (
    common_interlacer_overlap,
    isolating_intervals,
)


FACTOR_VALUES = (
    sp.Rational(1, 100),
    sp.Rational(1, 10),
    sp.Rational(1, 3),
    sp.Rational(1, 2),
    sp.Integer(1),
    sp.Integer(2),
    sp.Integer(3),
    sp.Integer(10),
    sp.Integer(100),
)


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def one_case(rng: random.Random, m: int, trial: int) -> dict[str, object]:
    reserve = 4 * m + 9
    parity = rng.choice(("odd", "even"))
    reserve_index = rng.randrange(13)
    p = 2 * reserve_index + reserve + int(parity == "even")
    alpha = 2 * reserve_index + int(parity == "even")
    u = sp.Rational(rng.randrange(21), 20)
    v = sp.Rational(rng.randrange(21), 20)
    factors = [rng.choice(FACTOR_VALUES) for _ in range(m)]
    if trial % 10 == 0:
        factors = [FACTOR_VALUES[(trial // 10) % len(FACTOR_VALUES)]] * m

    gamma_expression = (1 - u * X) * (1 - v * X)
    for factor in factors:
        gamma_expression *= X + factor
    gamma = list(
        reversed(
            sp.Poly(sp.expand(gamma_expression), X, domain=sp.QQ).all_coeffs()
        )
    )
    current = window_polynomial(p, alpha, gamma)
    adjacent_base = window_polynomial(p - 2, alpha + 1, gamma)
    adjacent = sp.Poly(X * adjacent_base.as_expr(), X, domain=sp.QQ)
    current_roots = isolating_intervals(current)
    adjacent_roots = isolating_intervals(adjacent, allow_zero=True)
    overlap = common_interlacer_overlap(current_roots, adjacent_roots)
    return {
        "m": m,
        "trial": trial,
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "u": str(u),
        "v": str(v),
        "factors": list(map(str, factors)),
        "degree": current.degree(),
        "strict_common_interlacer_overlap": bool(overlap),
        "current_digest": digest(current),
        "adjacent_digest": digest(adjacent),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--m-start", type=int, default=3)
    parser.add_argument("--m-end", type=int, default=6)
    parser.add_argument("--cases-per-m", type=int, default=25)
    parser.add_argument("--seed", type=int, default=99320260808)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    assert 2 <= args.m_start <= args.m_end
    assert args.cases_per_m > 0

    rng = random.Random(args.seed)
    started = time.monotonic()
    cases = []
    first_failure = None
    for m in range(args.m_start, args.m_end + 1):
        for trial in range(args.cases_per_m):
            case = one_case(rng, m, trial)
            cases.append(case)
            if not case["strict_common_interlacer_overlap"]:
                first_failure = case
                break
            if len(cases) % 10 == 0:
                print(
                    json.dumps(
                        {
                            "completed": len(cases),
                            "m": m,
                            "elapsed_seconds": round(time.monotonic() - started, 3),
                        }
                    ),
                    flush=True,
                )
        if first_failure:
            break

    report = {
        "status": (
            "EXACT_ADVERSARIAL_PF_OVERLAP_FAILURE"
            if first_failure
            else "PASS_EXACT_ADVERSARIAL_PF_COMMON_INTERLACER_AUDIT"
        ),
        "logical_status": "Finite exact route evidence only; not an all-parameter theorem.",
        "seed": args.seed,
        "m_range": [args.m_start, args.m_end],
        "cases_per_m": args.cases_per_m,
        "completed_case_count": len(cases),
        "factor_value_set": list(map(str, FACTOR_VALUES)),
        "first_failure": first_failure,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                key: report[key]
                for key in (
                    "status",
                    "m_range",
                    "completed_case_count",
                    "first_failure",
                    "elapsed_seconds",
                )
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
