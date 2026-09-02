#!/usr/bin/env python3
"""Direct exact certificate that adding an isolate raises the payment.

This companion to ``verify_rank5_isolate_payment_monotonicity.py``
certifies M_{s+1}-M_s >= 0 on the whole half-line s>=0 at once.  It
uses s=S/(1-S), clears (1-S)^14, and checks the resulting unit-box
polynomials in the same exact coefficient cone.
"""

from __future__ import annotations

import argparse
import math
import pickle
from collections import deque
from pathlib import Path

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_monotonicity import (
    cleared_numerator_from_terms,
    coefficient_regions,
    parameter_data,
    raw_forward_differences,
)


def denominator_maxima(term_sets, c0_bound):
    maxima = [0, 0, 0, 0]
    for terms in term_sets:
        for monomial, _ in terms:
            a0, a1, a2, _, a4, a5, _, ak = monomial
            powers = (
                a4 + 2 * a5 + ak,
                a0 + a1,
                a0 + a1 + a2,
                a0 if c0_bound == "pair" else 0,
            )
            maxima = [
                max(old, new) for old, new in zip(maxima, powers)
            ]
    return tuple(maxima)


def elevate_axis(coefficients, axis, target_degree):
    current_degree = coefficients.shape[axis] - 1
    if current_degree == target_degree:
        return coefficients
    assert current_degree < target_degree
    extra = target_degree - current_degree
    moved = np.moveaxis(coefficients, axis, 0)
    result = np.empty(
        (target_degree + 1,) + moved.shape[1:], dtype=object
    )
    for target_index in range(target_degree + 1):
        value = np.empty(moved.shape[1:], dtype=object)
        value.fill(sp.S.Zero)
        low = max(0, target_index - extra)
        high = min(current_degree, target_index)
        for source_index in range(low, high + 1):
            weight = sp.Rational(
                math.comb(current_degree, source_index)
                * math.comb(extra, target_index - source_index),
                math.comb(target_degree, target_index),
            )
            value += moved[source_index] * weight
        result[target_index] = value
    return np.moveaxis(result, 0, axis)


def elevate_tensor(coefficients, target_degrees):
    elevated = coefficients
    for axis, target_degree in enumerate(target_degrees):
        elevated = elevate_axis(elevated, axis, target_degree)
    return elevated


def common_monomial(polynomials, variables):
    minimum_exponents = [None] * len(variables)
    for polynomial in polynomials:
        for monomial, _ in sp.Poly(polynomial, *variables).terms():
            for axis, exponent in enumerate(monomial):
                if (
                    minimum_exponents[axis] is None
                    or exponent < minimum_exponents[axis]
                ):
                    minimum_exponents[axis] = exponent
    exponents = tuple(minimum_exponents)
    factor = sp.prod(
        variable**exponent
        for variable, exponent in zip(variables, exponents)
    )
    residuals = []
    for polynomial in polynomials:
        quotient = sp.S.Zero
        for monomial, coefficient in sp.Poly(
            polynomial, *variables
        ).terms():
            quotient += coefficient * sp.prod(
                variable ** (power - removed)
                for variable, power, removed in zip(
                    variables, monomial, exponents
                )
            )
        residuals.append(sp.expand(quotient))
    return residuals, exponents


def compact_basis_coefficients():
    S = sp.symbols("S", nonnegative=True)
    arrays = []
    for degree in range(15):
        basis = (
            (1 - S) ** (14 - degree)
            * sp.prod(
                S - offset * (1 - S)
                for offset in range(degree)
            )
            / math.factorial(degree)
        )
        basis_degree, coefficients = tensor_bernstein_fast(
            sp.expand(basis), (S,)
        )
        coefficients = elevate_tensor(coefficients, (14,))
        assert coefficients.shape == (15,)
        arrays.append(coefficients)
    return arrays


def derivative_coefficients(coefficients, axis):
    degree = coefficients.shape[axis] - 1
    moved = np.moveaxis(coefficients, axis, 0)
    derivative = degree * (moved[1:] - moved[:-1])
    return np.moveaxis(derivative, 0, axis)


