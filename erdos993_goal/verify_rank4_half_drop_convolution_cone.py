#!/usr/bin/env python3
"""Verify a conditional rank-4 half-drop convolution cone.

This is an algebraic lemma and negative-control audit, not a proof that
every forest has nonnegative Q_4.  The cone assumes the half-drop
condition at *all* ranks 1,...,4.  Forests do not always satisfy it at
rank 2 (large stars are the basic obstruction).

The exact checks are:

1. Q_j >= 0 is a unit-drop condition on the ratios of the scaled
   factorial coefficients 2^j j! p_j.
2. At rank four, the unit-drop cone is closed under polynomial
   multiplication.  This is checked by a coefficientwise-positive
   slack expansion for every possible support category through rank 5.
3. The only tree polynomials with negative global Q_4 are two
   seven-vertex, independence-number-four exceptions.  A second
   coefficientwise expansion shows that either exception is repaired by
   any full unit-drop factor of support at least three.
"""

from __future__ import annotations

import math

import networkx as nx
import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.rings import ring

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_q_cascade_all_forest_polynomials import q_reserve


BAD_POLYNOMIALS = (
    (1, 7, 15, 10, 1),
    (1, 7, 15, 11, 1),
)


def symbolic_ratio_identity() -> None:
    k = sp.symbols("k", positive=True, integer=True)
    pm, p, pp = sp.symbols("p_minus p p_plus", positive=True)
    q = 2 * k * p**2 - pm * p - 2 * (k + 1) * pm * pp
    lambda_before = k * p / pm
    lambda_after = (k + 1) * pp / p
    assert sp.factor(
        q / (pm * p)
        - (2 * (lambda_before - lambda_after) - 1)
    ) == 0


