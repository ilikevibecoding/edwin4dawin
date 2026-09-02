#!/usr/bin/env python3
"""Independent literal audit of all 224 finite mask-1 small-m cells."""

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
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_n26_39_m0_15_independent_audit_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent.py": "75374FA0811C2C97836DBB2C2C23BA378F879F4AC50ADACAFE5A41FDDBC6CCE3",
    "rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json": "6E2A5A22CDD7104B326A116A2EF6988E2A85528891EE9F4188301C71CDDD0FE8",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json": "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json": "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def fraction(value: str) -> Fraction:
    numerator, slash, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if slash else 1)


def path_minima(m: int) -> list[int]:
    return [choose(m - j + 1, j) for j in range(5)]


def gap(r: int, minima: list[int]) -> int:
    return sum(minima[j] * choose(r - min(j, 4), 5 - j) for j in range(5))


def direct_polynomial(base, N: int, m: int, branch: str, t_upper: Fraction | None):
    r = N - m
    X, V, T = sp.symbols("X V T")
    x0 = sp.Rational(6, N - 5)
    x1 = sp.Rational(6 * N, N * N - 15 * N + 10)
    x = x0 + (x1 - x0) * X
    d6cap = choose(N - 1, 6) + choose(r - 1, 5)
    y = (x - sp.Rational(gap(r, path_minima(m)), d6cap)) * V
    if branch == "f6_zero":
        z = sp.Integer(0)
        variables = (X, V)
    else:
        assert t_upper is not None
        t0 = sp.Rational(6, m - 5)
        t1 = sp.Rational(t_upper.numerator, t_upper.denominator)
        t = t0 + (t1 - t0) * T
        z = y / t
        variables = (X, V, T)
    expression = base.as_expr().subs(
        {base.gens[0]: N, base.gens[1]: x, base.gens[2]: y, base.gens[3]: z},
        simultaneous=True,
    )
    numerator, denominator = sp.fraction(sp.cancel(expression))
    denominator_poly = sp.Poly(denominator, *(variables[-1:],), domain=sp.QQ)
    assert all(coefficient > 0 for coefficient in denominator_poly.coeffs())
    return sp.Poly(numerator, *variables, domain=sp.QQ)


def sign(polynomial):
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


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224"
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = literal_base()
    replay = []
    subboxes = 0
    minimum = None
    for row in reversed(primary["rows"]):
        audited = []
        for branch in reversed(row["branches"]):
            t_upper = None
            if branch["branch"] == "f6_positive":
                t_upper = fraction(
                    global_rows[row["m"]]["f6_positive_maximum_f5_over_f6"]
                )
            polynomial = direct_polynomial(
                base, row["N"], row["m"], branch["branch"], t_upper
            )
            current = sign(polynomial)
            expected = branch["bernstein"]
            for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
                assert current[key] == expected[key], (row["N"], row["m"], branch["branch"], key)
            assert current["negative"] == 0
            current_min = Fraction(current["minimum_literal_fraction"])
            minimum = current_min if minimum is None else min(minimum, current_min)
            audited.append({"branch": branch["branch"], **current})
            subboxes += 1
        audited.reverse()
        replay.append({"N": row["N"], "m": row["m"], "r": row["r"], "branches": audited})
    replay.reverse()
    assert len(replay) == 224 and subboxes == 294
    assert [(row["N"], row["m"], row["r"]) for row in replay] == [
        (N, m, N - m) for N in range(26, 40) for m in range(16)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-n26-39-m0-15-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224",
        "scope": primary["scope"],
        "hashes": actual,
        "method": "direct rational substitution and unscaled Fraction Bernstein replay",
        "counts": {"cells": len(replay), "bernstein_subboxes": subboxes, "open": 0},
        "minimum_literal_fraction": str(minimum),
        "rows": replay,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(replay), "SUBBOXES", subboxes, "OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
