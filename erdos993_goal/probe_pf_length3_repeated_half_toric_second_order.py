"""Evaluate the second Riccati-flow orientations at the interior singularity."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import numpy as np

from certify_pf_length3_repeated_branch_core import (
    integer_power_array,
    integer_power_to_bernstein_reduced,
    strip_common_axis,
)
from certify_pf_length3_repeated_half_toric_core import compactified, restrict_to_address
from certify_pf_length3_repeated_positive_root_orientation import remove_positive_content
from verify_pf_length3_repeated_resultant_reduction import build


def evaluate_bernstein(array, point):
    value = array
    for coordinate in point:
        degree = value.shape[0] - 1
        for _ in range(degree):
            value = (1.0 - coordinate) * value[:-1] + coordinate * value[1:]
        value = value[0]
    return float(value)


def normalized_local_controls(poly, address):
    poly, a_order = strip_common_axis(poly, 0)
    poly, x_order = strip_common_axis(poly, 1)
    power, degrees, terms = integer_power_array(poly)
    controls = integer_power_to_bernstein_reduced(power)
    restricted, depth, _ = restrict_to_address(
        {"P": controls},
        (0, 0, 0, 0, 0),
        ((False, True), (False, True), (True, True), (True, True), (True, True)),
        address,
    )
    exact = restricted["P"]
    scale = max(abs(int(value)) for value in exact.flat)
    numeric = np.array(
        [float(Fraction(int(value), scale)) for value in exact.flat], dtype=float
    ).reshape(exact.shape)
    return numeric, [a_order, x_order], list(degrees), terms, list(depth)


def main():
    checkpoint = json.loads(
        open("two_pivot_frontier_alt_wave2.stdout.log", encoding="utf-8").read().splitlines()[-1]
    )
    address = checkpoint["current_address"]
    point = np.array(
        [
            0.05301413122466815,
            0.034562195258041425,
            0.05057951843313352,
            0.13995075023737746,
            0.13396179025056973,
        ]
    )
    source = build(
        "odd",
        return_polynomials=True,
        include_alternate=True,
        include_second=True,
    )
    records = {}
    for name in ("second_orientation0", "second_orientation1"):
        poly = remove_positive_content(source[name])[0]
        transformed, _ = compactified(poly, "q_dominant", -1, "branch")
        controls, orders, degrees, terms, depth = normalized_local_controls(transformed, address)
        value = evaluate_bernstein(controls, point)
        records[name] = {
            "scaled_value": value,
            "sign": 1 if value > 0 else -1 if value < 0 else 0,
            "orders": orders,
            "degrees": degrees,
            "terms": terms,
            "depth": depth,
        }
    report = {"address": address, "local_point": point.tolist(), "records": records}
    Path("pf_length3_repeated_half_toric_second_order_probe_20260808.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
