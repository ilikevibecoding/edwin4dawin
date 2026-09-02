#!/usr/bin/env python3
"""Exact finite parameter proof for the forest m=1, j=3 reduction.

The verifier checks every integer structural cell 13<=N<=30, every integer
W in the correlated wedge interval, and the complete continuous y interval.
For fixed parameters each of three valid lower bounds is affine in y, so the
minimum of their maximum occurs at y endpoints or pairwise crossings.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build
from derive_terminal_q3_m1_forest_j3_component_u0_root import (
    build as build_component_u0,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_forest_j3_exact_u1_finite_relaxation_root_20260829.json"
PINS = {
    "derive_terminal_q3_m1_forest_j3_exact_u1_root.py":
        "0BEEDF0C142D2D96594D881A488BD6501A24D83917EB698CAF4843C53A82AC4B",
    "derive_terminal_q3_m1_forest_j3_component_u0_root.py":
        "ACFAEC033D16AE46B646C6D9ED2EB62D876D7259DC5192F09F6BCDE17729BE36",
    "FOREST_FIXED_EDGE_I3_UPPER_ROOT_2026-08-29.md":
        "E089F1F0A8C151950A633F2AA2A184ADDF71DBFAAEAD174A764B07122BAEDCC8",
    "FOREST_M1_ALLR_RELATIVE_SHADOW_CAP_ROOT_2026-08-29.md":
        "91777DB2843ABCDC1F0795FA2B01B1E2EF8995C559C3C444E79218FDBBCF2F5D",
    "FOREST_M1_J3_ROOT_NEIGHBOR_CLASS_CAPS_ROOT_2026-08-29.md":
        "1E3937FB48898C5AF101B788E9613CFDD4944616D97B0115231DC931159A22E0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def path_floor(n: int, k: int) -> int:
    return choose(n - k + 1, k) if n >= 2 * k - 1 else 0


def compile_exact(expression, variables):
    terms = []
    for powers, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        coefficient = sp.Rational(coefficient)
        terms.append((powers, Fraction(int(coefficient.p), int(coefficient.q))))

    def evaluate(values):
        total = Fraction(0)
        for powers, coefficient in terms:
            term = coefficient
            for value, power in zip(values, powers):
                if power:
                    term *= value ** power
            total += term
        return total

    return evaluate, len(terms)


def f4_floor(N: int, d: int, R: int) -> int:
    S = N - d
    q1, s1 = divmod(R, d)
    one = (d - s1) * path_floor(S - q1, 3) + s1 * path_floor(S - q1 - 1, 3)
    pairs = choose(d, 2)
    if pairs:
        q2, s2 = divmod((d - 1) * R, pairs)
        two = ((pairs - s2) * path_floor(S - q2, 2)
               + s2 * path_floor(S - q2 - 1, 2))
    else:
        two = 0
    three = choose(d, 3) * S - choose(d - 1, 2) * R
    value = path_floor(S, 4) + one + two + three + choose(d, 4)
    assert value >= 0
    return value


def path_sign(N: int, h: int, d: int, R: int, W: int,
              y: Fraction, f4bar: int) -> Fraction:
    m = N - h
    p0 = choose(N + 1, 3) - m * (N - 1) + W + choose(N + 1, 2) - m
    p1 = choose(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = choose(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    h2 = choose(N - d, 2) - (m - d - R)
    c0 = a + z2 + h2
    b = choose(N, 3) - (m - d) * (N - 2) + W - choose(d, 2) - R
    assert a > 0 and b > 0 and p1 > 0
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    assert A1 > 0
    ebar = 1 + y + Fraction(3 * z2, 2 * a)
    Q0 = 4 * c0 - 3 * ebar * (p0 + a)
    Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    gap = 2 * p1 * c0 - 3 * a * R1
    lower_times_b = 4 * (
        Fraction(3, 2) * p0 * R1 * b
        + Fraction(p0 * p0 * gap, 2 * p1)
        + A1 * ((1 + y) * b + h2 + f4bar + p0)
    ) + remainder * b
    scale = (72 * (N - 3) * (N * N - 3 * N + 2 * d + 2 * h)
             * (N * N + N + 2 * h + 2))
    return lower_times_b * scale


def main(max_N: int = 30) -> None:
    for name, expected in PINS.items():
        assert sha256(HERE / name) == expected, name

    numerator, denominator, _mnum, _mden, variables, bsymbol = build()
    component_num, component_den, component_variables, component_b = build_component_u0()
    assert variables == component_variables
    assert sp.cancel(denominator - component_den) == 0
    assert sp.cancel(bsymbol - component_b) == 0
    sign_evaluator, coupled_terms = compile_exact(-numerator, variables)
    component_evaluator, component_terms = compile_exact(-component_num, variables)

    structural_cells = supported_w_cells = y_candidates = 0
    zero = positive = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for N in range(13, max_N + 1):
        for h in range(1, (N - 1) // 2 + 1):
            edge_budget = N - 2 * h
            B = edge_budget - 1
            if B <= 0:
                continue
            for d in range(1, edge_budget + 1):
                S = N - d
                cS3 = choose(S, 3)
                for R in range(edge_budget - d + 1):
                    eH = N - h - d - R
                    h3max = cS3 - eH * (S - 2) + choose(eH, 2)
                    assert h3max >= 0
                    q, s = divmod(R, d)
                    B1 = ((d - s) * path_floor(S - q, 2)
                          + s * path_floor(S - q - 1, 2))
                    root_classes = (B1 + choose(d, 2) * S
                                    - (d - 1) * R + choose(d, 3))
                    assert root_classes >= 0
                    y_balanced = (Fraction(h3max, h3max + root_classes)
                                  if h3max else Fraction(0))
                    y_relative = (Fraction(S - 2, S - 2 + 3 * (d - 3))
                                  if d > 3 and S >= 3 else Fraction(1))
                    ycap = min(y_balanced, y_relative)
                    low = max(choose(d, 2) + R, B)
                    slack = edge_budget - d - R
                    high = (choose(d, 2) + choose(R + 1, 2)
                            + choose(slack + 1, 2))
                    assert low <= high
                    structural_cells += 1
                    f4bar = f4_floor(N, d, R)
                    for W in range(low, high + 1):
                        m = N - h
                        bvalue = (choose(N, 3) - (m - d) * (N - 2)
                                  + W - choose(d, 2) - R)
                        if bvalue <= 0:
                            continue
                        supported_w_cells += 1
                        values0 = (
                            sign_evaluator((N, h, d, R, W, Fraction(0))),
                            component_evaluator((N, h, d, R, W, Fraction(0))),
                            path_sign(N, h, d, R, W, Fraction(0), f4bar),
                        )
                        values1 = (
                            sign_evaluator((N, h, d, R, W, ycap)),
                            component_evaluator((N, h, d, R, W, ycap)),
                            path_sign(N, h, d, R, W, ycap, f4bar),
                        )
                        candidates = {Fraction(0), Fraction(1)}
                        for left in range(3):
                            for right in range(left + 1, 3):
                                denominator_cross = ((values1[left] - values0[left])
                                                     - (values1[right] - values0[right]))
                                if denominator_cross:
                                    crossing = Fraction(
                                        values0[right] - values0[left],
                                        denominator_cross,
                                    )
                                    if 0 < crossing < 1:
                                        candidates.add(crossing)
                        for t in sorted(candidates):
                            values = tuple(
                                left + t * (right - left)
                                for left, right in zip(values0, values1)
                            )
                            best = max(values)
                            assert best >= 0, (N, h, d, R, W, t, ycap, values)
                            y_candidates += 1
                            zero += best == 0
                            positive += best > 0
                            label = f"{N}|{h}|{d}|{R}|{W}|{t}|{ycap}"
                            stream.update(f"{label}|{best}|{values}\n".encode())
                            if minimum is None or best < minimum:
                                minimum = best
                                witness = label

    assert positive > 0 and zero == 0
    report = {
        "schema": "terminal-q3-m1-forest-j3-exact-u1-finite-relaxation-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_FOREST_M1_J3_COMBINED_RELAXATION_N13_TO_30",
        "claim": (
            "For every integer structural cell 13<=N<=30, every integer W "
            "in the correlated wedge interval, and every real y in the "
            "combined valid cap interval, at least one of the coupled, "
            "component-count, and root-neighbor four-set exact-U1 lower "
            "bounds is nonnegative."
        ),
        "coverage": {
            "minimum_N": 13,
            "maximum_N": max_N,
            "structural_cells": structural_cells,
            "supported_integer_W_cells": supported_w_cells,
            "endpoint_or_crossing_y_candidates": y_candidates,
            "positive_candidates": positive,
            "zero_candidates": zero,
            "minimum_positive": str(minimum),
            "minimum_witness": witness,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "polynomial_terms": {
            "coupled_exact_U1": coupled_terms,
            "component_exact_U1": component_terms,
        },
        "dependencies": PINS,
        "scope": (
            "This is an exact finite parameter proof, stronger than a graph "
            "census, but only through N=30. An all-order N>=31 cone, forest "
            "m0, final assembly, unimodality, and Erdos Problem 993 remain open."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
