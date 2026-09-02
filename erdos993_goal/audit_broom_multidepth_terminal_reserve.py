#!/usr/bin/env python3
"""Exact conditioning-depth audit for a rooted broom at one rank.

For global rank r and local rank s, condition a uniform independent
(r-1)-set on a uniform subface K of size t=r-s.  The exact pointed
reserve recurrence has correction

    C_(r,s)
      = (r-s) E[M_B(s,K)] - Var(A_K)
        + r Cov(A_K,p_K)
      = (r-s) M_B(r) - Var(A_K)
        + s Cov(A_K,p_K).

The second form lets us evaluate the correction from the residual
independence polynomials F-N[K].  Equivalent K with the same deleted
closed neighborhood are aggregated before polynomial evaluation.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from fractions import Fraction
from itertools import combinations
from math import comb
from pathlib import Path

from audit_onestep_terminal_drift_correction import (
    broom_adjacency,
    coeff,
    forest_polynomial,
)


def independent(vertices, adjacency_sets):
    chosen = set(vertices)
    return all(
        not (adjacency_sets[vertex] & chosen)
        for vertex in vertices
    )


def vertices_from_mask(mask: int):
    output = []
    while mask:
        bit = mask & -mask
        output.append(bit.bit_length() - 1)
        mask ^= bit
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--leaves", type=int, required=True)
    parser.add_argument("--path-order", type=int, required=True)
    parser.add_argument("--rank", type=int, required=True)
    parser.add_argument(
        "--local-rank",
        type=int,
        action="append",
        default=[],
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    adjacency = broom_adjacency(
        args.leaves, args.path_order
    )
    order = len(adjacency)
    root = 0
    r = args.rank
    local_ranks = args.local_rank or list(range(2, r))
    adjacency_sets = [set(neighbors) for neighbors in adjacency]
    closed_masks = []
    for vertex, neighbors in enumerate(adjacency):
        mask = 1 << vertex
        for neighbor in neighbors:
            mask |= 1 << neighbor
        closed_masks.append(mask)

    poly = forest_polynomial(adjacency)
    root_deleted = forest_polynomial(
        adjacency, frozenset((root,))
    )
    bm = coeff(poly, r - 1)
    br = coeff(poly, r)
    bp = coeff(poly, r + 1)
    u = Fraction(r * br, bm)
    hm = bm - coeff(root_deleted, r - 1)
    hr = br - coeff(root_deleted, r)
    rho_m = Fraction(hm, bm)
    rho = Fraction(hr, br)
    global_component_b = (
        1 - (u + 1) * rho_m + u * rho
    )
    iso_reserve = Fraction(
        r
        * (
            r * br * br
            + bm * bm
            - (r + 1) * bm * bp
        ),
        bm * bm,
    )
    burden = (
        r * (u + 1) * rho_m
        - (r + 1) * u * rho
    )
    global_pointed_reserve = iso_reserve - burden

    reports = []
    for s in local_ranks:
        if not 2 <= s < r:
            raise ValueError("local rank must satisfy 2 <= s < r")
        t = r - s
        fibers = defaultdict(int)
        independent_k = 0
        for vertices in combinations(range(order), t):
            if not independent(vertices, adjacency_sets):
                continue
            independent_k += 1
            forbidden = 0
            root_selected = False
            for vertex in vertices:
                forbidden |= closed_masks[vertex]
                root_selected |= vertex == root
            fibers[(forbidden, root_selected)] += 1

        expected_mass = bm * comb(r - 1, t)
        total_mass = 0
        sum_a = sum_a2 = Fraction(0)
        sum_p = sum_ap = Fraction(0)
        for (forbidden, root_selected), multiplicity in fibers.items():
            deleted = frozenset(vertices_from_mask(forbidden))
            link = forest_polynomial(adjacency, deleted)
            fiber_mass = coeff(link, s - 1)
            if not fiber_mass:
                continue
            weighted_mass = multiplicity * fiber_mass
            total_mass += weighted_mass
            a_value = Fraction(
                s * coeff(link, s), fiber_mass
            )
            if root_selected:
                p_value = Fraction(1)
            elif forbidden & 1:
                p_value = Fraction(0)
            else:
                avoiding = forest_polynomial(
                    adjacency,
                    deleted | frozenset((root,)),
                )
                p_value = Fraction(
                    fiber_mass - coeff(avoiding, s - 1),
                    fiber_mass,
                )
            weight = Fraction(weighted_mass, expected_mass)
            sum_a += weight * a_value
            sum_a2 += weight * a_value * a_value
            sum_p += weight * p_value
            sum_ap += weight * a_value * p_value

        variance_a = sum_a2 - sum_a * sum_a
        covariance = sum_ap - sum_a * sum_p
        correction = (
            (r - s) * global_component_b
            - variance_a
            + s * covariance
        )
        average_local_pointed_reserve = (
            global_pointed_reserve - correction
        )
        reports.append(
            {
                "local_rank_s": s,
                "conditioning_size_t": t,
                "independent_K": independent_k,
                "aggregated_fibers": len(fibers),
                "expected_mass": expected_mass,
                "total_mass": total_mass,
                "mean_A": str(sum_a),
                "mean_p": str(sum_p),
                "variance_A": str(variance_a),
                "covariance_A_p": str(covariance),
                "correction": str(correction),
                "correction_float": float(correction),
                "average_local_pointed_reserve": str(
                    average_local_pointed_reserve
                ),
                "average_local_pointed_reserve_float": float(
                    average_local_pointed_reserve
                ),
                "identities_hold": (
                    total_mass == expected_mass
                    and sum_a == u
                    and sum_p == rho_m
                ),
            }
        )

    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "order": order,
        "alpha": poly.degree(),
        "root_degree": len(adjacency[root]),
        "u": str(u),
        "global_component_B": str(global_component_b),
        "global_pointed_reserve": str(
            global_pointed_reserve
        ),
        "reports": reports,
    }
    args.out.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
