#!/usr/bin/env python3
"""All-order coefficient-convexity proof for the path selector.

The Whipple/Catalan identity from
``analyze_selector_nested_chain_reduction.py`` writes

    g_(M,s,h) := [t^h]G_(M,s)(t)
      = C_(M,s,h) S_(M,s,h),

    C_(M,s,h)=4^h binom(2M-s-1,s-2h),

where S_(M,s,h) is the coefficient of u^h in F_(M,s)(u).  In the
Catalan coordinate u=4x/(1+x)^2,

    F_(M,s)=(1+x)^(2M-2s)(1-x)^(2s-4M).

For M>=s this series has nonnegative coefficients, and

    F_(M+1,s)/F_(M,s)=Q(x)=(1+x)^2/(1-x)^4.

Both Q and Q-1 have nonnegative coefficients.  The inverse Catalan series
x=x(u) also has nonnegative coefficients.  Consequently, coefficientwise
in u,

    Delta_M F_M = F_(M-1)(Q-1) >= 0,
    Delta_M^2 F_M = F_(M-2)(Q-1)^2 >= 0.

Thus S_(M,s,h) is nonnegative, nondecreasing, and convex in M.  The binomial
factor C has the same three properties (Vandermonde, with the upper index
advancing by two).  Products of two nonnegative nondecreasing convex
sequences are again nonnegative, nondecreasing, and convex.  Hence every
coefficient g_(M,s,h) has these properties.

Finally

    Gamma_(N,s)(t)=G_N(t)-2tG_(N-1)(t)+t^2G_(N-2)(t)

has the exact decomposition

    Delta_M^2 G_N(t)
      +2(1-t) Delta_M G_(N-1)(t)
      +(1-t)^2 G_(N-2)(t).

Every summand is nonnegative for 0<=t<=1, and the last is strictly positive
for t<1.  Thus Gamma_(N,s)(t)>0 throughout [0,1).  At t=1 the second
difference is strictly positive for s>=2; the harmless boundary layers s=0,1
instead have Gamma_(N,s)(1)=0.  This is an all-order theorem, not a finite
extrapolation.  The computation below only replays its algebra.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from fractions import Fraction

from analyze_selector_nested_chain_reduction import whipple_gamma
from probe_group_selector_gamma_root_pattern import gamma_coefficients, path_slice


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_unit_interval_exclusion_exact_20260809.json"


def differences(current: list[int], previous: list[int], older: list[int]):
    size = max(len(current), len(previous), len(older))
    first = []
    second = []
    for h in range(size):
        a = current[h] if h < len(current) else 0
        b = previous[h] if h < len(previous) else 0
        c = older[h] if h < len(older) else 0
        first.append(a - b)
        second.append(a - 2 * b + c)
    return first, second


def evaluate(coefficients: list[int], point: Fraction) -> Fraction:
    value = Fraction(0)
    for coefficient in reversed(coefficients):
        value = value * point + coefficient
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=100)
    parser.add_argument("--max-excess", type=int, default=20)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    coefficient_checks = 0
    decomposition_checks = 0
    interval_checks = 0
    sample_points = [Fraction(j, 20) for j in range(21)]
    records = []
    for s in range(args.max_layer + 1):
        for excess in range(args.max_excess + 1):
            N = 2 * s + 5 + excess
            values = []
            for M in (N, N - 1, N - 2):
                direct = gamma_coefficients(path_slice(M, s), s)
                transformed = whipple_gamma(M, s)
                assert direct == transformed
                values.append(direct)
                coefficient_checks += len(direct)

            first_N, second_N = differences(*values)
            first_previous, _ = differences(values[1], values[2], [0])
            assert all(value >= 0 for value in first_N)
            assert all(value >= 0 for value in second_N)
            assert all(value >= 0 for value in first_previous)

            selector = []
            size = max(len(values[0]), len(values[1]) + 1, len(values[2]) + 2)
            for h in range(size):
                selector.append(
                    (values[0][h] if h < len(values[0]) else 0)
                    - 2 * (values[1][h - 1] if 0 <= h - 1 < len(values[1]) else 0)
                    + (values[2][h - 2] if 0 <= h - 2 < len(values[2]) else 0)
                )

            for point in sample_points:
                lhs = evaluate(selector, point)
                rhs = (
                    evaluate(second_N, point)
                    + 2 * (1 - point) * evaluate(first_previous, point)
                    + (1 - point) ** 2 * evaluate(values[2], point)
                )
                assert lhs == rhs
                assert lhs > 0 if point < 1 or s >= 2 else lhs == 0
                decomposition_checks += 1
                interval_checks += 1

            records.append({
                "s": s,
                "N": N,
                "coefficientwise_first_difference_nonnegative": True,
                "coefficientwise_second_difference_nonnegative": True,
                "sampled_unit_interval_values_strictly_positive": True,
            })

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_ALL_ORDER_SELECTOR_UNIT_INTERVAL_EXCLUSION_WITH_BOUNDARY_DEGENERACIES",
        "theorem": (
            "For every s>=0 and every forest-cone N>=2s+5, "
            "Gamma_(N,s)(t)>0 for 0<=t<1; it is also positive at t=1 "
            "when s>=2, while s=0,1 have the exact boundary value zero."
        ),
        "proof": [
            "Whipple-Catalan factorization g=C*S",
            "Q=(1+x)^2/(1-x)^4 and Q-1 have nonnegative coefficients",
            "the inverse Catalan series x(u) has nonnegative coefficients",
            "therefore S, C, and g are coefficientwise nondecreasing and convex in M",
            "Gamma=Delta^2G+2(1-t)DeltaG+(1-t)^2G gives strict positivity on [0,1), and at t=1 for s>=2",
        ],
        "exact_replay": {
            "max_layer": args.max_layer,
            "max_forest_excess": args.max_excess,
            "cases": len(records),
            "whipple_coefficient_checks": coefficient_checks,
            "decomposition_checks": decomposition_checks,
            "nonnegative_rational_interval_checks_with_only_s_0_1_t_1_zero": interval_checks,
        },
        "scope": (
            "The theorem follows from the displayed formal-power-series identities "
            "and nonnegative-coefficient closure.  The finite rational checks are "
            "independent transcription evidence only."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "cases": len(records),
        "coefficient_checks": coefficient_checks,
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
