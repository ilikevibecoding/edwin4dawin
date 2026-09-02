#!/usr/bin/env python3
"""Exact one-variable audit of the negative Delta5 q-D5 Bernstein faces."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def branch_expression(piece: str) -> sp.Expr:
    T = sp.symbols("T", nonnegative=True)
    n = sp.Rational(21) / T
    # The implicated face is W=A=1, U=0, V=1, Z=1.
    w = 3 * (n - 1) / ((n - 3) * (n - 4))
    x = 4 * w / (3 * (1 - w))
    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    d4 = (2 + x) / 10
    c5 = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(c4 / c5)
    a = n - 7
    k = 1
    q = sp.factor((30 / x5 - 3 - 3 * k) / (7 * a))
    c6 = sp.factor(c5 * (7 * a * q + 3 * k) / 36)
    c7 = sp.factor(a * q * c6 / 6)
    c8 = sp.factor(a * c7 / 8)
    if piece == "l0":
        S = 1 - q
        h7 = sp.S.Zero
    elif piece == "ucap":
        S = 7 * q / 6
        h7 = a * S * c6 / 7
    elif piece == "full":
        # The lcross and uc7 parameterizations coincide at their implicated
        # Z=1 face: h6=c6 and h7=c7.
        S = sp.S.One
        h7 = c7
    else:
        raise ValueError(piece)
    h6 = sp.factor(S * c6)
    raw = newton_coefficients(residual())[5]
    values = (c0, c1, c2, c3, c4, c5, c6, c7, c8, h6, h7)
    return sp.cancel(raw.subs(dict(zip((*c[:9], h[6], h[7]), values)), simultaneous=True))


def audit(piece: str) -> dict:
    T = sp.symbols("T", nonnegative=True)
    expression = branch_expression(piece)
    numerator, denominator = sp.fraction(expression)
    poly = sp.Poly(sp.expand(numerator), T, domain=sp.QQ)
    den_poly = sp.Poly(sp.expand(denominator), T, domain=sp.QQ)
    degree = poly.degree()
    power = [poly.nth(j) for j in range(degree + 1)]
    coefficients = [
        sp.factor(
            sum(
                power[j] * sp.binomial(i, j) / sp.binomial(degree, j)
                for j in range(i + 1)
            )
        )
        for i in range(degree + 1)
    ]
    minimum = min(coefficients)
    index = coefficients.index(minimum)
    roots = sp.polys.polytools.intervals(poly, eps=sp.Rational(1, 10**30))
    open_unit_roots = [
        ((str(interval[0]), str(interval[1])), multiplicity)
        for interval, multiplicity in roots
        if interval[1] > 0 and interval[0] < 1
    ]
    implicated_index = {"l0": 16, "ucap": 11, "full": 15}[piece]
    implicated_degree = {"l0": 54, "ucap": 53, "full": 54}[piece]
    point = sp.Rational(implicated_index, implicated_degree)
    point_value = sp.factor(expression.subs(T, point))
    return {
        "piece": piece,
        "numerator_degree": poly.degree(),
        "denominator_degree": den_poly.degree(),
        "numerator_factorization": str(sp.factor(poly.as_expr())),
        "denominator_factorization": str(sp.factor(den_poly.as_expr())),
        "univariate_bernstein_degree": degree,
        "univariate_bernstein_minimum": str(minimum),
        "univariate_bernstein_minimum_index": index,
        "isolated_real_roots_meeting_unit_interval": open_unit_roots,
        "implicated_T": str(point),
        "exact_value_at_implicated_T": str(point_value),
        "status": "PASS_FACE_NONNEGATIVE"
        if minimum >= 0
        else "NEEDS_STURM_SIGN_ANALYSIS",
    }


def main() -> None:
    payload = {
        "schema": "rank8-q8-terminal-delta5-qd5-implicated-faces-v1",
        "face": "W=A=1,U=0,V=1,Z=1, n=21/T",
        "branches": [audit("l0"), audit("ucap"), audit("full")],
    }
    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta5_qd5_implicated_faces_exact_20260817.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if any(branch["status"] != "PASS_FACE_NONNEGATIVE" for branch in payload["branches"]):
        raise SystemExit(2)
    print("PASS_EXACT_RANK8_DELTA5_QD5_IMPLICATED_FACES")


if __name__ == "__main__":
    main()
