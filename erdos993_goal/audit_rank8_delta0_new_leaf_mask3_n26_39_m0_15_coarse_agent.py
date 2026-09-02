#!/usr/bin/env python3
"""Independent literal replay of the coarse 224-cell mask-3 small-m registry."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_coarse_independent_audit_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_agent.py":
        "111DFEEC2DCEC290A2AD876170AE083835D88E2B1E2834EC1F80DBE18467C475",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json":
        "1F771FEB9338055E961045A8C557C184E92FBED45BBA02C5A6CFDC5377CC212D",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json":
        "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_fraction(value: str) -> Fraction:
    numerator, slash, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if slash else 1)


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def path_minima(m: int):
    return [choose(m - j + 1, j) for j in range(5)]


def gap(r: int, m: int) -> int:
    minima = path_minima(m)
    return sum(minima[j] * choose(r - min(j, 4), 5 - j) for j in range(5))


def multiply(left, right):
    answer = {}
    for a, av in left.items():
        for b, bv in right.items():
            key = tuple(x + y for x, y in zip(a, b))
            answer[key] = answer.get(key, Fraction(0)) + av * bv
    return {key: value for key, value in answer.items() if value}


def powers(polynomial, maximum: int):
    zero = (0,) * len(next(iter(polynomial)))
    answer = [{zero: Fraction(1)}]
    for _ in range(maximum):
        answer.append(multiply(answer[-1], polynomial))
    return answer


def direct_sign(base, N: int, m: int, branch: str, t_upper: Fraction | None):
    r = N - m
    x0 = Fraction(6, N - 5)
    x1 = Fraction(6 * N, N * N - 15 * N + 10)
    slope = x1 - x0
    cap = choose(N - 1, 6) + choose(r - 1, 5)
    y0 = x0 - Fraction(gap(r, m), cap)
    axes = 2 if branch == "f6_zero" else 3
    x = {(0,) * axes: x0, (1,) + (0,) * (axes - 1): slope}
    y = {(0, 1) + (0,) * (axes - 2): y0, (1, 1) + (0,) * (axes - 2): slope}
    x_powers = powers(x, 4)
    y_powers = powers(y, 5)
    if branch == "f6_positive":
        assert t_upper is not None
        t0 = Fraction(6, m - 5)
        t = {(0, 0, 0): t0, (0, 0, 1): t_upper - t0}
        t_powers = powers(t, 4)
    power = {}
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        assert np == 0
        if branch == "f6_zero" and zp:
            continue
        current = multiply(x_powers[xp], y_powers[yp + zp])
        if branch == "f6_positive":
            current = multiply(current, t_powers[4 - zp])
        for index, value in current.items():
            power[index] = power.get(index, Fraction(0)) + int(coefficient) * value
    power = {key: value for key, value in power.items() if value}
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    controls = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for source, coefficient in power.items():
            if all(a <= b for a, b in zip(source, target)):
                value += coefficient * math.prod(
                    Fraction(math.comb(b, a), math.comb(degree, a))
                    for a, b, degree in zip(source, target, degrees)
                )
        controls[target] = value
    negative = [list(index) for index, value in sorted(controls.items()) if value < 0]
    return {
        "degrees": list(degrees),
        "blocks": len(controls),
        "negative": len(negative),
        "zero": sum(value == 0 for value in controls.values()),
        "positive": sum(value > 0 for value in controls.values()),
        "negative_indices": negative,
        "minimum_literal_fraction": str(min(controls.values())),
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = literal_base()
    rows = []
    replay_open = []
    subboxes = 0
    for row in reversed(primary["rows"]):
        branches = []
        for branch in reversed(row["branches"]):
            t_upper = None
            if branch["branch"] == "f6_positive":
                t_upper = parse_fraction(
                    global_rows[row["m"]]["f6_positive_maximum_f5_over_f6"]
                )
            current = direct_sign(
                base, row["N"], row["m"], branch["branch"], t_upper
            )
            expected = branch["bernstein"]
            for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
                assert current[key] == expected[key], (
                    row["N"], row["m"], branch["branch"], key
                )
            if current["negative"]:
                replay_open.append([row["N"], row["m"], branch["branch"], current["negative_indices"]])
            branches.append({"branch": branch["branch"], **current})
            subboxes += 1
        branches.reverse()
        rows.append({"N": row["N"], "m": row["m"], "r": row["r"], "branches": branches})
    rows.reverse()
    replay_open.reverse()
    assert len(rows) == 224 and subboxes == 294
    assert replay_open == primary["open_subboxes"]
    assert len(replay_open) == 80
    assert [(row["N"], row["m"], row["r"]) for row in rows] == [
        (N, m, N - m) for N in range(26, 40) for m in range(16)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-coarse-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_MASK3_SMALL_M_COARSE_REPLAY_WITH_80_OPEN",
        "scope": primary["scope"],
        "method": "direct rational substitution and unscaled Fraction Bernstein replay",
        "counts": {
            "cells": 224,
            "logical_branches": 294,
            "coarse_sealed_logical_branches": 214,
            "coarse_open_logical_branches": 80,
        },
        "open_subboxes": replay_open,
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": (
            "This audit credits only the 214 zero-negative coarse branches. "
            "The 80 listed branches require the independently audited exact-jet chain."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 224 BRANCHES 294 SEALED 214 OPEN 80")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
