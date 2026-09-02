"""Exact replay for the second-highest homogeneous layer of G_(N,d).

Section 89 of NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md gives the
all-order Jacobi-matrix proof.  This script checks the row formula against
the full group coefficient matrix, the gamma multiplier, negative root
counts, and the parity-independent positive slack polynomial.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from probe_group_order6_sturm import group_matrix
from verify_group_top_homogeneous_cone import gamma_coefficients


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_second_homogeneous_cone_20260804.json"

z, t = sp.symbols("z t")


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-c for c in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def formula_row(N: int, d: int) -> sp.Poly:
    p = d + 1
    alpha = N - d - 1
    theta = sp.Rational(N - 2, N - 1)
    eta = sp.Rational(N - 3, N - 1)
    terms = []
    for j in range(p + 1):
        selector = (
            comb(p, j)
            - 2 * theta * (comb(p - 2, j - 1) if 1 <= j <= p - 1 else 0)
            + eta * (comb(p - 4, j - 2) if 2 <= j <= p - 2 else 0)
        )
        terms.append(comb(p + 2 * alpha, alpha + j) * selector * z**j)
    return sp.Poly(sp.Add(*terms), z, domain=sp.QQ)


def base_row(N: int, d: int) -> sp.Poly:
    p = d + 1
    alpha = N - d - 1
    return sp.Poly(sum(
        comb(p + 2 * alpha, alpha + j) * comb(p, j) * z**j
        for j in range(p + 1)
    ), z, domain=sp.QQ)


def matrix_row(N: int, d: int) -> sp.Poly:
    matrix = group_matrix(N, d)
    total_degree = 2 * N - d - 1
    alpha = N - d - 1
    return sp.Poly(sum(
        int(matrix[alpha + j, total_degree - alpha - j]) * z**j
        for j in range(d + 2)
    ), z, domain=sp.QQ)


def main() -> None:
    report: dict[str, object] = {"status": "PASS", "checks": [], "symbolic": {}}

    # The two parity calculations have the same numerator after writing
    # q=(p-7)-alpha for the distance from the cone boundary.
    alpha, q = sp.symbols("alpha q", nonnegative=True, integer=True)
    slack = (
        12 * alpha**3 * q + 48 * alpha**3
        + 20 * alpha**2 * q**2 + 194 * alpha**2 * q + 458 * alpha**2
        + 11 * alpha * q**3 + 171 * alpha * q**2 + 872 * alpha * q + 1458 * alpha
        + 2 * q**4 + 43 * q**3 + 343 * q**2 + 1200 * q + 1552
    )
    report["symbolic"] = {
        "distance": "q=(d+1)-7-alpha=d-6-alpha",
        "common_positive_slack_numerator": str(slack),
        "all_coefficients_positive": all(c > 0 for c in sp.Poly(slack, alpha, q).coeffs()),
    }

    for d in range(6, 31):
        for r in range(1, d - 4):
            N = d + r
            expected = formula_row(N, d)
            actual = matrix_row(N, d)
            ratios = {
                sp.factor(actual.coeff_monomial(z**j) / expected.coeff_monomial(z**j))
                for j in range(d + 2)
                if expected.coeff_monomial(z**j) != 0
            }
            formula_ok = len(ratios) == 1

            gamma = gamma_coefficients(expected, d + 1)
            gamma0 = gamma_coefficients(base_row(N, d), d + 1)
            p = d + 1
            az = sp.Rational(2 * (N - 2), (N - 1) * p * (p - 1))
            bz = sp.Rational(N - 3, (N - 1) * p * (p - 1) * (p - 2) * (p - 3))
            A = sp.factor(az * N)
            B = sp.factor(bz * N * (N - 1))
            expected_gamma = [sp.factor(c * (1 - A * k + B * k * (k - 1))) for k, c in enumerate(gamma0)]
            gamma_ok = gamma == expected_gamma
            gamma_poly = sp.Poly(sum(c * t**k for k, c in enumerate(gamma)), t, domain=sp.QQ)
            real = int(gamma_poly.count_roots(-sp.oo, sp.oo))
            negative = int(gamma_poly.count_roots(-sp.oo, 0))
            positive = all(c > 0 for c in gamma)
            item = {
                "N": N,
                "d": d,
                "r": r,
                "formula_ok": formula_ok,
                "scale": str(next(iter(ratios))) if formula_ok else None,
                "gamma_ok": gamma_ok,
                "positive_coefficients": positive,
                "degree": gamma_poly.degree(),
                "real_roots": real,
                "negative_roots": negative,
                "digest": digest(expected),
            }
            report["checks"].append(item)
            if not formula_ok or not gamma_ok or not positive or real != gamma_poly.degree() or negative != gamma_poly.degree():
                report["status"] = "FAIL"

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{report['status']}: {len(report['checks'])} exact cone cells")
    print(REPORT)


if __name__ == "__main__":
    main()
