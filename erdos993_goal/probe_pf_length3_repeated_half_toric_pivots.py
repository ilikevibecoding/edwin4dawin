"""Stably evaluate both affine collision-row pivots at the singularity."""

from __future__ import annotations

import json
from fractions import Fraction

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
        for _ in range(value.shape[0] - 1):
            value = (1.0 - coordinate) * value[:-1] + coordinate * value[1:]
        value = value[0]
    return float(value)


def local(poly, address):
    transformed, _ = compactified(remove_positive_content(poly)[0], "q_dominant", -1, "branch")
    transformed, a_order = strip_common_axis(transformed, 0)
    transformed, x_order = strip_common_axis(transformed, 1)
    power, degrees, terms = integer_power_array(transformed)
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
    source = build("odd", return_polynomials=True, include_alternate=True)
    records = {}
    for name, key in (
        ("P0", "constant0"),
        ("S0", "slope0"),
        ("P1", "constant1"),
        ("S1", "slope1"),
    ):
        controls, orders, degrees, terms, depth = local(source[key], address)
        value = evaluate_bernstein(controls, point)
        records[name] = {
            "scaled_value": value,
            "sign": 1 if value > 0 else -1 if value < 0 else 0,
            "orders": orders,
            "degrees": degrees,
            "terms": terms,
            "depth": depth,
        }
    print(json.dumps({"address": address, "local_point": point.tolist(), "records": records}, indent=2))


if __name__ == "__main__":
    main()