def certify_patch(coefficients, degrees, maximum_depth=30):
    queue = deque([(coefficients, 0)])
    leaves = 0
    maximum_used = 0
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            maximum_used = max(maximum_used, depth)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved coefficient {minimum} at {index}, "
                f"depth {depth}"
            )
        interiorities = [
            (
                min(position, degree - position) / degree
                if degree
                else 0
            )
            for position, degree in zip(index, degrees)
        ]
        if max(interiorities) > 0:
            axis = max(
                range(len(degrees)), key=interiorities.__getitem__
            )
        else:
            axis = depth % len(degrees)
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return leaves, maximum_used


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region")
    parser.add_argument("--coefficient-region")
    parser.add_argument("--s-index", type=int)
    parser.add_argument("--cache-only", action="store_true")
    args = parser.parse_args()

    differences, coefficient_variables = raw_forward_differences()
    term_sets = [
        sp.Poly(difference, *coefficient_variables).terms()
        for difference in differences
    ]
    print("forward differences built", flush=True)
    (
        base_box_variables,
        normalized_variables,
        _,
        q_regions,
    ) = parameter_data(13)
    X, T, A, W, V, Z = base_box_variables
    D, r, q = normalized_variables
    if args.region:
        q_regions = tuple(
            item for item in q_regions if item[0] == args.region
        )
        if not q_regions:
            raise ValueError(args.region)

    required_bounds = (
        {"pair"}
        if args.coefficient_region in {"pair_low_x", "pair_low_ratio"}
        else {"order"}
        if args.coefficient_region == "order_high_ratio"
        else {"pair", "order"}
    )
    common = {}
    for bound in required_bounds:
        maxima = denominator_maxima(term_sets, bound)
        common[bound] = [
            cleared_numerator_from_terms(
                terms,
                base_box_variables,
                normalized_variables,
                c0_bound=bound,
                core_order=13,
                denominator_maxima=maxima,
            )
            for terms in term_sets
        ]
    basis_coefficients = compact_basis_coefficients()
    print("scaled difference numerators built", flush=True)

    total = 0
    for q_name, r_value, D_value, q_value in q_regions:
        for (
            coefficient_name,
            bound,
            x_value,
            v_numerator,
            v_denominator,
        ) in coefficient_regions(base_box_variables, 13):
            if (
                args.coefficient_region
                and coefficient_name != args.coefficient_region
            ):
                continue
            endpoints = [
                sp.expand(polynomial.xreplace(
                    {D: D_value, r: r_value, q: q_value}
                ))
                for polynomial in common[bound]
            ]
            print(
                f"{q_name}/{coefficient_name}: endpoints built",
                flush=True,
            )
            v_degree = max(
                sp.Poly(endpoint, V).degree()
                for endpoint in endpoints
            )
            mapped_polynomials = []
            for endpoint in endpoints:
                mapped = endpoint.xreplace(
                    {X: x_value, V: v_numerator / v_denominator}
                )
                if v_denominator == 1:
                    numerator = sp.expand(mapped)
                else:
                    mapped = sp.cancel(
                        mapped * v_denominator**v_degree
                    )
                    numerator, denominator = sp.fraction(mapped)
                    assert denominator > 0
                    numerator = sp.expand(numerator)
                mapped_polynomials.append(numerator)
            print(
                f"{q_name}/{coefficient_name}: coefficient maps built",
                flush=True,
            )
            residuals, monomial = common_monomial(
                mapped_polynomials, base_box_variables
            )
            tensor_data = [
                tensor_bernstein_fast(
                    residual, base_box_variables
                )
                for residual in residuals
            ]
            target_degrees = tuple(
                max(degrees[axis] for degrees, _ in tensor_data)
                for axis in range(len(base_box_variables))
            )
            elevated = [
                elevate_tensor(coefficients, target_degrees)
                for _, coefficients in tensor_data
            ]
            slice_size = elevated[0].size
            a_minimum_at_zero = q_name == "q_half_high_r"
            combined_slices = []
            s_indices = (
                (args.s_index,)
                if args.s_index is not None
                else range(15)
            )
            for s_index in s_indices:
                assert 0 <= s_index <= 14
                combined = np.empty(
                    elevated[0].shape, dtype=object
                )
                combined.fill(sp.S.Zero)
                for degree in range(15):
                    combined += (
                        elevated[degree]
                        * basis_coefficients[degree][s_index]
                    )
                combined_slices.append(combined)
                if args.cache_only:
                    continue
                if (
                    args.region
                    and args.coefficient_region
                    and args.s_index is not None
                ):
                    cache_path = Path(
                        "rank5_direct_array_"
                        f"{q_name}_{coefficient_name}_S{s_index}.pkl"
                    )
                    with cache_path.open("wb") as stream:
                        pickle.dump(
                            {
                                "coefficients": combined,
                                "degrees": target_degrees,
                                "q_region": q_name,
                                "coefficient_region": coefficient_name,
                                "s_index": s_index,
                            },
                            stream,
                            protocol=pickle.HIGHEST_PROTOCOL,
                        )
                full_minimum, full_index = minimum_with_index(combined)
                if full_minimum >= 0:
                    print(
                        f"{q_name}/{coefficient_name}: "
                        f"S_Bernstein_index={s_index} "
                        f"degrees={target_degrees} "
                        f"minimum={full_minimum} index={full_index} "
                        "direct=PASS",
                        flush=True,
                    )
                    continue
                t_derivative = derivative_coefficients(combined, 1)
                t_minimum, t_index = minimum_with_index(t_derivative)
                a_derivative = derivative_coefficients(combined, 2)
                if not a_minimum_at_zero:
                    a_derivative = -a_derivative
                a_minimum, a_index = minimum_with_index(a_derivative)
                if t_minimum < 0 or a_minimum < 0:
                    raise AssertionError(
                        f"monotonicity failure at S index {s_index}: "
                        f"T minimum {t_minimum} at {t_index}, "
                        f"A oriented minimum {a_minimum} at {a_index}"
                    )

                face = np.take(combined, 0, axis=1)
                a_face_index = 0 if a_minimum_at_zero else target_degrees[2]
                face = np.take(face, a_face_index, axis=1)
                face_degrees = (
                    target_degrees[0],
                    target_degrees[3],
                    target_degrees[4],
                    target_degrees[5],
                )
                minimum, index = minimum_with_index(face)
                leaves = 1
                depth = 0
                v_oriented = -derivative_coefficients(face, 2)
                z_oriented = -derivative_coefficients(face, 3)
                v_minimum, v_index = minimum_with_index(v_oriented)
                z_minimum, z_index = minimum_with_index(z_oriented)
                print(
                    f"{q_name}/{coefficient_name}: "
                    f"S_Bernstein_index={s_index} reduction "
                    f"T_derivative_minimum={t_minimum} "
                    f"A_oriented_derivative_minimum={a_minimum} "
                    f"V_oriented_derivative_minimum={v_minimum} "
                    f"at={v_index} "
                    f"Z_oriented_derivative_minimum={z_minimum} "
                    f"at={z_index} "
                    f"initial_face_minimum={minimum} index={index}",
                    flush=True,
                )
                if v_minimum >= 0 and z_minimum >= 0:
                    face = np.take(
                        face, face_degrees[2], axis=2
                    )
                    face = np.take(
                        face, face_degrees[3], axis=2
                    )
                    face_degrees = (
                        face_degrees[0],
                        face_degrees[1],
                    )
                    minimum, index = minimum_with_index(face)
                if minimum < 0:
                    leaves, depth = certify_patch(
                        face, face_degrees
                    )
                print(
                    f"{q_name}/{coefficient_name}: "
                    f"S_Bernstein_index={s_index} "
                    f"face_degrees={face_degrees} "
                    f"initial_face_minimum={minimum} index={index} "
                    f"leaves={leaves} maximum_depth={depth}",
                    flush=True,
                )
            if args.cache_only:
                assert args.s_index is None
                full = np.stack(combined_slices, axis=-1)
                cache_path = Path(
                    "rank5_direct_array_"
                    f"{q_name}_{coefficient_name}_full.pkl"
                )
                with cache_path.open("wb") as stream:
                    pickle.dump(
                        {
                            "coefficients": full,
                            "degrees": target_degrees + (14,),
                            "q_region": q_name,
                            "coefficient_region": coefficient_name,
                            "s_index": None,
                        },
                        stream,
                        protocol=pickle.HIGHEST_PROTOCOL,
                    )
                print(
                    f"{q_name}/{coefficient_name}: cached full "
                    f"tensor at {cache_path}",
                    flush=True,
                )
                total += full.size
                continue
            total += len(tuple(s_indices)) * slice_size
            print(
                f"{q_name}/{coefficient_name}: PASS "
                f"coefficients={len(tuple(s_indices)) * slice_size:,} "
                f"monomial_factor={monomial}",
                flush=True,
            )
    print(
        "direct isolate-payment increment certificate: PASS "
        f"Bernstein_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
