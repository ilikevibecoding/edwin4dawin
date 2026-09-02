"""Exact replay for the selector diagonal-crossing theorem.

The all-order proof is in SELECTOR_DIAGONAL_CROSSING_THEOREM_2026-08-10.md.
This script checks exact triple common-interlacer gaps, representative
positive quadratic-in-u pencils, and the resulting selector root count.
Finite checks are transcription evidence, not the compactness/continuity
argument used in the proof.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_diagonal_crossing_exact_20260810.json"
t, u, x = sp.symbols("t u x")


def path_coeff(M: int, i: int) -> int:
    if i < 0 or i >= M:
        return 0
    return comb(2 * M - i - 1, i)


def gamma_polynomial(M: int, s: int) -> sp.Poly:
    """Gamma transform of the palindromic diagonal path slice."""
    diagonal = [path_coeff(M, i) * path_coeff(M, s - i) for i in range(s + 1)]
    gamma: list[int] = []
    for h in range(s // 2 + 1):
        value = diagonal[h]
        for j in range(h):
            value -= gamma[j] * comb(s - 2 * j, h - j)
        gamma.append(value)
    return sp.Poly(sum(value * t**h for h, value in enumerate(gamma)), t, domain=sp.ZZ)


def mixed_slice_at_minus(M1: int, M2: int, s: int) -> sp.Poly:
    return sp.Poly(
        sum(
            (-1) ** i * path_coeff(M1, i) * path_coeff(M2, s - i) * x**i
            for i in range(s + 1)
        ),
        x,
        domain=sp.ZZ,
    )


def exact_intervals(p: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    data = p.intervals(eps=sp.Rational(1, 10**30))
    assert len(data) == p.degree()
    assert all(mult == 1 for _, mult in data)
    intervals = [interval for interval, _ in data]
    # SymPy records an exact rational root as the point interval (r,r).
    assert all(left <= right for left, right in intervals)
    assert all(intervals[i][1] < intervals[i + 1][0] for i in range(len(intervals) - 1))
    return intervals


def negative_simple_intervals(p: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    intervals = exact_intervals(p)
    assert all(right < 0 for _, right in intervals)
    return intervals


def positive_simple_intervals(p: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    intervals = exact_intervals(p)
    assert all(left > 0 for left, _ in intervals)
    return intervals


def strictly_precedes_positive(p: sp.Poly, q: sp.Poly) -> bool:
    """p_1<q_1<...<p_s<q_s, checked with exact rational isolators."""
    p_roots = positive_simple_intervals(p)
    q_roots = positive_simple_intervals(q)
    assert len(p_roots) == len(q_roots)
    for i in range(len(p_roots)):
        if not p_roots[i][1] < q_roots[i][0]:
            return False
        if i + 1 < len(p_roots) and not q_roots[i][1] < p_roots[i + 1][0]:
            return False
    return True


def same_mixed_gap_interlacer(diagonal_0: sp.Poly, diagonal_2: sp.Poly, mixed: sp.Poly) -> bool:
    """The first s-1 mixed roots lie in every corresponding endpoint gap."""
    roots_0 = positive_simple_intervals(diagonal_0)
    roots_2 = positive_simple_intervals(diagonal_2)
    roots_k = positive_simple_intervals(mixed)
    for i in range(len(roots_k) - 1):
        if not (
            roots_0[i][1] < roots_k[i][0] < roots_k[i][1] < roots_0[i + 1][0]
            and roots_2[i][1] < roots_k[i][0] < roots_k[i][1] < roots_2[i + 1][0]
        ):
            return False
    return True


def strict_triple_common_interlacer(polys: tuple[sp.Poly, sp.Poly, sp.Poly]) -> bool:
    roots = [negative_simple_intervals(poly) for poly in polys]
    degree = polys[0].degree()
    assert all(poly.degree() == degree for poly in polys)
    for i in range(degree - 1):
        left = max(root_set[i][1] for root_set in roots)
        right = min(root_set[i + 1][0] for root_set in roots)
        if not left < right:
            return False
    return True


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    boundary_checks = 0
    # s=0: G_M=1 and the selector is (1-t)^2.
    g00 = gamma_polynomial(5, 0)
    g01 = gamma_polynomial(4, 0)
    g02 = gamma_polynomial(3, 0)
    selector0 = sp.Poly(g00.as_expr() - 2 * t * g01.as_expr() + t**2 * g02.as_expr(), t)
    assert selector0 == sp.Poly((1 - t) ** 2, t)
    boundary_checks += 1

    # s=1: G_(M,1)=2M-2, so the roots are 1 and (N-1)/(N-3).
    N1 = 7
    g10 = gamma_polynomial(N1, 1)
    g11 = gamma_polynomial(N1 - 1, 1)
    g12 = gamma_polynomial(N1 - 2, 1)
    selector1 = sp.Poly(g10.as_expr() - 2 * t * g11.as_expr() + t**2 * g12.as_expr(), t)
    expected1 = sp.Poly(2 * (N1 - 3) * (t - 1) * (t - sp.Rational(N1 - 1, N1 - 3)), t)
    assert selector1 == expected1
    boundary_checks += 1

    identity_checks = 0
    endpoint_direction_checks = 0
    reciprocal_mixed_identities = 0
    endpoint_common_interlacer_checks = 0
    triple_interlacer_checks = 0
    q_pencil_checks = 0
    selector_root_counts = 0
    cases: list[dict[str, int]] = []

    for s in range(2, 15):
        degree = s // 2
        for excess in (0, 3):
            N = 2 * s + 5 + excess
            g0 = gamma_polynomial(N, s)
            g1 = gamma_polynomial(N - 1, s)
            g2 = gamma_polynomial(N - 2, s)
            assert g0.degree() == g1.degree() == g2.degree() == degree

            diagonal_0 = mixed_slice_at_minus(N, N, s)
            diagonal_2 = mixed_slice_at_minus(N - 2, N - 2, s)
            mixed_k = mixed_slice_at_minus(N - 2, N, s)
            mixed_kstar = mixed_slice_at_minus(N, N - 2, s)
            assert strictly_precedes_positive(diagonal_0, mixed_k)
            assert strictly_precedes_positive(mixed_kstar, diagonal_2)
            assert strictly_precedes_positive(mixed_kstar, diagonal_0)
            assert strictly_precedes_positive(diagonal_2, mixed_k)
            endpoint_direction_checks += 4

            reciprocal_residual = sp.expand(
                x**s * mixed_k.as_expr().subs(x, 1 / x)
                - (-1) ** s * mixed_kstar.as_expr()
            )
            assert reciprocal_residual == 0
            reciprocal_mixed_identities += 1
            assert same_mixed_gap_interlacer(diagonal_0, diagonal_2, mixed_k)
            endpoint_common_interlacer_checks += 1

            assert strict_triple_common_interlacer((g0, g1, g2))
            triple_interlacer_checks += 1

            selector = sp.Poly(
                g0.as_expr() - 2 * t * g1.as_expr() + t**2 * g2.as_expr(),
                t,
                domain=sp.ZZ,
            )
            assert selector.degree() == degree + 2

            # Gamma(-u)=Q_u(-u), checked exactly in every parameter case.
            q_expr = g0.as_expr() + 2 * u * g1.as_expr() + u**2 * g2.as_expr()
            residual = sp.expand(
                selector.as_expr().subs(t, -u) - q_expr.subs(t, -u)
            )
            assert residual == 0
            identity_checks += 1

            # Representative exact positive pencils from the all-order cone.
            for u_value in (sp.Rational(1, 7), sp.Rational(1), sp.Rational(13, 5)):
                q_value = sp.Poly(q_expr.subs(u, u_value), t, domain=sp.QQ)
                negative_simple_intervals(q_value)
                q_pencil_checks += 1

            selector_intervals = exact_intervals(selector)
            negative_count = sum(1 for _, right in selector_intervals if right < 0)
            positive_intervals = [(left, right) for left, right in selector_intervals if left > 0]
            assert negative_count == degree
            assert len(positive_intervals) == 2
            assert all(left > 1 for left, _ in positive_intervals)
            selector_root_counts += 1
            cases.append({"s": s, "N": N, "degree": degree, "excess": excess})

    payload = {
        "status": "PASS_EXACT_SELECTOR_DIAGONAL_CROSSING_REPLAY",
        "boundary_cases_s_0_s_1": boundary_checks,
        "range": "2<=s<=14, N=2s+5+e, e in {0,3}",
        "cases": len(cases),
        "direction_explicit_endpoint_comparisons": endpoint_direction_checks,
        "reciprocal_mixed_slice_identities": reciprocal_mixed_identities,
        "same_mixed_gap_endpoint_interlacers": endpoint_common_interlacer_checks,
        "triple_common_interlacer_checks": triple_interlacer_checks,
        "moving_pencil_identity_checks": identity_checks,
        "sample_simple_negative_Q_pencils": q_pencil_checks,
        "complete_selector_root_counts": selector_root_counts,
        "case_parameters": cases,
        "logical_note": (
            "The finite checks audit the identities and strictness.  The all-order "
            "negative-root count uses the common strict interlacer, continuous ordered "
            "roots of Q_u, and their bounded u-to-infinity limit."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"cases={len(cases)} triple={triple_interlacer_checks} "
        f"Q={q_pencil_checks} selector={selector_root_counts}"
    )
    print(f"source_sha256={sha256(Path(__file__).resolve())}")
    print(f"report_sha256={sha256(REPORT)}")


if __name__ == "__main__":
    main()
