"""All-order symbolic classification of the fixed lower family (r,s)=(3,8).

This is the family containing the unique W failure in the d<=50 full-diamond
audit.  The proof uses coefficient positivity after a finite integer shift.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from probe_lower_selector_tail3_flint_full import one_case


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_w_exception_family_exact_20260812.json"
X, Y, Z = sp.symbols("x y z")


def binomial_polynomial(top: sp.Expr, bottom: int) -> sp.Expr:
    return sp.prod(top - j for j in range(bottom)) / factorial(bottom)


def path_gamma(M: sp.Expr, s: int) -> list[sp.Expr]:
    coefficients = [
        binomial_polynomial(2 * M - i - 1, i)
        * binomial_polynomial(2 * M - s + i - 1, s - i)
        for i in range(s + 1)
    ]
    gamma: list[sp.Expr] = []
    for j in range(s // 2 + 1):
        gamma.append(sp.factor(
            coefficients[j]
            - sum(gamma[h] * sp.binomial(s - 2 * h, j - h) for h in range(j))
        ))
    return gamma


def selector_gamma(N: sp.Expr, s: int) -> list[sp.Expr]:
    rows = [path_gamma(N - q, s) for q in range(3)]
    result: list[sp.Expr] = [sp.Integer(0)] * (s // 2 + 3)
    for q, scale in enumerate((1, -2, 1)):
        for h, value in enumerate(rows[q]):
            result[h + q] += scale * value
    while sp.simplify(result[-1]) == 0:
        result.pop()
    return [sp.factor(value) for value in result]


def margin_family(parity: int) -> tuple[sp.Expr, sp.Expr, list[sp.Expr]]:
    """Return numerator, denominator, gamma for d=2x+5+parity."""
    d = 2 * X + 5 + parity
    r = 3
    row_s = 8
    gamma = selector_gamma(d + r, row_s)
    m = len(gamma) - 1
    assert m == 6
    P = d + row_s
    epsilon = (5 + parity + row_s) % 2
    n = (P - epsilon) / 2
    beta = sp.Rational(2 * epsilon - 1, 2)
    A = sp.factor((n - m + 1) * (n - m + 1 + beta))
    q = sp.Poly(sp.expand(sum(
        gamma[h] * sp.ff(P, h) / 4**h * sp.rf(Z, m - h)
        for h in range(m + 1)
    )), Z)
    ascending = [q.nth(j) for j in range(m + 1)]
    H: list[sp.Expr] = []
    for j in range(m):
        H.append(sp.factor(
            (ascending[m - j]
             - sum(ascending[shift] * A**shift * H[j - shift]
                   for shift in range(1, j + 1)))
            / ascending[0]
        ))
    squares = [sp.factor(A ** (m - j) * H[j] ** 2) for j in range(m)]
    E = sum(squares[:-1])
    F = sum(squares)
    W = sp.factor(A**4 * (H[-3] * H[-1] - H[-2] ** 2) ** 2)
    numerator, denominator = sp.cancel(W - (E + F - 1)).as_numer_denom()
    return sp.factor(numerator), sp.factor(denominator), gamma


def one_parity(parity: int) -> dict[str, object]:
    numerator, denominator, gamma = margin_family(parity)
    shift = 8 if parity == 0 else 7
    finite_stop = shift - 1
    denominator_coefficients = sp.Poly(denominator, X).all_coeffs()
    shifted_coefficients = sp.Poly(
        sp.expand(numerator.subs(X, Y + shift)), Y
    ).all_coeffs()
    finite_signs = [int(sp.sign(numerator.subs(X, k))) for k in range(shift)]
    assert all(value > 0 for value in denominator_coefficients)
    assert all(value > 0 for value in shifted_coefficients)
    if parity == 0:
        assert finite_signs == [1, 1, 1, 1, 1, 1, 1, -1]
    else:
        assert finite_signs == [1] * 7

    transcription_checks = 0
    for k in range(11):
        d = 2 * k + 5 + parity
        record = one_case(d, 3, 8)
        exact_margin = sp.Rational(str(record[1]))
        symbolic_margin = sp.cancel(numerator / denominator).subs(X, k)
        assert sp.factor(symbolic_margin - exact_margin) == 0
        transcription_checks += 1

    primitive = sp.primitive(numerator, X)[1]
    return {
        "parity": "odd_d=2k+5" if parity == 0 else "even_d=2k+6",
        "degree": int(sp.degree(numerator, X)),
        "denominator_degree": int(sp.degree(denominator, X)),
        "denominator_positive_coefficients": len(denominator_coefficients),
        "finite_k_signs": finite_signs,
        "finite_stop": finite_stop,
        "positive_shift": shift,
        "positive_shifted_coefficients": len(shifted_coefficients),
        "numerator_primitive_sha256": hashlib.sha256(
            str(primitive).encode("utf-8")
        ).hexdigest().upper(),
        "transcription_checks": transcription_checks,
        "gamma_degree": len(gamma) - 1,
    }


def main() -> None:
    families = [one_parity(0), one_parity(1)]
    payload = {
        "kind": "lower_selector_w_exception_family_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_ALL_ORDER_W_EXCEPTION_CLASSIFICATION_R3_S8",
        "statement": (
            "For r=3,row_s=8, W>E+F-1 for every d>=5 except d=19; "
            "at d=19 the stronger three-index S3 certificate is positive."
        ),
        "method": (
            "The cleared denominator has positive coefficients. The odd numerator "
            "is checked at k=0,...,7 and has positive coefficients after k=y+8; "
            "the even numerator is checked at k=0,...,6 and has positive "
            "coefficients after k=y+7."
        ),
        "families": families,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "families": len(families),
        "transcription_checks": sum(item["transcription_checks"] for item in families),
        "source_sha256": payload["source_sha256"],
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
