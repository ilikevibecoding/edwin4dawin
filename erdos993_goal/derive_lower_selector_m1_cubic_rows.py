"""Prove exact root-free M1 certificates for lower selector rows s=2,3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma as selector_gamma_integer


Z = sp.symbols("z")
HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_duran_m1_cubic_rows_exact_20260812.json"


def path_coefficient(M: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.prod(2 * M - k - 1 - j for j in range(k)) / sp.factorial(k)


def path_gamma(M: sp.Expr, s: int) -> list[sp.Expr]:
    row = [sp.expand(path_coefficient(M, i) * path_coefficient(M, s - i)) for i in range(s + 1)]
    rem = row[:]
    gamma = []
    for h in range(s // 2 + 1):
        value = sp.factor(rem[h])
        gamma.append(value)
        for j in range(s - 2 * h + 1):
            rem[h + j] = sp.expand(rem[h + j] - value * sp.binomial(s - 2 * h, j))
    assert all(sp.expand(value) == 0 for value in rem)
    return gamma


def selector_gamma(N: sp.Expr, s: int) -> list[sp.Expr]:
    rows = [path_gamma(N - q, s) for q in range(3)]
    output = [sp.Integer(0)] * (max(map(len, rows)) + 2)
    for h, value in enumerate(rows[0]):
        output[h] += value
    for h, value in enumerate(rows[1]):
        output[h + 1] -= 2 * value
    for h, value in enumerate(rows[2]):
        output[h + 2] += value
    while output and sp.expand(output[-1]) == 0:
        output.pop()
    return [sp.factor(value) for value in output]


def falling(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(value - j for j in range(order))


def duran(ambient: sp.Expr, gamma: list[sp.Expr]) -> sp.Poly:
    degree = len(gamma) - 1
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h] * falling(ambient, h) / 4**h * sp.rf(Z, degree - h)
                for h in range(degree + 1)
            )
        ),
        Z,
    )


def positive_coefficient_rational(expression: sp.Expr, variable: sp.Symbol) -> bool:
    numerator, denominator = sp.cancel(expression).as_numer_denom()
    return (
        all(value > 0 for value in sp.Poly(numerator, variable).all_coeffs())
        and all(value > 0 for value in sp.Poly(denominator, variable).all_coeffs())
    )


def one_family(s: int, r: int, parity: int) -> dict[str, object]:
    k = sp.symbols("k", integer=True, nonnegative=True)
    # The least d>=5 of the prescribed parity.
    d0 = 5 if parity == 1 else 6
    d = 2 * k + d0
    N = d + r
    gamma = selector_gamma(N, s)
    assert len(gamma) == 4
    P = d + s
    epsilon = int((d0 + s) % 2)
    n = sp.expand((P - epsilon) / 2)
    beta = sp.Rational(2 * epsilon - 1, 2)
    x = sp.expand(n - 2)
    A = sp.factor(x * (x + beta))
    q = duran(P, gamma)
    lc = sp.factor(q.LC())
    q0 = sp.factor(q.TC())
    total_product = sp.factor(-q0 / lc)
    threshold = sp.factor(-total_product / A)
    evaluation = sp.factor(q.eval(-threshold))
    assert positive_coefficient_rational(A, k)
    assert positive_coefficient_rational(lc, k)
    assert positive_coefficient_rational(q0, k)
    assert positive_coefficient_rational(threshold, k)
    assert positive_coefficient_rational(evaluation, k)

    numerator, denominator = sp.cancel(evaluation).as_numer_denom()
    core = sp.Poly(numerator, k)
    # Remove the visibly positive factors recorded separately, leaving a
    # shorter coefficient certificate for the JSON replay.
    factored = sp.factor(evaluation)

    transcription_checks = 0
    for kval in range(6):
        d_value = int(d.subs(k, kval))
        N_value = d_value + r
        gamma_value = [sp.expand(value.subs(k, kval)) for value in gamma]
        assert gamma_value == selector_gamma_integer(N_value, s)
        q_value = sp.Poly(q.as_expr().subs(k, kval), Z)
        assert q_value == duran_polynomial(d_value + s, gamma_value)
        transcription_checks += 1

    return {
        "row_s": s,
        "r": r,
        "d_parameterization": str(d),
        "epsilon": epsilon,
        "gamma": [str(value) for value in gamma],
        "first_margin_base_A": str(A),
        "leading_coefficient": str(lc),
        "constant_coefficient": str(q0),
        "threshold_T": str(threshold),
        "q_at_minus_T_factored": str(factored),
        "q_at_minus_T_numerator_degree": core.degree(),
        "q_at_minus_T_numerator_coefficients_descending": [
            int(value) for value in core.all_coeffs()
        ],
        "q_at_minus_T_denominator_factored": str(sp.factor(denominator)),
        "all_certificate_coefficients_strictly_positive": True,
        "transcription_checks": transcription_checks,
    }


def main() -> None:
    records = []
    for s in (2, 3):
        for r in range(s):
            for parity in (1, 0):
                records.append(one_family(s, r, parity))

    assert len(records) == 10
    assert sum(int(record["transcription_checks"]) for record in records) == 60
    payload = {
        "kind": "lower_selector_duran_m1_cubic_rows_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_ALL_ORDER_LOWER_DURAN_M1_ROWS_2_AND_3",
        "scope": "all-order symbolic theorem for row_s=2,3; not the generic row theorem",
        "root_free_criterion": (
            "For cubic q with LC>0,q(0)>0 and a negative root -b, let "
            "A=(s_D-1)(s_D+beta-1), C=q(0)/LC, T=C/A. If q(-T)>0, "
            "then q(-infinity)<0 gives b>T and Vieta gives G2=C/b<A."
        ),
        "families": len(records),
        "symbolic_families": records,
        "finite_transcription_checks": 60,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "families": payload["families"],
        "finite_transcription_checks": payload["finite_transcription_checks"],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
