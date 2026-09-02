#!/usr/bin/env python3
"""Independent literal replay of the coarse, 13-cell, and 9-cell mask-3 layers."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_middle_layers_independent_audit_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_middle_agent.py":
        "91F3D2FBD65BE77119A9513A2A3BE8D95F1277683FD49F60BCE7E27E7FB70F5B",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json":
        "2919A6986E0AF16466EEF5CE89783D6676B27B0316066C821BFFE944647F9DC9",
    "prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent.py":
        "1484464582B475072E126563CDF9A31E274A03E39609E0F11E6C1FE1337C6246",
    "rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json":
        "881507ADD1A7A96E95C8D24A0D1C6E7092E567F8C27AB8A84082F6F34F862957",
    "prove_rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_agent.py":
        "7EF09D48838D6D991B5A755D2112F2205B066CC8F007B5301C1B9072C0A433C6",
    "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json":
        "7417437EB9605542365D6C170378866EEF77030B417BB8019531E3F0F00B5378",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json":
        "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def path_gap(N: int, r: int) -> int:
    m = N - r
    return sum(choose(m - j + 1, j) * choose(r - j, 5 - j) for j in range(5))


def polynomial_multiply(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    answer = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, left_value in enumerate(left):
        for j, right_value in enumerate(right):
            answer[i + j] += left_value * right_value
    return answer


def linear_power(constant: Fraction, slope: Fraction, exponent: int) -> list[Fraction]:
    answer = [Fraction(1)]
    for _ in range(exponent):
        answer = polynomial_multiply(answer, [constant, slope])
    return answer


def controls(base_terms, N: int, r: int, d6_upper: int, t_upper: Fraction):
    m = N - r
    x0 = Fraction(6, N - 5)
    x1 = Fraction(6 * N, N * N - 15 * N + 10)
    x_slope = x1 - x0
    y0 = x0 - Fraction(path_gap(N, r), d6_upper)
    assert y0 >= 0
    t0 = Fraction(6, m - 5)
    assert t0 <= t_upper
    t_slope = t_upper - t0
    x_powers = [linear_power(x0, x_slope, exponent) for exponent in range(5)]
    y_powers = [linear_power(y0, x_slope, exponent) for exponent in range(6)]
    t_powers = [linear_power(t0, t_slope, exponent) for exponent in range(5)]
    power: dict[tuple[int, int, int], Fraction] = {}
    # Multiplication by t^4 is positive. With z=y/t, each literal term is
    # c*x^xp*y^(yp+zp)*V^(yp+zp)*t^(4-zp).
    for (np, xp, yp, zp), coefficient in reversed(base_terms):
        assert np == 0
        x_coefficients = polynomial_multiply(x_powers[xp], y_powers[yp + zp])
        t_coefficients = t_powers[4 - zp]
        for x_degree, x_value in enumerate(x_coefficients):
            for t_degree, t_value in enumerate(t_coefficients):
                key = (x_degree, yp + zp, t_degree)
                power[key] = power.get(key, Fraction(0)) + int(coefficient) * x_value * t_value
    degrees = (8, 5, 4)
    out = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = Fraction(1)
            for a, b, degree in zip(source, target, degrees):
                weight *= Fraction(choose(b, a), choose(degree, a))
            value += coefficient * weight
        out[target] = value
    return out


def sign(blocks: dict[tuple[int, ...], Fraction]) -> dict:
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {
        "degrees": [8, 5, 4],
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


def selected_ratio(m: int) -> Fraction:
    return Fraction(6 * m, m * m - 15 * m + 10)


def lifted_ratio(m: int) -> Fraction:
    return {16: Fraction(12, 7), 17: Fraction(11, 7), 18: Fraction(132, 91)}[m]


def edge_concentration_checks() -> int:
    checks = 0
    for N in range(10, 40):
        for m in range(1, min(18, N - 10) + 1):
            for degree in range(1, m + 1):
                interior = choose(N - m + degree - 2, 5) + choose(N - degree - 1, 5)
                endpoints = choose(N - m - 1, 5) + choose(N - 2, 5)
                assert interior <= endpoints
                checks += 1
    return checks


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = load("rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json")
    first = load("rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json")
    ratio = load("rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json")
    base_terms = literal_base().terms()

    coarse_replay = []
    for row in reversed(coarse["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        current = sign(controls(base_terms, N, r, choose(N, 6), selected_ratio(m)))
        assert current["negative_indices"] == row["negative_indices"]
        assert current["negative"] == len(row["negative_indices"])
        coarse_replay.append({"N": N, "r": r, "m": m, **current})
    coarse_replay.reverse()
    assert len(coarse_replay) == 105
    coarse_open = [(row["N"], row["r"], row["m"]) for row in coarse_replay if row["negative"]]
    assert coarse_open == [(row["N"], row["r"], row["m"]) for row in coarse["open_cells"]]
    assert len(coarse_open) == 13

    first_replay = []
    for row in reversed(first["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        cap = choose(N - 1, 6) + choose(r - 1, 5)
        baseline = sign(controls(base_terms, N, r, cap, selected_ratio(m)))
        final_upper = min(selected_ratio(m), Fraction(12, 7)) if m == 16 else selected_ratio(m)
        final = sign(controls(base_terms, N, r, cap, final_upper))
        compare(baseline, row["baseline"], (N, r, m, "baseline"))
        compare(final, row["final"], (N, r, m, "final"))
        first_replay.append({"N": N, "r": r, "m": m, "baseline": baseline, "final": final})
    first_replay.reverse()
    assert [(row["N"], row["r"], row["m"]) for row in first_replay] == coarse_open
    first_open = [(row["N"], row["r"], row["m"]) for row in first_replay if row["final"]["negative"]]
    assert first_open == [tuple(row) for row in first["open_cells"]] and len(first_open) == 9

    ratio_replay = []
    for row in reversed(ratio["rows"]):
        N, r, m = row["N"], row["r"], row["m"]
        cap = choose(N - 1, 6) + choose(r - 1, 5)
        current = sign(controls(base_terms, N, r, cap, lifted_ratio(m)))
        compare(current, row["bernstein"], (N, r, m, "ratio"))
        ratio_replay.append({"N": N, "r": r, "m": m, "bernstein": current})
    ratio_replay.reverse()
    assert [(row["N"], row["r"], row["m"]) for row in ratio_replay] == first_open
    ratio_open = [(row["N"], row["r"], row["m"]) for row in ratio_replay if row["bernstein"]["negative"]]
    assert ratio_open == [tuple(row) for row in ratio["open_cells"]] and len(ratio_open) == 5

    edge_checks = edge_concentration_checks()
    # Independently replay the two deletion-average lifts from 12 f6 >= 7 f5.
    assert Fraction(12 * (17 - 6), 7 * (17 - 5)) == Fraction(11, 7)
    assert Fraction(11 * (18 - 6), 7 * (18 - 5)) == Fraction(132, 91)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-middle-layers-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_MASK3_N26_39_MIDDLE_92_PLUS_4_PLUS_4_PARTITION",
        "hashes": hashes,
        "method": (
            "A direct literal mask-3 numerator, rational t^4-cleared boxes, and "
            "Fraction Bernstein conversion independently replayed all three layers."
        ),
        "counts": {
            "coarse_cells": 105,
            "coarse_zero_negative": 92,
            "coarse_open": 13,
            "first_refinement_zero_negative": 4,
            "first_refinement_open": 9,
            "ratio_lift_zero_negative": 4,
            "ratio_lift_open": 5,
            "boxes_replayed": 140,
            "bernstein_controls_replayed": 140 * 270,
            "edge_concentration_induction_checks": edge_checks,
        },
        "open_chain": {
            "after_coarse": [list(cell) for cell in coarse_open],
            "after_first_refinement": [list(cell) for cell in first_open],
            "after_ratio_lift": [list(cell) for cell in ratio_open],
        },
        "proof_boundary": (
            "This independently credits 92+4+4 finite-middle cells and confirms "
            "the exact five-cell residual set. It requires the separately audited "
            "five-cell package before the 105-cell region is complete."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", payload["counts"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
