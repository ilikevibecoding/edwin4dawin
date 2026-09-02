#!/usr/bin/env python3
"""Greedy-axis diagnostics for the two open sum>=2 Bernstein OR leaves."""

from __future__ import annotations

import gc
import json
import math

import numpy as np

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)
from explore_iso_n7_bundle_g4_sumge2_reduced_bernstein_rank7_g4_piecewise import (
    bernstein_controls,
)


VARIABLES = ("q", "a", "b", "c", "omega", "tau", "eA", "eB", "eZ")
FLOORS = ("triple134",)


def minimum(array):
    return min(int(value) for value in array.flat)


def negative_count(array):
    return sum(int(value) < 0 for value in array.flat)


def split_axis_fast(array, axis):
    """Integer de Casteljau at one half, vectorized over all other axes."""
    degree = array.shape[axis] - 1
    moved = np.moveaxis(array, axis, 0)
    source = moved.reshape((degree + 1, -1))
    left = np.empty_like(source)
    right = np.empty_like(source)
    for index in range(degree + 1):
        left[index] = (1 << (degree - index)) * sum(
            math.comb(index, power) * source[power]
            for power in range(index + 1)
        )
        right[index] = (1 << index) * sum(
            math.comb(degree - index, power - index) * source[power]
            for power in range(index, degree + 1)
        )
    return (
        np.moveaxis(left.reshape(moved.shape), 0, axis),
        np.moveaxis(right.reshape(moved.shape), 0, axis),
    )


def open_leaves(array):
    discarded, q_right = split_axis_fast(array, 0)
    del discarded, array
    gc.collect()
    discarded, c_right = split_axis_fast(q_right, 3)
    del discarded, q_right
    gc.collect()
    discarded, q2_right = split_axis_fast(c_right, 0)
    del discarded, c_right
    gc.collect()
    omega_left, omega_right = split_axis_fast(q2_right, 4)
    del q2_right
    gc.collect()
    discarded, omega_left_q_right = split_axis_fast(omega_left, 0)
    del discarded, omega_left
    gc.collect()
    discarded, omega_right_q_right = split_axis_fast(omega_right, 0)
    del discarded, omega_right
    gc.collect()
    discarded, omega_left_q2_right = split_axis_fast(omega_left_q_right, 0)
    del discarded, omega_left_q_right
    gc.collect()
    discarded, omega_right_q2_right = split_axis_fast(omega_right_q_right, 0)
    del discarded, omega_right_q_right
    gc.collect()
    return {
        "omegaL_qRR": omega_left_q2_right,
        "omegaR_qRR": omega_right_q2_right,
    }


def child_report(arrays):
    minima = {floor: minimum(array) for floor, array in arrays.items()}
    return {
        "passing": [floor for floor, value in minima.items() if value >= 0],
        "minima": {floor: str(value) for floor, value in minima.items()},
        "negative_counts": {
            floor: negative_count(array) for floor, array in arrays.items()
        },
    }


def main():
    polynomials = build_polynomials(
        endpoint_pairs=((0, 0),), floor_labels=FLOORS
    )
    report = {
        label: {"before": {}, "axes": {variable: {"left": {}, "right": {}}
                 for variable in VARIABLES}}
        for label in ("omegaL_qRR", "omegaR_qRR")
    }
    for floor in FLOORS:
        print("CONTROLS", floor, flush=True)
        polynomial = polynomials.pop((0, 0, floor))
        controls, _scale, _digest = bernstein_controls(polynomial)
        del polynomial
        gc.collect()
        leaves = open_leaves(controls)
        del controls
        gc.collect()
        for label in ("omegaL_qRR", "omegaR_qRR"):
            array = leaves.pop(label)
            report[label]["before"][floor] = {
                "minimum": str(minimum(array)),
                "negative_count": negative_count(array),
            }
            for axis, variable in enumerate(VARIABLES):
                print("SPLIT", floor, label, variable, flush=True)
                left, right = split_axis_fast(array, axis)
                report[label]["axes"][variable]["left"][floor] = {
                    "minimum": str(minimum(left)),
                    "negative_count": negative_count(left),
                }
                report[label]["axes"][variable]["right"][floor] = {
                    "minimum": str(minimum(right)),
                    "negative_count": negative_count(right),
                }
                del left, right
                gc.collect()
            del array
            gc.collect()
    for label in report:
        report[label]["passing_before"] = [
            floor for floor in FLOORS
            if int(report[label]["before"][floor]["minimum"]) >= 0
        ]
        for variable in VARIABLES:
            for side in ("left", "right"):
                rows = report[label]["axes"][variable][side]
                report[label]["axes"][variable][side]["passing"] = [
                    floor for floor in FLOORS if int(rows[floor]["minimum"]) >= 0
                ]
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
