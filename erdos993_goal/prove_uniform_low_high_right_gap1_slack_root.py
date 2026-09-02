#!/usr/bin/env python3
"""Assemble the all-rank right gap-1 strong-boundary theorem."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_exact_root_20260827.json"
DEPENDENCIES = {
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json":
        "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
    "explore_uniform_low_high_right_gap1_slack_symbolic_fast_root.py":
        "EE631E3E3D1E4D210E951F7BB81D6C27BCAF4DBA6D7BA39FF8A301DC709D3D5B",
    "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json":
        "01EED7B84E2701F40893FE5520A206A7109E7DC08899122063E5DBADFD58E5BF",
    "prove_uniform_low_high_right_gap1_left_payments_root.py":
        "54DD1B0AD13A546ABA7B883151CB6A235F602D1D4927629969050D8E7E0A5A9F",
    "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json":
        "A6E1ACAA021464FD4664E7920C5F833D914BF560C59CA35B953389CC4A4AE431",
    "prove_uniform_low_high_right_gap1_right_payments_root.py":
        "0614B267C6D40EDCF7A1F8990CE2D3F62AD46CC8A7A0D40D3EE6F1FC02BBF75B",
    "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json":
        "EDD5C780AEAAC98E98AE874213473AFA2D22F0B170DE1B8BAAAE78ECC2EF5309",
}
CACHES = {
    "s1": ("uniform_low_high_right_gap1_s1_product_coefficients_root.pkl", "DD96A7CF6135E771BB94AE367DADE60DE3DACE19F660FDF7E563A09F9C262807"),
    "s2": ("uniform_low_high_right_gap1_s2_product_coefficients_root.pkl", "7C6262B39B392782810510E6D8DC2570E973AEAF542E6E6EAD39E568EAC778D8"),
    "s3": ("uniform_low_high_right_gap1_s3_product_coefficients_root.pkl", "A0347E38E31C3FE3507DDCC010F397DF5F8C72BC566A3802571A33629F1EA726"),
    "s4": ("uniform_low_high_right_gap1_s4_product_coefficients_root.pkl", "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_row(rank: int, terminal: int, gap1_slack: int = 0):
    ratios = [
        terminal + rank + 1 + gap1_slack,
        terminal + rank - 1 + gap1_slack,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def margin(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def direct_strong(rank: int, x: int, y: int, slack: int):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, slack)
    tail = [0, 0, 0, *left[3:]]
    c = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    v = [convolution(tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * margin(c) + polar(c, v)


def power_coefficients(values):
    differences = [list(map(Fraction, values))]
    while len(differences[-1]) > 1:
        previous = differences[-1]
        differences.append([
            previous[index + 1] - previous[index]
            for index in range(len(previous) - 1)
        ])
    d0, d1, d2, d3, d4 = (row[0] for row in differences)
    return [
        d0,
        d1 - d2 / 2 + d3 / 3 - d4 / 4,
        d2 / 2 - d3 / 2 + 11 * d4 / 24,
        d3 / 6 - d4 / 4,
        d4 / 24,
    ]


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    zero = json.loads((HERE / next(iter(DEPENDENCIES))).read_text(encoding="utf-8"))
    left = json.loads((HERE / "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    right = json.loads((HERE / "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    probe = json.loads((HERE / "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json").read_text(encoding="utf-8"))
    assert zero["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"
    assert left["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_LEFT_PRODUCT_PAYMENTS"
    assert right["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_RIGHT_PRODUCT_PAYMENTS"
    assert probe["status"] == "PASS_EXACT_RIGHT_GAP1_SLACK_MEMORY_LEAN_COEFFICIENT_PROBE"

    rows = {}
    cache_hashes = {}
    for label, (name, expected) in CACHES.items():
        path = HERE / name
        assert sha256(path) == expected
        cache_hashes[name] = expected
        with path.open("rb") as stream:
            rows[label] = pickle.load(stream)
        assert set(rows[label]) == {
            ("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"),
        }
        assert rows[label][("T", "T")] == 0

    symbols = {
        str(symbol): symbol
        for expression in rows["s1"].values()
        for symbol in expression.free_symbols
    }
    k_symbol, x_symbol, y_symbol = symbols["k"], symbols["x"], symbols["y"]
    checks = []
    for rank, x, y in (
        (8, 0, 0), (8, 3, 11), (9, 17, 2),
        (13, 0, 47), (16, 29, 5), (20, 7, 31),
    ):
        values = [direct_strong(rank, x, y, slack) for slack in range(5)]
        coefficients = power_coefficients(values)
        assert all(coefficient > 0 for coefficient in coefficients)
        N, M = rank + x, rank + y
        D = M**2 - 1
        products = {
            "T": math.prod(x + y + rank + j for j in range(2, rank + 1)),
            "L": math.prod(x + j for j in range(2, rank + 1)),
            "R": math.prod(y + j for j in range(2, rank + 1)),
        }
        substitutions = {k_symbol: rank, x_symbol: x, y_symbol: y}
        for degree in range(1, 5):
            label = f"s{degree}"
            reconstructed = sum(
                expression.subs(substitutions)
                * products[first] * products[second]
                for (first, second), expression in rows[label].items()
            )
            rescaling = D if degree == 1 else D**2
            assert Fraction(reconstructed) == coefficients[degree] * (N * M) ** 2 * rescaling
        assert direct_strong(rank, x, y, 5) == sum(
            coefficient * 5**degree
            for degree, coefficient in enumerate(coefficients)
        )
        checks.append({
            "rank": rank, "x": x, "y": y,
            "power_coefficients": [str(value) for value in coefficients],
        })

    payload = {
        "schema": "uniform-low-high-right-gap1-slack-root-v1",
        "status": "PASS_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_STRONG_BOUNDARY",
        "theorem": (
            "For every integer k>=8 and real x,y,s>=0, with left ratios "
            "(x+k+1,x+k-1,...,x) and right ratios "
            "(y+k+1+s,y+k-1+s,y+k-2,...,y), the complete strong auxiliary "
            "(x+k-2)M(c)+B(c,v) is strictly positive."
        ),
        "quartic_reduction": {
            "D": "(y+k)^2-1>0",
            "rescaling": "(NM)^2*D*H1 and (NM)^2*D^2*Hj for j=2,3,4",
            "five_product_form": (
                "T*L*alpha+T*R*beta+L^2*epsilon-L*R*gamma-R^2*delta"
            ),
            "constant_term": "strictly positive by the independent zero-slack audit",
            "positive_coefficients": (
                "each Hj, j=1..4, is the sum of the independently certified "
                "left and right product payments"
            ),
        },
        "direct_exact_reconstruction_checks": checks,
        "dependencies": dependency_hashes,
        "cache_sha256": cache_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the second ordinary right-row gap coordinate on the "
            "translated low/high boundary.  Other gap coordinates and the full "
            "Erdos conjecture remain separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CHECKS", len(checks))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
