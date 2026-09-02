#!/usr/bin/env python3
"""Exact large-order rank-four ratio-cone probe for isolated core marks."""

from __future__ import annotations

import argparse
import gc
import hashlib
import itertools
import math

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent import (
    coefficient_sign,
    marked_rows,
    substitute_rows,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)


def weak_compositions(total, length):
    if length == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for tail in weak_compositions(total - first, length - 1):
            yield (first,) + tail


def multinomial(total, exponents):
    value = math.factorial(total)
    for exponent in exponents:
        value //= math.factorial(exponent)
    return value


def common_expression(mode, n, N, h, t, k):
    mark_count = 3 if mode == "collision" else 4
    expression = build_mode(mode, n, t)
    expression = substitute_rows(
        expression, "R", marked_rows(k, h + mark_count)
    )
    expression = substitute_rows(
        expression, "S", marked_rows(k, h + mark_count - 1)
    )
    if mode == "distinct":
        expression = substitute_rows(
            expression, "X", marked_rows(k, h + mark_count - 1)
        )
        expression = substitute_rows(
            expression, "Y", marked_rows(k, h + mark_count - 2)
        )
    return sp.expand(sp.expand_func(
        expression.subs(n, N + h + mark_count)
    ))


def tensor_bernstein_general(polynomial, power_count, cube_count):
    terms = polynomial.terms()
    degrees = [
        max(monomial[power_count + index] for monomial, _ in terms)
        for index in range(cube_count)
    ]
    # Apply the one-dimensional power-to-Bernstein matrices successively.
    # This is exactly the tensor formula but avoids rescanning every power
    # monomial once for every final tensor row.
    transformed = dict(terms)
    for offset, degree in enumerate(degrees):
        position = power_count + offset
        weights = tuple(
            tuple(
                sp.Rational(math.comb(index, power), math.comb(degree, power))
                if power <= index else sp.Integer(0)
                for power in range(degree + 1)
            )
            for index in range(degree + 1)
        )
        grouped = {}
        for monomial, coefficient in transformed.items():
            power = monomial[position]
            rest = (*monomial[:position], *monomial[position + 1:])
            grouped.setdefault(rest, {})[power] = coefficient
        transformed = {}
        for rest, power_coefficients in grouped.items():
            for index in range(degree + 1):
                value = sum(
                    coefficient * weights[index][power]
                    for power, coefficient in power_coefficients.items()
                    if power <= index
                )
                if value:
                    monomial = (*rest[:position], index, *rest[position:])
                    transformed[monomial] = value

    row_map = {}
    for monomial, coefficient in transformed.items():
        indices = monomial[power_count:power_count + cube_count]
        key = (*monomial[:power_count], *monomial[power_count + cube_count:])
        row_map.setdefault(indices, {})[key] = coefficient
    rows = [
        row_map.get(indices, {})
        for indices in itertools.product(*(range(degree + 1) for degree in degrees))
    ]
    return degrees, rows


