"""Evaluate both orientation pairs at an R=0 point in the slow interior cell."""

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

    arrays = {}
    metadata = {}
    for name, poly in (("R", fr), ("A0", fa0), ("A1", fa1), ("N0", fn0), ("N1", fn1)):
        arrays[name], orders, degrees, terms, depth = normalized_local_controls(poly, address)
        metadata[name] = {"orders": orders, "degrees": degrees, "terms": terms}

    def diagonal(name, parameter):
        return evaluate_bernstein(arrays[name], [parameter] * 5)

    root = brentq(lambda parameter: diagonal("R", parameter), 0.0, 0.5, xtol=1e-14)
    report = {
        "address": address,
        "diagonal_root_local_parameter": root,
        "values_at_root_scaled_independently": {
            name: diagonal(name, root) for name in arrays
        },
        "signs_at_root": {
            name: (1 if diagonal(name, root) > 0 else -1 if diagonal(name, root) < 0 else 0)
            for name in arrays
        },
        "R_at_lower_corner": diagonal("R", 0.0),
        "R_at_midpoint": diagonal("R", 0.5),
        "metadata": metadata,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
