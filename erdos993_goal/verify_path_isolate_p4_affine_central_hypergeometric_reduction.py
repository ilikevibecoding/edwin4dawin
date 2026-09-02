#!/usr/bin/env python3
"""Verify the double-binomial central extraction for both affine kernels."""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


@functools.cache
def atom(
    a: int,
    b: int,
    r: int,
    target: int,
    p: int,
    q_power: int,
) -> int:
    """[z^N w^N] z^p w^q A^a T^b V^r as a double sum."""

    total = 0
    for k in range(b + 1):
        outer = choose(b, k)
        for j in range(r + 1):
            total += (
                outer
                * choose(r, j)
                * choose(
                    a + b - k,
                    target - q_power - (b - k) - j,
                )
                * choose(a + k + r - j, target - p - k)
            )
    return total


def central_sum(source, a: int, b: int, r: int, target: int) -> int:
    return sum(
        coefficient * atom(a, b, r, target, pz, pw)
        for (pz, pw), coefficient in source.items()
    )


def direct_sum(source, a: int, b: int, r: int, target: int) -> int:
    result = source
    for factor, exponent in ((A, a), (T_dict, b), (V_dict, r)):
        result = multiply(result, power(factor, exponent, target), target)
    return result.get((target, target), 0)


def main() -> None:
    records = []
    bottom_points = ((3, 0, 7), (3, 12, 11), (12, 24, 19), (30, 60, 34))
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        sources = {
            "P": to_sparse(sp.expand(slope * A_expr)),
            "B": to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr)),
        }
        for m_value, x_value, r in bottom_points:
            a = m_value + x_value - 3
            b = 2 * m_value + parity - 5
            target = m_value + r + 5
            for kind, source in sources.items():
                numeric = evaluate(source, 0, m_value, x_value, target)
                hyper = central_sum(numeric, a, b, r, target)
                direct = direct_sum(numeric, a, b, r, target)
                records.append(
                    {
                        "package": "bottom",
                        "parity": parity,
                        "m": m_value,
                        "x": x_value,
                        "r": r,
                        "kind": kind,
                        "hypergeometric": hyper,
                        "direct": direct,
                        "difference": hyper - direct,
                    }
                )
        print("bottom", parity, flush=True)

    group_points = (
        (1, 3, 0, 7),
        (1, 12, 24, 20),
        (1, 30, 60, 35),
        (8, 3, 24, 12),
    )
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        sources = {
            "P": to_sparse(sp.expand(slope * A_expr)),
            "B": to_sparse(sp.expand(T**3 * affine * V + slope * A_expr)),
        }
        for c_value, m_value, x_value, r in group_points:
            a = 2 * c_value + m_value + x_value - 3
            b = 2 * m_value + parity - 4
            target = m_value + r + 5
            for kind, source in sources.items():
                numeric = evaluate(source, c_value, m_value, x_value, target)
                hyper = central_sum(numeric, a, b, r, target)
                direct = direct_sum(numeric, a, b, r, target)
                records.append(
                    {
                        "package": "group",
                        "parity": parity,
                        "c": c_value,
                        "m": m_value,
                        "x": x_value,
                        "r": r,
                        "kind": kind,
                        "hypergeometric": hyper,
                        "direct": direct,
                        "difference": hyper - direct,
                    }
                )
        print("group", parity, flush=True)

    failures = [record for record in records if record["difference"] != 0]
    report = {
        "status": (
            "PASS_AFFINE_CENTRAL_HYPERGEOMETRIC_REDUCTION"
            if not failures
            else "FAIL"
        ),
        "identity": (
            "[z^Nw^N]z^p w^q A^aT^bV^r="
            "sum_{k=0}^b sum_{j=0}^r binom(b,k)binom(r,j)"
            "binom(a+b-k,N-q-b+k-j)"
            "binom(a+k+r-j,N-p-k)"
        ),
        "comparison_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:20],
    }
    Path(
        "path_isolate_p4_affine_central_hypergeometric_reduction_"
        "20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
