#!/usr/bin/env python3
"""Close the 19 finite mask-0 diagonal cells by exact Bernstein boxes."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_agent.py":
        "622D1A2E3AE8525DE1516904544AE319CF3FCB3FFF2308C9403081F5CAEF971E",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json":
        "8551E3E7FDDC6EDBA78C4F68A300A6525CDD539BE957DE15033F2FFDED3FA753",
    "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_independent_audit_agent_20260823.json":
        "6E6872E615F74D207C2D6F3D192CDBB0D799437C15AE40DD7E2352F6BD83E232",
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
    "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json":
        "91E071946534CA6AF36ED4F121639F895F2A9E3F3D405E048EB64858D692D196",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json":
        "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
    "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py":
        "10CF82012DA64D69B216F3580DE8923F5D9F89C1C63D061A7D21BBC8DC76A27B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap(N: int, r: int) -> int:
    m = N - r
    return sum(
        choose(m - j + 1, j) * choose(r - j, 5 - j)
        for j in range(5)
    )


def d6_edge_concentration_upper(N: int, m: int) -> int:
    # For every N-vertex graph with m<=N-1 edges,
    # i_k <= C(N-1,k)+C(N-m-1,k-1).  Induct on m at a vertex of degree d:
    # the two recursive binomial terms lie symmetrically inside the two
    # displayed endpoint arguments, so discrete convexity of C(x,k-1)
    # completes the induction.  Here N-m=r.
    return choose(N - 1, 6) + choose(N - m - 1, 5)


def t_bounds(m: int, forest16_sharp: bool) -> tuple[Fraction, Fraction]:
    lower = Fraction(6, m - 5)
    selected_upper = Fraction(6 * m, m * m - 15 * m + 10)
    upper = min(selected_upper, Fraction(12, 7)) if forest16_sharp else selected_upper
    assert lower <= upper
    return lower, upper


def clear_cell(base, N_value: int, r_value: int, forest16_sharp: bool):
    m = N_value - r_value
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    q6_denominator = N_value * N_value - 15 * N_value + 10
    x_denominator = (N_value - 5) * q6_denominator
    x_numerator = 6 * q6_denominator + 60 * (N_value - 1) * X
    upper_d6 = d6_edge_concentration_upper(N_value, m)
    y_denominator = x_denominator * upper_d6
    y_numerator = x_numerator * upper_d6 - gap(N_value, r_value) * x_denominator

    lower_t, upper_t = t_bounds(m, forest16_sharp)
    t_denominator = math.lcm(lower_t.denominator, upper_t.denominator)
    lower_integer = lower_t.numerator * (t_denominator // lower_t.denominator)
    upper_integer = upper_t.numerator * (t_denominator // upper_t.denominator)
    t_numerator = lower_integer + (upper_integer - lower_integer) * T
    z_numerator = y_numerator * t_denominator
    z_denominator = y_denominator * t_numerator

    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N_value**np
        term *= x_numerator**xp * x_denominator ** (1 - xp)
        term *= (y_numerator * V) ** yp * y_denominator ** (2 - yp)
        term *= (z_numerator * V) ** zp * z_denominator ** (4 - zp)
        answer += term
    return answer, {
        "x_lower": f"6/{N_value - 5}",
        "x_upper": f"{6 * N_value}/{q6_denominator}",
        "gap": gap(N_value, r_value),
        "d6_edge_concentration_upper": upper_d6,
        "t_lower": str(lower_t),
        "t_upper": str(upper_t),
        "forest16_ratio_used": forest16_sharp,
    }


def bernstein(cleared):
    power = cleared.to_dict()
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    scales = []
    for degree in degrees:
        scale = 1
        for exponent in range(degree + 1):
            scale = math.lcm(scale, math.comb(degree, exponent))
        scales.append(scale)
    rows = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = 1
            for a, b, degree, scale in zip(source, target, degrees, scales):
                weight *= math.comb(b, a) * scale // math.comb(degree, a)
            value += int(coefficient) * weight
        rows[target] = value
    return degrees, rows


def sign_row(base, N: int, r: int, forest16_sharp: bool):
    cleared, bounds = clear_cell(base, N, r, forest16_sharp)
    degrees, blocks = bernstein(cleared)
    values = list(blocks.values())
    return {
        "degrees": [int(value) for value in degrees],
        "blocks": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "positive": sum(value > 0 for value in values),
        "minimum": str(min(values)),
        "negative_indices": [
            list(index) for index, value in sorted(blocks.items()) if value < 0
        ],
        "bounds": bounds,
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    registry = json.loads(
        (
            HERE
            / "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    cells = [tuple(cell) for cell in registry["open_cells"]]
    assert len(cells) == 19

    base = base_polynomial()
    rows = []
    for N, r in cells:
        m = N - r
        baseline = sign_row(base, N, r, False)
        enhanced = sign_row(base, N, r, m == 16)
        assert enhanced["negative"] == 0
        rows.append(
            {
                "N": N,
                "r": r,
                "m": m,
                "status": "SEALED_MASK0_DIAGONAL",
                "route": (
                    "EDGE_CONCENTRATION_D6_ONLY"
                    if baseline["negative"] == 0
                    else "EDGE_CONCENTRATION_D6_PLUS_FOREST16_12F6_GE_7F5"
                ),
                "baseline_selected_t": baseline,
                "final": enhanced,
            }
        )
    residual = [
        (row["N"], row["r"], row["m"])
        for row in rows
        if row["route"] != "EDGE_CONCENTRATION_D6_ONLY"
    ]
    assert residual == [(29, 13, 16), (30, 14, 16)]

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-19-diagonal-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_ALL_19_DIAGONAL_CELLS",
        "scope": (
            "The 19 previously open cells in 26<=N<=39, r>=10, m>=16, "
            "at the selected-lower c8/d7 mask0 endpoint."
        ),
        "exact_inputs": [
            "d5-f5>=sum_{j=0}^4 C(m-j+1,j)C(r-j,5-j)",
            "d6<=C(N-1,6)+C(r-1,5) by the edge-concentration induction for m=N-r<=N-1 edges",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
            "for m=16, the independently audited finite theorem f5/f6<=12/7",
        ],
        "counts": {
            "total": 19,
            "edge_concentration_d6_only": 17,
            "edge_concentration_plus_forest16_ratio": 2,
            "open": 0,
        },
        "forest16_ratio_residual_cells": [list(cell) for cell in residual],
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": (
            "This seals exactly the old 19-cell finite diagonal obstruction list "
            "for Delta0/new-leaf/mask0.  A complete mask0 theorem still requires "
            "an assembler for the other sealed partitions.  Masks1..3, q=v, "
            "Delta1..3, connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTAL 19 EDGE_CONCENTRATION_ONLY 17 RATIO 2 OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
