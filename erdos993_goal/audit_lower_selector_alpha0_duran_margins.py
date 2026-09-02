#!/usr/bin/env python3
"""Exact 770-cell audit of the lower-selector artificial-alpha=0 margins.

The path parameters are deliberately kept distinct from Durán's ambient
parameter (which older notes also call N).  The complete normalization is:

    5 <= d <= 14,
    0 <= r <= d-5,
    path_N = d+r,
    r < row_s <= path_N+r,
    Gamma = G_(path_N,row_s)-2t G_(path_N-1,row_s)
            +t^2 G_(path_N-2,row_s),
    a = max(0,row_s-path_N+1),       Gamma=t^a Gamma_hat,
    m = deg Gamma_hat,
    P = d+row_s,                     original alpha=0,
    p = P-2a,                        alpha=a,
    duran_N = p+alpha = P-a,
    epsilon = p mod 2 = P mod 2,
    n = (p-epsilon)/2,
    beta = epsilon-1/2,
    duran_s = n-m+2,
    L = duran_s+beta-1 = n-m+beta+1.

For Gamma_hat(t)=sum gamma_h t^h, the actual coefficient polynomial is

    Q_D(z)=sum_h gamma_h (duran_N)_h^fall 4^(-h)
                         (z)_(m-h)^rise.

Exact Sturm intervals select the m-2 most negative roots.  Vieta interval
arithmetic then certifies the residual sum/product and the two margins

    M1=(duran_s-1)(duran_s+beta-1)-G2,
    M2=(duran_s+beta-1)(duran_s+beta-G1)+G2.

The identity M2=Q_D(L)/B(L), with
    B(z)=LC(Q_D) product_selected(z-b),
is checked exactly at the interval level; Q_D(L)>0, LC(Q_D)>0, and L>0
give an independent exact sign certificate because all selected b are
negative.  This is a finite audit, not the missing all-order proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_alpha0_duran_margins_exact_20260810.json"
Z = sp.symbols("z")
ROOT_EPS = sp.Rational(1, 10**45)


def duran_polynomial(duran_N: int, gamma: list[sp.Expr]) -> sp.Poly:
    m = len(gamma) - 1
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h]
                * sp.ff(duran_N, h)
                / 4**h
                * sp.rf(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), Z)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def interval_product(
    intervals: list[tuple[sp.Rational, sp.Rational]],
) -> tuple[sp.Rational, sp.Rational]:
    lower = upper = sp.Integer(1)
    for left, right in intervals:
        candidates = (lower * left, lower * right, upper * left, upper * right)
        lower, upper = min(candidates), max(candidates)
    return sp.Rational(lower), sp.Rational(upper)


def interval_multiply(
    first: tuple[sp.Rational, sp.Rational],
    second: tuple[sp.Rational, sp.Rational],
) -> tuple[sp.Rational, sp.Rational]:
    candidates = (
        first[0] * second[0],
        first[0] * second[1],
        first[1] * second[0],
        first[1] * second[1],
    )
    return sp.Rational(min(candidates)), sp.Rational(max(candidates))


def divide_point_by_interval(
    numerator: sp.Rational, denominator: tuple[sp.Rational, sp.Rational]
) -> tuple[sp.Rational, sp.Rational]:
    left, right = denominator
    assert left * right > 0
    candidates = (sp.cancel(numerator / left), sp.cancel(numerator / right))
    return min(candidates), max(candidates)


def decimal_interval(
    interval: tuple[sp.Rational, sp.Rational], digits: int = 18
) -> list[str]:
    return [str(sp.N(interval[0], digits)), str(sp.N(interval[1], digits))]


def one_case(d: int, r: int, row_s: int) -> dict[str, object]:
    path_N = d + r
    assert r < row_s <= path_N + r

    gamma = selector_gamma(path_N, row_s)
    forced_order = max(0, row_s - path_N + 1)
    assert gamma[:forced_order] == [0] * forced_order
    gamma_hat = gamma[forced_order:]
    assert gamma_hat and gamma_hat[0] != 0
    m = len(gamma_hat) - 1
    assert m >= 2

    original_P = d + row_s
    effective_p = original_P - 2 * forced_order
    effective_alpha = forced_order
    duran_N = effective_p + effective_alpha
    assert duran_N == original_P - forced_order
    epsilon = effective_p % 2
    assert epsilon == original_P % 2
    n = (effective_p - epsilon) // 2
    beta = sp.Rational(2 * epsilon - 1, 2)
    duran_s = n - m + 2
    L = duran_s + beta - 1
    assert duran_s >= 2
    assert L > 0

    q = duran_polynomial(duran_N, gamma_hat)
    assert q.degree() == m
    assert q.LC() > 0
    assert q.eval(L) > 0

    real_intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in q.intervals(eps=ROOT_EPS):
        assert multiplicity == 1
        real_intervals.append(
            (sp.Rational(interval[0]), sp.Rational(interval[1]))
        )
    negative = [interval for interval in real_intervals if interval[1] < 0]
    assert len(negative) >= m - 2
    benign = negative[: m - 2]

    leading = sp.Rational(q.LC())
    total_sum = sp.cancel(-q.nth(m - 1) / leading)
    total_product = sp.cancel(((-1) ** m) * q.nth(0) / leading)
    benign_sum = (
        sum((left for left, _ in benign), start=sp.Integer(0)),
        sum((right for _, right in benign), start=sp.Integer(0)),
    )
    residual_sum = (
        sp.cancel(total_sum - benign_sum[1]),
        sp.cancel(total_sum - benign_sum[0]),
    )
    benign_product = interval_product(benign)
    residual_product = divide_point_by_interval(total_product, benign_product)

    g1 = (1 + residual_sum[0], 1 + residual_sum[1])
    g2 = residual_product
    first_base = sp.cancel((duran_s - 1) * (duran_s + beta - 1))
    first_margin = (
        sp.cancel(first_base - g2[1]),
        sp.cancel(first_base - g2[0]),
    )
    second_margin = (
        sp.cancel(L * (L - residual_sum[1]) + g2[0]),
        sp.cancel(L * (L - residual_sum[0]) + g2[1]),
    )
    assert first_margin[0] > 0
    assert second_margin[0] > 0

    # Exact interval replay of Q_D(L)/B(L).  Since each selected root is
    # negative and L>0, the denominator is a strictly positive interval.
    benign_at_L = interval_product(
        [(sp.cancel(L - right), sp.cancel(L - left)) for left, right in benign]
    )
    B_at_L = (leading * benign_at_L[0], leading * benign_at_L[1])
    q_over_B = divide_point_by_interval(sp.Rational(q.eval(L)), B_at_L)
    assert q_over_B[0] > 0
    # Both intervals enclose the same exact M2; overlap is an exact check.
    assert max(q_over_B[0], second_margin[0]) <= min(
        q_over_B[1], second_margin[1]
    )

    return {
        "path_N": path_N,
        "d": d,
        "r": r,
        "row_s": row_s,
        "forced_t_order": forced_order,
        "core_degree_m": m,
        "original_P": original_P,
        "effective_p": effective_p,
        "effective_alpha": effective_alpha,
        "duran_N": duran_N,
        "epsilon": epsilon,
        "n": n,
        "beta": str(beta),
        "duran_s": duran_s,
        "L": str(L),
        "real_roots": len(real_intervals),
        "negative_real_roots": len(negative),
        "certified_benign_roots": len(benign),
        "residual_sum_interval_decimal": decimal_interval(residual_sum),
        "G1_interval_decimal": decimal_interval(g1),
        "G2_interval_decimal": decimal_interval(g2),
        "M1_interval_decimal": decimal_interval(first_margin),
        "M2_interval_decimal": decimal_interval(second_margin),
        "Q_D_at_L": str(q.eval(L)),
        "Q_D_at_L_decimal": str(sp.N(q.eval(L), 18)),
        "Q_D_over_B_interval_decimal": decimal_interval(q_over_B),
        "primitive_sha256": primitive_digest(q),
    }


def main() -> None:
    cases: list[dict[str, object]] = []
    for d in range(5, 15):
        for r in range(d - 4):
            path_N = d + r
            for row_s in range(r + 1, path_N + r + 1):
                cases.append(one_case(d, r, row_s))

    assert len(cases) == 770
    minimum_first = min(
        cases, key=lambda case: sp.Rational(case["M1_interval_decimal"][0])
    )
    minimum_second = min(
        cases, key=lambda case: sp.Rational(case["M2_interval_decimal"][0])
    )
    digest_input = ";".join(str(case["primitive_sha256"]) for case in cases)
    source_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    payload = {
        "kind": "lower_selector_alpha0_duran_margins_exact_audit",
        "date": "2026-08-10",
        "status": "PASS_EXACT_770_CELL_LOWER_SELECTOR_ALPHA0_DURAN_MARGIN_AUDIT",
        "scope": "finite exact Sturm/Vieta evidence, not an all-order theorem",
        "parameter_range": "5<=d<=14, 0<=r<=d-5, r<row_s<=path_N+r, path_N=d+r",
        "normalization": {
            "selector": "Gamma=G_(path_N,row_s)-2tG_(path_N-1,row_s)+t^2G_(path_N-2,row_s)",
            "forced_order": "a=max(0,row_s-path_N+1), Gamma=t^a Gamma_hat",
            "degree": "m=deg Gamma_hat",
            "window": "P=d+row_s; after t^a stripping, effective_p=P-2a, effective_alpha=a, duran_N=P-a",
            "parity": "epsilon=effective_p mod 2=P mod 2, n=(effective_p-epsilon)/2, beta=epsilon-1/2",
            "offset": "duran_s=n-m+2, L=duran_s+beta-1=n-m+beta+1",
            "coefficient_polynomial": "Q_D(z)=sum_h gamma_h (duran_N)_h^fall 4^-h (z)_(m-h)^rise",
            "margins": "M1=(duran_s-1)(duran_s+beta-1)-G2; M2=L(L+1-G1)+G2=Q_D(L)/B(L)",
        },
        "cases": len(cases),
        "all_Q_D_at_L_positive": True,
        "all_first_margins_positive": True,
        "all_second_margins_positive": True,
        "minimum_first_margin_case": minimum_first,
        "minimum_second_margin_case": minimum_second,
        "source_sha256": source_sha256,
        "combined_primitive_digest_sha256": hashlib.sha256(
            digest_input.encode("ascii")
        ).hexdigest(),
        "cases_detail": cases,
        "remaining_theorem": (
            "Prove Q_D(L)>0 and the path-specific M1 bound uniformly in d,r,row_s; "
            "the exact 770-cell audit only identifies and certifies the target."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    summary = {key: value for key, value in payload.items() if key != "cases_detail"}
    print(json.dumps(summary, indent=2))
    print(json.dumps({"output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
