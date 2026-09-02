#!/usr/bin/env python3
"""Exact audit of a prefix-product strengthening of the fixed Duran bound.

Let H be the positive-rooted normalized Pochhammer transform of the r
negative-factor source, and let T be the degree-r+2 transform after adjoining
the two bounded negative source nodes -u/4 and -v/4.  Write xi_i for the roots
of H and alpha_i for the r largest positive roots of T, both increasingly.
The proposed weak log-majorization inequalities are

  prod_{i<=k} alpha_i/xi_i
    >= u*v*B*(B+1)/((B+k)*(B+k+1)),  1<=k<=r.

At k=r, N=B+r+1, this is exactly the fixed ambient residual-product
bound G2<=N(N-1)/16.  This file provides exact finite evidence and the
algebraic reduction only; it does not claim an all-rank proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_duran_prefix_log_majorization_exact_20260809.json"
X, Z = sp.symbols("x z")


def falling_x(order: int) -> sp.Expr:
    return sp.prod((X - j for j in range(order)), start=sp.Integer(1))


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), poly.gens[0])[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def build_pair(
    B: int,
    u: sp.Rational,
    v: sp.Rational,
    ds: list[sp.Rational],
) -> tuple[sp.Poly, sp.Poly]:
    r = len(ds)
    source = sp.Poly(
        sp.prod((4 * Z - d for d in ds), start=sp.Integer(1)), Z
    )
    coefficients = list(reversed(source.all_coeffs()))
    H = sp.Poly(
        sp.expand(
            sum(
                coefficients[j] * falling_x(j) / sp.rf(B + 2, j)
                for j in range(r + 1)
            )
        ),
        X,
    )
    J = sp.Poly(
        sp.expand(
            u * (X + B + 1) * H.as_expr()
            + (4 - u) * X * H.as_expr().subs(X, X - 1)
        ),
        X,
    )
    T = sp.Poly(
        sp.expand(
            v * (X + B) * J.as_expr()
            + (4 - v) * X * J.as_expr().subs(X, X - 1)
        ),
        X,
    )
    return H, T


def positive_intervals(
    poly: sp.Poly, digits: int = 34
) -> list[tuple[sp.Rational, sp.Rational]]:
    result: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**digits)):
        assert multiplicity == 1
        left, right = sp.Rational(interval[0]), sp.Rational(interval[1])
        if left > 0:
            result.append((left, right))
    return result


def exact_case(
    B: int,
    u: sp.Rational,
    v: sp.Rational,
    ds: list[sp.Rational],
) -> dict[str, object]:
    r = len(ds)
    H, T = build_pair(B, u, v, ds)
    xi = positive_intervals(H)
    all_alpha = positive_intervals(T)
    assert len(xi) == r and len(all_alpha) >= r
    alpha = all_alpha[-r:]
    xi_lower_product = xi_upper_product = sp.Integer(1)
    alpha_lower_product = alpha_upper_product = sp.Integer(1)
    prefix_records: list[dict[str, object]] = []
    minimum_ratio = None
    for k in range(1, r + 1):
        xi_lower_product *= xi[k - 1][0]
        xi_upper_product *= xi[k - 1][1]
        alpha_lower_product *= alpha[k - 1][0]
        alpha_upper_product *= alpha[k - 1][1]
        ratio_lower = sp.cancel(alpha_lower_product / xi_upper_product)
        ratio_upper = sp.cancel(alpha_upper_product / xi_lower_product)
        target = sp.cancel(u * v * B * (B + 1) / ((B + k) * (B + k + 1)))
        margin_lower = sp.cancel(ratio_lower - target)
        assert margin_lower > 0
        normalized_lower = sp.cancel(ratio_lower / target)
        if minimum_ratio is None or normalized_lower < minimum_ratio:
            minimum_ratio = normalized_lower
        prefix_records.append(
            {
                "k": k,
                "ratio_interval_decimal": [
                    str(sp.N(ratio_lower, 20)),
                    str(sp.N(ratio_upper, 20)),
                ],
                "target_decimal": str(sp.N(target, 20)),
                "margin_lower_decimal": str(sp.N(margin_lower, 20)),
                "normalized_ratio_lower_decimal": str(sp.N(normalized_lower, 20)),
            }
        )
    return {
        "r": r,
        "B": B,
        "N": B + r + 1,
        "u": str(u),
        "v": str(v),
        "negative_parameters": [str(d) for d in ds],
        "H_positive_roots": len(xi),
        "T_positive_roots": len(all_alpha),
        "selected_T_positive_roots": len(alpha),
        "minimum_normalized_prefix_ratio_lower_decimal": str(sp.N(minimum_ratio, 20)),
        "prefixes": prefix_records,
        "H_primitive_sha256": primitive_digest(H),
        "T_primitive_sha256": primitive_digest(T),
    }


def main() -> None:
    B, r, k, u, v = sp.symbols("B r k u v", positive=True)
    N = B + r + 1
    full_target = sp.factor(
        u * v * B * (B + 1) / ((B + r) * (B + r + 1))
    )
    expected = sp.factor(u * v * B * (B + 1) / ((N - 1) * N))
    assert sp.factor(full_target - expected) == 0

    cases: list[dict[str, object]] = []
    for rank in range(1, 8):
        cases.append(
            exact_case(
                3 * rank + 4,
                sp.Rational(1, 1000),
                sp.Rational(1, 20),
                [sp.Rational(1, 1000)] * rank,
            )
        )
        cases.append(
            exact_case(
                3 * rank + 7,
                sp.Rational(1, 3),
                sp.Integer(1),
                [
                    sp.Integer(1000) if index % 2 == 0 else sp.Rational(1, 1000)
                    for index in range(rank)
                ],
            )
        )
        cases.append(
            exact_case(
                4 * rank + 9,
                sp.Rational(1, 20),
                sp.Rational(1, 20),
                [
                    sp.Rational(index + 1, rank + 2 - index)
                    for index in range(rank)
                ],
            )
        )

    all_prefixes = [
        (sp.Rational(record["normalized_ratio_lower_decimal"]), case, record)
        for case in cases
        for record in case["prefixes"]
    ]
    minimum_value, minimum_case, minimum_record = min(
        all_prefixes, key=lambda item: item[0]
    )
    digest_input = ";".join(
        case["H_primitive_sha256"] + case["T_primitive_sha256"] for case in cases
    )
    payload = {
        "kind": "actual_duran_prefix_log_majorization_exact_audit",
        "date": "2026-08-09",
        "status": "PASS_EXACT_PREFIX_LOG_MAJORISATION_FINITE_AUDIT",
        "scope": "finite exact evidence and algebraic reduction only",
        "proposed_prefix_theorem": (
            "For 1<=k<=r, prod_(i<=k)(alpha_i/xi_i) >= "
            "u*v*B*(B+1)/((B+k)*(B+k+1)), where alpha_i are the r largest "
            "positive roots after the two outliers."
        ),
        "full_rank_equivalence": (
            "At k=r and N=B+r+1, the right side is "
            "u*v*B*(B+1)/(N*(N-1)); using the exact residual-product identity, "
            "this is equivalent to G2<=N*(N-1)/16."
        ),
        "telescoping_factor": (
            "B*(B+1)/((B+k)*(B+k+1))="
            "prod_(j=0)^(k-1)((B+j)/(B+j+2))."
        ),
        "symbolic_full_rank_target": str(full_target),
        "cases": len(cases),
        "ranks": "1..7",
        "all_prefixes_strictly_pass": True,
        "minimum_normalized_prefix_ratio_lower_decimal": str(
            sp.N(minimum_value, 20)
        ),
        "minimum_prefix_case": {
            "case": {
                key: value for key, value in minimum_case.items() if key != "prefixes"
            },
            "prefix": minimum_record,
        },
        "combined_pair_digest_sha256": hashlib.sha256(
            digest_input.encode("ascii")
        ).hexdigest(),
        "cases_detail": cases,
        "remaining_theorem": (
            "Prove the prefix inequalities from the structured normalized-Pochhammer "
            "or generalized-Vandermonde pencil.  This finite audit is not a proof."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {key: value for key, value in payload.items() if key != "cases_detail"},
            indent=2,
        )
    )
    print(json.dumps({"output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
