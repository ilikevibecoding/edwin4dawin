#!/usr/bin/env python3
"""Exact repeated-q tail diagnostic for the two open sum>=2 OR boxes."""

from __future__ import annotations

import gc
import json

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_or_axis_rank7_g4_piecewise import (
    minimum,
    split_axis_fast,
)
from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    bernstein_controls,
)


FLOORS = ("incidence", "shadow", "strong")
DEPTH = 10


def high_omega_leaves(array):
    discarded, current = split_axis_fast(array, 0)
    del discarded, array
    discarded, replacement = split_axis_fast(current, 3)
    del discarded, current
    current = replacement
    discarded, replacement = split_axis_fast(current, 0)
    del discarded, current
    current = replacement
    omega_left, omega_right = split_axis_fast(current, 4)
    del current
    gc.collect()
    return {"omegaL": omega_left, "omegaR": omega_right}


def main():
    polynomials = build_polynomials(endpoint_pairs=((0, 0),))
    report = {label: {"bands": [{} for _ in range(DEPTH)], "tail": {}}
              for label in ("omegaL", "omegaR")}
    for floor in FLOORS:
        print("CONTROLS", floor, flush=True)
        polynomial = polynomials.pop((0, 0, floor))
        controls, _scale, _digest = bernstein_controls(polynomial)
        del polynomial
        leaves = high_omega_leaves(controls)
        del controls
        gc.collect()
        for label in ("omegaL", "omegaR"):
            current = leaves.pop(label)
            for depth in range(DEPTH):
                left, right = split_axis_fast(current, 0)
                report[label]["bands"][depth][floor] = str(minimum(left))
                print("BAND", floor, label, depth + 1,
                      report[label]["bands"][depth][floor], flush=True)
                del left, current
                current = right
                gc.collect()
            report[label]["tail"][floor] = {
                "minimum": str(minimum(current)),
                "terminal_q_face_minimum": str(minimum(current[-1])),
            }
            del current
            gc.collect()
    for label in report:
        for band in report[label]["bands"]:
            band["passing"] = [
                floor for floor in FLOORS if int(band[floor]) >= 0
            ]
        report[label]["tail"]["passing"] = [
            floor for floor in FLOORS
            if int(report[label]["tail"][floor]["minimum"]) >= 0
        ]
        report[label]["tail"]["terminal_passing"] = [
            floor for floor in FLOORS
            if int(report[label]["tail"][floor]["terminal_q_face_minimum"]) >= 0
        ]
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
