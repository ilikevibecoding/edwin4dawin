#!/usr/bin/env python3
"""Independent literal replay of the five component-refined mask-3 cells."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_5_component_residual_independent_audit_agent_20260823.json"
CATALOG = HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_5_component_residual_agent.py":
        "A165E44CA67F6622A38783502AF06179EE267BAAA6BDA975C43B0F5B4B01279A",
    "rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json":
        "C9DCA4BF65A3787042AA7344EC7846613E9D51EA4B4EA511BAFBCED9A0D9372B",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json":
        "41C457BEB4BF565F3FCCF46BF374168AD7EA5683B115C3A50347AA72E811F9E1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def parse_fraction(value: str) -> Fraction:
    numerator, separator, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if separator else 1)


def component_gap(r: int, components: int, minima: list[int]) -> int:
    return sum(
        minima[j] * choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def direct_box(
    base: sp.Poly,
    N: int,
    r: int,
    components: int,
    minima: list[int],
    t_upper: Fraction,
) -> sp.Poly:
    m = N - r
    X, V, T = sp.symbols("X V T")
    x_lower = sp.Rational(6, N - 5)
    x_upper = sp.Rational(6 * N, N * N - 15 * N + 10)
    x = x_lower + (x_upper - x_lower) * X
    d6_upper = choose(N - 1, 6) + choose(r - 1, 5)
    y_upper = x - sp.Rational(component_gap(r, components, minima), d6_upper)
    assert y_upper.subs(X, 0) >= 0
    y = y_upper * V
    t_lower = sp.Rational(6, m - 5)
    rational_upper = sp.Rational(t_upper.numerator, t_upper.denominator)
    assert t_lower <= rational_upper
    t = t_lower + (rational_upper - t_lower) * T
    z = y / t
    expression = base.as_expr().subs(
        {base.gens[0]: N, base.gens[1]: x, base.gens[2]: y, base.gens[3]: z},
        simultaneous=True,
    )
    numerator, denominator = sp.fraction(sp.cancel(expression))
    denominator_poly = sp.Poly(denominator, T, domain=sp.QQ)
    assert all(coefficient > 0 for coefficient in denominator_poly.all_coeffs())
    return sp.Poly(numerator, X, V, T, domain=sp.QQ)


def bernstein(polynomial: sp.Poly) -> tuple[tuple[int, ...], dict[tuple[int, ...], Fraction]]:
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


def sign(polynomial: sp.Poly) -> dict:
    degrees, blocks = bernstein(polynomial)
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


def compare(actual: dict, expected: dict, label) -> None:
    for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
        assert actual[key] == expected[key], (label, key, actual[key], expected[key])


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    component_rows = {
        (row["order"], row["components"]): row
        for row in catalog["component_rows"]
    }
    base = literal_base()
    replay = []
    method_obstructions = []
    subboxes = 0
    for row in reversed(primary["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        current_subboxes = []
        for subbox in reversed(row["component_subboxes"]):
            components = subbox["components"]
            item = component_rows[(m, components)]
            polynomial = direct_box(
                base,
                N,
                r,
                components,
                item["minimum_f0_to_f4"],
                parse_fraction(item["maximum_f5_over_f6"]),
            )
            current = sign(polynomial)
            compare(current, subbox["bernstein"], (N, r, m, components))
            if current["negative"]:
                method_obstructions.append(
                    {
                        "N": N,
                        "r": r,
                        "m": m,
                        "components": components,
                        "negative_indices": current["negative_indices"],
                        "minimum_literal_fraction": current["minimum_literal_fraction"],
                    }
                )
            current_subboxes.append({"components": components, **current})
            subboxes += 1
        current_subboxes.reverse()
        replay.append({"N": N, "r": r, "m": m, "component_subboxes": current_subboxes})
    replay.reverse()
    assert subboxes == 82
    assert sorted((row["N"], row["r"], row["m"], row["components"]) for row in method_obstructions) == [
        (26, 10, 16, 1),
        (26, 10, 16, 2),
    ]
    assert all(row["negative_indices"] == [[7, 5, 4], [8, 5, 4]] for row in method_obstructions)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-5-component-residual-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_MASK3_5_COMPONENT_RESIDUAL_PARTIAL_WITH_METHOD_OBSTRUCTIONS",
        "hashes": hashes,
        "method": (
            "Direct literal mask-3 residual, rational X/V/T substitutions, and "
            "Fraction Bernstein conversion independently replayed all component boxes."
        ),
        "counts": {
            "cells": len(replay),
            "component_subboxes": subboxes,
            "zero_negative_subboxes": subboxes - len(method_obstructions),
            "method_obstruction_subboxes": len(method_obstructions),
        },
        "method_obstructions": method_obstructions,
        "rows": replay,
        "proof_boundary": (
            "The two negative relaxed-box controls are method obstructions, not "
            "forest or graph counterexamples. Four cells have all subboxes "
            "independently zero-negative; (26,10,16) remains uncredited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SUBBOXES", subboxes, "METHOD_OBSTRUCTIONS", len(method_obstructions))
    print("OBSTRUCTIONS", method_obstructions)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