def shift_and_homogenize(
    rows, power_count, simplex_length, threshold=13, progress=True
):
    stream = hashlib.sha256()
    first_payload = True
    minimum = None
    positive = negative = 0
    for row_index, row in enumerate(rows):
        shifted = {}
        for key, coefficient in row.items():
            n_power = key[0]
            for new_power in range(n_power + 1):
                new_key = (new_power, *key[1:])
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * math.comb(n_power, new_power)
                    * threshold ** (n_power - new_power)
                )
        # All values are already exact Rational/Integer objects; arithmetic
        # canonicalizes them, so an additional symbolic cancel is redundant.
        shifted = {key: value for key, value in shifted.items() if value}
        degree = max(sum(key[power_count:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[power_count:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (
                    *key[:power_count],
                    *(left + right for left, right in zip(
                        key[power_count:], extra
                    )),
                )
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {key: value for key, value in homogeneous.items() if value}
        for value in homogeneous.values():
            if value >= 0:
                positive += 1
            else:
                negative += 1
            minimum = value if minimum is None or value < minimum else minimum
        for monomial in sorted(homogeneous):
            if not first_payload:
                stream.update(b"\n")
            stream.update(
                f"{row_index}|{','.join(map(str, monomial))}|{homogeneous[monomial]}".encode()
            )
            first_payload = False
        rows[row_index] = None
        if progress and row_index % 128 == 127:
            print(
                "HOMOGENIZE_PROGRESS", row_index + 1, "OF", len(rows),
                "POSITIVE", positive, "NEGATIVE", negative,
                "MINIMUM", minimum,
                flush=True,
            )
    return positive, negative, minimum, stream.hexdigest().upper()


def rows_hash(rows):
    payload = []
    for row_index, row in enumerate(rows):
        for monomial in sorted(row):
            payload.append(
                f"{row_index}|{','.join(map(str, monomial))}|{row[monomial]}"
            )
    return hashlib.sha256("\n".join(payload).encode()).hexdigest().upper()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), action="append")
    parser.add_argument("--sector", choices=("high", "low"), action="append")
    args = parser.parse_args()
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    A, B = sp.symbols("A B", nonnegative=True)
    tau = sp.Symbol("tau", nonnegative=True)
    k = (sp.Integer(1), N, *sp.symbols(
        "k2:8", integer=True, nonnegative=True
    ))
    for mode in (args.mode or ("collision", "distinct")):
        mark_count = 3 if mode == "collision" else 4
        expression = common_expression(mode, n, N, h, t, k)
        lower = expression
        derivative_checks = {}
        extension_bounds = {}
        for rank in (7,):
            derivative = sp.expand(sp.diff(expression, k[rank]))
            sign = coefficient_sign(
                derivative,
                (N, h, t, *tuple(x for x in k[2:] if x != k[rank])),
            )
            derivative_checks[str(k[rank])] = sign
            assert sign == -1
            bound = sp.Rational(1, rank) * (N - rank + 1) * k[rank - 1]
            extension_bounds[str(k[rank])] = str(bound)
            lower = sp.expand(lower.subs(k[rank], bound))
        bounded = sp.expand(lower.subs(
            t, sp.Rational(11, 10) * (N + h + mark_count) * tau
        ))
        print(
            "MODE", mode,
            "TOP_ENDPOINT_DERIVATIVES", derivative_checks,
            "TOP_EXTENSION_CEILING", extension_bounds,
            flush=True,
        )
        for sector in (args.sector or ("high", "low")):
            cubes, simplex, substitutions, cone, rho1 = ratio_parameterization(
                sector, N, A, B, k, 6
            )
            substituted = sp.factor(bounded.subs(substitutions))
            numerator, denominator = sp.fraction(sp.together(substituted))
            assert denominator.is_Rational and denominator > 0
            all_cubes = (*cubes, tau)
            variables = (N, h, *all_cubes, *simplex)
            polynomial = sp.Poly(numerator, *variables)
            power_terms = len(polynomial.terms())
            print("STAGE", mode, sector, "POWER_TERMS", power_terms, flush=True)
            degrees, rows = tensor_bernstein_general(
                polynomial, power_count=2, cube_count=len(all_cubes)
            )
            del polynomial, numerator, substituted
            gc.collect()
            print(
                "STAGE", mode, sector,
                "CUBE_DEGREES", degrees,
                "BERNSTEIN_ROWS", len(rows),
                flush=True,
            )
            positive, negative, minimum, homogeneous_hash = shift_and_homogenize(
                rows, power_count=2, simplex_length=len(simplex), threshold=13
            )
            print(
                "SECTOR", sector,
                "CONE", cone,
                "RHO1", rho1,
                "LOW_SIBLING_GUARD", "t=(11/10)(N+h+marks)tau, 0<=tau<=1",
                "DENOMINATOR", denominator,
                "POWER_TERMS", power_terms,
                "CUBE_DEGREES", degrees,
                "BERNSTEIN_ROWS", len(rows),
                "HOMOGENEOUS_POSITIVE", positive,
                "HOMOGENEOUS_NEGATIVE", negative,
                "MINIMUM", minimum,
                "ROWS_SHA256", homogeneous_hash,
                flush=True,
            )
    print("PROBE_ONLY_NO_ISOLATED_MARK_COMMON_FOREST_THEOREM")


if __name__ == "__main__":
    main()
