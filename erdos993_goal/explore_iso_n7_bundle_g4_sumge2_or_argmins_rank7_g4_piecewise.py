#!/usr/bin/env python3
"""Locate the obstructing exact Bernstein controls for the sum>=2 floor OR."""

from __future__ import annotations

import itertools
import json

import numpy as np

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    bernstein_controls,
    split_axis,
)


VARIABLES = ("q", "a", "b", "c", "omega", "tau", "eA", "eB", "eZ")


def minimum_with_index(array):
    index = min(np.ndindex(array.shape), key=lambda item: int(array[item]))
    return int(array[index]), index


def frozen_leaves(array):
    q_left, q_right = split_axis(array, 0)
    c_left, c_right = split_axis(q_right, 3)
    q2_left, q2_right = split_axis(c_right, 0)
    omega_left, omega_right = split_axis(q2_right, 4)
    return {
        "qL": q_left,
        "qR_cL": c_left,
        "qR_cR_qL": q2_left,
        "qR_cR_qR_omegaL": omega_left,
        "qR_cR_qR_omegaR": omega_right,
    }


def main():
    polynomials = build_polynomials()
    report = {}
    for endpoint_pair in itertools.product((0, 1), repeat=2):
        branch = {}
        for floor in ("incidence", "shadow", "strong"):
            key = (*endpoint_pair, floor)
            print("CONTROLS", key, flush=True)
            controls, _scale, _digest = bernstein_controls(polynomials[key])
            leaves = frozen_leaves(controls)
            branch[floor] = {
                label: {
                    "minimum": str(minimum_with_index(array)[0]),
                    "index": list(minimum_with_index(array)[1]),
                    "coordinates": {
                        variable: f"{index}/{array.shape[axis] - 1}"
                        for axis, (variable, index) in enumerate(
                            zip(VARIABLES, minimum_with_index(array)[1])
                        )
                    },
                }
                for label, array in leaves.items()
            }
        report[str(endpoint_pair)] = branch
        print(json.dumps({str(endpoint_pair): branch}, sort_keys=True), flush=True)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
