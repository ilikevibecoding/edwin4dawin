"""Exact replay for the top homogeneous layer of the defect-one group cone.

The all-order proof is in Section 88 of
NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md.  This script checks the
coefficient identities, gamma/Jacobi transformation, boundary root counts,
and the tail-lowering identity over a substantial exact range.  The finite
range is a transcription audit, not the proof.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_top_homogeneous_cone_20260804.json"

z, t, y = sp.symbols("z t y")


def primitive_digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-c for c in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def R(d: int) -> sp.Poly:
    return sp.Poly(sp.expand((1 + z) ** (d - 4) * (1 + z + z**2) ** 2), z)


def Q(d: int, r: int) -> sp.Poly:
    D = d + 2 * r
    base = R(d)
    return sp.Poly(sp.Add(*[
        comb(D, r + j) * base.coeff_monomial(z**j) * z**j
        for j in range(d + 1)
        if 0 <= r + j <= D
    ]), z, domain=sp.QQ)


def Q0(d: int, r: int) -> sp.Poly:
    D = d + 2 * r
    return sp.Poly(sp.Add(*[
        comb(d, j) * comb(D, r + j) * z**j
        for j in range(d + 1)
        if 0 <= r + j <= D
    ]), z, domain=sp.QQ)


def gamma_coefficients(poly: sp.Poly, d: int) -> list[sp.Rational]:
    remainder = poly
    out: list[sp.Rational] = []
    for k in range(d // 2 + 1):
        coefficient = remainder.coeff_monomial(z**k)
        out.append(sp.Rational(coefficient))
        remainder = sp.Poly(
            sp.expand(remainder.as_expr() - coefficient * z**k * (1 + z) ** (d - 2 * k)),
            z,
            domain=sp.QQ,
        )
    assert remainder.is_zero
    return out


def E(poly: sp.Poly) -> sp.Poly:
    return sp.Poly(sp.expand(z * sp.diff(poly.as_expr(), z)), z, domain=sp.QQ)


def lowering(poly: sp.Poly, d: int, r: int) -> sp.Poly:
    first = sp.Poly(sp.expand(z * sp.diff(poly.as_expr(), z) + r * poly.as_expr()), z)
    return sp.Poly(
        sp.expand((d + r) * first.as_expr() - z * sp.diff(first.as_expr(), z)),
        z,
        domain=sp.QQ,
    )


def main() -> None:
    report: dict[str, object] = {
        "status": "PASS",
        "boundary_checks": [],
        "tail_checks": [],
        "symbolic_slack": {},
    }

    # Symbolic parity formulas for the final Jacobi coupling ratio.
    n = sp.symbols("n", integer=True, positive=True)
    even_ratio = sp.factor(
        (3 * n - 5) * (4 * n - 5) * (6 * n - 11)
        / (3 * (n - 1) * (2 * n - 3) * (12 * n - 19))
    )
    odd_ratio = sp.factor(
        (3 * n - 4) * (4 * n - 3) * (6 * n - 7)
        / (3 * (n - 1) * (2 * n - 1) * (12 * n - 13))
    )
    report["symbolic_slack"] = {
        "even_ratio": str(even_ratio),
        "even_one_minus_ratio": str(sp.factor(1 - even_ratio)),
        "odd_ratio": str(odd_ratio),
        "odd_one_minus_ratio": str(sp.factor(1 - odd_ratio)),
    }

    # Derive (rather than merely record) the two coupling ratios.  At x=1,
    # Chu--Vandermonde gives the first two logarithmic derivative moments of
    # 2F1(-n,b;c;x).  The Jacobi norm ratio then gives B_d/b_(n-1).
    symbolic_cases = (
        (2 * n, sp.Rational(-1, 2), sp.Rational(1, 2) - n, 2 * n - 4, even_ratio, "even"),
        (2 * n + 1, sp.Rational(1, 2), -n - sp.Rational(1, 2), 2 * n - 3, odd_ratio, "odd"),
    )
    for d_symbolic, beta, hyper_b, hyper_c, expected_ratio, label in symbolic_cases:
        alpha = d_symbolic - 5
        coeff_a = sp.factor(2 * (2 * d_symbolic - 5) / (d_symbolic * (d_symbolic - 1)))
        coeff_b = sp.factor(
            2 * (2 * d_symbolic - 5)
            / (d_symbolic * (d_symbolic - 1) * (d_symbolic - 2))
        )
        mu1 = sp.factor(-n * hyper_b / (hyper_c - hyper_b + n - 1))
        mu2 = sp.factor(
            n * (n - 1) * hyper_b * (hyper_b + 1)
            / ((hyper_c - hyper_b + n - 2) * (hyper_c - hyper_b + n - 1))
        )
        leading_scale = sp.factor(1 - coeff_a * mu1 + coeff_b * mu2)
        jacobi_sum = 2 * n + alpha + beta
        next_recurrence = sp.factor(
            n * (n + alpha) * (n + beta) * (n + alpha + beta)
            / (jacobi_sum**2 * (jacobi_sum + 1) * (jacobi_sum - 1))
        )
        derived_ratio = sp.factor(
            coeff_b * jacobi_sum * (jacobi_sum + 1) * next_recurrence / leading_scale
        )
        assert sp.factor(derived_ratio - expected_ratio) == 0
        report["symbolic_slack"][f"{label}_leading_scale"] = str(leading_scale)
        report["symbolic_slack"][f"{label}_derived_ratio"] = str(derived_ratio)

    for d in range(5, 51):
        r = d - 5
        q = Q(d, r)
        q0 = Q0(d, r)
        gamma = gamma_coefficients(q, d)
        gamma0 = gamma_coefficients(q0, d)
        a = sp.Rational(2 * (2 * d - 5), d * (d - 1))
        b = sp.Rational(2 * (2 * d - 5), d * (d - 1) * (d - 2))
        expected = [sp.factor(c * (1 - a * k + b * k * (k - 1))) for k, c in enumerate(gamma0)]
        gamma_identity = gamma == expected
        gamma_poly = sp.Poly(sum(c * t**k for k, c in enumerate(gamma)), t, domain=sp.QQ)
        real = int(gamma_poly.count_roots(-sp.oo, sp.oo))
        negative = int(gamma_poly.count_roots(-sp.oo, 0))
        positive_coefficients = all(c > 0 for c in gamma)
        item = {
            "d": d,
            "degree": gamma_poly.degree(),
            "gamma_identity": gamma_identity,
            "positive_coefficients": positive_coefficients,
            "real_roots": real,
            "negative_roots": negative,
            "digest": primitive_digest(q),
        }
        report["boundary_checks"].append(item)
        if not gamma_identity or not positive_coefficients or real != gamma_poly.degree() or negative != gamma_poly.degree():
            report["status"] = "FAIL"

        # Check the explicit Jacobi top-three expansion and coupling slack.
        degree = d // 2
        beta = sp.Rational(-1, 2) if d % 2 == 0 else sp.Rational(1, 2)
        alpha = d - 5
        F = gamma_poly.as_expr()
        K = sp.Poly(sp.cancel((1 - y) ** degree * F.subs(t, -y / (4 * (1 - y)))), y, domain=sp.QQ)
        jacobi = [sp.Poly(sp.jacobi(k, alpha, beta, 1 - 2 * y), y, domain=sp.QQ) for k in range(degree + 1)]
        remainder = K
        coefficients: dict[int, sp.Rational] = {}
        for k in range(degree, max(-1, degree - 3), -1):
            c = sp.factor(remainder.LC() / jacobi[k].LC())
            coefficients[k] = c
            remainder = sp.Poly(sp.expand(remainder.as_expr() - c * jacobi[k].as_expr()), y, domain=sp.QQ)
        top_three_only = remainder.is_zero
        report["boundary_checks"][-1]["jacobi_top_three_only"] = top_three_only
        if not top_three_only:
            report["status"] = "FAIL"

    # Q_(d,r-1) is a positive scalar multiple of (E+r)(d+r-E)Q_(d,r).
    for d in range(5, 31):
        for r in range(1, d - 4):
            left = Q(d, r - 1)
            right = lowering(Q(d, r), d, r)
            ratios = {
                sp.factor(left.coeff_monomial(z**j) / right.coeff_monomial(z**j))
                for j in range(d + 1)
                if right.coeff_monomial(z**j) != 0
            }
            ok = len(ratios) == 1 and all(
                left.coeff_monomial(z**j) == 0 or right.coeff_monomial(z**j) != 0
                for j in range(d + 1)
            )
            report["tail_checks"].append({"d": d, "r": r, "ok": ok, "scale": str(next(iter(ratios)))})
            if not ok:
                report["status"] = "FAIL"

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{report['status']}: {len(report['boundary_checks'])} boundary sizes, "
          f"{len(report['tail_checks'])} exact tail identities")
    print(REPORT)


if __name__ == "__main__":
    main()
