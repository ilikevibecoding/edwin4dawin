#!/usr/bin/env python3
"""Probe the connected-endpoint residual on the exact forest component-count cone.

Unlike the older A/B order box, this parametrizes the number of components as
``c=1+(N-1)C``.  Thus every cube point respects the nonempty-forest condition
``1 <= c <= N``.  The only remaining relaxations are stated coefficient-row
bounds and the already-proved rank-five forest ratio cone.
"""
from __future__ import annotations

import sympy as sp

from derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein import (
    adaptive_upper,
    choose,
)
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    tensor_bernstein_sparse,
    weak_compositions,
    multinomial,
)
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import (
    n4_deleted,
)


def homogenize_allow_negative(rows, simplex_length):
    minimum = None
    negative = total = 0
    witness = None
    for row_index, row in enumerate(rows):
        shifted = {}
        for key, coefficient in row.items():
            degree = key[0]
            for power in range(degree + 1):
                new = (power, *key[1:])
                shifted[new] = shifted.get(new, 0) + coefficient * sp.binomial(
                    degree, power
                ) * 13 ** (degree - power)
        shifted = {key: sp.cancel(value) for key, value in shifted.items() if value}
        degree = max(sum(key[1:]) for key in shifted)
        hom = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[1:])
            for extra in weak_compositions(missing, simplex_length):
                new = (
                    key[0],
                    *(left + right for left, right in zip(key[1:], extra)),
                )
                hom[new] = hom.get(new, 0) + coefficient * multinomial(
                    missing, extra
                )
        hom = {key: sp.cancel(value) for key, value in hom.items() if value}
        local = min(hom.values())
        total += len(hom)
        negative += sum(1 for value in hom.values() if value < 0)
        if minimum is None or local < minimum:
            minimum = local
            witness = (row_index, min(hom, key=hom.get), local)
    return total, negative, minimum, witness


def exact_component_ratio_parameterization(sector, N, C, x):
    """Rank-five ratio cone with the exact component interval 1<=c<=N."""
    alpha = sp.symbols(f"{sector}_alpha", nonnegative=True)
    component_count = 1 + (N - 1) * C
    rho1_fixed = sp.factor(2 * N - 6 + 4 * component_count / N)
    budget = rho1_fixed - 3
    if sector == "high":
        z = sp.symbols("high_z0:4", nonnegative=True)
        rho4 = budget * z[0]
        rho3 = rho4 + 1 + budget * z[1]
        rho2 = rho3 + 1 + budget * z[2]
        rho1 = rho2 + 1 + budget * z[3]
        cubes = (C,)
    else:
        z = sp.symbols("low_z0:3", nonnegative=True)
        rho4 = budget * z[0]
        rho3 = rho4 + 1 + budget * z[1]
        rho2 = rho3 + 2 - alpha + budget * z[2]
        rho1 = rho2 + alpha
        cubes = (C, alpha)
    assert sp.factor(rho1 - rho1_fixed - budget * (sum(z) - 1)) == 0
    product = 1
    substitutions = {}
    for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
        product *= rho
        substitutions[x[rank]] = N * product / (
            2 ** (rank - 1) * sp.factorial(rank)
        )
    return cubes, z, substitutions


def main():
    N, C, D, M = sp.symbols("N C D M", nonnegative=True)
    x = (sp.Integer(1), *sp.symbols("x1:8"))
    component_count = 1 + (N - 1) * C
    edges = N - component_count
    degree = edges * D
    m = 1 + (N - 2) * M
    a = (sp.Integer(1), N, *x[2:6])
    b = (
        sp.Integer(1),
        N - 1,
        choose(N - 1, 2) - edges + degree,
        choose(N - 3, 3),
        adaptive_upper(a[4], N, N - 1, 4),
        sp.Integer(0),
    )
    c4_union_floor = choose(m, 4) - (m - 1) * choose(m - 2, 2)
    d3_path_floor = choose(m - 3, 3)
    lower = sp.expand(
        n4_deleted(a, b)
        + choose(m - 1, 2) * b[3]
        - 2 * choose(m, 3) * b[2]
        + (m - 1) * a[4]
        - 2 * choose(m - 1, 2) * a[3]
        + (N - 1) * c4_union_floor
        + a[2] * d3_path_floor
    )
    for sector in ("high", "low"):
        cubes, z, sub = exact_component_ratio_parameterization(sector, N, C, x)
        all_cubes = (*cubes, D, M)
        num, den = sp.fraction(sp.together(lower.subs(sub)))
        poly = sp.Poly(num, N, *all_cubes, *z)
        deg, branches = tensor_bernstein_sparse(poly, len(all_cubes))
        total, negative, minimum, witness = homogenize_allow_negative(
            branches, len(z)
        )
        print(
            sector,
            "den",
            den,
            "terms",
            len(poly.terms()),
            "degrees",
            deg,
            "cube_rows",
            len(branches),
            "coeffs",
            total,
            "negative",
            negative,
            "min",
            minimum,
            "witness",
            witness,
            flush=True,
        )


if __name__ == "__main__":
    main()
