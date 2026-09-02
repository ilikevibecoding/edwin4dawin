#!/usr/bin/env python3
"""Exact verification of the scaled-three coefficient-prefix reduction.

This script checks the algebraic identities, cutoff arithmetic, factorial
decomposition, and the finite factor-two counterexample recorded in
FUGACITY3_COEFFICIENT_PREFIX_REDUCTION_2026-07-26.md.  It does not assume
or prove the remaining scaled-three boundary inequality.
"""

from __future__ import annotations

from math import comb

import sympy as sp


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return out


def multiply(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, left in enumerate(a):
        for j, right in enumerate(b):
            out[i + j] += left * right
    return out


def power(poly: list[int], exponent: int) -> list[int]:
    out = [1]
    for _ in range(exponent):
        out = multiply(out, poly)
    return out


def verify_symbolic_identities() -> None:
    tk, tkm1, fk, fkm1, fkm2 = sp.symbols(
        "t_k t_km1 f_k f_km1 f_km2"
    )
    hk, hkm1, hkm2 = sp.symbols("h_k h_km1 h_km2")

    d_g = 3 * (tk + fkm1) - (tkm1 + fkm2)
    d_t = 3 * tk - tkm1
    d_f_previous = 3 * fkm1 - fkm2
    assert sp.expand(d_g - d_t - d_f_previous) == 0

    # T=F+xH, followed by G=T+xF.
    d_t_expanded = (
        3 * (fk + hkm1) - (fkm1 + hkm2)
    )
    d_f = 3 * fk - fkm1
    d_h_previous = 3 * hkm1 - hkm2
    assert sp.expand(d_t_expanded - d_f - d_h_previous) == 0
    assert sp.expand(
        d_g.subs({tk: fk + hkm1, tkm1: fkm1 + hkm2})
        - d_f
        - d_f_previous
        - d_h_previous
    ) == 0

    # The leaf-occupancy gap is 3t_k-f_{k-1}; SM3 on F and t_k>=f_k
    # make both displayed comparison steps exact.
    occupancy_gap = 3 * (tk + fkm1) - 4 * fkm1
    assert sp.expand(occupancy_gap - (3 * tk - fkm1)) == 0
    assert sp.expand(
        occupancy_gap
        - (3 * fk - fkm1)
        - 3 * (tk - fk)
    ) == 0

    # Factorial-curvature decomposition of H_k.
    k = sp.symbols("k", integer=True, positive=True)
    pkm1, pk, pkp1 = sp.symbols("p_km1 p_k p_kp1", positive=True)
    akm1 = sp.factorial(k - 1) * pkm1
    ak = sp.factorial(k) * pk
    akp1 = sp.factorial(k + 1) * pkp1
    factorial_form = (
        ak**2 + akm1 * ak - akm1 * akp1
    ) / (sp.factorial(k - 1) * akm1)
    g_k = k * pk**2 + pkm1 * pk - (k + 1) * pkm1 * pkp1
    h_k = k * g_k / pkm1
    assert sp.simplify(factorial_form - h_k) == 0


def verify_cutoffs(limit: int = 1000) -> None:
    for alpha in range(1, limit + 1):
        r = (2 * alpha) // 3
        previous_r = (2 * (alpha - 1)) // 3
        assert r - previous_r in (0, 1)
        assert (r - previous_r == 1) == (alpha % 3 in (0, 2))
        for k in range(1, r + 1):
            assert k - 1 <= previous_r

        ceil_r = (2 * alpha + 2) // 3
        previous_ceil_r = (2 * (alpha - 1) + 2) // 3
        assert ceil_r - previous_ceil_r in (0, 1)
        assert (ceil_r - previous_ceil_r == 1) == (
            alpha % 3 in (1, 2)
        )
        for k in range(1, ceil_r + 1):
            assert k - 1 <= previous_ceil_r

    for beta in range(limit + 1):
        alpha_g = beta + 1
        cascade_cutoff = (2 * alpha_g + 1) // 3
        assert cascade_cutoff == (2 * beta) // 3 + 1
        for k in range(2, cascade_cutoff):
            assert k <= (2 * beta) // 3


def verify_factor_two_counterexample() -> None:
    # T_m has one centre, m support vertices, and two leaves at every
    # support.  Splitting on the centre gives
    # I(T_m)=(1+3x+x^2)^m+x(1+x)^(2m).
    m = 6
    excluded_centre = power([1, 3, 1], m)
    included_centre = [0] + [comb(2 * m, j) for j in range(2 * m + 1)]
    tree = add(excluded_centre, included_centre)
    forest = multiply(tree, power([1, 1], 2))

    order = 3 * m + 1 + 2
    alpha = len(forest) - 1
    rank = (2 * alpha) // 3
    assert order == 21
    assert alpha == 15
    assert rank == 10
    assert forest[rank - 1] == 10431
    assert forest[rank] == 5173
    assert forest[rank - 1] > 2 * forest[rank]
    assert forest[rank - 1] < 3 * forest[rank]


def verify_overstrong_boundary_payment_counterexample() -> None:
    # In the same family, let F=T_7 union 2K_1 and let v be the centre
    # of T_7.  Then H=F-v=(1+3x+x^2)^7(1+x)^2.  Adding a vertex p
    # adjacent only to v, followed by a leaf at p, gives the exact
    # exceptional leaf setup.  The crude payment
    #
    #   D_{r+1}(F)+D_r(F) >= [x^{r-1}]H
    #
    # fails, but D_r(H) is positive and the actual boundary is safe.
    m = 7
    isolates = power([1, 1], 2)
    excluded_centre = power([1, 3, 1], m)
    included_centre = [0] + [comb(2 * m, j) for j in range(2 * m + 1)]
    tree = add(excluded_centre, included_centre)
    forest = multiply(tree, isolates)
    closed_deleted = multiply(excluded_centre, isolates)

    beta = len(forest) - 1
    rank = (2 * beta) // 3
    pair_reserve = (
        3 * forest[rank + 1]
        + 2 * forest[rank]
        - forest[rank - 1]
    )
    closed_previous = closed_deleted[rank - 1]
    closed_difference = (
        3 * closed_deleted[rank] - closed_deleted[rank - 1]
    )
    full = add(multiply(forest, [1, 1]), [0] + closed_deleted)
    boundary_difference = 3 * full[rank + 1] - full[rank]

    assert beta == 17
    assert rank == 11
    assert pair_reserve == 34109
    assert closed_previous == 37730
    assert pair_reserve - closed_previous == -3621
    assert closed_difference == 15883
    assert pair_reserve + closed_difference == 49992
    assert boundary_difference == 49992


def verify_bipartite_ceil_prefix_counterexample() -> None:
    # This eight-vertex graph is bipartite with parts {0,...,4} and
    # {5,6,7}.  It shows that the ceil(2 alpha/3) strengthening, if true
    # for forests, cannot follow from bipartiteness alone.
    order = 8
    edges = {
        (0, 5),
        (0, 7),
        (1, 6),
        (2, 5),
        (2, 6),
        (3, 5),
        (3, 6),
        (3, 7),
        (4, 7),
    }
    coefficients = [0] * (order + 1)
    for mask in range(1 << order):
        if all(
            not ((mask >> u) & 1 and (mask >> v) & 1)
            for u, v in edges
        ):
            coefficients[mask.bit_count()] += 1
    while coefficients[-1] == 0:
        coefficients.pop()

    assert coefficients == [1, 8, 19, 16, 5, 1]
    alpha = len(coefficients) - 1
    rank = (2 * alpha + 2) // 3
    assert alpha == 5
    assert rank == 4
    assert 3 * coefficients[rank] - coefficients[rank - 1] == -1
    # The weaker floor cutoff still passes.
    floor_rank = (2 * alpha) // 3
    assert 3 * coefficients[floor_rank] - coefficients[floor_rank - 1] > 0


def main() -> int:
    verify_symbolic_identities()
    verify_cutoffs()
    verify_factor_two_counterexample()
    verify_overstrong_boundary_payment_counterexample()
    verify_bipartite_ceil_prefix_counterexample()
    print("symbolic identities: PASS")
    print("cutoff cases alpha<=1000: PASS")
    print("21-vertex factor-two counterexample: PASS")
    print("24-vertex overstrong-payment counterexample: PASS")
    print("8-vertex bipartite ceil-prefix counterexample: PASS")
    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
