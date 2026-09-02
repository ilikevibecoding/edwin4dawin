#!/usr/bin/env python3
"""Search simple coefficientwise recurrences for exact distance-six middle rows."""

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    core_terms,
    fixed_delta,
)


def sign_stats(expression):
    assert len(expression.denom.terms()) == 1
    assert expression.denom.terms()[0][1] > 0
    coefficients = [coefficient for _, coefficient in expression.numer.terms()]
    return sum(coefficient < 0 for coefficient in coefficients), min(coefficients), len(coefficients)


def main():
    _, q, v = field("q,v", QQ)
    polynomials = {}
    for target in range(4, 16):
        b = q + target - 2
        a = q + v + target - 2
        f_terms, z_terms = core_terms(DISTANCE, a, b)
        polynomials[target] = fixed_delta(f_terms, z_terms, a, b, target)

    for target in range(4, 15):
        current = polynomials[target]
        following = polynomials[target + 1]
        shifted_b = q + target - 1
        shifted_a = q + v + target - 1
        shifted_f, shifted_z = core_terms(DISTANCE, shifted_a, shifted_b)
        current_same_tree = fixed_delta(
            shifted_f, shifted_z, shifted_a, shifted_b, target
        )
        candidates = {
            "difference": following - current,
            "same_tree_target_difference": following - current_same_tree,
            "minus_q": following - q * current,
            "minus_q1": following - (q + 1) * current,
            "minus_2qv": following - (2 * q + v) * current,
        }
        best = None
        for constant in range(0, 41):
            candidate = following - (2 * q + v + constant) * current
            record = (sign_stats(candidate)[0], constant, sign_stats(candidate))
            if best is None or record < best:
                best = record
        print(
            target,
            {label: sign_stats(expression) for label, expression in candidates.items()},
            "best_2qv_plus_c",
            best,
            flush=True,
        )

    layer = [polynomials[target] for target in range(4, 16)]
    for order in range(1, 8):
        layer = [layer[index + 1] - layer[index] for index in range(len(layer) - 1)]
        print(
            "finite_difference_order",
            order,
            [sign_stats(expression) for expression in layer],
            flush=True,
        )


if __name__ == "__main__":
    main()
