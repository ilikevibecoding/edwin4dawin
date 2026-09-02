#!/usr/bin/env python3
"""Extract and shift-test the three failed distance-five orthant charts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance5_negative_charts_"
    "diagnostic_root_20260831.json"
)
MARKER = (
    "DIAGNOSTIC_EXACT_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE5_NEGATIVE_CHARTS_ROOT"
)


def C(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def negative_records(polynomial: sp.Poly) -> list[dict]:
    return [
        {"monomial": list(monomial), "coefficient": str(coefficient)}
        for monomial, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]


def polynomial_stats(polynomial: sp.Poly) -> dict:
    coefficients = polynomial.coeffs()
    negatives = negative_records(polynomial)
    return {
        "terms": len(polynomial.terms()),
        "total_degree": polynomial.total_degree(),
        "degree_by_variable": {
            str(variable): polynomial.degree(variable)
            for variable in polynomial.gens
        },
        "negative": len(negatives),
        "minimum": str(min(coefficients)),
        "negative_terms": negatives,
    }


def shifted_poly(polynomial: sp.Poly, shifts: tuple[int, ...]) -> sp.Poly:
    """Translate exactly, one univariate polynomial-ring coordinate at a time.

    SymPy's generic multivariate ``subs`` followed by ``expand`` repeatedly
    rebuilds the entire expression tree, even for the zero shift.  ``Poly.shift``
    is substantially faster, so view the expression as a univariate polynomial
    over the remaining variables for each nonzero coordinate.
    """
    variables = polynomial.gens
    if not any(shifts):
        return polynomial
    expression = polynomial.as_expr()
    for variable, shift in zip(variables, shifts):
        if shift:
            expression = sp.Poly(expression, variable).shift(shift).as_expr()
    return sp.Poly(expression, *variables)


def shift_search(polynomial: sp.Poly, maximum_total: int = 8) -> dict:
    variables = polynomial.gens
    best = None
    best_negative = None
    samples = []
    for total in range(maximum_total + 1):
        for first in range(total + 1):
            for second in range(total - first + 1):
                third = total - first - second
                shifts = (first, second, third)
                candidate = shifted_poly(polynomial, shifts)
                coefficients = candidate.coeffs()
                record = {
                    "shifts": dict(zip(map(str, variables), shifts)),
                    "negative": sum(
                        coefficient.is_negative is True
                        for coefficient in coefficients
                    ),
                    "minimum": str(min(coefficients)),
                    "terms": len(candidate.terms()),
                }
                samples.append(record)
                if best_negative is None or record["negative"] < best_negative:
                    best_negative = record["negative"]
                    print("SHIFT_IMPROVEMENT", record, flush=True)
                if record["negative"] == 0:
                    best = record
                    return {
                        "best_zero_negative_shift": best,
                        "tested": len(samples),
                        "maximum_total_shift": maximum_total,
                    }
    return {
        "best_zero_negative_shift": None,
        "tested": len(samples),
        "maximum_total_shift": maximum_total,
        "lowest_negative_count": min(record["negative"] for record in samples),
        "best_observed": min(
            samples,
            key=lambda record: (record["negative"], sum(record["shifts"].values())),
        ),
    }


def clear_chart(expression, denominator, variables) -> sp.Poly:
    cleared = sp.cancel(expression * denominator)
    numerator, residual_denominator = sp.fraction(cleared)
    assert sp.simplify(residual_denominator - 1) == 0
    return sp.Poly(sp.expand(numerator), *variables)


def main() -> None:
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    q, v, y, r, s = sp.symbols(
        "q v y r s", integer=True, nonnegative=True
    )
    n = a + b
    order = n + 6
    edges = n + 5
    wedges = C(a + 1, 2) + C(b + 1, 2) + 4
    connected_four = C(a + 1, 3) + C(b + 1, 3) + n + 3
    f2 = C(order, 2) - edges
    f3 = C(order, 3) - edges * (order - 2) + wedges
    z2 = edges
    z3 = edges * (order - 2) - 2 * wedges
    z4 = (
        edges * C(order - 2, 2)
        - 2 * C(edges, 2)
        - 2 * wedges * (order - 4)
        + 3 * connected_four
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown1 = (j - 2) / (n - j + 3)
    ndown2 = (j - 2) * (j - 3) / ((n - j + 3) * (n - j + 4))
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown1 = (j - 2) / (a - j + 3)
    bdown1 = (j - 2) / (b - j + 3)
    adown2 = (j - 2) * (j - 3) / ((a - j + 3) * (a - j + 4))
    bdown2 = (j - 2) * (j - 3) / ((b - j + 3) * (b - j + 4))

    fj = (
        3
        + 4 * nup1
        + nup2
        + rho * (3 + aup1 + adown1)
        + tau * (3 + bup1 + bdown1)
    )
    fprev = (
        3 * ndown1
        + 4
        + nup1
        + rho * (1 + 3 * adown1 + adown2)
        + tau * (1 + 3 * bdown1 + bdown2)
    )
    fnext = (
        3 * nup1
        + 4 * nup2
        + nup3
        + rho * (1 + 3 * aup1 + aup2)
        + tau * (1 + 3 * bup1 + bup2)
    )
    znext = (
        2
        + 3 * nup1
        + rho * ((b + 1) * aup1 + (3 * b + 4) + b * adown1)
        + tau * ((a + 1) * bup1 + (3 * a + 4) + a * bdown1)
    )
    delta = sp.factor(
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2
        * p0
        * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )
    assert sp.Poly(sp.together(delta), rho, tau).total_degree() == 1

    u_a5 = (
        a * (a - 1) * (a - 2) * (a - 3) * (a - 4)
        / (n * (n - 1) * (n - 2) * (n - 3) * (n - 4))
    )
    u_b5 = (
        b * (b - 1) * (b - 2) * (b - 3) * (b - 4)
        / (n * (n - 1) * (n - 2) * (n - 3) * (n - 4))
    )

    middle_substitution = {
        j: y + 8,
        b: q + y + 6,
        a: q + v + y + 6,
    }
    middle_common = 24 * (y + 7) * (y + 8) * (2 * q + v + y + 7)
    middle_tail = sp.prod(2 * q + v + 2 * y + offset for offset in range(8, 13))
    middle_specs = {
        "middle_large_side": (
            delta.subs({rho: u_a5, tau: 0}, simultaneous=True).subs(
                middle_substitution, simultaneous=True
            ),
            middle_common * (q + v + 1) * (q + v + 2) * middle_tail,
            (q, v, y),
        ),
        "middle_small_side": (
            delta.subs({rho: 0, tau: u_b5}, simultaneous=True).subs(
                middle_substitution, simultaneous=True
            ),
            middle_common * (q + 1) * (q + 2) * middle_tail,
            (q, v, y),
        ),
    }
    tail_expression = delta.subs({rho: u_a5, tau: 0}, simultaneous=True).subs(
        {b: r + 5, j: r + y + 8, a: r + y + s + 6},
        simultaneous=True,
    )
    tail_denominator = (
        24
        * (s + 1)
        * (s + 2)
        * (r + s + 6)
        * (r + y + 7)
        * (r + y + 8)
        * sp.prod(2 * r + s + y + offset for offset in range(7, 12))
    )
    specs = {
        **middle_specs,
        "tail_general": (tail_expression, tail_denominator, (r, s, y)),
    }

    charts = {}
    for label, (expression, denominator, variables) in specs.items():
        print("CLEARING", label, flush=True)
        polynomial = clear_chart(expression, denominator, variables)
        stats = polynomial_stats(polynomial)
        print(
            label,
            {key: value for key, value in stats.items() if key != "negative_terms"},
            flush=True,
        )
        print("NEGATIVE_TERMS", label, stats["negative_terms"], flush=True)
        search = shift_search(polynomial)
        print("SHIFT_SEARCH", label, search, flush=True)
        charts[label] = {
            "variables": list(map(str, variables)),
            "denominator": str(sp.factor(denominator)),
            "stats": stats,
            "shift_search": search,
        }

    report = {
        "marker": MARKER,
        "status": "exact negative-monomial extraction and orthant-shift search",
        "charts": charts,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "Diagnostic only. Negative monomial coefficients are failures of "
            "these sufficient orthant certificates, not graph counterexamples."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
