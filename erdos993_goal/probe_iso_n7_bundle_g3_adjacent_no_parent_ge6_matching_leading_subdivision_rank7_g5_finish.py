#!/usr/bin/env python3
"""Low-memory leading root-tail subdivision audit for all matchings."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_ge6_matching_all_distributions_rank7_g5_finish import matching_row


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
FAILED_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_matching_all_distributions_probe_rank7_g5_finish_20260831.json"
FAILED_REPORT_SHA = "139FF223B3A8ED48301B391680BDC94B27CA8EE880EBEA030ABA7807E03F05AE"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_matching_leading_subdivision_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_MATCHING_LEADING_SUBDIVISION_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def controls_for(polynomial, variables):
    poly = sp.Poly(sp.expand(polynomial), *variables)
    degrees = tuple(poly.degree(variable) for variable in variables)
    shape = tuple(degree + 1 for degree in degrees)
    controls = np.empty(shape, dtype=object)
    controls.fill(sp.Integer(0))
    for powers, coefficient in poly.terms():
        controls[powers] = coefficient
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = sum(
                source[exponent] * sp.Rational(math.comb(index, exponent), math.comb(degree, exponent))
                for exponent in range(index + 1)
            )
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)
    return degrees, controls


def split_axis_midpoint(array, axis):
    degree = array.shape[axis] - 1
    moved = np.moveaxis(array, axis, 0)
    source = moved.reshape((degree + 1, -1))
    left = np.empty_like(source)
    right = np.empty_like(source)
    for index in range(degree + 1):
        left[index] = sum(
            math.comb(index, j) * source[j] for j in range(index + 1)
        ) / 2**index
        right[index] = sum(
            math.comb(degree - index, j - index) * source[j]
            for j in range(index, degree + 1)
        ) / 2**(degree - index)
    return (
        np.moveaxis(left.reshape(moved.shape), 0, axis),
        np.moveaxis(right.reshape(moved.shape), 0, axis),
    )


def minimum(array):
    return min(value for value in array.flat)


def subdivide_bad_boxes(initial, max_depth=8):
    leaves = [(initial, (), 0)]
    records = []
    while True:
        bad_index = next((i for i, (array, _path, _depth) in enumerate(leaves) if minimum(array) < 0), None)
        if bad_index is None:
            break
        array, path, depth = leaves.pop(bad_index)
        if depth >= max_depth:
            leaves.append((array, path, depth))
            break
        candidates = []
        for axis in range(array.ndim):
            children = split_axis_midpoint(array, axis)
            score = min(minimum(child) for child in children)
            negative_controls = sum(sum(value < 0 for value in child.flat) for child in children)
            candidates.append((score, -negative_controls, -axis, axis, children))
        _score, _negative_score, _axis_score, axis, children = max(candidates, key=lambda item: item[:3])
        records.append({
            "path": [list(step) for step in path],
            "depth": depth,
            "split_axis": axis,
            "parent_minimum": str(minimum(array)),
            "child_minima": [str(minimum(child)) for child in children],
        })
        leaves.extend((child, (*path, (axis, side)), depth + 1) for side, child in enumerate(children))
    return leaves, records


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    assert sha256(FAILED_REPORT) == FAILED_REPORT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b")
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail = sp.Symbol("root_tail", nonnegative=True)
    split, x_fraction, y_fraction = sp.symbols("split x_fraction y_fraction", nonnegative=True)
    roots = root_tail + 6
    b_value = roots * split / 2
    a_value = roots - b_value
    x_edges = a_value * x_fraction
    y_edges = b_value * y_fraction
    edges = x_edges + y_edges
    m_value = roots + x_edges + y_edges
    w_rows = {k: matching_row(m, edges, k) for k in W}
    p_rows = {k: w_rows[k] - matching_row(m - b, edges - y_edges, k) for k in P}
    q_rows = {k: w_rows[k] - matching_row(m - a, edges - x_edges, k) for k in Q}
    specialized = sp.cancel(identity.subs({
        m: m_value, a: a_value, b: b_value,
        **{W[k]: w_rows[k] for k in W},
        **{P[k]: p_rows[k] for k in P},
        **{Q[k]: q_rows[k] for k in Q},
    }, simultaneous=True))
    numerator, denominator = map(sp.expand, sp.fraction(specialized))
    assert not denominator.free_symbols and denominator > 0
    root_poly = sp.Poly(numerator, root_tail)
    target_degree = root_poly.degree()
    assert target_degree >= 1
    target_coefficient = sp.expand(root_poly.coeff_monomial(root_tail**target_degree))
    variables = (split, x_fraction, y_fraction)
    degrees, controls = controls_for(target_coefficient, variables)
    leaves, subdivisions = subdivide_bad_boxes(controls, max_depth=10)
    unresolved = [
        {"path": [list(step) for step in path], "depth": depth, "minimum": str(minimum(array))}
        for array, path, depth in leaves if minimum(array) < 0
    ]
    stream = hashlib.sha256()
    for array, path, depth in sorted(leaves, key=lambda item: item[1]):
        stream.update(f"{path}|{depth}|".encode())
        for index in np.ndindex(array.shape):
            stream.update(f"{index}:{sp.srepr(array[index])};".encode())
    report = {
        "marker": MARKER,
        "status": "exact leading root-tail subdivision diagnostic; no full theorem asserted",
        "full_root_tail_degree": target_degree,
        "target_root_tail_degree": target_degree,
        "bounded_variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "initial_negative_controls": sum(value < 0 for value in controls.flat),
        "initial_minimum": str(minimum(controls)),
        "subdivision_count": len(subdivisions),
        "leaf_count": len(leaves),
        "unresolved_negative_leaves": unresolved,
        "subdivisions": subdivisions,
        "ordered_leaf_stream_sha256": stream.hexdigest().upper(),
        "failed_full_probe_sha256": FAILED_REPORT_SHA,
        "scope": "The leading root-tail coefficient on the u=t=0 matching face only; every lower tail coefficient and u,t>0 remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": list(degrees),
        "initial_negative_controls": report["initial_negative_controls"],
        "initial_minimum": report["initial_minimum"],
        "subdivision_count": report["subdivision_count"],
        "leaf_count": report["leaf_count"],
        "unresolved_negative_leaves": unresolved,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
