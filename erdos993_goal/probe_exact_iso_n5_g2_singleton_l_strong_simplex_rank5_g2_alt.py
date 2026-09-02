#!/usr/bin/env python3
"""Fail-closed exact simplex probe for the strong singleton-g2 L cone."""

import argparse
import json

import sympy as sp

from derive_iso_n5_g2_singleton_l_strong_parent_cone_rank5_g2_alt import derive_strong
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
    parse_bits,
    parse_endpoint_states,
    valid_endpoint_branch,
    valid_parent_state,
)


MARKER = "PROBE_EXACT_ISO_N5_G2_SINGLETON_L_STRONG_SIMPLEX_RANK5_G2_ALT"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--degrees", default="111")
    parser.add_argument("--adjacency", default="000")
    parser.add_argument("--common", default="00")
    parser.add_argument("--endpoints", default="UU")
    parser.add_argument("--w-lower", choices=("zero", "centers"), default="centers")
    parser.add_argument("--subdivisions", type=int, default=1)
    parser.add_argument("--w-cell", type=int, default=0)
    parser.add_argument("--p-cell", type=int, default=0)
    parser.add_argument("--uv-common", type=int, choices=(0, 1), default=0)
    parser.add_argument("--parent-state", choices=("Z", "P"), default="P")
    parser.add_argument("--positive-parent-interval", choices=("full", "lower", "above"), default="full")
    parser.add_argument("--q-wedge", choices=("lower", "upper"), default="lower")
    parser.add_argument("--order-base", type=int, default=14)
    parser.add_argument("--geometry-elevation", type=int, default=0)
    parser.add_argument("--wedge-elevation", type=int, default=0)
    parser.add_argument("--parent-elevation", type=int, default=0)
    args = parser.parse_args()

    degree_flags = parse_bits(args.degrees, 3)
    adjacency = parse_bits(args.adjacency, 3)
    common = parse_bits(args.common, 2)
    endpoints = parse_endpoint_states(args.endpoints)
    if not valid_endpoint_branch(degree_flags, adjacency, common, endpoints):
        raise ValueError("incompatible branch")
    if not valid_parent_state(degree_flags, adjacency, common, args.parent_state):
        raise ValueError("incompatible parent state")

    strong, names = derive_strong()
    n=names["n"]; e=names["edge_count"]; dp=names["degree_p"]
    xp=names["neighbor_excess_p"]; qW=names["Q_wedges_E"]
    qxu=names["Q_neighbor_excess_u"]; qxv=names["Q_neighbor_excess_v"]
    kqu = sp.factor(sp.diff(strong, qxu)); kqv = sp.factor(sp.diff(strong, qxv))
    # For n>=14, minimize kqu with dp=e=n-1, dv=0, apu=0,apv=1.
    floor = 4*n**2 - 35*n + 63
    y = sp.symbols("y", nonnegative=True)
    assert sp.expand(floor.subs(n, y + 14)) == 4*y**2 + 77*y + 357
    # The v coefficient is symmetric.  Hence both nonnegative variables may
    # be dropped at their lower endpoint zero.
    reduced = sp.cancel(strong.subs({qxu: 0, qxv: 0}))
    qe = e - dp - xp
    q_wedge_value = 0 if args.q_wedge == "lower" else qe * (qe - 1) / 2
    numerator = sp.factor(sp.fraction(reduced.subs(qW, q_wedge_value))[0])

    polynomial, _ = mapped_polynomial(
        degree_flags, adjacency, common, endpoints, args.w_lower,
        args.subdivisions, args.w_cell, args.p_cell, args.uv_common,
        args.order_base, numerator=numerator, parent_state=args.parent_state,
        positive_parent_interval=args.positive_parent_interval,
    )
    coefficients, stats = homogeneous_coefficients_fast(
        polynomial, args.geometry_elevation, 0,
        wedge_elevation=args.wedge_elevation,
        parent_elevation=args.parent_elevation,
    )
    negatives = sorted(((key, value) for key, value in coefficients.items() if value < 0), key=lambda row: row[1])
    gens = polynomial.gens
    vertex_values = []
    for n_value in (0, 1, 10):
        for geometry_vertex in range(5):
            geometry = [0, 0, 0, 0]
            if geometry_vertex < 4:
                geometry[geometry_vertex] = 1
            for wedge_value in (0, 1):
                for parent_value in (0, 1):
                    point = (n_value, *geometry, wedge_value, parent_value)
                    value = polynomial.eval(dict(zip(gens, point)))
                    vertex_values.append((point, value))
    minimum_vertex = min(vertex_values, key=lambda row: row[1])
    print(json.dumps({
        "marker": MARKER,
        "branch": {
            "degrees": args.degrees, "adjacency": args.adjacency,
            "common": args.common, "endpoints": args.endpoints,
            "uv_common": args.uv_common, "parent_state": args.parent_state,
            "positive_parent_interval": args.positive_parent_interval,
            "q_wedge": args.q_wedge, "order_base": args.order_base,
        },
        "stats": stats,
        "negative": len(negatives),
        "minimum": str(min(coefficients.values())) if coefficients else "0",
        "first_negative": [(list(key), str(value)) for key, value in negatives[:5]],
        "minimum_sampled_vertex": [list(minimum_vertex[0]), str(minimum_vertex[1])],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
