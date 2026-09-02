#!/usr/bin/env python3
"""Independent literal audit of the 224 finite small-m mask-0 cells."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

import audit_rank8_delta0_new_leaf_mask0_19_diagonal_agent as literal


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "rank8_delta0_new_leaf_mask0_n26_39_m0_15_independent_audit_agent_20260823.json"
)
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_n26_39_m0_15_agent.py":
        "6FF89B861D52AA54F1F15F7525B6B1C39EAF5FC9FA21ED38DAF0E0E49F31DF73",
    "rank8_delta0_new_leaf_mask0_n26_39_m0_15_exact_agent_20260823.json":
        "6ABD067524A591FC0F9DA3C497EA8C85412AA4ECC4C04587097C01DFC841752F",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json":
        "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "audit_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py":
        "FC0B6FC05F24186B29C4FF780D58349573BD65D010C3D93C90DA67325BECBC89",
    "rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json":
        "264DF9A4D588E0EF8779D4F1F7FFC9596F72B324C93CCE9A9C5829D82D83D0D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def parse_fraction(value: str) -> Fraction:
    numerator, separator, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if separator else 1)


def path_minima(m: int) -> list[int]:
    return [choose(m - j + 1, j) for j in range(5)]


def gap(r: int, components: int, minima: list[int]) -> int:
    return sum(
        minima[j] * choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def direct_polynomial(
    base: sp.Poly,
    N: int,
    r: int,
    branch: str,
    minima: list[int] | None,
    components: int | None,
    t_upper: Fraction | None,
    f5_maximum: int | None,
):
    X, V, T = sp.symbols("X V T")
    x_lower = sp.Rational(6, N - 5)
    x_upper = sp.Rational(6 * N, N * N - 15 * N + 10)
    x = x_lower + (x_upper - x_lower) * X
    if f5_maximum is not None:
        y = sp.Rational(f5_maximum, choose(r, 6)) * V
    else:
        assert minima is not None and components is not None
        d6_upper = choose(N - 1, 6) + choose(r - 1, 5)
        y = (x - sp.Rational(gap(r, components, minima), d6_upper)) * V
    if branch == "f6_zero":
        z = sp.Integer(0)
        variables = (X, V)
    else:
        m = N - r
        assert t_upper is not None
        t_lower = sp.Rational(6, m - 5)
        t = t_lower + (sp.Rational(t_upper.numerator, t_upper.denominator) - t_lower) * T
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


def sign(polynomial: sp.Poly):
    degrees, blocks = literal.bernstein_signs(polynomial)
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


def compare_sign(actual: dict, expected: dict, label) -> None:
    for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
        assert actual[key] == expected[key], (label, key, actual[key], expected[key])
    assert actual["negative"] == 0


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask0_n26_39_m0_15_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    component_rows = {
        (row["order"], row["components"]): row
        for row in catalog["component_rows"]
    }
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = literal.literal_base_polynomial()
    replay = []
    subboxes = 0
    for row in reversed(primary["rows"]):
        N, m, r = row["N"], row["m"], row["r"]
        branch_rows = []
        for branch in reversed(row["branches"]):
            audited_subcases = []
            for subcase in reversed(branch["subcases"]):
                components_value = subcase["components"]
                f5_maximum = None
                t_upper = None
                if components_value == "all":
                    minima = path_minima(m)
                    components = 4
                    if branch["branch"] == "f6_positive":
                        t_upper = parse_fraction(
                            global_rows[m]["f6_positive_maximum_f5_over_f6"]
                        )
                else:
                    components = int(components_value)
                    item = component_rows[(m, components)][branch["branch"]]
                    minima = item["minimum_f0_to_f4"]
                    if branch["branch"] == "f6_positive":
                        t_upper = parse_fraction(item["maximum_f5_over_f6"])
                    elif subcase["metadata"].get("route") == "ROOT_SIXSET_F5_CAP":
                        f5_maximum = item["maximum_f5"]
                        minima = None
                        assert subcase["metadata"]["d6_root_sixset_floor"] == choose(r, 6)
                polynomial = direct_polynomial(
                    base,
                    N,
                    r,
                    branch["branch"],
                    minima,
                    components,
                    t_upper,
                    f5_maximum,
                )
                current = sign(polynomial)
                compare_sign(
                    current,
                    subcase["bernstein"],
                    (N, m, branch["branch"], components_value),
                )
                audited_subcases.append(
                    {"components": components_value, **current}
                )
                subboxes += 1
            audited_subcases.reverse()
            branch_rows.append(
                {
                    "branch": branch["branch"],
                    "route": branch["route"],
                    "subcases": audited_subcases,
                }
            )
        branch_rows.reverse()
        replay.append({"N": N, "m": m, "r": r, "branches": branch_rows})
    replay.reverse()
    assert len(replay) == 224 and subboxes == 346
    assert [(row["N"], row["m"], row["r"]) for row in replay] == [
        (N, m, N - m) for N in range(26, 40) for m in range(16)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-m0-15-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_N26_39_M0_15_ALL_224",
        "hashes": hashes,
        "counts": {"cells": len(replay), "bernstein_subboxes": subboxes, "open": 0},
        "rows": replay,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 224 SUBBOXES", subboxes, "OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
