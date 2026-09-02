#!/usr/bin/env python3
"""Experimental exact shifted-Newton certificate for rank-five payment.

For a terminal forest core C and s isolated sibling factors, set

    F_s = M_s - constant * d_s * e_s^3.

Unlike the stronger (and unnecessary) assertion that every forward
difference at s=0 is nonnegative, this verifier can certify F at a chosen
integer base and all fifteen forward differences there.  Newton's formula
then proves F_s >= 0 for every integer s at least that base.  Earlier
integer values can be certified separately with ``--min-difference 0``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import platform
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_curvature_cone import (
    abstract_numerator,
    coefficient_regions,
    mapped_polynomial,
)
from verify_rank5_isolate_payment_monotonicity import parameter_data
from verify_rank5_leaf_induction_reduction import rooted_payment


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_quantitative_isolate_shifted_base1_tenth_exact_root_20260826.json"
EXPECTED_INPUTS = {
    "verify_rank5_isolate_payment_curvature_cone.py":
        "D0EC5D9D0FAAA75A6849FDF5561C29D8177F4798F5C8C8F86B34AF5BC69CDD51",
    "verify_rank5_isolate_payment_monotonicity.py":
        "BF0CDEA6129421DB2B8A2A348E03AA5C0FD41B02ADD24445B17AAF137B07CC51",
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "explore_rank4_three_halves_grouped.py":
        "0F700C716739ABEF49DB90C9890C3218186F680E7CA71DC81A82249BC9951AFA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def shifted_quantitative_differences(
    constant: sp.Rational,
    base_smoothing: int,
):
    c0, c1, c2, c3, c4, c5, h, k = sp.symbols(
        "c0 c1 c2 c3 c4 c5 h k", nonnegative=True
    )
    core = (c0, c1, c2, c3, c4, c5)

    def coefficient(rank: int, smoothing: int):
        return sum(
            math.comb(smoothing, offset) * core[rank - offset]
            for offset in range(min(smoothing, rank) + 1)
        )

    def margin(smoothing: int):
        d, e, f = (coefficient(rank, smoothing) for rank in (3, 4, 5))
        payment = rooted_payment(e + h, f + k, d, e, f)
        return sp.expand(payment - constant * d * e**3)

    values = [margin(base_smoothing + offset) for offset in range(17)]
    results = [values[0]]
    for _ in range(15):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        results.append(values[0])
    assert sp.expand(values[1] - values[0]) == 0
    return results, (c0, c1, c2, c3, c4, c5, h, k)


def verify_shifted_q_concavity(
    differences,
    coefficient_variables,
    base_smoothing: int,
):
    c0, c1, c2, c3, _, _, _, k = coefficient_variables
    d_values = []
    for smoothing in range(base_smoothing, base_smoothing + 17):
        d = (
            c3
            + smoothing * c2
            + math.comb(smoothing, 2) * c1
            + math.comb(smoothing, 3) * c0
        )
        d_values.append(sp.expand(d**2))
    square_heads = [d_values[0]]
    for _ in range(15):
        d_values = [
            sp.expand(d_values[index + 1] - d_values[index])
            for index in range(len(d_values) - 1)
        ]
        square_heads.append(d_values[0])
    for order, (difference, square_head) in enumerate(
        zip(differences, square_heads)
    ):
        polynomial = sp.Poly(square_head, c0, c1, c2, c3)
        assert all(coefficient >= 0 for _, coefficient in polynomial.terms())
        expected = -100 * square_head
        actual = sp.factor(sp.diff(difference, k, 2))
        assert sp.expand(actual - expected) == 0, order


def certify_patch_adaptive(coefficients, degrees, maximum_depth: int):
    stack = [(coefficients, 0)]
    leaves = 0
    deepest = 0
    fallback = (0, 3, 4, 5, 1, 2)
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
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
            axis = fallback[depth % len(fallback)]
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    return leaves, deepest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-smoothing", type=int, required=True)
    parser.add_argument("--min-difference", type=int, default=0)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--q-region")
    parser.add_argument("--coefficient-region")
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--constant", default="1/2")
    args = parser.parse_args()
    assert args.base_smoothing >= 0
    assert 0 <= args.min_difference <= args.max_difference <= 15
    constant = sp.Rational(args.constant)
    assert constant > 0
    immutable_inputs = {
        name: sha256(HERE / name) for name in EXPECTED_INPUTS
    }
    assert immutable_inputs == EXPECTED_INPUTS

    differences, coefficient_variables = shifted_quantitative_differences(
        constant, args.base_smoothing
    )
    verify_shifted_q_concavity(
        differences, coefficient_variables, args.base_smoothing
    )
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    coefficient_boxes = coefficient_regions(box_variables)
    if args.q_region:
        q_regions = tuple(row for row in q_regions if row[0] == args.q_region)
        if not q_regions:
            raise ValueError(args.q_region)
    if args.coefficient_region:
        coefficient_boxes = tuple(
            row for row in coefficient_boxes if row[0] == args.coefficient_region
        )
        if not coefficient_boxes:
            raise ValueError(args.coefficient_region)

    total = 0
    rows = []
    for order in range(args.min_difference, args.max_difference + 1):
        raw = differences[order]
        common = {
            bound: abstract_numerator(
                raw,
                coefficient_variables,
                box_variables,
                normalized_variables,
                bound,
            )
            for bound in {region[1] for region in coefficient_boxes}
        }
        for q_region in q_regions:
            for coefficient_region in coefficient_boxes:
                label, polynomial, monomial = mapped_polynomial(
                    common[coefficient_region[1]],
                    box_variables,
                    normalized_variables,
                    q_region,
                    coefficient_region,
                )
                degrees, coefficients = tensor_bernstein_fast(
                    polynomial, box_variables
                )
                minimum, index = minimum_with_index(coefficients)
                print(
                    f"base={args.base_smoothing} Delta^{order} {label}: "
                    f"initial_minimum={minimum} index={index} degrees={degrees}",
                    flush=True,
                )
                if minimum < 0:
                    leaves, depth = certify_patch_adaptive(
                        coefficients, degrees, args.maximum_depth
                    )
                else:
                    leaves, depth = 1, 0
                count = int(coefficients.size) * leaves
                total += count
                rows.append({
                    "difference": order,
                    "region": label,
                    "degrees": [int(value) for value in degrees],
                    "initial_minimum": str(minimum),
                    "initial_minimum_index": [int(value) for value in index],
                    "subdivision_leaves": leaves,
                    "maximum_depth": depth,
                    "Bernstein_coefficients": count,
                    "removed_nonnegative_monomial": [
                        int(value) for value in monomial
                    ],
                    "ordered_initial_coefficients_sha256": hashlib.sha256(
                        "\n".join(str(value) for value in coefficients.flat).encode(
                            "ascii"
                        )
                    ).hexdigest().upper(),
                })
                print(
                    f"base={args.base_smoothing} Delta^{order} {label}: "
                    f"PASS leaves={leaves} maximum_depth={depth} "
                    f"certificate_coefficients={count:,} monomial={monomial}",
                    flush=True,
                )
    print(
        "PASS_EXACT_SHIFTED_QUANTITATIVE_ISOLATE_PAYMENT_PARTIAL "
        f"base={args.base_smoothing} constant={constant} "
        f"orders={args.min_difference}..{args.max_difference} "
        f"coefficients={total:,}",
        flush=True,
    )
    full_theorem_run = (
        args.base_smoothing == 1
        and constant == sp.Rational(1, 10)
        and args.min_difference == 0
        and args.max_difference == 15
        and args.q_region is None
        and args.coefficient_region is None
    )
    if full_theorem_run:
        assert len(rows) == 16 * 4 * 4
        assert all(sp.Rational(row["initial_minimum"]) >= 0 for row in rows)
        assert all(row["subdivision_leaves"] == 1 for row in rows)
        payload = {
            "schema": "rank5-quantitative-isolate-shifted-base1-tenth-root-v1",
            "status": (
                "PASS_EXACT_RANK5_QUANTITATIVE_ISOLATE_PAYMENT_BASE1_"
                "CONSTANT_ONE_TENTH"
            ),
            "theorem": (
                "For every terminal tree core C of order at least 13 on the "
                "exact low-rank coefficient and rooted domains, and every integer "
                "s>=1 of isolated sibling factors, the rooted rank-five payment "
                "satisfies M_s >= d_s*e_s^3/10."
            ),
            "newton_certificate": (
                "For F_s=M_s-d_s*e_s^3/10, F_1 and all fifteen forward "
                "differences Delta^j F_1 are nonnegative; Delta^16 F is "
                "identically zero. Newton's formula proves F_s>=0 for every "
                "integer s>=1."
            ),
            "base_smoothing": 1,
            "constant": "1/10",
            "core_order_floor": 13,
            "region_certificates": rows,
            "coverage": {
                "Newton_orders_including_value": 16,
                "root_regions": 4,
                "coefficient_regions": 4,
                "cells": len(rows),
                "total_Bernstein_coefficients": total,
                "negative_initial_minima": sum(
                    1
                    for row in rows
                    if bool(sp.Rational(row["initial_minimum"]) < 0)
                ),
                "maximum_subdivision_depth": max(
                    row["maximum_depth"] for row in rows
                ),
            },
            "immutable_inputs": immutable_inputs,
            "software": {
                "python": platform.python_version(),
                "sympy": sp.__version__,
            },
            "scope_warning": (
                "This seals the large-core branch with at least one sibling "
                "isolate. The no-isolate, small-core, star, induction-base, "
                "and all-order assembly certificates remain separate."
            ),
            "source_sha256": sha256(Path(__file__)),
        }
        temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
        temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, OUTPUT)
        print(payload["status"], flush=True)
        print("CELLS", payload["coverage"]["cells"], flush=True)
        print("COEFFICIENTS", total, flush=True)
        print("SOURCE", payload["source_sha256"], flush=True)
        print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
