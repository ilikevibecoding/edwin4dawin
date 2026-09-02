#!/usr/bin/env python3
"""Independent literal replay of the 19 finite mask-0 diagonal cells."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py":
        "FB0A422F3E601B9C5757F8D740C1C17576322D46196B882D7141016804CE3338",
    "rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json":
        "C7AD3BEB20A543F7D06EE84D6501F33454EEC2265C541570B42F0DE7CCBAC3B2",
    "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json":
        "91E071946534CA6AF36ED4F121639F895F2A9E3F3D405E048EB64858D692D196",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json":
        "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json":
        "8551E3E7FDDC6EDBA78C4F68A300A6525CDD539BE957DE15033F2FFDED3FA753",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json":
        "6E6872E615F74D207C2D6F3D192CDBB0D799437C15AE40DD7E2352F6BD83E232",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def q8(left: sp.Expr, middle: sp.Expr, right: sp.Expr) -> sp.Expr:
    return 16 * middle**2 - left * middle - 18 * left * right


def literal_base_polynomial() -> sp.Poly:
    """Directly transcribe the new-leaf gate at both selected lower endpoints."""
    N, x, y, z = sp.symbols("N x y z")
    d6 = sp.Integer(1)
    d7 = (N**2 - 18 * N + 12) / (7 * N)
    c6 = d6 + y
    c7 = d7 + z
    c8 = (N**2 - 19 * N - 6) * c7 / (8 * (N + 1))
    # At the new leaf: C'=C+xD and H'=C.  These are the rank-6..8
    # coefficients after the two ordinary leaf transforms in the gate.
    core6 = c6 + x
    core7 = c7 + d6
    core8 = c8 + d7
    p7 = core7 + core6 + c6
    p8 = core8 + core7 + c7
    residual = sp.expand(
        8 * core7 * c6 * q8(p7, p8, core8)
        - 8 * c6 * p7 * (16 * core8**2 - core7 * core8)
        - 9 * core7 * p7 * (14 * c7**2 - c6 * c7)
    )
    numerator, denominator = sp.fraction(sp.cancel(residual))
    assert sp.factor(denominator) == 343 * N**4 * (N + 1) ** 2
    polynomial = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(polynomial.terms()) == 131
    return polynomial


def gap(N: int, r: int) -> int:
    m = N - r
    return sum(
        choose(m - j + 1, j) * choose(r - j, 5 - j)
        for j in range(5)
    )


def direct_box(base: sp.Poly, N: int, r: int, sharpen_order16: bool):
    m = N - r
    X, V, T = sp.symbols("X V T")
    x_lower = sp.Rational(6, N - 5)
    x_upper = sp.Rational(6 * N, N * N - 15 * N + 10)
    x = x_lower + (x_upper - x_lower) * X
    d6_upper = choose(N - 1, 6) + choose(r - 1, 5)
    y = (x - sp.Rational(gap(N, r), d6_upper)) * V
    t_lower = sp.Rational(6, m - 5)
    selected_upper = sp.Rational(6 * m, m * m - 15 * m + 10)
    t_upper = min(selected_upper, sp.Rational(12, 7)) if sharpen_order16 else selected_upper
    t = t_lower + (t_upper - t_lower) * T
    z = y / t
    expression = base.as_expr().subs(
        {base.gens[0]: N, base.gens[1]: x, base.gens[2]: y, base.gens[3]: z},
        simultaneous=True,
    )
    numerator, denominator = sp.fraction(sp.cancel(expression))
    denominator_polynomial = sp.Poly(denominator, T, domain=sp.QQ)
    assert all(coefficient > 0 for coefficient in denominator_polynomial.all_coeffs())
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
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = Fraction(1)
            for a, b, degree in zip(source, target, degrees):
                weight *= Fraction(math.comb(b, a), math.comb(degree, a))
            total += coefficient * weight
        blocks[target] = total
    return degrees, blocks


def replay_row(base, N: int, r: int, sharpen: bool):
    polynomial = direct_box(base, N, r, sharpen)
    degrees, blocks = bernstein_signs(polynomial)
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {
        "degrees": list(degrees),
        "blocks": len(blocks),
        "negative": len(negative),
        "zero": sum(value == 0 for value in blocks.values()),
        "positive": sum(value > 0 for value in blocks.values()),
        "negative_indices": negative,
        "minimum_literal_fraction": str(min(blocks.values())),
    }


def audit_edge_concentration_induction() -> int:
    checks = 0
    # Every induction descendant of a target cell has at most 39 vertices,
    # at most 17 remaining edges, and at least 10 excess vertices.
    for N in range(10, 40):
        for m in range(1, min(17, N - 10) + 1):
            for degree in range(1, m + 1):
                interior = (
                    choose(N - m + degree - 2, 5)
                    + choose(N - degree - 1, 5)
                )
                endpoints = choose(N - m - 1, 5) + choose(N - 2, 5)
                assert interior <= endpoints
                checks += 1
    return checks


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (
            HERE / "rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_ALL_19_DIAGONAL_CELLS"
    base = literal_base_polynomial()

    replay = []
    residual = []
    for row in reversed(primary["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        baseline = replay_row(base, N, r, False)
        sharpen = m == 16
        final = replay_row(base, N, r, sharpen)
        assert final["negative"] == 0
        assert baseline["degrees"] == row["baseline_selected_t"]["degrees"]
        assert baseline["blocks"] == row["baseline_selected_t"]["blocks"]
        assert baseline["negative"] == row["baseline_selected_t"]["negative"]
        assert baseline["zero"] == row["baseline_selected_t"]["zero"]
        assert baseline["positive"] == row["baseline_selected_t"]["positive"]
        assert baseline["negative_indices"] == row["baseline_selected_t"]["negative_indices"]
        assert final["degrees"] == row["final"]["degrees"]
        assert final["blocks"] == row["final"]["blocks"]
        assert final["negative"] == row["final"]["negative"]
        assert final["zero"] == row["final"]["zero"]
        assert final["positive"] == row["final"]["positive"]
        assert final["negative_indices"] == row["final"]["negative_indices"]
        if baseline["negative"]:
            residual.append((N, r, m))
        replay.append(
            {
                "N": N,
                "r": r,
                "m": m,
                "baseline": baseline,
                "final": final,
            }
        )
    replay.reverse()
    residual.sort()
    assert residual == [(29, 13, 16), (30, 14, 16)]
    induction_checks = audit_edge_concentration_induction()

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-19-diagonal-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_ALL_19_DIAGONAL_CELLS",
        "hashes": hashes,
        "method": (
            "Direct literal reconstruction of the new-leaf residual, rational "
            "substitution cell by cell, and unscaled Fraction Bernstein replay."
        ),
        "counts": {
            "cells": len(replay),
            "edge_concentration_only": 17,
            "forest16_ratio_needed": 2,
            "open": 0,
            "edge_concentration_induction_convexity_checks": induction_checks,
        },
        "residual_before_forest16_ratio": [list(cell) for cell in residual],
        "rows": replay,
        "edge_concentration_proof": (
            "For a nonisolated vertex of degree d, deletion gives i_k(G)="
            "i_k(G-v)+i_(k-1)(G-N[v]).  Induction bounds the first term by "
            "C(N-2,k)+C(N-m+d-2,k-1), and the second trivially by "
            "C(N-d-1,k-1).  The last two binomials have fixed argument sum "
            "and lie between N-m-1 and N-2, so discrete convexity gives the "
            "endpoint sum C(N-m-1,k-1)+C(N-2,k-1)."
        ),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 19 EDGE_CONCENTRATION_ONLY 17 RATIO 2 OPEN 0")
    print("CONVEXITY_CHECKS", induction_checks)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
