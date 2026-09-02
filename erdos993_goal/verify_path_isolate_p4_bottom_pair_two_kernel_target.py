#!/usr/bin/env python3
"""Verify the bottom-pair two-kernel target against direct exact lifts."""

from __future__ import annotations

import json
import math
from functools import cache
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    m,
    q,
    w,
    x,
    z,
)
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    expression_dict,
    multiply,
    power,
)
from prove_path_isolate_p4_bottom_pair_initial_quotient import pair_normalized


@cache
def actual_lift(m_value: int, x_value: int, parity: int, distance: int) -> int:
    old_pair = pair_normalized(
        sp.Integer(m_value), sp.Integer(x_value), parity, distance
    )
    new_pair = pair_normalized(
        sp.Integer(m_value + 1), sp.Integer(x_value), parity, distance
    )
    old_central = math.comb(2 * m_value + parity, m_value)
    new_central = math.comb(2 * m_value + 2 + parity, m_value + 1)
    return int(sp.cancel(new_central * new_pair - old_central * old_pair))


def main() -> None:
    m_value = 3
    x_value = 0
    maximum_r = 2
    records = []
    failures = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        p_kernel = sp.expand(slope * A_expr)
        b_kernel = sp.expand(q**2 * T**3 * kernel.as_expr() * V + slope * A_expr)
        a = m_value + x_value - 3
        b = 2 * m_value + parity - 5
        for r in range(maximum_r + 1):
            k = r + 1
            direct = sum(
                (-1) ** (k - n)
                * math.comb(k, n)
                * actual_lift(m_value, x_value, parity, n - 1)
                for n in range(k + 1)
            )
            target = m_value + r + 5
            source_expr = sp.expand(
                (b_kernel + r * p_kernel).subs({m: m_value, x: x_value})
            )
            source = expression_dict(source_expr, target)
            for factor, exponent in (
                (A, a),
                (T_dict, b),
                (V_dict, r),
            ):
                source = multiply(source, power(factor, exponent, target), target)
            extracted = source.get((target, target), 0)
            record = {
                "parity": parity,
                "m": m_value,
                "x": x_value,
                "r": r,
                "newton_order": k,
                "target": target,
                "direct_lift_newton_coefficient": direct,
                "extracted_two_kernel_coefficient": extracted,
                "difference": extracted - direct,
            }
            records.append(record)
            if extracted != direct:
                failures.append(record)
            print(record, flush=True)
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_TWO_KERNEL_TARGET"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_TWO_KERNEL_TARGET"
        ),
        "outer_exponents": (
            "A^(m+x-3)*T^(2m+epsilon-5)*V^r"
        ),
        "target": "m+r+5",
        "comparison_count": len(records),
        "failure_count": len(failures),
        "first_failures": failures[:20],
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_two_kernel_target_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
