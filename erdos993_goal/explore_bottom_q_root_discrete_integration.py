#!/usr/bin/env python3
"""Search cumulative-sum transforms of the reciprocal-node pencil weights."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def root_forms(d: int):
    q = d - 1
    _, _, q0, q1, _ = homotopy_data(d)
    nodes = [sp.Rational(1, 4)] + [sp.Rational(1, 5 + index) for index in range(q - 1)]
    vandermonde = sp.Matrix(q, q, lambda power, column: nodes[column] ** power)
    form0 = sp.simplify(vandermonde.inv() * (q0 * reverse_identity(q)) * vandermonde.inv().T)
    form1 = sp.simplify(vandermonde.inv() * (q1 * reverse_identity(q)) * vandermonde.inv().T)
    return form0, form1


def minor_profile(matrix: sp.Matrix):
    positive = zero = negative = 0
    first_negative = None
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                determinant = sp.factor(matrix.extract(rows, columns).det())
                sign = sp.sign(determinant)
                positive += int(bool(sign == 1))
                zero += int(bool(sign == 0))
                negative += int(bool(sign == -1))
                if sign == -1 and first_negative is None:
                    first_negative = (rows, columns, determinant)
    return positive, zero, negative, first_negative


for d in range(4, 9):
    q = d - 1
    form0, form1 = root_forms(d)
    endpoint = sp.simplify(form0 + form1)
    lower_difference = sp.eye(q)
    upper_difference = sp.eye(q)
    for i in range(1, q):
        lower_difference[i, i - 1] = -1
        upper_difference[i - 1, i] = -1
    transforms = {
        "lower": lower_difference,
        "upper": upper_difference,
        "checker_lower": checker(q) * lower_difference * checker(q),
        "checker_upper": checker(q) * upper_difference * checker(q),
    }
    records = []
    for name, difference in transforms.items():
        inverse = difference.inv()
        current = endpoint
        for power in range(1, 4):
            current = sp.simplify(inverse.T * current * inverse)
            for orientation_name, oriented in (
                ("plain", current),
                ("checker", checker(q) * current * checker(q)),
                ("reverse", reverse_identity(q) * current * reverse_identity(q)),
                (
                    "checker_reverse",
                    checker(q) * reverse_identity(q) * current * reverse_identity(q) * checker(q),
                ),
            ):
                entry_negative = sum(int(bool(value < 0)) for value in oriented)
                if entry_negative == 0 and q <= 6:
                    profile = minor_profile(oriented)
                else:
                    profile = (None, None, None, None)
                records.append(
                    (
                        entry_negative,
                        profile[2] if profile[2] is not None else 999999,
                        name,
                        power,
                        orientation_name,
                        profile,
                    )
                )
    records.sort(key=lambda item: item[:2])
    print(f"d={d} best={records[:8]}", flush=True)
