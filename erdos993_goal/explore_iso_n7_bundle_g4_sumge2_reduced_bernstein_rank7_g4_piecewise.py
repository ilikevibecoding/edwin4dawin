#!/usr/bin/env python3
"""Exact reduced Bernstein probe for rank-seven g4 common0/sum>=2.

The A4/B4/Z5 row derivatives are universally positive, so their safe
incidence intervals are minimized at their lower independent-set endpoints.
A5 and B5 are affine and are exhausted at their four endpoint pairs.  W uses
the strong audited B5 floor and its incidence upper endpoint.  The remaining
nine-variable polynomials are checked on the five frozen q/edge/omega boxes.
This remains a probe until every endpoint closes and the result is replayed.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp

from prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise import (
    choose_poly,
    forest_moment_rows,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sumge2_reduced_bernstein_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUMGE2_REDUCED_BERNSTEIN_RANK7_G4_PIECEWISE"
DEGREES = (11, 6, 6, 6, 4, 2, 1, 1, 1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def interval_independent_count(order, edges, rank, endpoint):
    incidence = edges * choose_poly(order - 2, rank - 2)
    bad_lower = incidence / (rank - 1)
    bad = bad_lower + endpoint * (incidence - bad_lower)
    return sp.expand(choose_poly(order, rank) - bad)


def build_endpoint_polynomials():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    m, r = sp.symbols("m r")
    a, b, c, y, z = sp.symbols("a b c y z")
    ea, eb, ez = sp.symbols("ea eb ez")
    endpoint_a5, endpoint_b5, endpoint_w5 = sp.symbols(
        "endpoint_a5 endpoint_b5 endpoint_w5"
    )
    total = 2 + (m - 2) * a
    x_count = total * b
    y_count = total * (1 - b)
    hA, hB, hZ = m - y_count, m - x_count, m - total
    edge_w = (m + 1 - total) * c
    omega_w, tau_w, rows_w, bad4_w = forest_moment_rows(m, edge_w, y, z)
    incidence_w = edge_w * choose_poly(m - 2, 3)
    joint_w = omega_w * choose_poly(m - 3, 2)
    strong_floor = (
        (m - 4) * bad4_w - 2 * incidence_w
        + sp.Rational(5, 6) * joint_w
    )
    bad5_w = strong_floor + endpoint_w5 * (incidence_w - strong_floor)

    edge_a, edge_b, edge_z = hA * ea, hB * eb, hZ * ez
    shift = {
        symbols["n"]: m + 2,
        symbols["A2"]: hA,
        symbols["A3"]: choose_poly(hA, 2) - edge_a,
        symbols["A4"]: interval_independent_count(hA, edge_a, 3, 1),
        symbols["A5"]: interval_independent_count(
            hA, edge_a, 4, endpoint_a5
        ),
        symbols["B2"]: hB,
        symbols["B3"]: choose_poly(hB, 2) - edge_b,
        symbols["B4"]: interval_independent_count(hB, edge_b, 3, 1),
        symbols["B5"]: interval_independent_count(
            hB, edge_b, 4, endpoint_b5
        ),
        symbols["Z2"]: 1,
        symbols["Z3"]: hZ,
        symbols["Z4"]: choose_poly(hZ, 2) - edge_z,
        symbols["Z5"]: interval_independent_count(hZ, edge_z, 3, 1),
        symbols["W2"]: rows_w[2],
        symbols["W3"]: rows_w[3],
        symbols["W4"]: rows_w[4],
        symbols["W5"]: choose_poly(m, 5) - bad5_w,
    }
    boxed = sp.cancel(residual.subs(shift, simultaneous=True))
    numerator, denominator = sp.fraction(boxed)
    assert sp.factor(denominator) == 5040 * m**4
    variables = (r, a, b, c, y, z, ea, eb, ez)
    polynomials = {}
    for a5, b5, w5 in itertools.product((0, 1), repeat=3):
        key = (a5, b5, w5)
        expression = sp.expand(
            numerator.subs({
                endpoint_a5: a5,
                endpoint_b5: b5,
                endpoint_w5: w5,
                m: r + 6,
            })
        )
        polynomial = sp.Poly(expression, *variables)
        assert tuple(polynomial.degree_list()) == DEGREES
        polynomials[key] = polynomial
        print("POLY", key, "terms", len(polynomial.terms()), flush=True)
    return variables, polynomials


def bernstein_controls(polynomial):
    shape = tuple(degree + 1 for degree in DEGREES)
    controls = np.empty(shape, dtype=object)
    controls.fill(Fraction(0))
    for powers, coefficient in polynomial.terms():
        controls[powers] = Fraction(
            int(sp.numer(coefficient)), int(sp.denom(coefficient))
        )
    for axis, degree in enumerate(DEGREES[1:], start=1):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = [
                sum(
                    source[power, column]
                    * Fraction(math.comb(index, power), math.comb(degree, power))
                    for power in range(index + 1)
                )
                for column in range(source.shape[1])
            ]
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)
    for q_index in range(DEGREES[0] + 1):
        controls[q_index] = controls[q_index] / math.comb(DEGREES[0], q_index)
    scale = 1
    for value in controls.flat:
        scale = math.lcm(scale, value.denominator)
    integers = np.empty(shape, dtype=object)
    stream = hashlib.sha256()
    for index in np.ndindex(shape):
        value = controls[index]
        integer = value.numerator * (scale // value.denominator)
        integers[index] = integer
        stream.update(f"{index}:{integer};".encode())
    return integers, scale, stream.hexdigest().upper()


def minimum(array):
    return min(int(value) for value in array.flat)


def normalize(array):
    common = 0
    for value in array.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return array
    return array // common if common > 1 else array


def split_axis(array, axis):
    degree = array.shape[axis] - 1
    moved = np.moveaxis(array, axis, 0)
    source = moved.reshape((degree + 1, -1))
    left = np.empty_like(source)
    right = np.empty_like(source)
    for index in range(degree + 1):
        left[index] = [
            (1 << (degree - index))
            * sum(math.comb(index, j) * source[j, column] for j in range(index + 1))
            for column in range(source.shape[1])
        ]
        right[index] = [
            (1 << index)
            * sum(
                math.comb(degree - index, j - index) * source[j, column]
                for j in range(index, degree + 1)
            )
            for column in range(source.shape[1])
        ]
    return (
        normalize(np.moveaxis(left.reshape(moved.shape), 0, axis)),
        normalize(np.moveaxis(right.reshape(moved.shape), 0, axis)),
    )


def frozen_five_leaf_check(array):
    """The exact q/c/y partition already discovered on sum0 and sum1."""
    records = []
    q_left, q_right = split_axis(array, 0)
    records.append(("qL", minimum(q_left)))
    c_left, c_right = split_axis(q_right, 3)
    records.append(("qR_cL", minimum(c_left)))
    q2_left, q2_right = split_axis(c_right, 0)
    records.append(("qR_cR_qL", minimum(q2_left)))
    y_left, y_right = split_axis(q2_right, 4)
    records.append(("qR_cR_qR_yL", minimum(y_left)))
    records.append(("qR_cR_qR_yR", minimum(y_right)))
    return {
        "complete": all(value >= 0 for _label, value in records),
        "leaf_minima": {label: str(value) for label, value in records},
    }


def main():
    _variables, polynomials = build_endpoint_polynomials()
    endpoint_reports = {}
    for key in sorted(polynomials):
        print("CONTROLS", key, flush=True)
        controls, scale, digest = bernstein_controls(polynomials[key])
        if key[2] == 0:
            certificate = frozen_five_leaf_check(controls)
        else:
            certificate = {
                "complete": minimum(controls) >= 0,
                "global_minimum": str(minimum(controls)),
            }
        endpoint_reports[str(key)] = {
            "scale": scale,
            "control_stream_sha256": digest,
            "certificate": certificate,
        }
        print("CERT", key, json.dumps(certificate, sort_keys=True), flush=True)
    complete = all(
        report["certificate"]["complete"] for report in endpoint_reports.values()
    )
    report = {
        "marker": MARKER,
        "degrees": list(DEGREES),
        "endpoint_order": "(A5 incidence endpoint, B5 incidence endpoint, W5 strong-to-incidence endpoint)",
        "endpoint_reports": endpoint_reports,
        "complete": complete,
        "status": "complete exact probe; audit/replay required" if complete else "falsified",
        "dependencies_sha256": {RESIDUAL_REPORT.name: sha256(RESIDUAL_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "complete": complete}, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
