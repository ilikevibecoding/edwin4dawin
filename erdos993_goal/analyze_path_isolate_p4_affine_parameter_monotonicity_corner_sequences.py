#!/usr/bin/env python3
"""Guess hypergeometric forms for minimal-boundary corner coefficients."""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

import sympy as sp

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)


@functools.cache
def choose(n, k):
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def coefficient(case, direction, s, t):
    package, parity, coordinate, c_value, m_value, x_value = case
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    lower = (
        3 * (m_value + int(direction == "m"))
        + 5
        + int(coordinate == "m")
    )
    u, v = lower + s, lower + t
    core = aligned_core(case, direction, 40)
    total = 0
    for k in range(b + 1):
        for j in range(r + 1):
            local = sum(
                value
                * choose(a + b - k, v - pw - b + k - j)
                * choose(a + k + r - j, u - pz - k)
                for (pz, pw), value in core.items()
            )
            total += choose(b, k) * choose(r, j) * local
    return total


def guess_ratio(values):
    variable = sp.symbols("m")
    data = [
        (sp.Integer(m), sp.Rational(next_value, value))
        for (m, value), (_, next_value) in zip(values, values[1:])
        if value
    ]
    for total_degree in range(1, 17):
        for numerator_degree in range(total_degree + 1):
            count = total_degree + 1
            if len(data) <= count:
                continue
            candidate = sp.cancel(
                sp.rational_interpolate(
                    data[:count], numerator_degree, X=variable
                )
            )
            if all(sp.cancel(candidate.subs(variable, point) - value) == 0 for point, value in data):
                numerator, denominator = map(sp.factor, sp.fraction(candidate))
                return {
                    "total_degree": total_degree,
                    "numerator": str(numerator),
                    "denominator": str(denominator),
                }
    return None


def guess_polynomial_recurrence(values):
    for order in range(1, 5):
        for degree in range(0, 8):
            unknowns = (order + 1) * (degree + 1)
            if len(values) - order < unknowns + 2:
                continue
            rows = []
            for start in range(len(values) - order):
                n = values[start][0]
                row = []
                for shift in range(order + 1):
                    value = values[start + shift][1]
                    row.extend(value * n**power for power in range(degree + 1))
                rows.append(row)
            nullspace = sp.Matrix(rows).nullspace()
            if nullspace:
                vector = nullspace[0]
                denominators = [item.q for item in vector]
                scale = sp.ilcm(*denominators)
                integers = [int(item * scale) for item in vector]
                common = abs(math.gcd(*integers))
                integers = [item // common for item in integers]
                return {
                    "order": order,
                    "degree": degree,
                    "coefficients_by_shift_low_to_high_degree": [
                        integers[index * (degree + 1):(index + 1) * (degree + 1)]
                        for index in range(order + 1)
                    ],
                }
    return None


def main():
    requested = [
        ("group", 0, "m", "m"),
        ("bottom", 1, "x", "m"),
    ]
    offsets = [(0, 0)]
    records = []
    for package, parity, coordinate, direction in requested:
        for s, t in offsets:
            values = []
            for m_value in range(3, 31):
                case = (
                    package, parity, coordinate,
                    1 if package == "group" else 0,
                    m_value, 0,
                )
                value = coefficient(case, direction, s, t)
                values.append((m_value, value))
                print(package, s, t, m_value, value, flush=True)
            record = {
                "package": package,
                "parity": parity,
                "coordinate": coordinate,
                "ambient_direction": direction,
                "offset": [s, t],
                "values": [{"m": m_value, "value": value} for m_value, value in values],
                "hypergeometric_ratio_guess": guess_ratio(values),
                "polynomial_recurrence_guess": guess_polynomial_recurrence(values),
            }
            records.append(record)
            print(json.dumps({key: value for key, value in record.items() if key != "values"}, indent=2), flush=True)
    report = {"status": "ANALYSIS", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "corner_sequences_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
