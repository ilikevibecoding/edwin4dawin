"""Semialgebraic feasibility search for the d=5 Toeplitz Jordan gauge."""

from __future__ import annotations

from itertools import combinations

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from explore_bottom_jordan_toeplitz_gauge import all_minor_values, jordan_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import initial_minors


def symbolic_data(d: int):
    q = d - 1
    variables = sp.symbols(f"q1:{q}")
    coefficients = (sp.Integer(1),) + variables
    gauge_inverse = sp.Matrix(
        q,
        q,
        lambda i, j: coefficients[j - i] if j >= i else 0,
    )
    m0, s = jordan_data(d)
    left = sp.simplify(m0 * s * gauge_inverse.inv())
    right = sp.simplify(gauge_inverse * s.inv())
    constraints = []
    for matrix in (left, right):
        for minor in initial_minors(matrix):
            value = sp.factor(minor.det(method="domain-ge"))
            if value != 0:
                constraints.append(value)
    return variables, gauge_inverse, left, right, constraints


def signed_relative_lambdas(constraints, variables):
    functions = []
    for expression in constraints:
        polynomial = sp.Poly(expression, *variables)
        numerator = sp.Poly(polynomial.as_expr() / polynomial.content(), *variables)
        terms = numerator.terms()
        value_function = sp.lambdify(variables, numerator.as_expr(), "numpy")
        absolute_expression = sum(
            abs(float(coefficient))
            * sp.prod(variable**power for variable, power in zip(variables, monomial))
            for monomial, coefficient in terms
        )
        scale_function = sp.lambdify(variables, absolute_expression + 1, "numpy")
        functions.append((value_function, scale_function))
    return functions


def main() -> None:
    d = 5
    variables, qmatrix, left, right, constraints = symbolic_data(d)
    functions = signed_relative_lambdas(constraints, variables)

    def objective(point):
        relative = np.array(
            [float(value(*point) / scale(*point)) for value, scale in functions]
        )
        negative = np.maximum(-relative, 0.0)
        if np.max(negative) < 1e-12:
            return -float(np.min(relative))
        return float(np.max(negative) + np.mean(negative))

    result = differential_evolution(
        objective,
        bounds=[(0.0, 15.0), (-50.0, 150.0), (-500.0, 1500.0)],
        seed=9993,
        maxiter=4000,
        popsize=40,
        tol=1e-12,
        polish=True,
        updating="immediate",
        workers=1,
    )
    print(
        f"success={result.success} fun={result.fun:.12g} q={result.x.tolist()}",
        flush=True,
    )
    relative = [float(value(*result.x) / scale(*result.x)) for value, scale in functions]
    print(f"minimum_relative_constraint={min(relative):.12g}", flush=True)

    # Try a modest rational reconstruction and audit every exact minor.
    rational_point = [sp.Rational(float(value)).limit_denominator(100000) for value in result.x]
    substitution = dict(zip(variables, rational_point))
    exact_left = sp.simplify(left.subs(substitution))
    exact_right = sp.simplify(right.subs(substitution))
    left_bad = next((value for value in all_minor_values(exact_left) if value < 0), None)
    right_bad = next((value for value in all_minor_values(exact_right) if value < 0), None)
    print(f"rational_point={rational_point}", flush=True)
    print(f"exact_left_bad={left_bad} exact_right_bad={right_bad}", flush=True)


if __name__ == "__main__":
    main()
