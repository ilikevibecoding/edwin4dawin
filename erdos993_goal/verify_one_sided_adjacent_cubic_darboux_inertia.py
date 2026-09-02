#!/usr/bin/env python3
"""Independent exact replay of the one-sided Darboux inertia theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import raw_changed
from verify_adjacent_cubic_trailing_minor_interlacer import (
    exact_cubic_matrix_data,
    intervals,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "one_sided_adjacent_cubic_darboux_replay_20260806.json"
R, U, V, C = sp.symbols("r u v c")


def digest(polynomial: sp.Poly) -> str:
    _, cleared = polynomial.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def load_cache(parity: str, kind: str) -> dict[str, sp.Expr]:
    path = HERE / f"one_sided_darboux_{parity}_{kind}_cache_20260806.json"
    record = json.loads(path.read_text(encoding="utf-8"))
    assert record["parity"] == parity
    key = "expressions" if kind == "expression" else None
    if key is not None:
        raw = record[key]
    else:
        raise ValueError(kind)
    return {
        name: sp.sympify(value, locals={"r": R, "u": U, "v": V, "c": C})
        for name, value in raw.items()
    }


def load_tails(parity: str) -> tuple[dict[str, sp.Expr], dict[str, sp.Expr]]:
    path = HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json"
    record = json.loads(path.read_text(encoding="utf-8"))
    assert record["parity"] == parity
    local = {"r": R, "u": U, "v": V, "c": C}
    return tuple(
        {
            name: sp.sympify(value, locals=local)
            for name, value in record[which].items()
        }
        for which in ("current", "adjacent")
    )  # type: ignore[return-value]


def exact_pivots(
    diagonal: list[sp.Expr], subdiagonal: list[sp.Expr]
) -> list[sp.Expr]:
    output = []
    for index, value in enumerate(diagonal):
        pivot = sp.cancel(
            value
            - (subdiagonal[index] / output[index - 1] if index else 0)
        )
        assert pivot > 0
        output.append(pivot)
    return output


def tail_matches(
    cached: dict[str, sp.Expr],
    substitutions: dict[sp.Symbol, sp.Rational],
    diagonal: list[sp.Expr],
    subdiagonal: list[sp.Expr],
) -> None:
    assert sp.cancel(cached["d_previous"].subs(substitutions) - diagonal[-2]) == 0
    assert sp.cancel(cached["d_last"].subs(substitutions) - diagonal[-1]) == 0
    assert sp.cancel(cached["terminal"].subs(substitutions) - subdiagonal[-1]) == 0
    assert sp.cancel(cached["b_previous"].subs(substitutions) - subdiagonal[-2]) == 0


def one_case(
    parity: str,
    r_value: int,
    u: Fraction,
    v: Fraction,
    c: Fraction,
    current_tail: dict[str, sp.Expr],
    adjacent_tail: dict[str, sp.Expr],
    expressions: dict[str, sp.Expr],
) -> dict[str, object]:
    if parity == "odd":
        p, alpha = 2 * r_value + 13, 2 * r_value
    else:
        p, alpha = 2 * r_value + 14, 2 * r_value + 1
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    diagonal, subdiagonal = exact_cubic_matrix_data(p, alpha, gamma)
    adjacent_diagonal, adjacent_subdiagonal = exact_cubic_matrix_data(
        p - 2, alpha + 1, gamma
    )
    substitutions = {
        R: sp.Integer(r_value),
        U: sp.Rational(u.numerator, u.denominator),
        V: sp.Rational(v.numerator, v.denominator),
        C: sp.Rational(c.numerator, c.denominator),
    }
    tail_matches(current_tail, substitutions, diagonal, subdiagonal)
    tail_matches(
        adjacent_tail,
        substitutions,
        adjacent_diagonal,
        adjacent_subdiagonal,
    )

    pivots = exact_pivots(diagonal, subdiagonal)
    degree = len(diagonal)
    j = degree - 3
    current_offdiag_squared = sp.cancel(
        pivots[j + 1] * subdiagonal[j + 1] / pivots[j]
    )
    adjacent_offdiag_squared = adjacent_subdiagonal[-1]
    schur_left = sp.cancel(
        pivots[j]
        + subdiagonal[j + 1] / pivots[j]
        - adjacent_diagonal[-2]
    )
    schur_right = sp.cancel(pivots[j + 1] - adjacent_diagonal[-1])
    majorant = sp.cancel(
        current_offdiag_squared
        + adjacent_offdiag_squared
        - schur_left * schur_right
    )
    squared_gap = sp.cancel(
        majorant**2
        - 4 * current_offdiag_squared * adjacent_offdiag_squared
    )
    assert majorant > 0 and squared_gap > 0
    assert sp.cancel(
        expressions["current_penultimate_cholesky_pivot"].subs(substitutions)
        - pivots[-2]
    ) == 0
    assert sp.cancel(
        expressions["current_last_cholesky_pivot"].subs(substitutions)
        - pivots[-1]
    ) == 0
    assert sp.cancel(
        expressions["radical_majorant"].subs(substitutions) - majorant
    ) == 0
    assert sp.cancel(
        expressions["squared_radical_gap"].subs(substitutions) - squared_gap
    ) == 0

    current = raw_changed(p, alpha, gamma)
    adjacent = raw_changed(p - 2, alpha + 1, gamma)
    current_roots = intervals(current)
    shifted_roots = [(sp.S.Zero, sp.S.Zero)] + intervals(adjacent)
    one_sided = all(
        shifted_roots[index][1] < current_roots[index + 1][0]
        for index in range(degree - 1)
    )
    assert one_sided
    return {
        "parity": parity,
        "r": r_value,
        "p": p,
        "alpha": alpha,
        "u": str(u),
        "v": str(v),
        "c": str(c),
        "degree": degree,
        "cached_tail_matches_direct_matrix": True,
        "cached_schur_expressions_match_direct_cholesky": True,
        "majorant_positive": True,
        "squared_gap_positive": True,
        "active_difference_inertia": [2, 1, degree - 3],
        "one_sided_exact_root_inequality_count": degree - 1,
        "current_digest": digest(current),
        "adjacent_digest": digest(adjacent),
    }


def main() -> None:
    samples = [
        (0, Fraction(1, 2), Fraction(4, 5), Fraction(3, 2)),
        (1, Fraction(1), Fraction(1, 5), Fraction(5)),
        (3, Fraction(4, 5), Fraction(1), Fraction(1, 25)),
    ]
    cases = []
    for parity in ("odd", "even"):
        current_tail, adjacent_tail = load_tails(parity)
        expressions = load_cache(parity, "expression")
        for sample in samples:
            cases.append(
                one_case(
                    parity,
                    *sample,
                    current_tail,
                    adjacent_tail,
                    expressions,
                )
            )
    report = {
        "status": "PASS_EXACT_ONE_SIDED_DARBOUX_INERTIA_REPLAY",
        "case_count": len(cases),
        "tail_identity_count": 8 * len(cases),
        "schur_expression_identity_count": 4 * len(cases),
        "exact_root_inequality_count": sum(
            int(case["one_sided_exact_root_inequality_count"]) for case in cases
        ),
        "cases": cases,
        "scope": (
            "The symbolic Bernstein/copositive certificate is the all-order "
            "proof. These rational specializations independently replay its "
            "matrix identities, Schur reduction, and spectral consequence."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
