"""Locate an A0 sign change along the local resultant sheet."""

from __future__ import annotations

import json
from fractions import Fraction

import numpy as np
from scipy.optimize import brentq

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
    poly, _ = strip_common_axis(poly, 0)
    poly, _ = strip_common_axis(poly, 1)
    power, _, _ = integer_power_array(poly)
    controls = integer_power_to_bernstein_reduced(power)
    restricted, _, _ = restrict_to_address(
        {"P": controls},
        (0, 0, 0, 0, 0),
        ((False, True), (False, True), (True, True), (True, True), (True, True)),
        address,
    )
    exact = restricted["P"]
    scale = max(abs(int(value)) for value in exact.flat)
    return np.array(
        [float(Fraction(int(value), scale)) for value in exact.flat], dtype=float
    ).reshape(exact.shape)


def main():
    checkpoint = json.loads(
        open("two_pivot_frontier_alt_wave2.stdout.log", encoding="utf-8").read().splitlines()[-1]
    )
    address = checkpoint["current_address"]
    source = build("odd", return_polynomials=True, include_alternate=True)
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    n0 = remove_positive_content(source["alternate_orientation0"])[0]
    n1 = remove_positive_content(source["alternate_orientation1"])[0]

    fr, target_data = compactified(resultant, "q_dominant", -1, "branch")
    fm0, _ = compactified(m0, "q_dominant", -1, "branch")
    fm1, _ = compactified(m1, "q_dominant", -1, "branch")
    fn0, _ = compactified(n0, "q_dominant", -1, "branch")
    fn1, _ = compactified(n1, "q_dominant", -1, "branch")
    a, x, y, u, v, c, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (c + 1) ** 7 * fm1 + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    arrays = {
        name: normalized_local_controls(poly, address)
        for name, poly in (("R", fr), ("A0", fa0), ("A1", fa1), ("N0", fn0), ("N1", fn1))
    }

    origin = np.zeros(5)
    positive_endpoint = np.ones(5)
    negative_sheet_point = np.array(
        [
            0.05681887032652208,
            0.0062970186519366155,
            0.050152840997056164,
            0.29485345806810326,
            0.27845553924344546,
        ]
    )
    negative_endpoint = negative_sheet_point / max(negative_sheet_point)

    def sheet_point(interpolation):
        endpoint = (1.0 - interpolation) * positive_endpoint + interpolation * negative_endpoint
        assert evaluate_bernstein(arrays["R"], endpoint) < 0
        radial_root = brentq(
            lambda parameter: evaluate_bernstein(arrays["R"], parameter * endpoint),
            0.0,
            1.0,
            xtol=2e-14,
        )
        return radial_root * endpoint

    def orientation(interpolation, name):
        return evaluate_bernstein(arrays[name], sheet_point(interpolation))

    endpoint_values = {
        "positive": {name: evaluate_bernstein(array, sheet_point(0.0)) for name, array in arrays.items()},
        "negative": {name: evaluate_bernstein(array, sheet_point(1.0)) for name, array in arrays.items()},
    }
    crossing = brentq(lambda parameter: orientation(parameter, "A0"), 0.0, 1.0, xtol=2e-13)
    point = sheet_point(crossing)
    values = {name: evaluate_bernstein(array, point) for name, array in arrays.items()}
    report = {
        "address": address,
        "endpoint_values_scaled_independently": endpoint_values,
        "interpolation_at_A0_zero": crossing,
        "local_point": [float(value) for value in point],
        "values_at_A0_zero_scaled_independently": values,
        "signs_at_A0_zero": {
            name: 1 if value > 1e-10 else -1 if value < -1e-10 else 0
            for name, value in values.items()
        },
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
