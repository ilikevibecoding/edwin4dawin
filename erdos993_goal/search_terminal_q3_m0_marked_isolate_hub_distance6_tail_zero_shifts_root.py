#!/usr/bin/env python3
"""Search finite-slack partitions for the distance-six rho=tau=0 tail."""

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    core_terms,
    normalized_delta,
)


def sign_stats(expression):
    numerator = [coefficient for _, coefficient in expression.numer.terms()]
    denominator = [coefficient for _, coefficient in expression.denom.terms()]
    return (
        len(numerator),
        sum(coefficient < 0 for coefficient in numerator),
        min(numerator),
        len(denominator),
        sum(coefficient < 0 for coefficient in denominator),
        min(denominator),
    )


def shifted_chart(shift):
    _, u, r, s = field("u,r,s", QQ)
    t = u + shift
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    return normalized_delta(f_terms, z_terms, a, b, target, 0, 0)


def fixed_chart(value):
    _, r, s = field("r,s", QQ)
    t = value
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    return normalized_delta(f_terms, z_terms, a, b, target, 0, 0)


def main():
    for shift in range(0, 21):
        print("shift", shift, sign_stats(shifted_chart(shift)), flush=True)
    for value in range(0, 21):
        print("fixed", value, sign_stats(fixed_chart(value)), flush=True)


if __name__ == "__main__":
    main()
