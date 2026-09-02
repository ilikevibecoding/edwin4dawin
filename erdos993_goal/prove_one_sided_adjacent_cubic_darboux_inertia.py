#!/usr/bin/env python3
"""Exact one-sided Darboux inertia certificate for adjacent cubic rows.

On the reserve-thirteen boundary let M be the positive Jacobi matrix for
the current cubic row U, write M=L L^T, and let H be the positive Jacobi
matrix for the adjacent cubic row.  The matrix

    D = L^T L - (H direct-sum 0)

vanishes outside its final 3 by 3 principal block.  One negative direction
of D proves one of the two eigenvalue-overlap inequalities required for
positive compatibility.  This script derives the block symbolically in
both parities and reduces its inertia to a rational 2 by 2 inequality.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import sympy as sp

from prove_two_outlier_one_negative_factor import (
    exact_quotient,
    ff,
    positive_rational_on_nonnegative_axis,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "one_sided_adjacent_cubic_darboux_inertia_20260806.json"


def tail_cache_path(parity: str) -> Path:
    return HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json"


def expression_cache_path(parity: str) -> Path:
    return HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json"


def write_tail_cache(
    path: Path,
    parity: str,
    current: dict[str, sp.Expr] | None,
    adjacent: dict[str, sp.Expr] | None,
) -> None:
    record: dict[str, object] = {"parity": parity}
    if current is not None:
        record["current"] = {key: str(value) for key, value in current.items()}
    if adjacent is not None:
        record["adjacent"] = {key: str(value) for key, value in adjacent.items()}
    path.write_text(json.dumps(record) + "\n", encoding="utf-8")


def cubic_tail(
    p: sp.Expr,
    alpha: sp.Expr,
    n: sp.Expr,
    beta: sp.Expr,
    u: sp.Symbol,
    v: sp.Symbol,
    c: sp.Symbol,
) -> dict[str, sp.Expr]:
    ambient = p + alpha

    def top_coefficients(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        total = alpha + beta
        diagonal = exact_quotient(-k * (k + alpha), 2 * k + total)
        second = exact_quotient(
            k * (k - 1) * (k + alpha - 1) * (k + alpha),
            2 * (2 * k + total - 1) * (2 * k + total),
        )
        return diagonal, second

    def t_action(j: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        k = n - j
        diagonal_top, second_top = top_coefficients(k)
        diagonal_next, second_next = top_coefficients(k + 1)
        upper = sp.Integer(j)
        diagonal = sp.cancel(
            k + (j + 1) * diagonal_top - upper * diagonal_next
        )
        lower = sp.cancel(
            (k - 1) * diagonal_top
            + (j + 2) * second_top
            - upper * second_next
            - diagonal * diagonal_top
        )
        return upper, diagonal, lower

    actions = [t_action(j) for j in range(4)]

    def apply_t_minus(vector: list[sp.Expr], shift: int) -> list[sp.Expr]:
        output = [sp.Integer(0)] * 4
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 3:
                output[j + 1] += coefficient * lower
        return [sp.cancel(value) for value in output]

    falling = [[sp.Integer(1), sp.Integer(0), sp.Integer(0), sp.Integer(0)]]
    for shift in range(3):
        falling.append(apply_t_minus(falling[-1], shift))

    gamma = [c, 1 - c * (u + v), c * u * v - (u + v), u * v]
    coordinates = [
        sp.cancel(
            sum(
                gamma[h]
                * exact_quotient(ff(ambient, h), ff(p, 2 * h))
                * falling[h][index]
                for h in range(4)
            )
        )
        for index in range(4)
    ]

    def recurrence(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        diagonal_top, second_top = top_coefficients(k)
        diagonal_next, second_next = top_coefficients(k + 1)
        diagonal = sp.cancel(diagonal_top - diagonal_next)
        subdiagonal = sp.cancel(
            second_top - second_next - diagonal * diagonal_top
        )
        return diagonal, subdiagonal

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    v0, v1, v2, v3 = coordinates
    coefficient_a = sp.cancel(v1 / v0)
    coefficient_b = sp.cancel(v2 / v0)
    coefficient_c = sp.cancel(v3 / v0)
    d_last = sp.cancel(
        a_last - coefficient_a + coefficient_c / b_previous
    )
    d_previous = sp.cancel(a_previous - coefficient_c / b_previous)
    terminal = sp.cancel(
        d_last * d_previous
        - ((a_last - coefficient_a) * a_previous - b_last + coefficient_b)
    )
    return {
        "d_previous": d_previous,
        "d_last": d_last,
        "terminal": terminal,
        "b_previous": b_previous,
    }


def bernstein_uv_coefficients(
    value: sp.Expr,
    r: sp.Symbol,
    u: sp.Symbol,
    v: sp.Symbol,
    c: sp.Symbol,
) -> tuple[sp.Expr, list[tuple[tuple[int, int, int], sp.Expr]]]:
    numerator, denominator = sp.fraction(sp.cancel(value))
    polynomial = sp.Poly(
        sp.expand(numerator), u, v, c, domain=sp.QQ.frac_field(r)
    )
    du, dv, dc = polynomial.degree(u), polynomial.degree(v), polynomial.degree(c)
    power = {
        (i, j, k): polynomial.coeff_monomial(u**i * v**j * c**k)
        for i in range(du + 1)
        for j in range(dv + 1)
        for k in range(dc + 1)
    }
    output = []
    for i in range(du + 1):
        for j in range(dv + 1):
            for k in range(dc + 1):
                coefficient = sp.cancel(
                    sum(
                        power[a, b, k]
                        * sp.Rational(math.comb(i, a), math.comb(du, a))
                        * sp.Rational(math.comb(j, b), math.comb(dv, b))
                        for a in range(i + 1)
                        for b in range(j + 1)
                    )
                )
                output.append(((i, j, k), coefficient))
    return sp.factor(denominator), output


def certify_positive(
    name: str,
    value: sp.Expr,
    r: sp.Symbol,
    u: sp.Symbol,
    v: sp.Symbol,
    c: sp.Symbol,
) -> dict[str, object]:
    denominator, coefficients = bernstein_uv_coefficients(value, r, u, v, c)
    denominator_numerator, denominator_denominator = sp.fraction(denominator)
    # All expressions here have a polynomial denominator after cancellation.
    assert denominator_denominator == 1
    denominator_poly = sp.Poly(sp.expand(denominator_numerator), r, domain=sp.QQ)
    if denominator_poly.LC() < 0:
        denominator_poly = -denominator_poly
        coefficients = [(index, -coefficient) for index, coefficient in coefficients]
    assert all(item >= 0 for item in denominator_poly.all_coeffs())
    assert denominator_poly.eval(0) > 0
    records = []
    for index, coefficient in coefficients:
        certificate = positive_rational_on_nonnegative_axis(coefficient, r)
        records.append(
            {
                "index_u_v_c": list(index),
                "numerator_digest": certificate["numerator_digest"],
                "denominator_digest": certificate["denominator_digest"],
            }
        )
    numerator, _ = sp.fraction(sp.cancel(value))
    polynomial = sp.Poly(
        sp.expand(numerator), u, v, c, domain=sp.QQ.frac_field(r)
    )
    return {
        "name": name,
        "degrees_u_v_c": [
            polynomial.degree(variable) for variable in (u, v, c)
        ],
        "power_term_count": len(polynomial.terms()),
        "bernstein_coefficient_count": len(records),
        "positive_denominator": str(denominator),
        "all_coefficients_positive_on_r_nonnegative": True,
        "coefficients": records,
    }


def one_parity(parity: str, *, full_certificate: bool) -> dict[str, object]:
    r, u, v, c = sp.symbols("r u v c", nonnegative=True)
    if parity == "odd":
        p, alpha, n, beta = 2 * r + 13, 2 * r, r + 6, sp.Rational(1, 2)
    elif parity == "even":
        p, alpha, n, beta = (
            2 * r + 14,
            2 * r + 1,
            r + 7,
            sp.Rational(-1, 2),
        )
    else:
        raise ValueError(parity)

    cache_path = tail_cache_path(parity)
    current: dict[str, sp.Expr] | None = None
    adjacent: dict[str, sp.Expr] | None = None
    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        assert cached["parity"] == parity
        local_symbols = {"r": r, "u": u, "v": v, "c": c}
        if "current" in cached:
            current = {
                key: sp.sympify(value, locals=local_symbols)
                for key, value in cached["current"].items()
            }
        if "adjacent" in cached:
            adjacent = {
                key: sp.sympify(value, locals=local_symbols)
                for key, value in cached["adjacent"].items()
            }
    if current is None:
        print(f"{parity}: deriving current tail", flush=True)
        current = cubic_tail(p, alpha, n, beta, u, v, c)
        write_tail_cache(cache_path, parity, current, adjacent)
    print(f"{parity}: current tail ready", flush=True)
    if adjacent is None:
        print(f"{parity}: deriving adjacent tail", flush=True)
        adjacent = cubic_tail(p - 2, alpha + 1, n - 1, beta, u, v, c)
        write_tail_cache(cache_path, parity, current, adjacent)
    print(f"{parity}: adjacent tail ready", flush=True)
    assert current is not None and adjacent is not None
    final_cache_path = expression_cache_path(parity)
    cached_expressions: dict[str, sp.Expr] = {}
    if final_cache_path.exists():
        cached_record = json.loads(final_cache_path.read_text(encoding="utf-8"))
        assert cached_record["parity"] == parity
        local_symbols = {"r": r, "u": u, "v": v, "c": c}
        cached_expressions = {
            key: sp.sympify(value, locals=local_symbols)
            for key, value in cached_record["expressions"].items()
        }
    if "squared_radical_gap" in cached_expressions:
        next_pivot = cached_expressions["current_penultimate_cholesky_pivot"]
        last_pivot = cached_expressions["current_last_cholesky_pivot"]
        radical_majorant = cached_expressions["radical_majorant"]
        squared_gap = cached_expressions["squared_radical_gap"]
        print(f"{parity}: final expressions loaded from cache", flush=True)
    else:
        j = n - 3
        pivot = sp.cancel(
            (j + 1 + alpha)
            * (j + 1 + alpha + beta)
            / ((2 * j + alpha + beta + 1) * (2 * j + alpha + beta + 2))
        )
        next_pivot = sp.cancel(
            current["d_previous"] - current["b_previous"] / pivot
        )
        print(f"{parity}: penultimate pivot ready", flush=True)
        last_pivot = sp.cancel(
            current["d_last"] - current["terminal"] / next_pivot
        )
        print(f"{parity}: last pivot ready", flush=True)
        current_offdiag_squared = sp.cancel(
            next_pivot * current["b_previous"] / pivot
        )
        adjacent_offdiag_squared = adjacent["terminal"]
        schur_left = sp.cancel(
            pivot
            + current["b_previous"] / pivot
            - adjacent["d_previous"]
        )
        schur_right = sp.cancel(next_pivot - adjacent["d_last"])
        radical_majorant = sp.cancel(
            current_offdiag_squared
            + adjacent_offdiag_squared
            - schur_left * schur_right
        )
        print(f"{parity}: radical majorant ready", flush=True)
        partial_expressions = {
            "current_penultimate_cholesky_pivot": next_pivot,
            "current_last_cholesky_pivot": last_pivot,
            "radical_majorant": radical_majorant,
        }
        final_cache_path.write_text(
            json.dumps(
                {
                    "parity": parity,
                    "expressions": {
                        key: str(value) for key, value in partial_expressions.items()
                    },
                }
            )
            + "\n",
            encoding="utf-8",
        )
        squared_gap = sp.cancel(
            radical_majorant**2
            - 4 * current_offdiag_squared * adjacent_offdiag_squared
        )
        print(f"{parity}: squared gap ready", flush=True)
        partial_expressions["squared_radical_gap"] = squared_gap
        final_cache_path.write_text(
            json.dumps(
                {
                    "parity": parity,
                    "expressions": {
                        key: str(value) for key, value in partial_expressions.items()
                    },
                }
            )
            + "\n",
            encoding="utf-8",
        )

    expressions = {
        "current_penultimate_cholesky_pivot": next_pivot,
        "current_last_cholesky_pivot": last_pivot,
        "radical_majorant": radical_majorant,
        "squared_radical_gap": squared_gap,
    }
    summary = {}
    for name, value in expressions.items():
        numerator, denominator = sp.fraction(sp.cancel(value))
        polynomial = sp.Poly(
            sp.expand(numerator), u, v, c, domain=sp.QQ.frac_field(r)
        )
        summary[name] = {
            "degrees_u_v_c": [
                polynomial.degree(variable) for variable in (u, v, c)
            ],
            "power_term_count": len(polynomial.terms()),
            "denominator": str(sp.factor(denominator)),
        }
    certificates = []
    if full_certificate:
        # The two Cholesky pivots are included so the Schur complement is
        # justified entirely within this certificate rather than by a
        # separate positive-definiteness appeal.
        for name, value in expressions.items():
            certificates.append(certify_positive(name, value, r, u, v, c))

    return {
        "parity": parity,
        "p": str(p),
        "alpha": str(alpha),
        "degree": str(n),
        "expression_summary": summary,
        "certificates": certificates,
        "logical_implication": (
            "Positive Cholesky pivots and radical_majorant > 0 together "
            "with squared_radical_gap > 0 make the 2 by 2 Schur complement "
            "indefinite. The active 3 by 3 difference therefore has inertia "
            "(2,1), proving the adjacent-with-zero root is below the next "
            "current root at every index."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even", "both"), default="both")
    parser.add_argument("--summary-only", action="store_true")
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    parities = ("odd", "even") if args.parity == "both" else (args.parity,)
    records = [
        one_parity(parity, full_certificate=not args.summary_only)
        for parity in parities
    ]
    report = {
        "status": (
            "EXACT_ONE_SIDED_ADJACENT_CUBIC_DARBOUX_INERTIA"
            if not args.summary_only
            else "SYMBOLIC_SUMMARY_ONE_SIDED_DARBOUX_INERTIA"
        ),
        "records": records,
        "scope": (
            "This proves one of the two common-interlacer overlap "
            "inequalities on the reserve-thirteen boundary. The "
            "complementary inequality remains necessary for the quartic theorem."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
