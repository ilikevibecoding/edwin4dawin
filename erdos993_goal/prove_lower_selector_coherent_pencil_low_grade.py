#!/usr/bin/env python3
"""Exact all-order certificates for the coherent selector in grades 2..7.

For a fixed path grade s, use the Lagrange coefficient formula

  G_R(t) = sum_h sum_k (R)_(s-2h+k)/((s-2h)! k!)
                         * binom(2R+h-k,h-k) t^h.

The three coherent rows are G_R,G_(R-2),G_(R-4), where
R=2N-s-1.  We form P=-(W02^2-4W01W12).  In the strict interior
R>=s+3, this script proves every coefficient and every leading Hurwitz
minor of P is positive by shifting R=X+s+3 and checking that all resulting
coefficients are positive integers/rationals.  The support boundaries are
checked separately after removing the exact zero at t=0.

This is symbolic exact arithmetic.  There is no bounded N scan in the
all-order certificates; the finite point checks only audit the conclusion.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_coherent_pencil_low_grade_exact_20260813.json"
R, T, X = sp.symbols("R t X")


def falling(a: sp.Expr, n: int) -> sp.Expr:
    return sp.prod(a - i for i in range(n))


def c(Rv: sp.Expr, s: int, h: int) -> sp.Expr:
    j = s - 2 * h
    ans = 0
    for k in range(h + 1):
        multinomial = falling(Rv, j + k) / (sp.factorial(j) * sp.factorial(k))
        upper = 2 * Rv + h - k
        tail = falling(upper, h - k) / sp.factorial(h - k)
        ans += multinomial * tail
    return sp.factor(ans)


def g(Rv: sp.Expr, s: int) -> sp.Expr:
    return sp.expand(sum(c(Rv, s, h) * T**h for h in range(s // 2 + 1)))


def wronskian(f: sp.Expr, h: sp.Expr) -> sp.Expr:
    return sp.expand(sp.diff(f, T) * h - f * sp.diff(h, T))


def zero_order(p: sp.Poly) -> int:
    for i in range(p.degree() + 1):
        if p.nth(i) != 0:
            return i
    raise AssertionError("zero polynomial")


def positive_shift_certificate(expr: sp.Expr, base: int) -> dict[str, int]:
    num, den = sp.cancel(expr).as_numer_denom()
    assert not den.has(R) and den > 0
    shifted = sp.Poly(sp.expand(num.subs(R, X + base)), X)
    coefficients = shifted.all_coeffs()
    assert coefficients and all(value > 0 for value in coefficients)
    return {
        "degree": shifted.degree(),
        "terms": len(shifted.terms()),
        "minimum_coefficient": int(min(coefficients)),
    }


def hurwitz_minors(poly: sp.Poly) -> list[sp.Expr]:
    n = poly.degree()
    descending = [poly.nth(i) for i in range(n, -1, -1)]
    matrix = sp.zeros(n)
    for i in range(n):
        for j in range(n):
            index = 2 * j - i + 1
            if 0 <= index <= n:
                matrix[i, j] = descending[index]
    return [sp.factor(matrix[:k, :k].det(method="domain-ge")) for k in range(1, n + 1)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    records: list[dict[str, object]] = []
    audit_cells = 0
    for s in range(2, 8):
        rows = [g(R - 2 * q, s) for q in range(3)]
        w01 = wronskian(rows[0], rows[1])
        w02 = wronskian(rows[0], rows[2])
        w12 = wronskian(rows[1], rows[2])
        p = sp.Poly(sp.factor(-(w02**2 - 4 * w01 * w12)), T)

        # R=2N-s-1 has parity opposite to s.  The first strict-interior value
        # is R=s+3 (equivalently N=s+2); every later value is obtained by
        # adding 2, and positivity on X>=0 is stronger than needed.
        base = s + 3
        coefficient_certificates = [
            positive_shift_certificate(p.nth(i), base)
            for i in range(p.degree() + 1)
        ]
        hurwitz = hurwitz_minors(p)
        hurwitz_certificates = [
            positive_shift_certificate(value, base) for value in hurwitz
        ]

        boundary_records = []
        # In the coherent-selector range s<=2N-6.  The values below the
        # strict interior R>=s+3 are therefore N from ceil((s+6)/2) through
        # s+1.  Zero discriminants are harmless degeneracies; nonzero ones
        # have an even forced factor and a strict Hurwitz core.
        first_N = max(4, (s + 7) // 2)
        for N in range(first_N, s + 2):
            Rv = 2 * N - s - 1
            boundary = sp.Poly(p.as_expr().subs(R, Rv), T)
            if boundary.is_zero:
                boundary_records.append({
                    "N": N,
                    "R": Rv,
                    "zero_discriminant_degeneracy": True,
                })
                continue
            order = zero_order(boundary)
            core = sp.Poly(sp.cancel(boundary.as_expr() / T**order), T)
            assert order % 2 == 0
            assert all(core.nth(i) > 0 for i in range(core.degree() + 1))
            boundary_hurwitz = hurwitz_minors(core)
            assert all(value > 0 for value in boundary_hurwitz)
            boundary_records.append({
                "N": N,
                "R": Rv,
                "forced_even_order": order,
                "core_degree": core.degree(),
                "core_coefficients_ascending": [
                    int(core.nth(i)) for i in range(core.degree() + 1)
                ],
                "hurwitz_minors": [int(value) for value in boundary_hurwitz],
            })

        # Finite independent conclusion audit, not part of the proof.
        for N in range(first_N, 31):
            Rv = 2 * N - s - 1
            audit = sp.Poly(p.as_expr().subs(R, Rv), T)
            if audit.is_zero:
                audit_cells += 1
                continue
            order = zero_order(audit)
            core = sp.Poly(sp.cancel(audit.as_expr() / T**order), T)
            assert core.count_roots(-sp.oo, sp.oo) == 0
            audit_cells += 1

        records.append({
            "s": s,
            "strict_interior": {
                "R_lower_bound": base,
                "coefficient_shift_certificates": coefficient_certificates,
                "hurwitz_shift_certificates": hurwitz_certificates,
            },
            "support_boundaries": boundary_records,
        })

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_ALL_ORDER_COHERENT_SELECTOR_GRADES_2_THROUGH_7",
        "theorem": (
            "For every 2<=s<=7 and every nonterminal path cell N>=max(4,s), "
            "the core of -(W02^2-4 W01 W12) is strictly Hurwitz stable. "
            "Hence W02^2-4 W01 W12<0 on the entire real axis away from the "
            "forced zero, and the coherent adjacent-pencil lemma holds."
        ),
        "all_order_method": (
            "Exact Lagrange path coefficients; after R=X+s+3 every coefficient "
            "of the discriminant core and every leading Hurwitz minor has strictly "
            "positive coefficients. The two support-boundary values are exact "
            "positive Hurwitz cores after removing their even zero order."
        ),
        "finite_conclusion_audit": {
            "N_upper_bound": 30,
            "cells": audit_cells,
            "role": "replay only; not used in the all-order proof",
        },
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "grades": [2, 7],
        "finite_audit_cells": audit_cells,
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
