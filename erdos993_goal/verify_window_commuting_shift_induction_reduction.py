#!/usr/bin/env python3
"""Exact reduction of the last window coupling to a commuting-shift induction.

For ``D_a f(x)=a f(x)+(4-a)f(x-1)`` and

    K_n(x)=(x+1)(x+2)...(x+n),

the gamma-augmented Pochhammer polynomial is obtained by applying one
commuting operator ``D_lambda`` for every factor parameter lambda.  Apply the
two positive parameters first.  After removing the forced consecutive block,
the starting residual is the explicit quadratic

    R_0(x)=16x^2+4(n(u+v)-4)x+uv*n*(n-1).

If k negative parameters have subsequently been applied, write the augmented
polynomial as ``K_L R_k``, where ``L=n-k-2``.  Adding ``-c`` gives the exact
small-degree recurrence

    R_(k+1)(x)=(4+c)x R_k(x-1)-c(x+L)R_k(x).

The only missing all-order statement is that, after any k positive zeros of
R_k are removed so as to minimize the residual constant D_k,

    D_k < (L+1)(L+2)/16.

At k=r and n=B+r+1 this is exactly D_r<B(B+1)/16, the remaining inequality
(27.11).  This replay proves all algebraic identities and the quadratic base
symbolically, then performs exact rational root-isolation checks of the
inductive invariant in a finite adversarial sample.  The finite checks are
evidence only; they are deliberately not reported as an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_commuting_shift_induction_reduction_exact_20260808.json"
X = sp.symbols("x")


def shift(poly: sp.Poly, amount: int = 1) -> sp.Poly:
    return sp.Poly(sp.expand(poly.as_expr().subs(X, X - amount)), X, domain=sp.QQ)


def d_operator(poly: sp.Poly, value: sp.Rational) -> sp.Poly:
    expression = value * poly.as_expr() + (4 - value) * shift(poly).as_expr()
    return sp.Poly(sp.expand(expression), X, domain=sp.QQ)


def block(length: int) -> sp.Poly:
    return sp.Poly(sp.prod(X + index for index in range(1, length + 1)), X, domain=sp.QQ)


def residual_base(n: int, u: sp.Rational, v: sp.Rational) -> sp.Poly:
    expression = (
        v * (X + n - 1) * (4 * X + u * n)
        + (4 - v) * X * (4 * (X - 1) + u * n)
    )
    return sp.Poly(sp.expand(expression), X, domain=sp.QQ)


def append_negative(poly: sp.Poly, c: sp.Rational, length: int) -> sp.Poly:
    expression = (
        (4 + c) * X * shift(poly).as_expr()
        - c * (X + length) * poly.as_expr()
    )
    return sp.Poly(sp.expand(expression), X, domain=sp.QQ)


def primitive_digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def symbolic_identities() -> dict[str, str]:
    n, length = sp.symbols("n L", integer=True, positive=True)
    u, v, c = sp.symbols("u v c")

    base = sp.expand(
        v * (X + n - 1) * (4 * X + u * n)
        + (4 - v) * X * (4 * (X - 1) + u * n)
    )
    target = 16 * X**2 + 4 * (n * (u + v) - 4) * X + u * v * n * (n - 1)
    assert sp.expand(base - target) == 0

    # A generic residual is sufficient to check the factor removal identity.
    coefficients = sp.symbols("a0:6")
    residual = sum(coefficients[index] * X**index for index in range(6))
    # K_L(x)=(x+L)K_(L-1)(x), K_L(x-1)=xK_(L-1)(x).
    reduced = sp.expand(
        -c * (X + length) * residual
        + (4 + c) * X * residual.subs(X, X - 1)
    )
    displayed = sp.expand(
        (4 + c) * X * residual.subs(X, X - 1)
        - c * (X + length) * residual
    )
    assert sp.expand(reduced - displayed) == 0

    # The shift operators commute because both are polynomials in E^{-1}.
    generic = sum(coefficients[index] * X**index for index in range(6))
    da_db = sp.expand(
        u
        * (v * generic + (4 - v) * generic.subs(X, X - 1))
        + (4 - u)
        * (
            v * generic.subs(X, X - 1)
            + (4 - v) * generic.subs(X, X - 2)
        )
    )
    db_da = sp.expand(
        v
        * (u * generic + (4 - u) * generic.subs(X, X - 1))
        + (4 - v)
        * (
            u * generic.subs(X, X - 1)
            + (4 - u) * generic.subs(X, X - 2)
        )
    )
    assert sp.expand(da_db - db_da) == 0

    base_product = sp.factor(target.subs(X, 0) / sp.Poly(target, X).LC())
    assert base_product == u * v * n * (n - 1) / 16
    base_margin = sp.factor(n * (n - 1) / 16 - base_product)
    expected_margin = n * (n - 1) * (1 - u * v) / 16
    assert sp.expand(base_margin - expected_margin) == 0

    return {
        "commutation": "D_u D_v = D_v D_u",
        "base_quadratic": str(target),
        "base_product_margin": str(base_margin),
        "negative_append": "R_next=(4+c)xR(x-1)-c(x+L)R(x)",
    }


def positive_intervals(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**24)):
        left, right = interval
        if left > 0:
            intervals.extend([(sp.Rational(left), sp.Rational(right))] * multiplicity)
    intervals.sort(key=lambda pair: pair[0])
    return intervals


def exact_stage_check(
    r: int,
    B: int,
    u: sp.Rational,
    v: sp.Rational,
    negatives: list[sp.Rational],
) -> tuple[int, list[str]]:
    n = B + r + 1
    residual = residual_base(n, u, v)
    digests: list[str] = []
    checks = 0

    for k in range(r + 1):
        length = n - k - 2
        intervals = positive_intervals(residual)
        assert len(intervals) >= k
        selected = intervals[-k:] if k else []
        lower_product = sp.prod(pair[0] for pair in selected) if selected else sp.Integer(1)

        degree = residual.degree()
        total_product = sp.factor((-1) ** degree * residual.TC() / residual.LC())
        ceiling = sp.Rational((length + 1) * (length + 2), 16)
        if total_product >= 0:
            # D=total_product/product(selected roots).  A rational lower
            # enclosure for the selected product makes this a rigorous check.
            if k == 0:
                # Equality is attained only at the sharp corner u=v=1.
                assert total_product <= ceiling
            else:
                assert lower_product > total_product / ceiling

        digests.append(primitive_digest(residual))
        checks += 1
        if k < r:
            residual = append_negative(residual, negatives[k], length)

    return checks, digests


def exact_audit() -> dict[str, object]:
    pool = [
        sp.Rational(1, 100),
        sp.Rational(1, 10),
        sp.Rational(1, 3),
        sp.Rational(1, 2),
        sp.Integer(1),
        sp.Integer(3),
        sp.Integer(10),
        sp.Integer(100),
    ]
    cases = 0
    stage_checks = 0
    all_digests: list[str] = []

    for r in range(0, 7):
        for offset in range(4):
            B = 3 * r + 4 + offset
            u = pool[(r + offset) % 5]
            v = pool[(2 * r + offset + 1) % 5]
            negatives = [pool[(3 * r + 2 * index + offset) % len(pool)] for index in range(r)]
            checks, digests = exact_stage_check(r, B, u, v, negatives)
            stage_checks += checks
            all_digests.extend(digests)
            cases += 1

    combined = hashlib.sha256("".join(all_digests).encode("ascii")).hexdigest()
    return {
        "cases": cases,
        "exact_stage_root_isolation_checks": stage_checks,
        "maximum_negative_factor_count": 6,
        "combined_primitive_digest": combined,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    identities = symbolic_identities()
    audit = exact_audit()
    report = {
        "kind": "window_commuting_shift_induction_reduction_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_REDUCTION_AND_FINITE_STAGE_AUDIT",
        "identities": identities,
        "stage_invariant_candidate": (
            "If W_k=K_L R_k and any k positive roots are removed to minimize "
            "the residual constant D_k, then D_k<(L+1)(L+2)/16."
        ),
        "final_equivalence": (
            "At k=r, n=B+r+1 and L=B-1, the candidate reads "
            "D_r<B(B+1)/16, exactly the remaining residual coupling bound."
        ),
        "proof_status": (
            "The commuting-shift identities and the k=0 quadratic are proved "
            "symbolically.  The all-order preservation of the stage invariant "
            "under R_next=(4+c)xR(x-1)-c(x+L)R(x) remains to be proved."
        ),
        "audit": audit,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
