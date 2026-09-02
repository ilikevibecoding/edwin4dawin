#!/usr/bin/env python3
"""Exact all-order BB-sector positivity for the double-broom Newton expansion.

The proof is coefficientwise in arbitrary nonnegative linear-factor weights.
The finite symbolic replay below is an independent sanity check of the closed
monomial formula used in the theorem note.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


z, w = sp.symbols("z w")
phi = z + w + z * w
delta = (z - w) ** 2 / 2


def coeff_g(B: int, H: int, p: int, q: int) -> int:
    """[z^p w^q] (z+w)^B phi^H, with zero outside support."""
    if min(B, H, p, q) < 0:
        return 0
    c = p + q - B - H
    if not 0 <= c <= H:
        return 0
    length = B + H - c
    left = p - c
    if not 0 <= left <= length:
        return 0
    return comb(H, c) * comb(length, left)


def A(B: int, H: int, q: int) -> int:
    return coeff_g(B, H, q, q)


def D(B: int, H: int, q: int) -> int:
    """[z^q w^q] delta (z+w)^B phi^H."""
    return coeff_g(B, H, q - 2, q) - coeff_g(B, H, q - 1, q - 1)


def closed_root_monomial(a: int, b: int, h: int, rank: int) -> int:
    """Coefficient for a doubled roots and b singly used roots."""
    R = rank - a
    return (
        A(b + 2, h, R - 1)
        - a * D(b + 2, h, R + 1)
        - h * D(b + 2, h - 1, R)
        - 2 * D(b + 1, h, R)
    )


def kernel(Pz, Pw):
    return sp.expand(
        z * w * Pz * Pw
        + (z - w) * (sp.diff(Pz, z) * Pw - Pz * sp.diff(Pw, w)) / 2
    )


def bb_integrand(Pz, Pw, h: int):
    correction = 2 * (z + w) * phi**h
    if h:
        correction += h * (z + w) ** 2 * phi ** (h - 1)
    return sp.expand(
        (z + w) ** 2 * phi**h * kernel(Pz, Pw)
        - delta * Pz * Pw * correction
    )


def path_poly(order: int, x):
    if order == -2:
        return sp.Integer(0)
    if order <= 0:
        return sp.Integer(1)
    older, old = sp.Integer(1), 1 + x
    for _ in range(2, order + 1):
        older, old = old, sp.expand(old + x * older)
    return old


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-factors", type=int, default=3)
    parser.add_argument("--max-h", type=int, default=5)
    parser.add_argument("--max-rank", type=int, default=7)
    parser.add_argument("--max-path-order", type=int, default=12)
    args = parser.parse_args()

    # Exact central-binomial sign identity behind D<=0.  When the common
    # support parameter is T>=0,
    # C(2T,T-1)-C(2T,T)=-C(2T,T)/(T+1).
    central_checks = 0
    for T in range(0, 4 * args.max_rank + 10):
        left = (comb(2 * T, T - 1) if T else 0) - comb(2 * T, T)
        right_num = -comb(2 * T, T)
        assert left * (T + 1) == right_num
        central_checks += 1

    stream = hashlib.sha256()
    abstract_cells = 0
    abstract_minimum = None
    for a in range(args.max_factors + 1):
        for b in range(args.max_factors + 1 - a):
            for h in range(args.max_h + 1):
                for rank in range(2, args.max_rank + 1):
                    value = closed_root_monomial(a, b, h, rank)
                    assert value >= 0
                    cell = (value, a, b, h, rank)
                    abstract_minimum = cell if abstract_minimum is None or cell < abstract_minimum else abstract_minimum
                    stream.update(f"A,{a},{b},{h},{rank},{value};".encode())
                    abstract_cells += 1

    # Literal symbolic factor replay.  Every monomial in the lambda variables
    # is classified only by the numbers of exponent-two and exponent-one
    # factors, and must match the closed all-order coefficient formula.
    literal_cells = 0
    for factor_count in range(args.max_factors + 1):
        lambdas = sp.symbols(f"l0:{factor_count}")
        Pz = sp.prod(1 + lam * z for lam in lambdas)
        Pw = sp.prod(1 + lam * w for lam in lambdas)
        for h in range(min(args.max_h, 5) + 1):
            integrand = bb_integrand(Pz, Pw, h)
            for rank in range(2, min(args.max_rank, factor_count + h + 5) + 1):
                value = sp.expand(integrand).coeff(z, rank).coeff(w, rank)
                poly = sp.Poly(value, *lambdas) if lambdas else None
                terms = poly.terms() if poly is not None else [((0,) * factor_count, value)]
                for exponents, coefficient in terms:
                    assert all(e in (0, 1, 2) for e in exponents)
                    a = sum(e == 2 for e in exponents)
                    b = sum(e == 1 for e in exponents)
                    expected = closed_root_monomial(a, b, h, rank)
                    assert int(coefficient) == expected
                    assert expected >= 0
                    literal_cells += 1
                    stream.update(
                        f"L,{factor_count},{h},{rank},{exponents},{expected};".encode()
                    )

    # Direct path-sector replay from the Fibonacci/path recurrence.
    path_cells = 0
    path_minimum = None
    for order in range(0, args.max_path_order + 1):
        Pz, Pw = path_poly(order, z), path_poly(order, w)
        for h in range(args.max_h + 1):
            integrand = bb_integrand(Pz, Pw, h)
            for rank in range(2, args.max_rank + 1):
                value = int(sp.expand(integrand).coeff(z, rank).coeff(w, rank))
                assert value >= 0
                cell = (value, order, h, rank)
                path_minimum = cell if path_minimum is None or cell < path_minimum else path_minimum
                path_cells += 1
                stream.update(f"P,{order},{h},{rank},{value};".encode())

    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_DOUBLE_BROOM_BB_NEWTON_SECTOR",
        "universal_statement": (
            "For P=product_s(1+lambda_s x), lambda_s>=0, every diagonal "
            "coefficient of the h-th Newton BB integrand is a polynomial in "
            "the lambda_s with nonnegative coefficients."
        ),
        "closed_root_monomial_formula": (
            "A_(b+2,h)(R-1)-aD_(b+2,h)(R+1)-hD_(b+2,h-1)(R)-2D_(b+1,h)(R), R=r-a"
        ),
        "sign_facts": ["A>=0", "D<=0 by the central-binomial identity"],
        "path_factorization": (
            "P_m(x)=product_{j=1}^{floor((m+1)/2)} "
            "(1+4 cos^2(j*pi/(m+2)) x)"
        ),
        "central_binomial_identity_checks": central_checks,
        "abstract_parameter_cells": abstract_cells,
        "abstract_minimum": abstract_minimum,
        "literal_symbolic_monomial_cells": literal_cells,
        "path_replay_cells": path_cells,
        "path_replay_minimum": path_minimum,
        "ranges": vars(args),
        "value_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "This closes only the BB/common-path sector. The mixed BX+BY, "
            "XY, and BZ sectors remain to be paid; therefore this is not the "
            "double-broom theorem, all-forest ISO, or Erdos Problem 993."
        ),
    }
    output = Path("iso_double_broom_bb_sector_exact_agent_20260829.json")
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
