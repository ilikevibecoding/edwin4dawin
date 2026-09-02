#!/usr/bin/env python3
"""Independent symbolic identity/support audit for the final a2/a3 bridge."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    FULL_INTERIOR_POSITIONS,
    POWER_TO_BERNSTEIN_TIMES_2,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
EARLY_THEOREM = ROOT / "RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_THEOREM_2026-08-22.md"
FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
EXPECTED = {
    PROBE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    EARLY_THEOREM.name: "E3F0A34642D2BAF0CD0E15FD8D54BB604E9470749D02B4CA02024F04AEFC0999",
    FACTORED.name: "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cumulative_ratios(terminal, gaps):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    return ratios


def degrees(poly, *variables):
    built = sp.Poly(sp.expand(poly), *variables)
    return tuple(built.degree(variable) for variable in variables)


def main() -> None:
    assert {path.name: sha256(path) for path in (
        PROBE, EARLY_THEOREM, FACTORED,
    )} == EXPECTED

    h, terminal, p, z = sp.symbols("h terminal P z", nonnegative=True)
    a0, a4, a5, a6, a7 = sp.symbols("a0 a4 a5 a6 a7", nonnegative=True)
    gaps = [
        2 * h + a0,
        h,
        h + (1 - z) * p,
        h + z * p,
        h + a4,
        h + a5,
        h + a6,
        h + a7,
    ]
    ratios = cumulative_ratios(terminal, gaps)
    coordinate_dependent_ratios = [
        index for index, ratio in enumerate(ratios)
        if sp.diff(ratio, z) != 0
    ]
    assert coordinate_dependent_ratios == [3]
    ratio_degrees = [sp.Poly(ratio, z).degree() for ratio in ratios]
    # A factor row is the product of a prefix of distinct cumulative ratios,
    # so its coordinate degree is the sum of the prefix degrees.  Computing
    # it this way avoids a large irrelevant symbolic expansion.
    factor_row_degrees = [0]
    for ratio_degree in ratio_degrees:
        factor_row_degrees.append(factor_row_degrees[-1] + ratio_degree)
    assert max(factor_row_degrees) == 1
    assert sp.expand(gaps[2].subs(z, 0)) == h + p
    assert sp.expand(gaps[3].subs(z, 0)) == h
    assert sp.expand(gaps[2].subs(z, 1)) == h
    assert sp.expand(gaps[3].subs(z, 1)) == h + p
    # Capacity is ratio 2, which sees the fixed total and no z.
    assert sp.diff(ratios[2], z) == 0

    # A convolution coefficient is affine on each side.  Products appearing
    # in the margin, derivative, and curvature are therefore tensor quadratic;
    # multiplication by the coordinate-independent capacity changes no degree.
    w = sp.symbols("w", nonnegative=True)
    l0, l1, r0, r1 = sp.symbols("l0 l1 r0 r1")
    l2, l3, r2, r3 = sp.symbols("l2 l3 r2 r3")
    first = (l0 + l1 * z) * (r0 + r1 * w)
    second = (l2 + l3 * z) * (r2 + r3 * w)
    generic_quadratic = sp.expand(first * second)
    assert degrees(generic_quadratic, z, w) == (2, 2)

    # Verify the integer power-to-Bernstein transform and its tensor factor 4.
    coefficients = {
        (i, j): sp.symbols(f"c{i}{j}")
        for i in range(3) for j in range(3)
    }
    power_polynomial = sum(
        coefficients[i, j] * z ** i * w ** j
        for i in range(3) for j in range(3)
    )
    transformed = {}
    for left_index in range(3):
        for right_index in range(3):
            transformed[left_index, right_index] = sum(
                POWER_TO_BERNSTEIN_TIMES_2[left_index][i]
                * POWER_TO_BERNSTEIN_TIMES_2[right_index][j]
                * coefficients[i, j]
                for i in range(3) for j in range(3)
            )
    basis_z = [
        math.comb(2, index) * z ** index * (1 - z) ** (2 - index)
        for index in range(3)
    ]
    basis_w = [
        math.comb(2, index) * w ** index * (1 - w) ** (2 - index)
        for index in range(3)
    ]
    reconstruction = sum(
        transformed[i, j] * basis_z[i] * basis_w[j]
        for i in range(3) for j in range(3)
    )
    assert sp.expand(reconstruction - 4 * power_polynomial) == 0
    assert transformed[0, 0] == 4 * coefficients[0, 0]
    assert transformed[2, 2] == 4 * sum(coefficients.values())

    assert set(FULL_INTERIOR_POSITIONS) == {
        (i, j) for i in range(3) for j in range(3)
    } - {(0, 0), (2, 2)}
    expansion_units = 0
    position_cells = 0
    by_region = {"both_positive": 0, "P_axis": 0, "Q_axis": 0}
    for p_exponent in range(10):
        for q_exponent in range(9):
            positions = required_positions(p_exponent, q_exponent)
            if not positions:
                assert (p_exponent, q_exponent) == (0, 0)
                continue
            expansion_units += 1
            position_cells += len(positions)
            if p_exponent and q_exponent:
                assert positions == FULL_INTERIOR_POSITIONS
                by_region["both_positive"] += len(positions)
            elif p_exponent:
                assert positions == ((1, 0),)
                by_region["P_axis"] += 1
            else:
                assert positions == ((0, 1),)
                by_region["Q_axis"] += 1
    assert expansion_units == 89
    assert by_region == {"both_positive": 504, "P_axis": 9, "Q_axis": 8}
    assert position_cells == 521

    payload = {
        "schema": "rank8-low-low-a23-redistribution-identity-support-agent-v1",
        "status": "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT",
        "coordinates": {
            "left": "P=a2+a3, a2=(1-z)P, a3=zP",
            "right": "Q=b2+b3, b2=(1-w)Q, b3=wQ",
        },
        "coordinate_dependent_cumulative_ratios": {"left": [3], "right": [3]},
        "factor_row_coordinate_degree": 1,
        "capacity_coordinate_degree": 0,
        "raw_auxiliary_redistribution_degree": [2, 2],
        "bernstein_transform": {
            "integer_rows": POWER_TO_BERNSTEIN_TIMES_2,
            "tensor_scaling": 4,
            "symbolic_reconstruction_verified": True,
            "known_corner_0_0": "four times the full-early/suffix45 face",
            "known_corner_2_2": "four times the a2=b2=0 gap0/suffix3 face",
        },
        "support": {
            "P_exponents": [0, 9],
            "Q_exponents": [0, 8],
            "argument": (
                "P or Q occurs in four cumulative ratios per factor row; "
                "two rows give degree 8 and the extra left capacity raises "
                "only P to degree 9."
            ),
        },
        "compressed_cell_universe": {
            "FLINT_expansion_units": expansion_units,
            "new_Bernstein_position_cells": position_cells,
            "by_region": by_region,
            "compression_factor": position_cells / expansion_units,
        },
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the exact reduction and finite support, not positivity "
            "of the 521 new Bernstein coefficients."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
