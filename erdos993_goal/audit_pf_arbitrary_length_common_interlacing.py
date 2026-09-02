#!/usr/bin/env python3
"""Finite exact audit of PF-convolution compatibility beyond length three.

For m appended negative factors with positive parameters c_i, form the PF
weights of prod(t+c_i).  At the sharp shifted reserve p-alpha=4m+9 this
script checks exact common-interlacer overlap of

    Q0=sum_j a_j G_j,   Q1=sum_j a_j G_(j+1)

for the quadratic positive-root source.  This is route-finding evidence, not
an all-parameter theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial
from verify_two_outlier_adjacent_cubic_common_interlacing import (
    common_interlacer_overlap,
    isolating_intervals,
)


HERE = Path(__file__).resolve().parent


def primitive_digest(poly):
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def pf_weights(factors):
    expression = sp.Integer(1)
    for value in factors:
        expression *= X + sp.Rational(value)
    polynomial = sp.Poly(sp.expand(expression), X, domain=sp.QQ)
    return list(reversed(polynomial.all_coeffs()))


def shifted_rows(p, alpha, u, v, count):
    gamma = [sp.Integer(1), -(sp.Rational(u) + sp.Rational(v)), sp.Rational(u * v)]
    rows = []
    for index in range(count):
        base = window_polynomial(p - 2 * index, alpha + index, gamma)
        rows.append(sp.Poly(X**index * base.as_expr(), X, domain=sp.QQ))
    assert len({row.degree() for row in rows}) == 1
    return rows


def one_case(m, parity, reserve_index, u, v, factors):
    reserve = 4 * m + 9
    if parity == "odd":
        p, alpha = 2 * reserve_index + reserve, 2 * reserve_index
    else:
        p, alpha = 2 * reserve_index + reserve + 1, 2 * reserve_index + 1
    assert p - alpha == reserve
    rows = shifted_rows(p, alpha, u, v, m + 2)
    weights = pf_weights(factors)
    assert len(weights) == m + 1 and weights[-1] == 1
    q0 = sp.Poly(sum(weights[j] * rows[j].as_expr() for j in range(m + 1)), X, domain=sp.QQ)
    q1 = sp.Poly(sum(weights[j] * rows[j + 1].as_expr() for j in range(m + 1)), X, domain=sp.QQ)
    roots0 = isolating_intervals(q0)
    roots1 = isolating_intervals(q1, allow_zero=True)
    overlap = common_interlacer_overlap(roots0, roots1)
    return {
        "m": m,
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "degree": q0.degree(),
        "u": str(u),
        "v": str(v),
        "factors": [str(value) for value in factors],
        "strict_common_interlacer_overlap": bool(overlap),
        "q0_digest": primitive_digest(q0),
        "q1_digest": primitive_digest(q1),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--max-r", type=int, default=1)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert args.m >= 2 and args.max_r >= 0

    units = [Fraction(1, 10), Fraction(1, 2), Fraction(1)]
    factor_values = [Fraction(1, 10), Fraction(1), Fraction(10)]
    factor_tuples = list(itertools.combinations_with_replacement(factor_values, args.m))
    cases = []
    first_failure = None
    for parity in ("odd", "even"):
        for reserve_index in range(args.max_r + 1):
            for i, u in enumerate(units):
                for v in units[i:]:
                    for factors in factor_tuples:
                        case = one_case(args.m, parity, reserve_index, u, v, factors)
                        cases.append(case)
                        if not case["strict_common_interlacer_overlap"]:
                            first_failure = case
                            break
                    if first_failure:
                        break
                if first_failure:
                    break
            if first_failure:
                break
        if first_failure:
            break

    status = "EXACT_FINITE_PF_ARBITRARY_LENGTH_COMMON_INTERLACING_AUDIT"
    if first_failure:
        status = "EXACT_FINITE_PF_ARBITRARY_LENGTH_OVERLAP_FAILURE"
    report = {
        "status": status,
        "statement": {
            "m_appended_negative_factors": args.m,
            "sharp_reserve": 4 * args.m + 9,
            "pair": "Q_i=sum_j [t^j]prod(t+c_k) G_(i+j)",
        },
        "scope": {
            "max_reserve_index": args.max_r,
            "u_v_values": [str(value) for value in units],
            "factor_values": [str(value) for value in factor_values],
            "factor_tuple_count": len(factor_tuples),
            "completed_case_count": len(cases),
        },
        "first_failure": first_failure,
        "cases": cases,
        "logical_status": "Finite exact route evidence only; not an all-order proof.",
    }
    output = args.output or HERE / f"pf_length{args.m + 1}_common_interlacing_exact_audit_20260807.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("status", "scope", "first_failure")}, indent=2))
    print(output)


if __name__ == "__main__":
    main()
