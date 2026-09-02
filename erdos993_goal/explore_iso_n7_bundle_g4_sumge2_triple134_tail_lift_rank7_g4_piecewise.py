#!/usr/bin/env python3
"""Lift the six-leaf triple134 asymptotic partition to the finite-q tail."""

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


Q_DEPTH = 12


def keep_half(array, axis, side):
    left, right = split_axis_fast(array, axis)
    if side == "L":
        del right, array
        gc.collect()
        return left
    del left, array
    gc.collect()
    return right


def initial_tail(array):
    array = keep_half(array, 0, "R")
    array = keep_half(array, 3, "R")
    array = keep_half(array, 0, "R")
    return array


def q_lift_record(array):
    bands = []
    tails = []
    current = array
    for depth in range(Q_DEPTH):
        left, right = split_axis_fast(current, 0)
        bands.append(str(minimum(left)))
        tails.append(str(minimum(right)))
        del left, current
        current = right
        gc.collect()
    record = {
        "bands": bands,
        "tails": tails,
        "tail_minimum": str(minimum(current)),
        "terminal_q_face_minimum": str(minimum(current[-1])),
    }
    del current
    gc.collect()
    return record


def visit_tree(array, path=()):
    # Exact six-leaf asymptotic tree: a; on aL split omega then b, on aR b.
    if not path:
        left, right = split_axis_fast(array, 1)
        del array
        gc.collect()
        return {
            **visit_tree(left, ("aL",)),
            **visit_tree(right, ("aR",)),
        }
    if path == ("aL",):
        left, right = split_axis_fast(array, 4)
        del array
        gc.collect()
        return {
            **visit_tree(left, (*path, "omegaL")),
            **visit_tree(right, (*path, "omegaR")),
        }
    if path in (("aL", "omegaL"), ("aL", "omegaR"), ("aR",)):
        left, right = split_axis_fast(array, 2)
        del array
        gc.collect()
        return {
            "/".join((*path, "bL")): q_lift_record(left),
            "/".join((*path, "bR")): q_lift_record(right),
        }
    raise AssertionError(path)


def main():
    polynomial = build_polynomials(
        endpoint_pairs=((0, 0),), floor_labels=("triple134",)
    )[(0, 0, "triple134")]
    controls, scale, digest = bernstein_controls(polynomial)
    del polynomial
    gc.collect()
    report = {
        "scale": scale,
        "digest": digest,
        "q_depth": Q_DEPTH,
        "leaves": visit_tree(initial_tail(controls)),
    }
    for leaf in report["leaves"].values():
        leaf["passing_bands"] = [
            index + 1 for index, value in enumerate(leaf["bands"])
            if int(value) >= 0
        ]
        leaf["first_passing_tail_depth"] = next(
            (index + 1 for index, value in enumerate(leaf["tails"])
             if int(value) >= 0),
            None,
        )
        leaf["tail_passing"] = int(leaf["tail_minimum"]) >= 0
        leaf["terminal_passing"] = int(leaf["terminal_q_face_minimum"]) >= 0
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
