#!/usr/bin/env python3
"""Exact polarized-Pochhammer reduction of the last window coupling.

For integers 0 <= m <= n and parameters t_1,...,t_m define

    K[m,n](x;t) = sum_{j=0}^m e_j(t) n^fall_j x^fall_(m-j).

This is the residual polynomial obtained after the forced consecutive block is
removed from the commuting-shift construction.  Appending a parameter tau has
the exact contiguous relation

    K[m+1,n](x;t,tau)
      = x K[m,n](x-1;t) + tau*n K[m,n-1](x;t).

For tau=-c/4 this is the normalized recurrence in Section 30.  Its endpoints
are especially simple: tau=0 inserts a zero, while division by tau followed by
tau -> -infinity deletes the parameter and lowers the ambient index n to n-1.
After all r negative parameters are deleted at the infinite endpoint, only the
two bounded parameters a=u/4 and b=v/4 remain, at ambient index B+1.  Their
quadratic has constant B(B+1)ab <= B(B+1)/16, exactly the missing target.

The identities below are proofs.  The finite root-isolation audit is evidence
for, not a proof of, the remaining endpoint-maximum lemma.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_polarized_pochhammer_boundary_reduction_exact_20260808.json"
X = sp.symbols("x")


def fall(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(value - index for index in range(order))


def elementary(parameters: list[sp.Expr]) -> list[sp.Expr]:
    coefficients = [sp.Integer(1)]
    for parameter in parameters:
        coefficients.append(sp.Integer(0))
        for index in range(len(coefficients) - 1, 0, -1):
            coefficients[index] = sp.expand(
                coefficients[index] + parameter * coefficients[index - 1]
            )
    return coefficients


def polarized(m: int, n: sp.Expr, parameters: list[sp.Expr]) -> sp.Expr:
    assert len(parameters) == m
    e = elementary(parameters)
    return sp.expand(
        sum(e[index] * fall(n, index) * fall(X, m - index) for index in range(m + 1))
    )


def symbolic_identities(maximum_degree: int = 6) -> dict[str, object]:
    tau, n = sp.symbols("tau n")
    contiguous_checks = 0
    shift_checks = 0

    for m in range(maximum_degree + 1):
        parameters = list(sp.symbols(f"t0:{m}"))
        current = polarized(m, n, parameters)
        appended = polarized(m + 1, n, parameters + [tau])
        contiguous = sp.expand(
            X * current.subs({X: X - 1})
            + tau * n * polarized(m, n - 1, parameters)
        )
        assert sp.expand(appended - contiguous) == 0
        contiguous_checks += 1

        # The normalized commuting-shift recurrence has L=n-m.
        length = n - m
        shift_form = sp.expand(
            (1 - tau) * X * current.subs({X: X - 1})
            + tau * (X + length) * current
        )
        assert sp.expand(appended - shift_form) == 0
        shift_checks += 1

        # Both boundary specializations are exact polynomial identities.
        assert sp.expand(appended.subs(tau, 0) - X * current.subs(X, X - 1)) == 0
        assert sp.expand(sp.Poly(appended, tau).coeff_monomial(tau) - n * polarized(m, n - 1, parameters)) == 0

    a, b, B = sp.symbols("a b B", nonnegative=True)
    base = sp.factor(polarized(2, B + 1, [a, b]))
    expected = X**2 + ((B + 1) * (a + b) - 1) * X + B * (B + 1) * a * b
    assert sp.expand(base - expected) == 0
    base_constant = sp.Poly(base, X).TC()
    displayed_margin = B * (B + 1) * (1 - 16 * a * b) / 16
    assert sp.expand(B * (B + 1) / 16 - base_constant - displayed_margin) == 0

    return {
        "checked_degrees": list(range(maximum_degree + 1)),
        "contiguous_identity_checks": contiguous_checks,
        "commuting_shift_identity_checks": shift_checks,
        "contiguous_identity": "K[m+1,n]=x*K[m,n](x-1)+tau*n*K[m,n-1]",
        "zero_endpoint": "K[m+1,n](tau=0)=x*K[m,n](x-1)",
        "infinite_endpoint": "lim_(|tau|->infinity) K[m+1,n]/tau=n*K[m,n-1]",
        "terminal_quadratic": str(expected),
        "terminal_margin": str(sp.factor(B * (B + 1) / 16 - base_constant)),
    }


def positive_intervals(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**28)):
        left, right = interval
        if left > 0:
            intervals.extend([(sp.Rational(left), sp.Rational(right))] * multiplicity)
    intervals.sort(key=lambda pair: pair[0])
    return intervals


def exact_residual_bound(
    B: int,
    a: sp.Rational,
    b: sp.Rational,
    negative_parameters: list[sp.Rational],
) -> tuple[bool, str]:
    r = len(negative_parameters)
    n = B + r + 1
    expression = polarized(r + 2, n, [a, b, *negative_parameters])
    poly = sp.Poly(expression, X, domain=sp.QQ)
    roots = positive_intervals(poly)
    if len(roots) < r:
        return False, "insufficient_positive_root_intervals"
    selected = roots[-r:] if r else []
    selected_lower = sp.prod(left for left, _ in selected) if selected else sp.Integer(1)
    total_product = sp.factor((-1) ** poly.degree() * poly.TC() / poly.LC())
    ceiling = sp.Rational(B * (B + 1), 16)
    if r == 0:
        proved = total_product <= ceiling
    else:
        proved = selected_lower > total_product / ceiling
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    payload = ",".join(map(str, primitive.all_coeffs()))
    return bool(proved), hashlib.sha256(payload.encode("ascii")).hexdigest()


def exact_audit() -> dict[str, object]:
    pool = [
        sp.Rational(1, 100),
        sp.Rational(1, 20),
        sp.Rational(1, 4),
        sp.Rational(1, 2),
        sp.Integer(1),
        sp.Integer(4),
        sp.Integer(20),
    ]
    bounded = [sp.Rational(1, 400), sp.Rational(1, 40), sp.Rational(1, 8), sp.Rational(1, 4)]
    checks = 0
    digests: list[str] = []
    for r in range(7):
        for offset in range(6):
            B = 3 * r + 4 + offset
            a = bounded[(r + offset) % len(bounded)]
            b = bounded[(2 * r + offset + 1) % len(bounded)]
            negatives = [-pool[(3 * r + 2 * index + offset) % len(pool)] for index in range(r)]
            passed, digest = exact_residual_bound(B, a, b, negatives)
            assert passed
            digests.append(digest)
            checks += 1
    return {
        "cases": checks,
        "maximum_negative_parameter_count": 6,
        "exact_root_isolation_checks": checks,
        "combined_primitive_digest": hashlib.sha256("".join(digests).encode("ascii")).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    identities = symbolic_identities()
    audit = exact_audit()
    report = {
        "kind": "window_polarized_pochhammer_boundary_reduction_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_IDENTITIES_AND_FINITE_BOUND_AUDIT",
        "identities": identities,
        "target_reduction": (
            "For a=u/4, b=v/4, r negative parameters and n=B+r+1, "
            "the desired residual product bound is the statement that the "
            "two-root defect is no larger than its all-infinite boundary "
            "B(B+1)ab, which is at most B(B+1)/16."
        ),
        "remaining_lemma": (
            "Prove that the two-root residual product of the structured "
            "polarized polynomial attains no value above the all-infinite "
            "negative-parameter boundary. Coordinatewise monotonicity is "
            "not asserted and is false in general."
        ),
        "audit": audit,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
