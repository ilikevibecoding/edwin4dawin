#!/usr/bin/env python3
"""Test and certify isolate preservation of M >= 7*d*e^3/5."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
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
from verify_rank5_isolate_payment_monotonicity import parameter_data, verify_q_concavity
from verify_rank5_leaf_induction_reduction import rooted_payment


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank5_unit_quantitative_isolate_payment_exact_root_20260826.json"
EXPECTED = {
    "verify_rank5_isolate_payment_curvature_cone.py":
        "D0EC5D9D0FAAA75A6849FDF5561C29D8177F4798F5C8C8F86B34AF5BC69CDD51",
    "verify_rank5_isolate_payment_monotonicity.py":
        "BF0CDEA6129421DB2B8A2A348E03AA5C0FD41B02ADD24445B17AAF137B07CC51",
    "verify_rank5_leaf_induction_reduction.py":
        "8E8175FBDCDF9CDACF027380A3193F822E6A3FCB83570D9BC802560A890CDE0D",
    "rank5_normalized_payment_quantitative_exact_root_20260823.json":
        "2E75DC3337EF9D1E16FD52992A1083602C862FA0881DF2726466C4EFA604A21C",
    "rank5_normalized_payment_quantitative_independent_audit_root_20260823.json":
        "70DFF053D470071CC9254830CDD61C0627260B8BE053C1086F5231D8E3BB35F1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quantitative_forward_differences(constant: sp.Rational = sp.Rational(1, 1)):
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

    values = [margin(smoothing) for smoothing in range(17)]
    differences = []
    for _ in range(1, 16):
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
        differences.append(values[0])
    assert sp.expand(values[1] - values[0]) == 0
    return differences, (c0, c1, c2, c3, c4, c5, h, k)


def certify_patch_adaptive(coefficients, degrees, maximum_depth: int = 30):
    """Depth-first adaptive Bernstein subdivision with bounded live memory."""
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
        # Depth-first traversal retains only one sibling per active level.
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    return leaves, deepest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=1)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--q-region")
    parser.add_argument("--coefficient-region")
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--constant", default="1")
    args = parser.parse_args()
    assert 1 <= args.min_difference <= args.max_difference <= 15
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    constant = sp.Rational(args.constant)
    assert 0 < constant <= sp.Rational(7, 5)
    differences, coefficient_variables = quantitative_forward_differences(constant)
    verify_q_concavity(differences, coefficient_variables)
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    coefficient_boxes = coefficient_regions(box_variables)
    rows = []
    for order in range(args.min_difference, args.max_difference + 1):
        raw = differences[order - 1]
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
        order_coefficients = 0
        order_minimum = None
        for q_region in q_regions:
            if args.q_region and q_region[0] != args.q_region:
                continue
            for coefficient_region in coefficient_boxes:
                if (args.coefficient_region
                        and coefficient_region[0] != args.coefficient_region):
                    continue
                label, polynomial, monomial = mapped_polynomial(
                    common[coefficient_region[1]],
                    box_variables,
                    normalized_variables,
                    q_region,
                    coefficient_region,
                )
                degrees, coefficients = tensor_bernstein_fast(polynomial, box_variables)
                minimum, index = minimum_with_index(coefficients)
                print(
                    f"Delta^{order} {label}: initial_minimum={minimum} "
                    f"index={index} degrees={degrees}",
                    flush=True,
                )
                if minimum < 0:
                    leaves, maximum_depth = certify_patch_adaptive(
                        coefficients, degrees, args.maximum_depth
                    )
                else:
                    leaves, maximum_depth = 1, 0
                certified_count = int(coefficients.size) * leaves
                order_coefficients += certified_count
                if order_minimum is None or minimum < order_minimum:
                    order_minimum = minimum
                rows.append({
                    "difference": order,
                    "region": label,
                    "degrees": [int(value) for value in degrees],
                    "Bernstein_coefficients": certified_count,
                    "initial_minimum": str(minimum),
                    "initial_minimum_index": [int(value) for value in index],
                    "subdivision_leaves": leaves,
                    "maximum_depth": maximum_depth,
                    "removed_nonnegative_monomial": list(monomial),
                })
        print(
            f"Delta^{order}: PASS coefficients={order_coefficients:,} "
            f"minimum={order_minimum}",
            flush=True,
        )

    if args.min_difference == 1 and args.max_difference == 15:
        payload = {
            "schema": "rank5-unit-quantitative-isolate-payment-root-v1",
            "status": "PASS_EXACT_RANK5_UNIT_QUANTITATIVE_ISOLATE_PAYMENT",
            "theorem": (
                f"If a large-core terminal payment satisfies M_0>={constant}*d_0*e_0^3, "
                "then after adjoining any s>=0 isolated sibling factors it satisfies "
                f"M_s>={constant}*d_s*e_s^3."
            ),
            "method": (
                "All fifteen forward differences of F_s=M_s-7*d_s*e_s^3/5 "
                "have nonnegative exact tensor-Bernstein coefficients on the same "
                "four root regions and four coefficient regions as the sealed isolate proof."
            ),
            "forward_differences": 15,
            "constant": str(constant),
            "region_certificates": rows,
            "total_Bernstein_coefficients": sum(row["Bernstein_coefficients"] for row in rows),
            "immutable_inputs": actual,
            "source_sha256": sha256(Path(__file__)),
            "scope_warning": (
                "This covers the core-order-at-least-13 isolate branch. Star and "
                "core-order-at-most-12 terminal branches remain separate."
            ),
        }
        OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(payload["status"])
        print("SOURCE", payload["source_sha256"])
        print("OUTPUT", sha256(OUTPUT))
    else:
        print("PARTIAL_RANGE_PASS_NOT_ASSEMBLED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
