"""Exact Schur--Cohn/Sturm disk audit for the lower-selector M1 target.

This is a finite exact audit.  It identifies a root-free all-order target:
the Schur--Cohn exterior-disk index equals the Sturm index on the negative
exterior ray.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_m1_schur_sturm_indices_exact_20260812.json"
X = sp.symbols("x")


def sign_changes(signs: list[int]) -> int:
    return sum(left != right for left, right in zip(signs, signs[1:]))


def primitive_integer_coefficients(q: sp.Poly) -> list[int]:
    primitive = sp.Poly(sp.primitive(q.as_expr(), q.gens[0])[1], q.gens[0])
    if primitive.LC() < 0:
        primitive = -primitive
    return [int(value) for value in primitive.all_coeffs()]


def rational_schur_cohn_matrix(coefficients: list[int], radius_squared: sp.Rational) -> sp.Matrix:
    """Return a rational congruent form of the unit-disk Schur--Cohn matrix.

    ``coefficients[j]`` is the coefficient of z^(m-j).  Apply the usual
    Schur--Cohn matrix to q(R z), R^2=radius_squared, then divide row/column i
    by R^(i mod 2).  Every resulting entry is rational.
    """

    m = len(coefficients) - 1
    rows: list[list[sp.Rational]] = []
    for i in range(m):
        row = []
        for j in range(m):
            parity = (i % 2) + (j % 2)
            value = sp.Integer(0)
            for source_row in range(max(i, j), m):
                exponent_top = (
                    2 * m - 2 * source_row + i + j - parity
                ) // 2
                exponent_bottom = (
                    2 * source_row - i - j - parity
                ) // 2
                value += (
                    coefficients[source_row - i]
                    * coefficients[source_row - j]
                    * radius_squared**exponent_top
                )
                value -= (
                    coefficients[m - source_row + i]
                    * coefficients[m - source_row + j]
                    * radius_squared**exponent_bottom
                )
            row.append(sp.Rational(value))
        rows.append(row)
    result = sp.Matrix(rows)
    assert result == result.T
    return result


def one_case(d: int, r: int, row_s: int) -> dict[str, object]:
    path_N = d + r
    gamma = selector_gamma(path_N, row_s)
    forced = max(0, row_s - path_N + 1)
    gamma_hat = gamma[forced:]
    m = len(gamma_hat) - 1
    P = d + row_s
    p = P - 2 * forced
    ambient = P - forced
    epsilon = p % 2
    n = p // 2
    beta = sp.Rational(2 * epsilon - 1, 2)
    duran_s = n - m + 2
    A = sp.Rational((duran_s - 1) * (duran_s + beta - 1))
    assert A > 0

    q = duran_polynomial(ambient, gamma_hat)
    coefficients = primitive_integer_coefficients(q)
    schur = rational_schur_cohn_matrix(coefficients, A)
    determinants = [sp.Integer(1)]
    for order in range(1, m + 1):
        determinants.append(sp.factor(schur[:order, :order].det(method="domain-ge")))
    assert all(value != 0 for value in determinants)
    signs = [1 if value > 0 else -1 for value in determinants]
    exterior_disk_index = sign_changes(signs)

    radius = sp.sqrt(A)
    scaled_negative = sp.Poly(
        q.as_expr().subs(q.gens[0], -radius * X),
        X,
        extension=radius,
    )
    negative_exterior_index = int(scaled_negative.count_roots(1, sp.oo))
    assert exterior_disk_index == negative_exterior_index, (
        d,
        r,
        row_s,
        m,
        A,
        signs,
        exterior_disk_index,
        negative_exterior_index,
        coefficients,
        schur,
    )

    terminal = (d, r, row_s) == (5, 0, 5)
    if not terminal:
        assert exterior_disk_index <= m - 2

    return {
        "d": d,
        "r": r,
        "row_s": row_s,
        "m": m,
        "A": str(A),
        "schur_leading_minor_signs": signs,
        "exterior_disk_index": exterior_disk_index,
        "negative_exterior_sturm_index": negative_exterior_index,
        "index_equality": True,
        "at_most_m_minus_2": exterior_disk_index <= m - 2,
        "terminal_trivial_exception": terminal,
    }


def main() -> None:
    cases = []
    for d in range(5, 15):
        for r in range(d - 4):
            path_N = d + r
            for row_s in range(r + 1, path_N + r + 1):
                cases.append(one_case(d, r, row_s))
    assert len(cases) == 770
    assert all(case["index_equality"] for case in cases)
    assert all(case["at_most_m_minus_2"] or case["terminal_trivial_exception"] for case in cases)

    pattern_counts: dict[str, int] = {}
    for case in cases:
        key = "".join("+" if value > 0 else "-" for value in case["schur_leading_minor_signs"])
        pattern_counts[key] = pattern_counts.get(key, 0) + 1

    payload = {
        "kind": "lower_selector_m1_schur_sturm_indices_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_770_CELL_SCHUR_STURM_DISK_INDEX_AUDIT",
        "scope": "finite exact root-free evidence, not the all-order generic M1 theorem",
        "target": (
            "For A=(s_D-1)(s_D+beta-1), prove that the Schur--Cohn index "
            "outside |z|=sqrt(A) equals the Sturm index on (-infinity,-sqrt(A)) "
            "and is at most m-2 (apart from the terminal cell with G2<0)."
        ),
        "cases": len(cases),
        "all_index_equalities": True,
        "all_nonterminal_exterior_indices_at_most_m_minus_2": True,
        "leading_minor_sign_pattern_counts": pattern_counts,
        "cases_detail": cases,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cases": payload["cases"],
        "leading_minor_sign_pattern_counts": pattern_counts,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
