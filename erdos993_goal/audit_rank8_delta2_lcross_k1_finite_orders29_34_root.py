#!/usr/bin/env python3
"""Independent exact audit of the finite n=29..34 lower-cross cells.

The audit expands the five-dimensional power tensor directly from sparse
monomials using a local bivariate polynomial implementation.  It then applies
the defining power-to-Bernstein sum axis by axis.  It imports neither finite
cell producer nor its FLINT polynomial/Bernstein engine.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import numpy as np
from flint import fmpq


HERE = Path(__file__).resolve().parent
SPARSE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
BATCH = HERE / "rank8_delta2_lcross_k1_finite_orders_batch_exact_root_20260826.json"
OUTPUT = HERE / "rank8_delta2_lcross_k1_finite_orders29_34_independent_audit_root_20260826.json"
D4_FACTOR = fmpq(1688, 715)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def as_fmpq(value) -> fmpq:
    fraction = Fraction(str(value))
    return fmpq(fraction.numerator, fraction.denominator)


def poly_constant(value):
    value = as_fmpq(value)
    return {} if value == 0 else {(0, 0): value}


def poly_add(left, right, right_scale=fmpq(1)):
    output = dict(left)
    for monomial, coefficient in right.items():
        value = output.get(monomial, fmpq(0)) + right_scale * coefficient
        if value == 0:
            output.pop(monomial, None)
        else:
            output[monomial] = value
    return output


def poly_scale(polynomial, scalar):
    scalar = as_fmpq(scalar)
    if scalar == 0:
        return {}
    return {monomial: scalar * coefficient for monomial, coefficient in polynomial.items()}


def poly_shift_a(polynomial):
    return {(b_degree, a_degree + 1): coefficient for (b_degree, a_degree), coefficient in polynomial.items()}


def poly_multiply(left, right):
    output = defaultdict(lambda: fmpq(0))
    for (b1, a1), first in left.items():
        for (b2, a2), second in right.items():
            output[(b1 + b2, a1 + a2)] += first * second
    return {monomial: coefficient for monomial, coefficient in output.items() if coefficient != 0}


def power_table(polynomial, maximum):
    powers = [{(0, 0): fmpq(1)}]
    for _ in range(maximum):
        powers.append(poly_multiply(powers[-1], polynomial))
    return powers


def evaluate_bivariate(polynomial, B, A):
    B = as_fmpq(B)
    A = as_fmpq(A)
    return sum(
        (coefficient * B**b_degree * A**a_degree for (b_degree, a_degree), coefficient in polynomial.items()),
        fmpq(0),
    )


def bernstein_axis(coefficients, axis, degree):
    moved = np.moveaxis(coefficients, axis, 0)
    transformed = np.empty_like(moved)
    for index in range(degree + 1):
        value = np.empty(moved.shape[1:], dtype=object)
        value.fill(fmpq(0))
        for exponent in range(index + 1):
            value += moved[exponent] * fmpq(
                math.comb(index, exponent), math.comb(degree, exponent)
            )
        transformed[index] = value
    return np.moveaxis(transformed, 0, axis)


def minimum_with_index(coefficients):
    flat = min(range(coefficients.size), key=lambda index: coefficients.flat[index])
    return coefficients.flat[flat], tuple(int(value) for value in np.unravel_index(flat, coefficients.shape))


def build_geometry(order, branch):
    mass = Fraction(order - 2)
    if branch == "low":
        e_low, e_high = Fraction(6), mass / 2
        gamma = {}
        b_degree = 24
    else:
        e_low, e_high = mass / 2, Fraction(math.comb(order - 3, 2))
        b_degree = 48
    excess = {(0, 0): as_fmpq(e_low), (1, 0): as_fmpq(e_high - e_low)}
    if branch == "high":
        excess_squared = poly_multiply(excess, excess)
        gamma = poly_scale(
            poly_add(poly_scale(excess_squared, 2), poly_scale(excess, -mass)),
            Fraction(1, 3) / mass,
        )
    tau_low = poly_add(excess, gamma)
    tau_high = poly_scale(excess, Fraction(order - 1, 3))
    tau_width = poly_add(tau_high, tau_low, fmpq(-1))
    tau = poly_add(tau_low, poly_shift_a(tau_width))
    N = poly_add(poly_constant(math.comb(order - 2, 3)), excess)
    D = poly_add(
        poly_add(poly_constant(math.comb(order - 3, 4)), poly_scale(excess, order - 4)),
        tau,
        fmpq(-1),
    )
    G = poly_add(poly_scale(D, D4_FACTOR), N, fmpq(-1))
    for B in (0, 1):
        for A in (0, 1):
            assert evaluate_bivariate(N, B, A) > 0
            assert evaluate_bivariate(D, B, A) > 0
            assert evaluate_bivariate(G, B, A) > 0
    return e_low, e_high, b_degree, N, D, G


def source_groups(order, z_denominator, terms):
    aggregate = defaultdict(lambda: fmpq(0))
    c2 = fmpq(math.comb(order - 1, 2))
    for monomial, coefficient in terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        scalar = coefficient
        scalar *= fmpq(order) ** n_power
        scalar *= c2 ** w_power
        scalar *= fmpq(5) ** u_power
        scalar *= fmpq(z_denominator) ** (2 - z_power)
        aggregate[(x_power, u_power, v_power, z_power)] += scalar
    groups = defaultdict(list)
    for (x_power, u_power, v_power, z_power), scalar in aggregate.items():
        if scalar != 0:
            groups[(x_power, u_power)].append((v_power, z_power, scalar))
    return groups


def certify_cell(order, branch, terms):
    started = time.perf_counter()
    e_low, e_high, b_degree, N, D, G = build_geometry(order, branch)
    N_powers = power_table(N, 24)
    D_powers = power_table(D, 12)
    G_powers = power_table(G, 12)
    z_denominator = order - 12
    z_constant = order - 19
    Z_powers = [
        [fmpq(math.comb(power, exponent) * z_constant ** (power - exponent) * 7**exponent) for exponent in range(power + 1)]
        for power in range(3)
    ]
    groups = source_groups(order, z_denominator, terms)
    degrees = (b_degree, 24, 12, 8, 2)
    tensor = np.empty(tuple(degree + 1 for degree in degrees), dtype=object)
    tensor.fill(fmpq(0))
    for (x_power, u_power), entries in groups.items():
        base = poly_multiply(
            poly_multiply(N_powers[x_power + u_power], D_powers[12 - x_power]),
            G_powers[12 - u_power],
        )
        assert all(b <= b_degree and a <= 24 for b, a in base)
        for (b_power, a_power), base_coefficient in base.items():
            for v_power, z_power, scalar in entries:
                for z_index, z_coefficient in enumerate(Z_powers[z_power]):
                    tensor[b_power, a_power, u_power, v_power, z_index] += (
                        base_coefficient * scalar * z_coefficient
                    )
    bernstein = tensor
    for axis, degree in enumerate(degrees):
        bernstein = bernstein_axis(bernstein, axis, degree)
    minimum, index = minimum_with_index(bernstein)
    negative = sum(coefficient < 0 for coefficient in bernstein.flat)
    row = {
        "order": order,
        "branch": branch,
        "degree_surplus_interval": [str(e_low), str(e_high)],
        "mapped_degrees": list(degrees),
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": list(index),
        "negative_coefficients": int(negative),
        "elapsed_seconds": time.perf_counter() - started,
    }
    print("AUDIT_CELL", order, branch, minimum, index, "negative", negative, flush=True)
    return row


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--orders", nargs="+", type=int, default=list(range(29, 35)))
    parser.add_argument("--branches", nargs="+", choices=("low", "high"), default=["low", "high"])
    parser.add_argument("--test-only", action="store_true")
    args = parser.parse_args()
    assert len(args.orders) == len(set(args.orders)) and all(29 <= order <= 34 for order in args.orders)

    sparse = json.loads(SPARSE.read_text(encoding="utf-8"))
    terms = [
        (tuple(int(value) for value in monomial), as_fmpq(coefficient))
        for monomial, coefficient in sparse["numerator_terms"]
    ]
    assert len(terms) == 5703
    started = time.perf_counter()
    rows = [certify_cell(order, branch, terms) for order in args.orders for branch in args.branches]
    assert all(row["negative_coefficients"] == 0 for row in rows)
    if args.test_only:
        print("PASS_TEST_ONLY", len(rows))
        return 0

    assert args.orders == list(range(29, 35)) and args.branches == ["low", "high"]
    for row in rows:
        primary_path = HERE / (
            f"rank8_delta2_lcross_k1_finite_surplus_n{row['order']}_{row['branch']}_exact_root_20260826.json"
        )
        primary = json.loads(primary_path.read_text(encoding="utf-8"))
        assert primary["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_SURPLUS_CELL"
        assert row["mapped_degrees"] == primary["mapped_degrees"]
        assert row["bernstein_coefficients"] == primary["bernstein_coefficients"]
        assert row["minimum"] == primary["minimum"]
        assert row["minimum_index"] == primary["minimum_index"]

    batch = json.loads(BATCH.read_text(encoding="utf-8"))
    assert batch["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_ORDERS_BATCH"
    assert batch["orders"] == list(range(30, 35))
    artifacts = {
        SPARSE.name: sha256(SPARSE),
        BATCH.name: sha256(BATCH),
    }
    for order in range(29, 35):
        for branch in ("low", "high"):
            name = f"rank8_delta2_lcross_k1_finite_surplus_n{order}_{branch}_exact_root_20260826.json"
            artifacts[name] = sha256(HERE / name)
    payload = {
        "schema": "rank8-delta2-lcross-k1-finite-orders29-34-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_FINITE_ORDERS_29_TO_34_AUDIT",
        "method": (
            "All twelve five-dimensional cells were rebuilt from the pinned "
            "sparse source using a local exact bivariate power algebra and the "
            "defining axiswise Bernstein sum. No finite-cell producer, FLINT "
            "multivariate mapping, or matrix Bernstein engine was imported."
        ),
        "coverage": {
            "orders": [29, 34],
            "cells": len(rows),
            "negative_coefficients": 0,
            "matching_primary_minima": len(rows),
            "total_bernstein_coefficients": sum(row["bernstein_coefficients"] for row in rows),
        },
        "cells": rows,
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": artifacts,
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
