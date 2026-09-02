"""Sample orientation signs on the local R=0 sheet by radial crossings."""

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
    r_origin = evaluate_bernstein(arrays["R"], origin)
    assert r_origin > 0
    rng = np.random.default_rng(993)
    extrema = {
        name: {"minimum": float("inf"), "maximum": -float("inf"), "argmin": None}
        for name in ("A0", "A1", "N0", "N1")
    }
    crossings = 0
    attempted = 1000
    disagreement_counts = {"A": 0, "N": 0, "cross_pair": 0}
    product_minima = {"A": float("inf"), "N": float("inf"), "cross_pair": float("inf")}
    ratio_ranges = {
        "A1_over_A0": [float("inf"), -float("inf")],
        "N1_over_N0": [float("inf"), -float("inf")],
    }
    for _ in range(attempted):
        endpoint = rng.random(5)
        r_endpoint = evaluate_bernstein(arrays["R"], endpoint)
        if r_endpoint >= 0:
            continue
        root = brentq(
            lambda parameter: evaluate_bernstein(arrays["R"], parameter * endpoint),
            0.0,
            1.0,
            xtol=2e-13,
        )
        point = root * endpoint
        crossings += 1
        values = {name: evaluate_bernstein(arrays[name], point) for name in extrema}
        for name, value in values.items():
            extrema[name]["maximum"] = max(extrema[name]["maximum"], value)
            if value < extrema[name]["minimum"]:
                extrema[name]["minimum"] = value
                extrema[name]["argmin"] = [float(item) for item in point]
        products = {
            "A": values["A0"] * values["A1"],
            "N": values["N0"] * values["N1"],
            "cross_pair": values["A0"] * values["N0"],
        }
        for name, product in products.items():
            product_minima[name] = min(product_minima[name], product)
            if product < 0:
                disagreement_counts[name] += 1
        if abs(values["A0"]) > 1e-12:
            ratio = values["A1"] / values["A0"]
            ratio_ranges["A1_over_A0"][0] = min(ratio_ranges["A1_over_A0"][0], ratio)
            ratio_ranges["A1_over_A0"][1] = max(ratio_ranges["A1_over_A0"][1], ratio)
        if abs(values["N0"]) > 1e-12:
            ratio = values["N1"] / values["N0"]
            ratio_ranges["N1_over_N0"][0] = min(ratio_ranges["N1_over_N0"][0], ratio)
            ratio_ranges["N1_over_N0"][1] = max(ratio_ranges["N1_over_N0"][1], ratio)
    report = {
        "address": address,
        "attempted_rays": attempted,
        "crossing_rays": crossings,
        "R_at_origin": r_origin,
        "orientation_extrema_scaled_independently": extrema,
        "disagreement_counts": disagreement_counts,
        "scaled_product_minima": product_minima,
        "ratio_ranges_scaled_independently": ratio_ranges,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
