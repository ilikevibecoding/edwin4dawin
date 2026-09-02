"""Test whether actual columns are fractional-index beta-switch columns."""

from __future__ import annotations

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_matrix


P = sp.symbols("p")


def beta_value_ratio(q: int, x: int) -> sp.Expr:
    """beta_p(x)/beta_p(0), with the common 4^p cancelled."""
    value = sp.Integer(1)
    for step in range(x):
        value *= (
            (sp.Rational(7, 2) + P + step)
            / (sp.Rational(7, 2) + step)
            * (q + 4 + step)
            / (P + 5 + step)
        )
    return sp.factor(value)


def normalized_forward(q: int, order: int) -> sp.Expr:
    return sp.factor(
        sum(
            (-1) ** (order - x)
            * sp.binomial(order, x)
            * beta_value_ratio(q, x)
            for x in range(order + 1)
        )
    )


def main() -> None:
    for m in range(2, 9):
        q = 2 * m + 2
        target = forward_matrix(m)[2]
        model1 = normalized_forward(q, 1)
        models = [normalized_forward(q, order) for order in range(m)]
        print(f"m={m} q={q}", flush=True)
        for column in range(m):
            observed1 = sp.factor(target[1, column] / target[0, column])
            solutions = sp.solve(sp.together(model1 - observed1), P)
            records = []
            for solution in solutions:
                errors = [
                    sp.factor(
                        target[order, column] / target[0, column]
                        - models[order].subs(P, solution)
                    )
                    for order in range(m)
                ]
                records.append(
                    (
                        solution,
                        all(error == 0 for error in errors),
                        next((order for order, error in enumerate(errors) if error != 0), None),
                    )
                )
            print(f" column={column} records={records}", flush=True)


if __name__ == "__main__":
    main()