def parameterized_factor(
    polynomial_ring,
    variables,
    support_category: int,
):
    """Return scaled factorial coefficients q_0,...,q_5.

    Categories 1,...,4 mean exact support.  Category 5 means support at
    least five; only the first five extension ratios are relevant.
    """

    terminal = variables[0]
    gaps = variables[1:]
    if support_category < 5:
        ratios = [None] * support_category
        ratios[support_category - 1] = 1 + terminal
        for index in range(support_category - 2, -1, -1):
            ratios[index] = (
                ratios[index + 1] + 1 + gaps[index]
            )
    else:
        ratios = [None] * 5
        ratios[4] = terminal
        for index in range(3, -1, -1):
            ratios[index] = (
                ratios[index + 1] + 1 + gaps[index]
            )
    coefficients = [polynomial_ring.one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    coefficients.extend(
        [polynomial_ring.zero] * (6 - len(coefficients))
    )
    return coefficients


def convolve_factorial(left, right, polynomial_ring):
    return [
        sum(
            (
                math.comb(rank, index)
                * left[index]
                * right[rank - index]
                for index in range(rank + 1)
            ),
            polynomial_ring.zero,
        )
        for rank in range(6)
    ]


def rank4_margin(coefficients):
    return (
        coefficients[4] ** 2
        - coefficients[3] * coefficients[5]
        - coefficients[3] * coefficients[4]
    )


def closure_certificate() -> dict:
    cases = 0
    terms = 0
    largest_case = 0
    smallest_coefficient = None
    identically_zero_cases = 0
    for left_support in range(1, 6):
        for right_support in range(left_support, 6):
            left_names = ["lt"] + [
                f"ld{index}" for index in range(left_support - 1)
            ]
            if left_support == 5:
                left_names = ["lt"] + [
                    f"ld{index}" for index in range(4)
                ]
            right_names = ["rt"] + [
                f"rd{index}" for index in range(right_support - 1)
            ]
            if right_support == 5:
                right_names = ["rt"] + [
                    f"rd{index}" for index in range(4)
                ]
            polynomial_ring, *variables = ring(
                " ".join(left_names + right_names), QQ
            )
            split = len(left_names)
            left = parameterized_factor(
                polynomial_ring,
                variables[:split],
                left_support,
            )
            right = parameterized_factor(
                polynomial_ring,
                variables[split:],
                right_support,
            )
            product = convolve_factorial(
                left, right, polynomial_ring
            )
            margin = rank4_margin(product)
            coefficients = [
                coefficient
                for _, coefficient in margin.iterterms()
            ]
            if not coefficients:
                identically_zero_cases += 1
                cases += 1
                continue
            assert min(coefficients) >= 0
            cases += 1
            terms += len(coefficients)
            largest_case = max(largest_case, len(coefficients))
            case_minimum = min(coefficients)
            if (
                smallest_coefficient is None
                or case_minimum < smallest_coefficient
            ):
                smallest_coefficient = case_minimum
    return {
        "cases": cases,
        "terms": terms,
        "largest_case": largest_case,
        "smallest_coefficient": smallest_coefficient,
        "identically_zero_cases": identically_zero_cases,
    }


def repaired_exception_certificate() -> dict:
    cases = 0
    terms = 0
    smallest_coefficient = None
    for bad in BAD_POLYNOMIALS:
        # Scaling x -> 2x converts the half-drop condition to unit drop.
        bad_factorial = [
            math.factorial(rank) * 2**rank * coefficient
            for rank, coefficient in enumerate(bad)
        ]
        bad_factorial.extend([0] * (6 - len(bad_factorial)))
        for support in range(3, 6):
            names = ["t"] + [
                f"d{index}" for index in range(support - 1)
            ]
            if support == 5:
                names = ["t"] + [
                    f"d{index}" for index in range(4)
                ]
            polynomial_ring, *variables = ring(
                " ".join(names), QQ
            )
            good = parameterized_factor(
                polynomial_ring, variables, support
            )
            product = [
                sum(
                    (
                        math.comb(rank, index)
                        * bad_factorial[index]
                        * good[rank - index]
                        for index in range(rank + 1)
                    ),
                    polynomial_ring.zero,
                )
                for rank in range(6)
            ]
            coefficients = [
                coefficient
                for _, coefficient in rank4_margin(
                    product
                ).iterterms()
            ]
            assert coefficients
            assert min(coefficients) > 0
            cases += 1
            terms += len(coefficients)
            case_minimum = min(coefficients)
            if (
                smallest_coefficient is None
                or case_minimum < smallest_coefficient
            ):
                smallest_coefficient = case_minimum
    return {
        "cases": cases,
        "terms": terms,
        "smallest_coefficient": smallest_coefficient,
    }


def small_tree_classification() -> dict:
    negative = []
    trees = 0
    for order in range(1, 13):
        generator = (
            [nx.empty_graph(1)]
            if order == 1
            else nx.nonisomorphic_trees(order)
        )
        for tree in generator:
            trees += 1
            engine = MaskIndependencePolynomial(tree)
            polynomial = engine.polynomial((1 << order) - 1)
            alpha = len(polynomial) - 1
            if alpha > 6:
                continue
            reserve = q_reserve(polynomial, 4)
            if reserve < 0:
                negative.append(
                    {
                        "order": order,
                        "alpha": alpha,
                        "graph6": nx.to_graph6_bytes(
                            tree, header=False
                        ).decode().strip(),
                        "polynomial": polynomial,
                        "reserve": reserve,
                    }
                )
    assert {item["polynomial"] for item in negative} == set(
        BAD_POLYNOMIALS
    )
    assert sorted(item["reserve"] for item in negative) == [-3, -2]
    return {"trees": trees, "negative": negative}


def bad_pair_checks() -> None:
    for left in BAD_POLYNOMIALS:
        for right in BAD_POLYNOMIALS:
            product = [0] * (len(left) + len(right) - 1)
            for i, a in enumerate(left):
                for j, b in enumerate(right):
                    product[i + j] += a * b
            for rank in range(1, 5):
                assert q_reserve(tuple(product), rank) >= 0


def main() -> int:
    symbolic_ratio_identity()
    closure = closure_certificate()
    repair = repaired_exception_certificate()
    small = small_tree_classification()
    bad_pair_checks()
    print("conditional rank-4 half-drop convolution cone: PASS")
    print(
        "closure cases:",
        closure["cases"],
        "coefficient terms:",
        closure["terms"],
        "largest:",
        closure["largest_case"],
    )
    print(
        "exception-repair cases:",
        repair["cases"],
        "coefficient terms:",
        repair["terms"],
    )
    print(
        "small trees classified:",
        small["trees"],
        "negative exceptions:",
        len(small["negative"]),
    )
    print("scope warning: forests need not satisfy the rank-2 half drop")
    print("this verifier does not prove the rank-4 forest theorem")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
