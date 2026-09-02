"""Numerically design, then exactly audit, a fixed quartic-tail SONC allocation."""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
from math import ceil

import numpy as np
import sympy as sp
from scipy.optimize import minimize

import analyze_degree4_tail_eventual_support as audit


def best_selection(coefficients):
    positives = {exp: poly for exp, poly in coefficients.items() if poly.LC() > 0}
    negatives = {exp: poly for exp, poly in coefficients.items() if poly.LC() < 0}
    selection = []
    for negative, negative_poly in negatives.items():
        candidates = []
        for left, left_poly in positives.items():
            right = tuple(2 * negative[j] - left[j] for j in range(3))
            if right not in positives or left > right:
                continue
            right_poly = positives[right]
            growth = left_poly.degree() + right_poly.degree() - 2 * negative_poly.degree()
            ratio_squared = sp.cancel(
                4 * left_poly.LC() * right_poly.LC() / negative_poly.LC() ** 2
            )
            candidates.append((growth, float(ratio_squared), left, right, ratio_squared))
        candidates.sort(reverse=True)
        growth, _, left, right, ratio_squared = candidates[0]
        assert growth == 0
        selection.append((negative, left, right, ratio_squared))
    return selection


def optimize(selection):
    endpoints = sorted({endpoint for _, left, right, _ in selection for endpoint in (left, right)})
    incidences = [(index, side) for index in range(len(selection)) for side in range(2)]
    coordinate = {incidence: position for position, incidence in enumerate(incidences)}
    endpoint_incidences = {
        endpoint: [
            coordinate[index, side]
            for index, (_, left, right, _) in enumerate(selection)
            for side, value in enumerate((left, right))
            if value == endpoint
        ]
        for endpoint in endpoints
    }
    y0 = np.empty(len(incidences))
    for index, (_, _, _, ratio_squared) in enumerate(selection):
        y0[2 * index:2 * index + 2] = -0.5 * np.log(float(ratio_squared))
    initial_load = max(sum(np.exp(y0[i]) for i in indices) for indices in endpoint_incidences.values())
    z0 = np.append(y0, np.log(initial_load) + 0.01)
    constraints = []
    for endpoint, indices in endpoint_incidences.items():
        constraints.append({
            "type": "ineq",
            "fun": lambda z, ii=indices: np.exp(z[-1]) - np.sum(np.exp(z[ii])),
        })
    for index, (_, _, _, ratio_squared) in enumerate(selection):
        log_threshold = -np.log(float(ratio_squared))
        left_index, right_index = coordinate[index, 0], coordinate[index, 1]
        constraints.append({
            "type": "ineq",
            "fun": lambda z, i=left_index, j=right_index, t=log_threshold: z[i] + z[j] - t,
        })
    result = minimize(
        lambda z: z[-1], z0, method="SLSQP",
        constraints=constraints, options={"ftol": 1e-12, "maxiter": 10000},
    )
    assert result.success, result.message
    return np.exp(result.x[:-1]), endpoint_incidences


def main():
    for tail in ((10, 9), (11, 10)):
        coefficients = audit.discriminant_coefficients(*tail)
        selection = best_selection(coefficients)
        values, endpoint_incidences = optimize(selection)
        denominator = 64
        rounded = [sp.Rational(ceil(value * denominator - 1e-10), denominator) for value in values]
        print("TAIL", tail, "circuits", len(selection))
        print("maxload", max(sum(values[i] for i in indices) for indices in endpoint_incidences.values()))
        exact_loads = {
            endpoint: sum(rounded[i] for i in indices)
            for endpoint, indices in endpoint_incidences.items()
        }
        print("rounded maxload", max(exact_loads.values()), "overloads", [x for x in exact_loads.items() if x[1] > 1])
        shifted_endpoint_failures = []
        for endpoint in exact_loads:
            shifted = coefficients[endpoint].shift(12)
            if any(value <= 0 for value in shifted.all_coeffs()):
                shifted_endpoint_failures.append((endpoint, min(shifted.all_coeffs())))
        print("shifted endpoint failures", shifted_endpoint_failures)
        margin_failures = []
        pointwise_failures = []
        for index, row in enumerate(selection):
            negative, left, right, _ = row
            margin = sp.Poly(
                4 * rounded[2 * index] * rounded[2 * index + 1]
                * coefficients[left] * coefficients[right]
                - coefficients[negative] ** 2,
                audit.n,
            ).shift(12)
            if any(value <= 0 for value in margin.all_coeffs()):
                margin_failures.append((negative, min(margin.all_coeffs())))
            original_margin = sp.Poly(
                4 * rounded[2 * index] * rounded[2 * index + 1]
                * coefficients[left] * coefficients[right]
                - coefficients[negative] ** 2,
                audit.n,
            )
            for integer_n in range(12, 10001):
                negative_value = coefficients[negative].eval(integer_n)
                if negative_value < 0 and original_margin.eval(integer_n) <= 0:
                    pointwise_failures.append((negative, integer_n))
                    break
            print(row, rounded[2 * index], rounded[2 * index + 1])
        print("shifted margin failures", margin_failures)
        print("integer pointwise failures through 10000", pointwise_failures)


if __name__ == "__main__":
    main()
