"""Exact structural audit for arbitrary upper homogeneous layers of G_(N,d).

For layer deficit s (total degree 2N-d-s), the residual binary row has degree
N-|r-s| and Jacobi parameter |r-s|, where r=N-d.  This script verifies the
closed coefficient formula throughout that full homogeneous diamond, checks
that its formal selector is a polynomial in lambda=j(d+s-j) of degree at
most floor(s/2)+2, records the corresponding finite Jacobi support, and
tests the necessary adjacent-layer interlacing signal.

The finite grid is an audit/discovery calculation, not an all-order proof.
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
REPORT = HERE / "group_general_homogeneous_layers_20260804.json"

z, t, y, lam = sp.symbols("z t y lam")


def C(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def digest(poly: sp.Poly) -> str:
    _, primitive = poly.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-coefficient for coefficient in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def defect_selector(N: int, d: int, s: int, j: int) -> int:
    """The coefficient C_(s,j) after the common derivative factorials."""
    p = d + s
    total = 0
    for q, state_sign in enumerate((1, -2, 1)):
        inner = 0
        M = N - q
        for i in range(s + 1):
            inner += (
                C(2 * M - i - 1, i)
                * C(2 * M - s + i - 1, s - i)
                * C(d - 2 * q, p - q - i - j)
            )
        total += state_sign * inner
    return total


def formula_row(N: int, d: int, s: int) -> sp.Poly:
    """Upper residual row (retained for the proved s<=r formulas)."""
    r = N - d
    assert 0 <= s <= r
    p = d + s
    ell = 2 * N - d - s
    alpha = r - s
    return sp.Poly(
        sum(C(ell, alpha + j) * defect_selector(N, d, s, j) * z**j for j in range(p + 1)),
        z,
        domain=sp.QQ,
    )


def residual_formula_row(N: int, d: int, s: int) -> sp.Poly:
    """Residual row for every 0<=s<=2N-d, with endpoint zeros removed."""
    r = N - d
    assert 0 <= s <= 2 * N - d
    total_degree = 2 * N - d - s
    minimum_exponent = max(0, r - s)
    formal_shift = max(0, s - r)
    residual_degree = N - abs(r - s)
    return sp.Poly(
        sum(
            C(total_degree, minimum_exponent + h)
            * defect_selector(N, d, s, formal_shift + h)
            * z**h
            for h in range(residual_degree + 1)
        ),
        z,
        domain=sp.QQ,
    )


def matrix_row(N: int, d: int, s: int) -> sp.Poly:
    matrix = group_matrix(N, d)
    total_degree = 2 * N - d - s
    alpha = N - d - s
    p = d + s
    return sp.Poly(
        sum(int(matrix[alpha + j, total_degree - alpha - j]) * z**j for j in range(p + 1)),
        z,
        domain=sp.QQ,
    )


def residual_matrix_row(matrix, N: int, d: int, s: int) -> sp.Poly:
    r = N - d
    total_degree = 2 * N - d - s
    minimum_exponent = max(0, r - s)
    residual_degree = N - abs(r - s)
    return sp.Poly(
        sum(
            int(matrix[minimum_exponent + h, total_degree - minimum_exponent - h]) * z**h
            for h in range(residual_degree + 1)
        ),
        z,
        domain=sp.QQ,
    )


def selector_polynomial(N: int, d: int, s: int) -> sp.Poly:
    """Interpolate C_(s,j)/binom(p,j) as a polynomial in j(p-j)."""
    p = d + s
    target_degree = s // 2 + 2
    samples: list[tuple[int, sp.Rational]] = []
    seen: set[int] = set()
    for j in range(p + 1):
        value = j * (p - j)
        if value in seen:
            continue
        seen.add(value)
        samples.append((value, sp.Rational(defect_selector(N, d, s, j), C(p, j))))
        if len(samples) == target_degree + 1:
            break
    polynomial = sp.Poly(sp.interpolate(samples, lam), lam, domain=sp.QQ)
    assert polynomial.degree() <= target_degree
    for j in range(p + 1):
        assert polynomial.eval(j * (p - j)) == sp.Rational(
            defect_selector(N, d, s, j), C(p, j)
        )
    return polynomial


def jacobi_support(poly: sp.Poly, p: int, alpha: int) -> tuple[int, list[str], bool]:
    gamma = gamma_coefficients(poly, p)
    degree = p // 2
    beta = sp.Rational(-1, 2) if p % 2 == 0 else sp.Rational(1, 2)
    F = sum(coefficient * t**k for k, coefficient in enumerate(gamma))
    K = sp.Poly(
        sp.cancel((1 - y) ** degree * F.subs(t, -y / (4 * (1 - y)))),
        y,
        domain=sp.QQ,
    )
    basis = [
        sp.Poly(sp.jacobi(k, alpha, beta, 1 - 2 * y), y, domain=sp.QQ)
        for k in range(degree + 1)
    ]
    remainder = K
    coefficients: list[tuple[int, sp.Rational]] = []
    for k in range(degree, -1, -1):
        if remainder.is_zero:
            break
        coefficient = sp.factor(remainder.LC() / basis[k].LC())
        coefficients.append((k, coefficient))
        remainder = sp.Poly(
            sp.expand(remainder.as_expr() - coefficient * basis[k].as_expr()),
            y,
            domain=sp.QQ,
        )
    support = [degree - k for k, coefficient in coefficients if coefficient != 0]
    contiguous = support == list(range(max(support) + 1)) if support else True
    return (max(support) + 1 if support else 0, [str(c) for _, c in coefficients], contiguous)


def negative_root_count(poly: sp.Poly) -> tuple[int, int]:
    return int(poly.count_roots(-sp.oo, sp.oo)), int(poly.count_roots(-sp.oo, 0))


def strictly_interlaces(lower: sp.Poly, upper: sp.Poly, precision: int = 90) -> bool:
    """Numerically audit strict interlacing when deg(upper)=deg(lower)+1."""
    if upper.degree() != lower.degree() + 1:
        return False
    if lower.degree() == 0:
        roots = sp.nroots(upper.as_expr(), n=precision, maxsteps=300)
        return len(roots) == 1 and abs(float(sp.im(roots[0]))) < 1e-40
    lower_roots = sorted(float(sp.re(root)) for root in sp.nroots(lower.as_expr(), n=precision, maxsteps=300))
    upper_roots = sorted(float(sp.re(root)) for root in sp.nroots(upper.as_expr(), n=precision, maxsteps=300))
    if not all(abs(float(sp.im(root))) < 1e-40 for root in sp.nroots(lower.as_expr(), n=precision, maxsteps=300)):
        return False
    if not all(abs(float(sp.im(root))) < 1e-40 for root in sp.nroots(upper.as_expr(), n=precision, maxsteps=300)):
        return False
    return all(upper_roots[k] < lower_roots[k] < upper_roots[k + 1] for k in range(len(lower_roots)))


def main() -> None:
    report: dict[str, object] = {
        "status": "PASS_PROBE_ONLY",
        "checks": [],
        "adjacent_interlacing": [],
        "scope": (
            "Exact coefficient/selector/Jacobi support checks and exact root counts are finite audits. "
            "The adjacent interlacing check is high-precision numerical evidence only."
        ),
    }

    # Moderate grid: exact roots and symbolic Jacobi expansion dominate runtime.
    for d in range(5, 13):
        for r in range(0, d - 4):
            N = d + r
            matrix = group_matrix(N, d)
            rows: list[sp.Poly] = []
            for s in range(2 * N - d + 1):
                expected = residual_formula_row(N, d, s)
                actual = residual_matrix_row(matrix, N, d, s)
                ratios = {
                    sp.factor(actual.coeff_monomial(z**j) / expected.coeff_monomial(z**j))
                    for j in range(expected.degree() + 1)
                    if expected.coeff_monomial(z**j) != 0
                }
                formula_ok = len(ratios) == 1
                selector = selector_polynomial(N, d, s)
                expected_selector_degree = s // 2 + 2
                residual_degree = N - abs(r - s)
                alpha = abs(r - s)
                support_size, jacobi_coefficients, support_contiguous = jacobi_support(
                    expected, residual_degree, alpha
                )
                real, negative = negative_root_count(expected)
                item = {
                    "N": N,
                    "d": d,
                    "r": r,
                    "s": s,
                    "degree": expected.degree(),
                    "formula_ok": formula_ok,
                    "scale": str(next(iter(ratios))) if formula_ok else None,
                    "selector_degree": selector.degree(),
                    "selector_degree_upper_bound": expected_selector_degree,
                    "selector": str(selector.as_expr()),
                    "jacobi_support_size": support_size,
                    "jacobi_support_upper_bound": min(expected_selector_degree + 1, residual_degree // 2 + 1),
                    "jacobi_support_contiguous": support_contiguous,
                    "jacobi_coefficients_top_down": jacobi_coefficients,
                    "real_roots": real,
                    "negative_roots": negative,
                    "digest": digest(expected),
                }
                report["checks"].append(item)
                if (
                    not formula_ok
                    or selector.degree() > expected_selector_degree
                    or support_size > min(expected_selector_degree + 1, residual_degree // 2 + 1)
                    or not support_contiguous
                    or real != expected.degree()
                    or negative != expected.degree()
                ):
                    report["status"] = "FAIL"
                rows.append(expected)

            for s in range(len(rows) - 1):
                lower, upper = (
                    (rows[s], rows[s + 1]) if rows[s + 1].degree() > rows[s].degree()
                    else (rows[s + 1], rows[s])
                )
                interlaces = strictly_interlaces(lower, upper)
                report["adjacent_interlacing"].append(
                    {"N": N, "d": d, "r": r, "s_to_s_plus_1": s, "strictly_interlaces": interlaces}
                )
                if not interlaces:
                    report["status"] = "FAIL_INTERLACING"

    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        f"{report['status']}: {len(report['checks'])} exact layer cells, "
        f"{len(report['adjacent_interlacing'])} adjacent pairs"
    )
    print(REPORT)


if __name__ == "__main__":
    main()
