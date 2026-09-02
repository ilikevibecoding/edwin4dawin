#!/usr/bin/env python3
"""Exact uniform probe for >=6 attachments on a matching plus isolates."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_matching_all_distributions_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_MATCHING_ALL_DISTRIBUTIONS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def matching_row(vertices, edges, rank):
    return sp.expand(sum(
        choose_poly(edges, chosen_edges) * 2**chosen_edges
        * choose_poly(vertices - 2 * edges, rank - chosen_edges)
        for chosen_edges in range(rank + 1)
    ))


def tensor_certificate(expression, bounded, tails):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if not denominator.free_symbols and denominator < 0:
        numerator, denominator = -numerator, -denominator
    assert not denominator.free_symbols and denominator > 0
    polynomial = sp.Poly(numerator, *bounded, *tails)
    degrees = tuple(polynomial.degree(variable) for variable in bounded)
    shape = tuple(degree + 1 for degree in degrees)
    power = np.empty(shape, dtype=object)
    power.fill(sp.Integer(0))
    for powers, coefficient in polynomial.terms():
        bounded_powers = powers[:len(bounded)]
        tail_powers = powers[len(bounded):]
        monomial = sp.Integer(coefficient)
        for variable, exponent in zip(tails, tail_powers):
            monomial *= variable**exponent
        power[bounded_powers] += monomial
    controls = power.copy()
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
    recovered = controls.copy()
    for axis in range(len(degrees) - 1, -1, -1):
        degree = degrees[axis]
        moved = np.moveaxis(recovered, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for exponent in range(degree + 1):
            target[exponent] = math.comb(degree, exponent) * sum(
                (-1)**(exponent - index) * math.comb(exponent, index) * source[index]
                for index in range(exponent + 1)
            )
        recovered = np.moveaxis(target.reshape(moved.shape), 0, axis)
    assert all(sp.expand(recovered[index] - power[index]) == 0 for index in np.ndindex(shape))
    stream = hashlib.sha256()
    scalar_count = 0
    negative_count = 0
    minimum = None
    negatives = []
    for index in np.ndindex(shape):
        control = sp.expand(controls[index])
        stream.update(f"{degrees}|{index}|{sp.srepr(control)};".encode())
        for powers, coefficient in sp.Poly(control, *tails).terms():
            scalar_count += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative_count += 1
                if len(negatives) < 40:
                    negatives.append({"index": list(index), "powers": list(powers), "coefficient": str(coefficient), "control": str(control)})
    return {
        "positive_denominator": str(denominator),
        "degree_profile": list(degrees),
        "bernstein_controls": int(np.prod(shape)),
        "tail_scalar_coefficients": scalar_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "negative_tail_scalar_coefficients": negative_count,
        "first_negative": negatives,
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail, unrooted_edges, unrelated_isolates = sp.symbols(
        "root_tail unrooted_edges unrelated_isolates", nonnegative=True
    )
    split, x_fraction, y_fraction = sp.symbols("split x_fraction y_fraction", nonnegative=True)
    roots = root_tail + 6
    b_value = roots * split / 2
    a_value = roots - b_value
    x_rooted_edges = a_value * x_fraction
    y_rooted_edges = b_value * y_fraction
    edges = x_rooted_edges + y_rooted_edges + unrooted_edges
    m_value = roots + x_rooted_edges + y_rooted_edges + 2 * unrooted_edges + unrelated_isolates
    w_rows = {k: matching_row(m, edges, k) for k in W}
    p_rows = {k: w_rows[k] - matching_row(m - b, edges - y_rooted_edges, k) for k in P}
    q_rows = {k: w_rows[k] - matching_row(m - a, edges - x_rooted_edges, k) for k in Q}
    exact_matching = sp.expand(identity.subs({
        **{W[k]: w_rows[k] for k in W},
        **{P[k]: p_rows[k] for k in P},
        **{Q[k]: q_rows[k] for k in Q},
    }, simultaneous=True))
    specialized = sp.cancel(exact_matching.subs({m: m_value, a: a_value, b: b_value}))
    certificate = tensor_certificate(
        specialized,
        (split, x_fraction, y_fraction),
        (root_tail, unrooted_edges, unrelated_isolates),
    )
    report = {
        "marker": MARKER,
        "status": "proved exact" if certificate["negative_tail_scalar_coefficients"] == 0 else "exact diagnostic; Bernstein relaxation not closed",
        "candidate_theorem": "For a matching plus isolates with a+b>=6 attachment roots in distinct components, adjacent/no-parent rank-seven G3 is nonnegative for all distributions and root placements.",
        "parameterization": {
            "attachment_total": str(roots),
            "a": str(a_value),
            "b": str(b_value),
            "X_rooted_edges": str(x_rooted_edges),
            "Y_rooted_edges": str(y_rooted_edges),
            "unrooted_edges": str(unrooted_edges),
            "m": str(m_value),
            "domains": "split,x_fraction,y_fraction in [0,1]; root_tail,unrooted_edges,unrelated_isolates>=0",
        },
        "certificate": certificate,
        "coverage_gap_within_matching_ge6_all_distributions": None if certificate["negative_tail_scalar_coefficients"] == 0 else "Bernstein controls contain negatives; no theorem promoted.",
        "input_sha256": INPUT_SHA,
        "scope": "Matching plus isolates only; all >=6 attachment distributions and placements.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": certificate["degree_profile"],
        "controls": certificate["bernstein_controls"],
        "negative_tail_scalar_coefficients": certificate["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": certificate["minimum_tail_scalar_coefficient"],
        "first_negative": certificate["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
