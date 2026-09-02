#!/usr/bin/env python3
"""Independently verify the affine bridge via the positive D_r formula."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A as A_expr,
    T,
    V,
    c,
    m,
    to_sparse,
    x,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A,
    S,
    W,
    add_scaled,
    evaluate,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from verify_shifted_binomial_product_forward_difference import (
    choose,
    trinomial_weight,
)


def bridge_weight(
    i: int,
    j: int,
    a: int,
    b: int,
    target: int,
    r: int,
) -> int:
    total = 0
    trinomial_terms = [
        (p, q, trinomial_weight(p, q, r))
        for p in range(r + 1)
        for q in range(r + 1)
        if trinomial_weight(p, q, r)
    ]
    for t in range(b + 1):
        u = target - i - 2 * t
        v = target - j - 2 * (b - t)
        if u < 0 or v < 0:
            continue
        alpha = a + b - t
        beta = a + t
        inner = 0
        for p, q, weight in trinomial_terms:
            inner += (
                choose(alpha, u - p)
                * choose(beta, v - q)
                * weight
            )
        total += math.comb(b, t) * inner
    return total


def main() -> None:
    parameter_points = [(1, 3, 0), (1, 3, 4), (2, 4, 0)]
    maximum_r = 6
    records = []
    failures = []
    canonical = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine_kernel * V + slope * A_expr))
        p_reciprocal, degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert degree == b_degree == 24
        for c_value, m_value, x_value in parameter_points:
            a = 2 * c_value + m_value + x_value - 3
            b = 2 * m_value + parity - 4
            target = 2 * c_value + 4 * m_value + x_value + 2 * parity + 8
            p_numeric = evaluate(p_reciprocal, c_value, m_value, x_value, target)
            b_numeric = evaluate(b_reciprocal, c_value, m_value, x_value, target)
            for r in range(maximum_r + 1):
                combined = add_scaled(b_numeric, p_numeric, r)
                weights = {
                    key: bridge_weight(key[0], key[1], a, b, target, r)
                    for key in combined
                }
                formula_value = sum(
                    coefficient * weights[key]
                    for key, coefficient in combined.items()
                )

                direct_poly = dict(combined)
                for factor, exponent in ((A, a), (S, b), (W, r)):
                    direct_poly = multiply(
                        direct_poly, power(factor, exponent, target), target
                    )
                direct_value = direct_poly.get((target, target), 0)
                record = {
                    "parity": parity,
                    "c": c_value,
                    "m": m_value,
                    "x": x_value,
                    "r": r,
                    "target": target,
                    "formula_value": formula_value,
                    "direct_value": direct_value,
                    "difference": formula_value - direct_value,
                }
                records.append(record)
                canonical.append(
                    f"{parity},{c_value},{m_value},{x_value},{r}:{formula_value}"
                )
                if formula_value != direct_value:
                    failures.append(record)
                print(parity, c_value, m_value, x_value, r, record["difference"], flush=True)
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_AFFINE_FORWARD_DIFFERENCE_BRIDGE"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_AFFINE_FORWARD_DIFFERENCE_BRIDGE"
        ),
        "parameter_points": parameter_points,
        "r_range": [0, maximum_r],
        "comparison_count": len(records),
        "failure_count": len(failures),
        "first_failures": failures[:20],
        "sha256": hashlib.sha256(
            "\n".join(canonical).encode("utf-8")
        ).hexdigest(),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_forward_difference_bridge_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
