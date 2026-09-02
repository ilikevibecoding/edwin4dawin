#!/usr/bin/env python3
"""Independent manual-power audit of the 30 low-surplus strong-Q5 cells."""

from __future__ import annotations

import hashlib
import json
import math
import os
import time
from fractions import Fraction
from pathlib import Path

import numpy as np
from flint import fmpq

from audit_rank8_delta2_n28_strong_q5_surplus_root import (
    DEGREES,
    bernstein_axis,
    convolve,
    linear_power,
    minimum_with_index,
    rational,
)


HERE = Path(__file__).resolve().parent
SPARSE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
PRIMARY = HERE / "rank8_delta2_orders29_34_surplus1_5_strong_q5_exact_root_20260826.json"
OUTPUT = HERE / "rank8_delta2_orders29_34_surplus1_5_strong_q5_independent_audit_root_20260826.json"
TAU_UPPER = {1: 3, 2: 7, 3: 11, 4: 15, 5: 20}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_cell(order: int, excess: int, terms):
    N = fmpq(math.comb(order - 2, 3) + excess)
    tau_low = Fraction(excess)
    tau_width = Fraction(TAU_UPPER[excess]) - tau_low
    D_constant = Fraction(math.comb(order - 3, 4) + (order - 4) * excess) - tau_low
    D_slope = -tau_width
    D_linear = (
        fmpq(D_constant.numerator, D_constant.denominator),
        fmpq(D_slope.numerator, D_slope.denominator),
    )
    g_factor = Fraction(1688, 715)
    G_constant = g_factor * D_constant - Fraction(int(N))
    G_slope = g_factor * D_slope
    P_constant = 40 * D_constant - 173 * Fraction(int(N))
    P_slope = 40 * D_slope
    Q_constant = 5 * G_constant
    Q_slope = 5 * G_slope
    P_linear = (
        fmpq(P_constant.numerator, P_constant.denominator),
        fmpq(P_slope.numerator, P_slope.denominator),
    )
    Q_linear = (
        fmpq(Q_constant.numerator, Q_constant.denominator),
        fmpq(Q_slope.numerator, Q_slope.denominator),
    )
    for constant, slope in (D_linear, P_linear, Q_linear):
        assert constant > 0 and constant + slope > 0

    D_powers = [linear_power(*D_linear, power) for power in range(13)]
    P_powers = [linear_power(*P_linear, power) for power in range(13)]
    Q_powers = [linear_power(*Q_linear, power) for power in range(13)]
    Z_powers = [
        linear_power(fmpq(order - 19), fmpq(7), power)
        for power in range(3)
    ]
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
        scalar *= fmpq(order - 12) ** (2 - z_power)
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
        "order": order,
        "degree_surplus": excess,
        "mapped_degrees": list(DEGREES),
        "Bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": list(index),
        "negative_coefficients": int(negative),
    }


def main() -> int:
    started = time.perf_counter()
    sparse = json.loads(SPARSE.read_text(encoding="utf-8"))
    assert sparse["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"
    terms = [
        (tuple(int(value) for value in monomial), rational(coefficient))
        for monomial, coefficient in sparse["numerator_terms"]
    ]
    assert len(terms) == 5703
    rows = []
    for order in range(29, 35):
        for excess in range(1, 6):
            row = build_cell(order, excess, terms)
            assert row["negative_coefficients"] == 0
            rows.append(row)
            print("AUDIT_PASS", order, excess, row["minimum"], flush=True)

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA2_ORDERS29_TO34_SURPLUS1_TO5_STRONG_Q5"
    primary_rows = {
        (row["order"], row["degree_surplus"]): row
        for row in primary["cells"]
    }
    assert len(rows) == len(primary_rows) == 30
    for row in rows:
        producer = primary_rows[(row["order"], row["degree_surplus"])]
        assert row["mapped_degrees"] == producer["mapped_degrees"]
        assert row["Bernstein_coefficients"] == producer["initial_Bernstein_coefficients"]
        assert row["minimum"] == producer["initial_minimum"]
        assert row["minimum_index"] == producer["initial_minimum_index"]
        assert producer["terminal_patches"] == 1 and producer["maximum_depth"] == 0

    payload = {
        "schema": "rank8-delta2-orders29-34-surplus1-5-strong-q5-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA2_ORDERS29_TO34_SURPLUS1_TO5_STRONG_Q5_AUDIT",
        "method": (
            "Each of 30 cells was reconstructed from the pinned 5,703-term "
            "source into an exact power tensor by manual linear-factor "
            "convolution, followed by the defining Bernstein sum. This "
            "imports neither the producer nor its FLINT matrix transform."
        ),
        "coverage": {
            "orders": [29, 34],
            "degree_surpluses": [1, 5],
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
            PRIMARY.name: sha256(PRIMARY),
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
