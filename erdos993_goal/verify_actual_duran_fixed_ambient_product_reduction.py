#!/usr/bin/env python3
"""Exact reduction of the first Duran margin to a fixed ambient product bound.

The previously tested all-infinite endpoint bound shrinks with every negative
factor and is false.  The forest reserve supplies substantially more room.  It
is enough to prove that the residual exceptional product G2 never exceeds the
*initial* two-outlier ceiling N(N-1)/16.  This script proves that implication
symbolically, gives the equivalent benign-root product inequality, and audits
the proposed fixed ceiling in exact rational examples.  The fixed ceiling is
still a conjectural all-rank lemma; the script deliberately does not label the
finite audit as a proof.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_duran_fixed_ambient_product_reduction_exact_20260809.json"
Z = sp.symbols("z")


def elementary(values: list[sp.Rational]) -> list[sp.Expr]:
    result: list[sp.Expr] = [sp.Integer(1)]
    for value in values:
        result.append(sp.Integer(0))
        for index in range(len(result) - 1, 0, -1):
            result[index] = sp.expand(result[index] + value * result[index - 1])
    return result


def falling(value: sp.Expr | int, order: int) -> sp.Expr:
    return sp.prod((value - offset for offset in range(order)), start=sp.Integer(1))


def rising(value: sp.Expr | int, order: int) -> sp.Expr:
    return sp.prod((value + offset for offset in range(order)), start=sp.Integer(1))


def duran_polynomial(N: int, lambdas: list[sp.Rational]) -> sp.Poly:
    e = elementary(lambdas)
    gamma = [(-1) ** h * e[h] for h in range(len(e))]
    m = len(lambdas)
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h] * falling(N, h) / 4**h * rising(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), Z)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def interval_product(
    intervals: list[tuple[sp.Rational, sp.Rational]],
) -> tuple[sp.Rational, sp.Rational]:
    lower = upper = sp.Integer(1)
    for left, right in intervals:
        candidates = (lower * left, lower * right, upper * left, upper * right)
        lower, upper = min(candidates), max(candidates)
    return sp.Rational(lower), sp.Rational(upper)


def residual_product_interval(
    q: sp.Poly, benign_count: int, digits: int = 38
) -> tuple[tuple[sp.Rational, sp.Rational], int, int]:
    real_intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in q.intervals(eps=sp.Rational(1, 10**digits)):
        assert multiplicity == 1
        real_intervals.append((sp.Rational(interval[0]), sp.Rational(interval[1])))
    negative = [interval for interval in real_intervals if interval[1] < 0]
    assert len(negative) >= benign_count
    benign = negative[:benign_count]
    total_product = sp.cancel(((-1) ** q.degree()) * q.nth(0) / q.LC())
    if benign_count == 0:
        result = (total_product, total_product)
    else:
        product_interval = interval_product(benign)
        assert product_interval[0] * product_interval[1] > 0
        quotients = (
            sp.cancel(total_product / product_interval[0]),
            sp.cancel(total_product / product_interval[1]),
        )
        result = (min(quotients), max(quotients))
    return result, len(real_intervals), len(negative)


def exact_case(
    m: int,
    parity: int,
    alpha: int,
    slack: int,
    u: sp.Rational,
    v: sp.Rational,
    ds: list[sp.Rational],
) -> dict[str, object]:
    assert len(ds) == m - 2 and all(d > 0 for d in ds)
    p = alpha + 4 * m - 3 + slack
    if p % 2 != parity:
        p += 1
    n = p // 2
    epsilon = p - 2 * n
    beta = sp.Rational(2 * epsilon - 1, 2)
    N = p + alpha
    s = n - m + 2
    q = duran_polynomial(N, [u, v, *[-d for d in ds]])
    g2, real_count, negative_count = residual_product_interval(q, m - 2)
    fixed_ceiling = sp.Rational(N * (N - 1), 16)
    first_target = (s - 1) * (s + beta - 1)
    fixed_margin = (fixed_ceiling - g2[1], fixed_ceiling - g2[0])
    target_margin = (first_target - g2[1], first_target - g2[0])
    assert fixed_margin[0] > 0
    assert target_margin[0] > 0
    return {
        "m": m,
        "p": p,
        "parity": "even" if parity == 0 else "odd",
        "alpha": alpha,
        "slack": slack,
        "N": N,
        "u": str(u),
        "v": str(v),
        "negative_parameters": [str(d) for d in ds],
        "real_roots": real_count,
        "negative_real_roots": negative_count,
        "G2_interval_decimal": [str(sp.N(value, 20)) for value in g2],
        "fixed_ceiling_decimal": str(sp.N(fixed_ceiling, 20)),
        "fixed_ceiling_margin_lower_decimal": str(sp.N(fixed_margin[0], 20)),
        "first_margin_lower_decimal": str(sp.N(target_margin[0], 20)),
        "primitive_sha256": primitive_digest(q),
    }


def main() -> None:
    x, delta, alpha, m = sp.symbols(
        "x delta alpha m", integer=True, nonnegative=True
    )
    symbolic: dict[str, object] = {}
    for epsilon in (0, 1):
        beta = sp.Rational(2 * epsilon - 1, 2)
        N = 4 * x + 2 * epsilon - 1 - delta
        reserve_difference = sp.factor(16 * x * (x + beta) - N * (N - 1))
        x_from_parameters = sp.Rational(1, 2) * (
            alpha + 2 * m - 1 - epsilon + delta
        )
        positive_form = sp.factor(reserve_difference.subs(x, x_from_parameters))
        if epsilon == 0:
            expected = (
                3 * delta**2
                + (4 * (alpha + 2 * m - 1) - 1) * delta
                + 2 * alpha
                + 4 * m
                - 4
            )
        else:
            expected = (
                3 * delta**2
                + (4 * (alpha + 2 * m - 2) + 3) * delta
                + 2 * alpha
                + 4 * m
                - 4
            )
        assert sp.expand(positive_form - expected) == 0
        symbolic[f"epsilon_{epsilon}"] = {
            "N_in_x_delta": str(N),
            "16_target_minus_N_Nminus1": str(reserve_difference),
            "positive_parameter_form": str(positive_form),
        }

    # Constant-term algebra behind the equivalent benign-product statement.
    Nsym, r = sp.symbols("N r", integer=True, positive=True)
    u, v, dprod, bprod, tail = sp.symbols(
        "u v dprod bprod tail", positive=True
    )
    # tail denotes (N-2)^fall_r, so
    # (N)^fall_(r+2)=N(N-1)*tail exactly.
    q0 = u * v * dprod * Nsym * (Nsym - 1) * tail / 4 ** (r + 2)
    g2 = q0 / bprod
    normalized = sp.factor(
        (sp.Rational(1, 16) * Nsym * (Nsym - 1)) / g2
    )
    expected_normalized = sp.factor(
        bprod * 4**r / (u * v * dprod * tail)
    )
    assert sp.factor(normalized - expected_normalized) == 0

    rng = random.Random(99349)
    positive_grid = [
        sp.Rational(1, 1000),
        sp.Rational(1, 20),
        sp.Rational(1, 3),
        sp.Integer(1),
    ]
    negative_grid = [
        sp.Rational(1, 1000),
        sp.Rational(1, 20),
        sp.Integer(1),
        sp.Integer(20),
        sp.Integer(1000),
    ]
    cases: list[dict[str, object]] = []
    for degree in range(2, 11):
        for parity in (0, 1):
            cases.append(
                exact_case(
                    degree,
                    parity,
                    0,
                    0,
                    sp.Rational(1, 20),
                    sp.Rational(1, 20),
                    [sp.Rational(1, 1000)] * (degree - 2),
                )
            )
            cases.append(
                exact_case(
                    degree,
                    parity,
                    3,
                    2,
                    rng.choice(positive_grid),
                    rng.choice(positive_grid),
                    [rng.choice(negative_grid) for _ in range(degree - 2)],
                )
            )

    # This exact admissible case refutes the much stronger all-infinite
    # endpoint ceiling uv*(N-r)*(N-r-1)/16, while satisfying the fixed ceiling.
    counterexample_q = duran_polynomial(
        25,
        [
            sp.Rational(1, 20),
            sp.Rational(1, 20),
            *[-sp.Rational(1, 1000)] * 5,
        ],
    )
    counterexample_g2, real_count, negative_count = residual_product_interval(
        counterexample_q, 5, digits=45
    )
    shrinking_ceiling = sp.Rational(1, 20) ** 2 * 20 * 19 / 16
    fixed_ceiling = sp.Rational(25 * 24, 16)
    assert counterexample_g2[0] > shrinking_ceiling
    assert counterexample_g2[1] < fixed_ceiling

    minimum_fixed = min(
        cases, key=lambda case: sp.Rational(case["fixed_ceiling_margin_lower_decimal"])
    )
    payload = {
        "kind": "actual_duran_fixed_ambient_product_reduction_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_REDUCTION_AND_FIXED_CEILING_FINITE_AUDIT",
        "scope": "analytic reduction plus finite exact evidence; fixed ceiling remains conjectural",
        "proposed_lemma": "G2 <= N*(N-1)/16",
        "reserve_implication": (
            "With x=n-m+1 and delta=p-alpha-(4m-3), the reserve gives "
            "x=(alpha+2m-1-epsilon+delta)/2.  The exact positive forms in the "
            "report prove x*(x+beta)>N*(N-1)/16.  Hence the proposed lemma "
            "strictly implies M1>0."
        ),
        "equivalent_benign_product_bound": (
            "If b_i are the magnitudes of the selected m-2 negative Q_D roots, "
            "then prod(b_i) >= u*v*prod(d_i)*(N-2)^fall_(m-2)/4^(m-2)."
        ),
        "symbolic_reserve_identities": symbolic,
        "constant_term_ratio_identity": str(normalized),
        "exact_audit": {
            "cases": len(cases),
            "degrees": "2..10",
            "parities": ["even", "odd"],
            "minimum_fixed_ceiling_margin_case": minimum_fixed,
            "all_fixed_ceiling_margins_positive": True,
            "cases_detail": cases,
        },
        "stronger_shrinking_ceiling_counterexample": {
            "N": 25,
            "m": 7,
            "u": "1/20",
            "v": "1/20",
            "negative_parameters": ["1/1000"] * 5,
            "real_roots": real_count,
            "negative_real_roots": negative_count,
            "G2_interval_decimal": [
                str(sp.N(value, 22)) for value in counterexample_g2
            ],
            "shrinking_ceiling_decimal": str(sp.N(shrinking_ceiling, 22)),
            "fixed_ceiling_decimal": str(sp.N(fixed_ceiling, 22)),
            "primitive_sha256": primitive_digest(counterexample_q),
        },
        "remaining_theorem": (
            "Prove the fixed ambient residual-product bound for arbitrary positive "
            "negative-factor magnitudes, retaining the actual normalized Pochhammer "
            "structure.  The exact audit is not a proof of that statement."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in payload.items() if key != "exact_audit"}, indent=2))
    print(json.dumps({"exact_audit_cases": len(cases), "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
