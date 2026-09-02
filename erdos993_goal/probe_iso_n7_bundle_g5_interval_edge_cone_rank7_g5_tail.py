#!/usr/bin/env python3
"""Large-order interval/edge cone probe for rank-seven bundle g5.

This probe treats the exact no-parent and endpoint-parent expressions.  High
marked-category rows are eliminated by rigorous forest intervals, leaving the
exact W2/W3 edge-wedge geometry and the A2/B2/Z2/Z3 marked-neighbour geometry.
It records all negative Bernstein controls and asserts no theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
    tensor_bernstein,
)
from explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent import (
    substitute_geometry_with_wedge_floor,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_interval_edge_cone_probe_rank7_g5_tail_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_INTERVAL_EDGE_CONE_RANK7_G5_TAIL"
THRESHOLD = 60


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def shifted_split(expression, n, tail):
    shifted = sp.cancel(expression.subs(n, tail + THRESHOLD))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.free_symbols <= {tail}
    assert all(value >= 0 for value in sp.Poly(denominator, tail).all_coeffs())
    generators = tuple(sorted(numerator.free_symbols, key=str))
    terms = sp.Poly(numerator, *generators).terms() if generators else [((), numerator)]
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in terms:
        monomial = sp.prod(x**p for x, p in zip(generators, powers))
        if coefficient >= 0:
            positive += coefficient * monomial
        else:
            negative -= coefficient * monomial
    positive = sp.cancel(positive / denominator)
    negative = sp.cancel(negative / denominator)
    p_original = sp.cancel(positive.subs(tail, n - THRESHOLD))
    q_original = sp.cancel(negative.subs(tail, n - THRESHOLD))
    assert sp.cancel(expression - p_original + q_original) == 0
    return p_original, q_original


def eliminate_linear(expression, variable, lower, upper, n, tail):
    polynomial = sp.Poly(expression, variable)
    assert polynomial.degree() <= 1, (variable, polynomial.degree())
    constant = polynomial.coeff_monomial(1)
    coefficient = polynomial.coeff_monomial(variable)
    positive, negative = shifted_split(coefficient, n, tail)
    result = sp.cancel(constant + positive * lower - negative * upper)
    assert variable not in result.free_symbols
    return result, {
        "variable": str(variable),
        "coefficient": str(sp.factor(coefficient)),
        "positive_part": str(sp.factor(positive)),
        "negative_part": str(sp.factor(negative)),
        "lower": str(sp.factor(lower)),
        "upper": str(sp.factor(upper)),
    }


def bernstein_summary(expression, variables, tail):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.free_symbols <= {tail}
    assert all(value >= 0 for value in sp.Poly(denominator, tail).all_coeffs())
    degrees, values = tensor_bernstein(numerator, variables)
    negatives = []
    scalar_total = 0
    minimum = None
    stream = hashlib.sha256()
    for index in sorted(values):
        value = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        coefficients = sp.Poly(sp.expand(value), tail).all_coeffs()
        for coefficient in coefficients:
            scalar_total += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0 and len(negatives) < 20:
                negatives.append({
                    "index": list(index),
                    "control": str(sp.factor(value)),
                    "negative_coefficient": str(coefficient),
                })
    negative_count = sum(
        1
        for value in values.values()
        for coefficient in sp.Poly(sp.expand(value), tail).all_coeffs()
        if coefficient < 0
    )
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_controls": len(values),
        "tail_scalar_coefficients": scalar_total,
        "negative_tail_scalar_coefficients": negative_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "first_negative": negatives,
        "positive_denominator": str(sp.factor(denominator)),
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(f"{family}{rank}", nonnegative=True)
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n - 2
    e = choose(m, 2) - symbols["W2"]

    def category_lower(h, k):
        return choose(h, k) - e * choose(h, k - 2)

    def category_upper(h, k):
        # An h-vertex induced subgraph retains at least e-m(m-h) W-edges.
        # If this lower bound is positive, bad k-sets receive at least the
        # displayed safe extension incidence; if it is negative, the formula
        # is above the trivial cap C(h,k), so remains a valid upper bound.
        retained = e - m * (m - h)
        extension = k * choose(h, k) / (m * (m - 1))
        return choose(h, k) - retained * extension

    intervals = {}
    for rank in range(3, 8):
        internal_rank = rank - 1
        intervals[f"A{rank}"] = (
            category_lower(symbols["A2"], internal_rank),
            category_upper(symbols["A2"], internal_rank),
        )
        intervals[f"B{rank}"] = (
            category_lower(symbols["B2"], internal_rank),
            category_upper(symbols["B2"], internal_rank),
        )
    for rank in range(4, 8):
        internal_rank = rank - 2
        intervals[f"Z{rank}"] = (
            symbols["Z2"] * category_lower(symbols["Z3"], internal_rank),
            symbols["Z2"] * category_upper(symbols["Z3"], internal_rank),
        )
    for rank in range(4, 8):
        incidence = e * choose(m - 2, rank - 2)
        intervals[f"W{rank}"] = (
            choose(m, rank) - incidence,
            choose(m, rank) - incidence / (rank - 1),
        )

    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    modes = {}
    for mode in ("no_parent", "endpoint_u"):
        print("MODE_START", mode, flush=True)
        current = sp.expand(sp.sympify(source["modes"][mode]["expression"], locals=symbols))
        rows = []
        for rank in range(7, 2, -1):
            labels = [f"A{rank}", f"B{rank}"]
            if rank >= 4:
                labels += [f"W{rank}", f"Z{rank}"]
            for label in labels:
                current, row = eliminate_linear(
                    current, symbols[label], *intervals[label], n, tail
                )
                rows.append(row)
        assert current.free_symbols <= {
            n, symbols["A2"], symbols["B2"], symbols["W2"],
            symbols["W3"], symbols["Z2"], symbols["Z3"],
        }
        branches = []
        for branch in marked_geometry_branches(tail + THRESHOLD - 2, a, b, c, d):
            label, variables, value = substitute_geometry_with_wedge_floor(
                current, n, tail + THRESHOLD, branch
            )
            print("BRANCH_START", mode, label, flush=True)
            branches.append({
                "geometry": label,
                "summary": bernstein_summary(value, variables, tail),
            })
        modes[mode] = {
            "elimination": rows,
            "residual": str(sp.factor(current)),
            "branches": branches,
            "negative_tail_coefficients": sum(
                row["summary"]["negative_tail_scalar_coefficients"] for row in branches
            ),
        }
        print("MODE_DONE", mode, modes[mode]["negative_tail_coefficients"], flush=True)

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "modes": modes,
        "endpoint_v_by_symmetry": (
            "The endpoint-v expression is obtained from endpoint-u by A/B "
            "exchange; the marked forest geometry and all intervals are symmetric."
        ),
        "interval_facts": {
            "W": (
                "For a forest W, bad k-set edge incidence is exactly "
                "e*C(m-2,k-2), and each bad k-set contains at most k-1 edges. "
                "The exact W3 identity uses the rigorous wedge interval "
                "2e-m<=Omega<=e^2/2."
            ),
            "category": (
                "A/B/Z category graphs are induced in W. Union bound with e(W) "
                "gives the lower interval; deleting m-h vertices retains at "
                "least e-m(m-h) edges, giving the rational upper interval."
            ),
        },
        "status": "diagnostic cone; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": THRESHOLD,
        "mode_negative_counts": {
            key: value["negative_tail_coefficients"] for key, value in modes.items()
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
