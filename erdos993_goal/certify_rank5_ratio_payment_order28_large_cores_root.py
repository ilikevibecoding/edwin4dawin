#!/usr/bin/env python3
"""Exact strong rank-five terminal payments for the order-28 large cores.

For a terminal diameter leaf in an order-28 tree, write

    B-p = s K1 disjoint_union C,       |C| = 26-s.

For 0<=s<=6 the core has order at least 20.  The sharp tree rank-(3,4)
path ratio bounds X=i3(C)/i4(C) by

    X <= 4(|C|-2)/((|C|-5)(|C|-6)) <= 12/35.

On that exact restricted coefficient cone this verifier certifies the payment
needed to preserve Q5 >= i4*i5/5:

    M_s >= a_s d_s e_s (a_s+d_s).

All substitutions and tensor Bernstein coefficients are rational.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import time
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_monotonicity import (
    cleared_numerator,
    parameter_data,
    remove_nonnegative_monomial_factor,
)
from verify_rank5_leaf_induction_reduction import rooted_payment


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_ratio_payment_order28_large_cores_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def raw_ratio_margin(smoothing: int):
    c0, c1, c2, c3, c4, c5, h, k = sp.symbols(
        "c0 c1 c2 c3 c4 c5 h k", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def coefficient(rank):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    d, e, f = (coefficient(rank) for rank in (3, 4, 5))
    a = e + h
    payment = rooted_payment(a, f + k, d, e, f)
    target = a * d * e * (a + d)
    return sp.expand(payment - target), (c0, c1, c2, c3, c4, c5, h, k)


def certify_adaptive(coefficients, degrees, maximum_depth=28):
    stack = [(coefficients, 0)]
    leaves = 0
    deepest = 0
    smallest = None
    axis_order = (0, 3, 4, 5, 1, 2)
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            smallest = minimum if smallest is None else min(smallest, minimum)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved minimum={minimum} index={index} depth={depth}"
            )
        interiorities = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        if max(interiorities) > 0:
            axis = max(range(len(degrees)), key=interiorities.__getitem__)
        else:
            axis = axis_order[depth % len(axis_order)]
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    return leaves, deepest, smallest


def coefficient_regions_with_cap(box_variables, core_order, cap):
    """Exact pair/order c0 partition, truncated at the supplied X cap."""
    X, _, _, _, V, _ = box_variables
    threshold = sp.Rational(4, core_order - 2)
    assert threshold < cap
    high_x = threshold + (cap - threshold) * X
    critical_denominator = high_x * (core_order - 1)
    critical_numerator = high_x + 4
    return (
        ("pair_low_x", "pair", threshold * X, V, sp.S.One),
        (
            "pair_low_ratio",
            "pair",
            high_x,
            critical_numerator * V,
            critical_denominator,
        ),
        (
            "order_high_ratio",
            "order",
            high_x,
            critical_numerator
            + (critical_denominator - critical_numerator) * V,
            critical_denominator,
        ),
    )


def map_polynomial(
    common,
    box_variables,
    normalized_variables,
    q_region,
    coefficient_region,
):
    X, _, _, _, V, _ = box_variables
    D, r, q = normalized_variables
    q_name, r_value, d_value, q_value = q_region
    coefficient_name, _, x_value, v_numerator, v_denominator = coefficient_region
    endpoint = sp.expand(
        common.xreplace({D: d_value, r: r_value, q: q_value})
    )
    v_degree = sp.Poly(endpoint, V).degree()
    mapped = endpoint.xreplace({X: x_value, V: v_numerator / v_denominator})
    rational = sp.cancel(mapped * v_denominator**v_degree)
    numerator, denominator = sp.fraction(rational)
    assert denominator > 0
    polynomial, monomial = remove_nonnegative_monomial_factor(
        sp.expand(numerator), box_variables
    )
    return f"{q_name}/{coefficient_name}", polynomial, monomial


def main():
    started = time.perf_counter()
    rows = []
    for smoothing in range(7):
        core_order = 26 - smoothing
        cap = sp.Rational(
            4 * (core_order - 2),
            (core_order - 5) * (core_order - 6),
        )
        assert cap <= sp.Rational(12, 35) < sp.Rational(8, 23)
        box_variables, normalized_variables, _, q_regions = parameter_data(core_order)
        X, _, _, _, _, _ = box_variables
        raw, coefficient_variables = raw_ratio_margin(smoothing)
        # The target has no k dependence, so the sealed q-concavity survives.
        assert sp.factor(sp.diff(raw, coefficient_variables[7], 2)) <= 0
        coefficient_regions = coefficient_regions_with_cap(
            box_variables, core_order, cap
        )
        commons = {
            bound: cleared_numerator(
                raw,
                coefficient_variables,
                box_variables,
                normalized_variables,
                c0_bound=bound,
                core_order=core_order,
            )
            for bound in ("pair", "order")
        }
        for q_region in q_regions:
            for coefficient_region in coefficient_regions:
                label, polynomial, monomial = map_polynomial(
                    commons[coefficient_region[1]],
                    box_variables,
                    normalized_variables,
                    q_region,
                    coefficient_region,
                )
                degrees, coefficients = tensor_bernstein_fast(polynomial, box_variables)
                initial_minimum, initial_index = minimum_with_index(coefficients)
                if initial_minimum >= 0:
                    leaves, deepest, terminal_minimum = 1, 0, initial_minimum
                else:
                    leaves, deepest, terminal_minimum = certify_adaptive(coefficients, degrees)
                row = {
                    "sibling_isolates": smoothing,
                    "core_order": core_order,
                    "X_cap": str(cap),
                    "region": label,
                    "degrees": [int(value) for value in degrees],
                    "initial_Bernstein_minimum": str(initial_minimum),
                    "initial_minimum_index": [int(value) for value in initial_index],
                    "terminal_patches": leaves,
                    "maximum_depth": deepest,
                    "terminal_minimum": str(terminal_minimum),
                    "removed_nonnegative_monomial": list(monomial),
                    "Bernstein_coefficients": int(coefficients.size) * leaves,
                }
                rows.append(row)
                print(
                    "PASS", "s", smoothing, "core", core_order, label,
                    "initial", initial_minimum, "leaves", leaves,
                    "depth", deepest, flush=True,
                )

    payload = {
        "schema": "rank5-ratio-payment-order28-large-cores-root-v1",
        "status": "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_LARGE_CORES",
        "theorem": (
            "For every terminal order-28 row with B-p=sK1 union C, "
            "0<=s<=6 and |C|=26-s, M_s>=a_s*d_s*e_s*(a_s+d_s)."
        ),
        "target_corollary": (
            "This is exactly the local payment required by the leaf identity "
            "to preserve Q5(T)>=i4(T)i5(T)/5."
        ),
        "ratio_input": (
            "The sharp tree rank-(3,4) path ratio gives "
            "i3(C)/i4(C)<=4(|C|-2)/((|C|-5)(|C|-6))."
        ),
        "cases": rows,
        "total_Bernstein_coefficients": sum(row["Bernstein_coefficients"] for row in rows),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This covers only terminal order-28 rows with core order 20 through 26. "
            "Core orders 0 through 19 and the induction/base assembly are separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
