#!/usr/bin/env python3
"""Independent rational replay of all 126 finite mask-1 low-r cells."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

from audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_n26_39_r1_9_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_n26_39_r1_9_agent.py": "DA6DDEA49673BF5B0931FC8660F675A7F67D755DA8522BC4768D93479D8807FF",
    "rank8_delta0_new_leaf_mask1_n26_39_r1_9_exact_agent_20260823.json": "4F0D074279A887D0E6A46DF7E502C779CC5C33C1D3E2F1CC6F935436B6EEDC8F",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap(N: int, r: int) -> int:
    m = N - r
    return sum(choose(m - j + 1, j) * choose(r - j, 5 - j) for j in range(5))


def direct_box(base: sp.Poly, N: int, r: int) -> sp.Poly:
    m = N - r
    X, V, T = sp.symbols("X V T")
    x0 = sp.Rational(6, N - 5)
    x1 = sp.Rational(6 * N, N * N - 15 * N + 10)
    x = x0 + (x1 - x0) * X
    d6cap = choose(N - 1, 6) + choose(r - 1, 5)
    y = (x - sp.Rational(gap(N, r), d6cap)) * V
    t0 = sp.Rational(6, m - 5)
    t1 = sp.Rational(6 * m, m * m - 15 * m + 10)
    t = t0 + (t1 - t0) * T
    z = y / t
    expression = base.as_expr().subs(
        {base.gens[0]: N, base.gens[1]: x, base.gens[2]: y, base.gens[3]: z},
        simultaneous=True,
    )
    numerator, denominator = sp.fraction(sp.cancel(expression))
    denominator_poly = sp.Poly(denominator, T, domain=sp.QQ)
    assert all(coefficient > 0 for coefficient in denominator_poly.all_coeffs())
    return sp.Poly(numerator, X, V, T, domain=sp.QQ)


def bernstein_signs(polynomial: sp.Poly):
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    blocks = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = Fraction(0)
        for source, coefficient in reversed(list(power.items())):
            if all(a <= b for a, b in zip(source, target)):
                total += coefficient * math.prod(
                    Fraction(math.comb(b, a), math.comb(degree, a))
                    for a, b, degree in zip(source, target, degrees)
                )
        blocks[target] = total
    return degrees, blocks


def convexity_checks() -> int:
    checks = 0
    for N in range(6, 40):
        for m in range(1, N):
            for degree in range(1, m + 1):
                interior = choose(N - m + degree - 2, 5) + choose(N - degree - 1, 5)
                endpoints = choose(N - m - 1, 5) + choose(N - 2, 5)
                assert interior <= endpoints
                checks += 1
    return checks


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_n26_39_r1_9_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_R1_9_ALL_126"
    base = literal_base()
    replay = []
    minimum = None
    for row in reversed(primary["rows"]):
        polynomial = direct_box(base, row["N"], row["r"])
        degrees, blocks = bernstein_signs(polynomial)
        negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
        assert not negative
        assert list(degrees) == row["degrees"]
        assert len(blocks) == row["blocks"]
        minimum = min(blocks.values()) if minimum is None else min(minimum, min(blocks.values()))
        replay.append((row["N"], row["r"], row["m"]))
    replay.reverse()
    assert replay == [(N, r, N - r) for N in range(26, 40) for r in range(1, 10)]
    checks = convexity_checks()
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-n26-39-r1-9-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_R1_9_ALL_126",
        "scope": primary["scope"],
        "hashes": actual,
        "method": "direct rational substitution and unscaled Fraction Bernstein replay",
        "cells": len(replay),
        "open": 0,
        "minimum_literal_fraction": str(minimum),
        "edge_concentration_convexity_checks": checks,
        "edge_concentration_proof": (
            "Deletion at degree d gives the two interior binomials with fixed "
            "argument sum; 1<=d<=m places both arguments between N-m-1 and "
            "N-2, so discrete convexity is bounded by the endpoint pair."
        ),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(replay), "CONVEXITY_CHECKS", checks)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
