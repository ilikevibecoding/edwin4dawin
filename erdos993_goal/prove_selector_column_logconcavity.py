#!/usr/bin/env python3
"""Exact replay for the all-order normalized column log-concavity proof.

Put

    A(u)=(1+sqrt(1-u))^2/(4(1-u)^2),
    B(u)=(1+sqrt(1-u))^2/(4(1-u)).

The normalized Whipple layer differs by a positive h-dependent scalar from

    S_h(r,s)=[u^h] A(u)^r B(u)^s.

The proof uses two standard preservation lemmas.

1. (Bender--Canfield exponential lemma.)  If x_0=1 and
   (x_n) is nonnegative, log-concave, and has no internal zeroes, then the
   coefficients of exp(sum_(n>=1) x_n u^n/n) are log-concave.

2. If a and c are nonnegative log-concave sequences without internal zeroes,
   then, for every fixed h, [u^h]c(u)a(u)^r is log-concave in the integer r.
   Indeed convolution preserves log-concavity.  If F_r=c*a^{*r}, then
   F_r(k)/F_(r-1)(k) is nondecreasing in k; expanding F_(r+1)=a*F_r then
   gives F_r(k)^2 >= F_(r-1)(k)F_(r+1)(k) term by term.

Writing c_n=binom(2n,n)/4^n gives

    n[u^n]log B = 1-c_n,
    n[u^n]log A = 2-c_n.

Both input sequences are strictly log-concave.  For B^s the only boundary
condition is s>=3.  This covers every nontrivial forest layer h>=2 because
s>=2h; h=0,1 are direct.  Consequently

    P_h(r-1,s)^2 >= P_h(r,s)P_h(r-2,s)

in all admissible parameters.  The symbolic work below is a replay of the
closed-form identities and finite transcription checks, not a finite
substitute for the two all-order lemmas.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_selector_normalized_ratio_reduction import polynomial_p


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_column_logconcavity_exact_20260809.json"

u = sp.symbols("u")
n, s = sp.symbols("n s", integer=True, positive=True)
r_symbol, s_symbol = sp.symbols("r s", integer=True, nonnegative=True)


def central_ratio(index: int) -> sp.Rational:
    return sp.Rational(sp.binomial(2 * index, index), 4**index)


def truncated_series_coefficients(expr: sp.Expr, degree: int) -> list[sp.Expr]:
    series = sp.series(expr, u, 0, degree + 1).removeO().expand()
    return [sp.factor(series.coeff(u, k)) for k in range(degree + 1)]


def is_log_concave(values: list[sp.Expr]) -> bool:
    return all(
        sp.factor(values[k] ** 2 - values[k - 1] * values[k + 1]) >= 0
        for k in range(1, len(values) - 1)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=14)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.max_layer < 3:
        raise ValueError("--max-layer must be at least 3")

    w = sp.sqrt(1 - u)
    A = (1 + w) ** 2 / (4 * w**4)
    B = (1 + w) ** 2 / (4 * w**2)

    # Closed algebraic forms and logarithmic derivatives.
    assert sp.simplify(
        B - sp.Rational(1, 4) * (1 + 1 / (1 - u) + 2 / w)
    ) == 0
    assert sp.simplify(A - B / (1 - u)) == 0
    assert sp.simplify(sp.diff(sp.log(B), u) - 1 / (w**2 * (1 + w))) == 0
    assert sp.simplify(
        sp.diff(sp.log(A), u) - (w + 2) / (w**2 * (1 + w))
    ) == 0

    # Replay n[u^n]log B=1-c_n and n[u^n]log A=2-c_n.
    logarithmic_input_records: list[dict[str, object]] = []
    log_A = sp.series(sp.log(A), u, 0, args.max_layer + 2).removeO().expand()
    log_B = sp.series(sp.log(B), u, 0, args.max_layer + 2).removeO().expand()
    for k in range(1, args.max_layer + 1):
        c = central_ratio(k)
        d_B = sp.factor(k * log_B.coeff(u, k))
        d_A = sp.factor(k * log_A.coeff(u, k))
        assert d_B == 1 - c
        assert d_A == 2 - c
        logarithmic_input_records.append(
            {"n": k, "central_ratio": str(c), "B_input": str(d_B), "A_input": str(d_A)}
        )

    # The all-order adjacent central-binomial relation gives the displayed
    # strict input minors.  These identities are symbolic in n and c_n.
    c = sp.symbols("c", positive=True)
    c_previous = c * 2 * n / (2 * n - 1)
    c_next = c * (2 * n + 1) / (2 * n + 2)
    B_input_minor = sp.factor(
        (1 - c) ** 2 - (1 - c_previous) * (1 - c_next)
    )
    A_input_minor = sp.factor(
        (2 - c) ** 2 - (2 - c_previous) * (2 - c_next)
    )
    assert sp.simplify(
        B_input_minor - c * (3 - 2 * c) / (2 * (n + 1) * (2 * n - 1))
    ) == 0
    assert sp.simplify(
        A_input_minor - c * (3 - c) / ((n + 1) * (2 * n - 1))
    ) == 0

    # Boundary minors for the Bender--Canfield input sequences.
    # A: (2-c_1)^2-(2-c_2) = 5/8.
    # B^s: (s(1-c_1))^2-s(1-c_2)=s(2s-5)/8 >=0 for s>=3.
    c1 = central_ratio(1)
    c2 = central_ratio(2)
    A_boundary = sp.factor((2 - c1) ** 2 - (2 - c2))
    B_power_boundary = sp.factor((s * (1 - c1)) ** 2 - s * (1 - c2))
    assert A_boundary == sp.Rational(5, 8)
    assert B_power_boundary == s * (2 * s - 5) / 8

    # Finite coefficient replay of the two exponential-lemma outputs.
    A_coefficients = truncated_series_coefficients(A, args.max_layer + 1)
    assert is_log_concave(A_coefficients)
    B_power_records: list[dict[str, object]] = []
    for exponent in range(3, 2 * args.max_layer + 3):
        coefficients = truncated_series_coefficients(B**exponent, args.max_layer + 1)
        assert is_log_concave(coefficients)
        B_power_records.append(
            {
                "s": exponent,
                "checked_through_degree": args.max_layer + 1,
                "minimum_minor": str(
                    min(
                        sp.factor(coefficients[k] ** 2 - coefficients[k - 1] * coefficients[k + 1])
                        for k in range(1, args.max_layer + 1)
                    )
                ),
            }
        )

    # Replay the target P-minors through max-layer and a spread of admissible
    # s,r values.  The proof itself is the all-order convolution argument.
    target_checks = 0
    strict_target_checks = 0
    for h in range(args.max_layer + 1):
        P = polynomial_p(h)
        for s_value in sorted({max(2 * h, 2), max(2 * h, 3), 2 * h + 1, 3 * h + 7}):
            for excess in (5, 6, 17, 73):
                r_value = s_value + excess
                substitutions = {r_symbol: r_value, s_symbol: s_value}
                # polynomial_p uses symbols with assumptions from its module;
                # substitute by name to avoid assumption-identity mismatches.
                values = {
                    str(symbol): value for symbol, value in substitutions.items()
                }
                def evaluate(expr: sp.Expr, rr: int) -> sp.Expr:
                    return sp.factor(
                        expr.subs(
                            {
                                next(x for x in expr.free_symbols if str(x) == "r"): rr,
                                next(x for x in expr.free_symbols if str(x) == "s"): s_value,
                            }
                        )
                    ) if expr.free_symbols else expr

                minor = sp.factor(
                    evaluate(P, r_value - 1) ** 2
                    - evaluate(P, r_value) * evaluate(P, r_value - 2)
                )
                assert minor >= 0
                target_checks += 1
                if h >= 1:
                    assert minor > 0
                    strict_target_checks += 1

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_COLUMN_LOGCONCAVITY_REPLAY",
        "scope": {
            "all_order_components": [
                "n[u^n]log(B)=1-binomial(2n,n)/4^n",
                "n[u^n]log(A)=2-binomial(2n,n)/4^n",
                "strict log-concavity of both logarithmic input sequences",
                "Bender-Canfield exponential preservation",
                "convolution-power column log-concavity lemma",
                "P_h(r-1,s)^2 >= P_h(r,s)P_h(r-2,s)",
            ],
            "finite_replay_max_layer": args.max_layer,
            "target_checks": target_checks,
            "strict_target_checks": strict_target_checks,
        },
        "closed_forms": {
            "A_input_minor_n_ge_2": str(A_input_minor),
            "B_input_minor_n_ge_2": str(B_input_minor),
            "A_boundary_minor": str(A_boundary),
            "B_power_boundary_minor": str(B_power_boundary),
        },
        "logarithmic_input_records": logarithmic_input_records,
        "B_power_records": B_power_records,
        "source_sha256": source_hash,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print("PASS_EXACT_SELECTOR_COLUMN_LOGCONCAVITY_REPLAY")
    print(f"source_sha256={source_hash}")
    print(f"report_sha256={report_hash}")


if __name__ == "__main__":
    main()
