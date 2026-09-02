#!/usr/bin/env python3
"""Independent sparse-power audit of the n=28 strong-Q5 Delta2 cells.

The primary engine constructs FLINT multivariate polynomials and applies a
matrix Bernstein transform.  This audit instead expands each substituted
source monomial into a four-axis power tensor by hand and applies the defining
power-to-Bernstein formula axis by axis.  All arithmetic is exact fmpq.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from fractions import Fraction
from pathlib import Path

import numpy as np
from flint import fmpq


HERE = Path(__file__).resolve().parent
SPARSE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
TAU = HERE / "tree_tau_branch_weight_upper_exact_root_20260826.json"
LOW = HERE / "rank8_delta2_n28_surplus1_39_strong_q5_exact_root_20260826.json"
HIGH = HERE / "rank8_delta2_n28_high_surplus_strong_q5_exact_root_20260826.json"
OUTPUT = HERE / "rank8_delta2_n28_strong_q5_surplus_independent_audit_root_20260826.json"
DEGREES = (24, 12, 8, 2)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rational(value) -> fmpq:
    fraction = Fraction(str(value))
    return fmpq(fraction.numerator, fraction.denominator)


def linear_power(constant: fmpq, slope: fmpq, power: int):
    return [
        fmpq(math.comb(power, exponent))
        * constant ** (power - exponent)
        * slope ** exponent
        for exponent in range(power + 1)
    ]


def convolve(left, right):
    output = [fmpq(0) for _ in range(len(left) + len(right) - 1)]
    for i, first in enumerate(left):
        for j, second in enumerate(right):
            output[i + j] += first * second
    return output


def bernstein_axis(coefficients, axis, degree):
    moved = np.moveaxis(coefficients, axis, 0)
    transformed = np.empty_like(moved)
    ratios = [
        [
            fmpq(math.comb(index, exponent), math.comb(degree, exponent))
            for exponent in range(index + 1)
        ]
        for index in range(degree + 1)
    ]
    for index in range(degree + 1):
        value = np.empty(moved.shape[1:], dtype=object)
        value.fill(fmpq(0))
        for exponent in range(index + 1):
            value += moved[exponent] * ratios[index][exponent]
        transformed[index] = value
    return np.moveaxis(transformed, 0, axis)


def minimum_with_index(coefficients):
    flat = min(range(coefficients.size), key=lambda index: coefficients.flat[index])
    return coefficients.flat[flat], tuple(int(value) for value in np.unravel_index(flat, coefficients.shape))


def build_cell(excess, tau_upper, terms):
    order = 28
    N = fmpq(math.comb(26, 3) + excess)
    gamma = max(Fraction(0), Fraction(excess * (2 * excess - 26), 78))
    tau_low = Fraction(excess) + gamma
    tau_width = Fraction(tau_upper) - tau_low
    assert tau_width >= 0

    D_constant = Fraction(math.comb(25, 4) + 24 * excess) - tau_low
    D_slope = -tau_width
    D_linear = (fmpq(D_constant.numerator, D_constant.denominator), fmpq(D_slope.numerator, D_slope.denominator))
    g_factor = Fraction(1688, 715)
    G_constant = g_factor * D_constant - Fraction(int(N))
    G_slope = g_factor * D_slope
    G_linear = (fmpq(G_constant.numerator, G_constant.denominator), fmpq(G_slope.numerator, G_slope.denominator))
    if excess <= 10:
        P_constant = 40 * D_constant - 173 * Fraction(int(N))
        P_slope = 40 * D_slope
        Q_constant = 5 * G_constant
        Q_slope = 5 * G_slope
    else:
        P_constant = Fraction(5 * int(N))
        P_slope = Fraction(0)
        Q_constant = G_constant
        Q_slope = G_slope
    P_linear = (fmpq(P_constant.numerator, P_constant.denominator), fmpq(P_slope.numerator, P_slope.denominator))
    Q_linear = (fmpq(Q_constant.numerator, Q_constant.denominator), fmpq(Q_slope.numerator, Q_slope.denominator))
    for constant, slope in (D_linear, P_linear, Q_linear):
        assert constant > 0 and constant + slope > 0

    D_powers = [linear_power(*D_linear, power) for power in range(13)]
    P_powers = [linear_power(*P_linear, power) for power in range(13)]
    Q_powers = [linear_power(*Q_linear, power) for power in range(13)]
    Z_powers = [linear_power(fmpq(9), fmpq(7), power) for power in range(3)]

    power_tensor = np.empty(tuple(degree + 1 for degree in DEGREES), dtype=object)
    power_tensor.fill(fmpq(0))
    for monomial, coefficient in terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        assert w_power == 0
        scalar = coefficient
        scalar *= fmpq(order) ** n_power
        scalar *= N ** x_power
        scalar *= fmpq(24) ** v_power
        scalar *= fmpq(25) ** (8 - v_power)
        scalar *= fmpq(16) ** (2 - z_power)
        a_polynomial = convolve(
            convolve(D_powers[12 - x_power], P_powers[u_power]),
            Q_powers[12 - u_power],
        )
        assert len(a_polynomial) <= 25
        for a_power, a_coefficient in enumerate(a_polynomial):
            if a_coefficient == 0:
                continue
            for z_index, z_coefficient in enumerate(Z_powers[z_power]):
                power_tensor[a_power, u_power, v_power, z_index] += (
                    scalar * a_coefficient * z_coefficient
                )

    bernstein = power_tensor
    for axis, degree in enumerate(DEGREES):
        bernstein = bernstein_axis(bernstein, axis, degree)
    minimum, index = minimum_with_index(bernstein)
    negative = sum(coefficient < 0 for coefficient in bernstein.flat)
    return {
        "degree_surplus": excess,
        "mapped_degrees": list(DEGREES),
        "Bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": list(index),
        "negative_coefficients": int(negative),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--excesses", nargs="*", type=int)
    parser.add_argument("--test-only", action="store_true")
    args = parser.parse_args()
    started = time.perf_counter()

    sparse = json.loads(SPARSE.read_text(encoding="utf-8"))
    assert sparse["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"
    terms = [
        (tuple(int(value) for value in monomial), rational(coefficient))
        for monomial, coefficient in sparse["numerator_terms"]
    ]
    assert len(terms) == 5703
    tau_report = json.loads(TAU.read_text(encoding="utf-8"))
    tau_table = {int(row["e"]): int(row["tau_upper"]) for row in tau_report["order28"]["table"]}
    expected = sorted(excess for excess in tau_table if 1 <= excess <= 300)
    assert len(expected) == 207 and expected[:39] == list(range(1, 40))
    excesses = args.excesses if args.excesses else expected
    assert excesses and len(excesses) == len(set(excesses))
    assert all(excess in expected for excess in excesses)

    rows = []
    for excess in excesses:
        row = build_cell(excess, tau_table[excess], terms)
        assert row["negative_coefficients"] == 0
        rows.append(row)
        print("AUDIT_PASS", excess, row["minimum"], flush=True)
    if args.test_only:
        print("PASS_TEST_ONLY", len(rows))
        return 0

    assert excesses == expected and len(rows) == 207
    low = json.loads(LOW.read_text(encoding="utf-8"))
    high = json.loads(HIGH.read_text(encoding="utf-8"))
    primary_rows = {row["degree_surplus"]: row for row in low["cells"] + high["cells"]}
    assert sorted(primary_rows) == expected
    for row in rows:
        primary = primary_rows[row["degree_surplus"]]
        assert row["mapped_degrees"] == primary["mapped_degrees"]
        assert row["Bernstein_coefficients"] == primary["initial_Bernstein_coefficients"]
        assert row["minimum"] == primary["initial_minimum"]
        assert row["minimum_index"] == primary["initial_minimum_index"]
        assert primary["terminal_patches"] == 1 and primary["maximum_depth"] == 0

    payload = {
        "schema": "rank8-delta2-n28-strong-q5-surplus-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA2_N28_STRONG_Q5_SURPLUS_1_TO_300_AUDIT",
        "method": (
            "Each of 207 realizable positive integer-surplus cells was reconstructed "
            "from the pinned 5,703-term source into an exact power tensor by "
            "manual linear-factor convolution. The defining tensor Bernstein "
            "sum was then applied axis by axis. Every coefficient is "
            "nonnegative and every minimum/index agrees with the primary "
            "FLINT matrix engine."
        ),
        "coverage": {
            "realizable_surpluses": expected,
            "cells": len(rows),
            "bernstein_coefficients_per_cell": 8775,
            "total_bernstein_coefficients": 8775 * len(rows),
            "negative_coefficients": 0,
            "matching_primary_minima": len(rows),
        },
        "cells": rows,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            SPARSE.name: sha256(SPARSE),
            TAU.name: sha256(TAU),
            LOW.name: sha256(LOW),
            HIGH.name: sha256(HIGH),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
