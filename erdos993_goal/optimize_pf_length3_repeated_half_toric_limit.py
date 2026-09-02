"""Numerically maximize the exact local resultant with stable Bernstein evaluation."""

from __future__ import annotations

import itertools
import json
from fractions import Fraction

import numpy as np
from scipy.optimize import differential_evolution

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


def main():
    checkpoint = json.loads(
        open("two_pivot_frontier_alt_wave2.stdout.log", encoding="utf-8").read().splitlines()[-1]
    )
    address = checkpoint["current_address"]
    source = build("odd", return_polynomials=True, include_alternate=False)
    resultant = remove_positive_content(source["resultant"])[0]
    transformed, _ = compactified(resultant, "q_dominant", -1, "branch")
    transformed, a_order = strip_common_axis(transformed, 0)
    transformed, x_order = strip_common_axis(transformed, 1)
    power, degrees, terms = integer_power_array(transformed)
    controls = integer_power_to_bernstein_reduced(power)
    restricted, depth, _ = restrict_to_address(
        {"R": controls},
        (0, 0, 0, 0, 0),
        ((False, True), (False, True), (True, True), (True, True), (True, True)),
        address,
    )
    exact = restricted["R"]
    scale = max(abs(int(value)) for value in exact.flat)
    numeric = np.array(
        [float(Fraction(int(value), scale)) for value in exact.flat], dtype=float
    ).reshape(exact.shape)

    corners = []
    for corner in itertools.product((0.0, 1.0), repeat=5):
        corners.append((evaluate_bernstein(numeric, corner), corner))
    result = differential_evolution(
        lambda point: -evaluate_bernstein(numeric, point),
        bounds=[(0.0, 1.0)] * 5,
        seed=993,
        tol=1e-11,
        atol=1e-13,
        popsize=25,
        maxiter=1000,
        polish=True,
        workers=1,
        updating="immediate",
    )
    report = {
        "address": address,
        "removed_orders": [a_order, x_order],
        "degrees": list(degrees),
        "terms": terms,
        "local_depth": list(depth),
        "local_shape": list(exact.shape),
        "control_min_scaled": min(float(Fraction(int(value), scale)) for value in exact.flat),
        "control_max_scaled": max(float(Fraction(int(value), scale)) for value in exact.flat),
        "corner_max_scaled": max(corners)[0],
        "corner_argmax": list(max(corners)[1]),
        "optimized_max_scaled": -float(result.fun),
        "optimized_argmax_local": [float(value) for value in result.x],
        "optimizer_success": bool(result.success),
        "optimizer_message": str(result.message),
        "function_evaluations": int(result.nfev),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
