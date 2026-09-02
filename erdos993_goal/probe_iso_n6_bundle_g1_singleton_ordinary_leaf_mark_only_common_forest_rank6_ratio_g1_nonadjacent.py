#!/usr/bin/env python3
"""Exact large-order cone probe for a fixed mark-only forest component.

This is the N>=13 companion to the finite mark-only probe.  It preserves the
full rank-six ratio cone, substitutes only the exact k7 extension ceiling when
the derivative has the required sign, and then runs the sparse exact tensor
Bernstein and streamed simplex-homogenization checks.  Results remain probes
until all required motifs/sectors are assembled and independently replayed.
"""

from __future__ import annotations

import argparse
import gc

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent import (
    coefficient_sign,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent import (
    shift_and_homogenize,
    tensor_bernstein_general,
)


def parse_edges(raw):
    if not raw or raw == "edgeless":
        return ()
    return tuple(tuple(piece.strip()) for piece in raw.split(","))


def normalized_edge_set(edges):
    return frozenset(frozenset(edge) for edge in edges)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), required=True)
    parser.add_argument("--edges", default="edgeless")
    parser.add_argument("--sector", choices=("high", "low"), action="append")
    parser.add_argument("--derivative-only", action="store_true")
    parser.add_argument("--difference-from-edgeless", action="store_true")
    args = parser.parse_args()

    candidates = {
        normalized_edge_set(edges): (marks, edges)
        for marks, edges in mark_forests(args.mode)
    }
    requested = normalized_edge_set(parse_edges(args.edges))
    if requested not in candidates:
        raise ValueError(("not an allowed labelled mark forest", args.mode, args.edges))
    marks, edges = candidates[requested]

    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    A, B = sp.symbols("A B", nonnegative=True)
    tau = sp.Symbol("tau", nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    expression = exact_expression(
        args.mode, build_mode(args.mode, n, t), marks, edges,
        n, N, h, t, base,
    )
    if args.difference_from_edgeless:
        edgeless = exact_expression(
            args.mode, build_mode(args.mode, n, t), marks, (),
            n, N, h, t, base,
        )
        expression = sp.expand(expression - edgeless)
        assert base[7] not in expression.free_symbols
        print("TARGET difference_from_edgeless", flush=True)
    derivative = sp.expand(sp.diff(expression, base[7]))
    derivative_sign = coefficient_sign(
        derivative, (N, h, t, *base[2:7])
    )
    print(
        "MODE", args.mode, "EDGES", edges,
        "K7_DERIVATIVE_SIGN", derivative_sign,
        flush=True,
    )
    if args.difference_from_edgeless:
        assert derivative_sign == 1  # identically zero is classified both ways
    elif derivative_sign != -1:
        raise AssertionError("k7 derivative is not coefficientwise nonpositive")
    if args.derivative_only:
        print("PROBE_ONLY_K7_DERIVATIVE_CHECK")
        return
    k7_ceiling = sp.Rational(1, 7) * (N - 6) * base[6]
    lower = (
        expression if args.difference_from_edgeless
        else sp.expand(expression.subs(base[7], k7_ceiling))
    )
    bounded = sp.expand(lower.subs(
        t, sp.Rational(11, 10) * (N + h + len(marks)) * tau
    ))
    for sector in (args.sector or ("high", "low")):
        cubes, simplex, substitutions, cone, rho1 = ratio_parameterization(
            sector, N, A, B, base, 6
        )
        substituted = sp.factor(bounded.subs(substitutions))
        numerator, denominator = sp.fraction(sp.together(substituted))
        assert denominator.is_Rational and denominator > 0
        all_cubes = (*cubes, tau)
        variables = (N, h, *all_cubes, *simplex)
        polynomial = sp.Poly(numerator, *variables)
        power_terms = len(polynomial.terms())
        print(
            "STAGE", args.mode, edges, sector,
            "POWER_TERMS", power_terms,
            flush=True,
        )
        degrees, rows = tensor_bernstein_general(
            polynomial, power_count=2, cube_count=len(all_cubes)
        )
        del polynomial, numerator, substituted
        gc.collect()
        print(
            "STAGE", args.mode, edges, sector,
            "CUBE_DEGREES", degrees, "BERNSTEIN_ROWS", len(rows),
            flush=True,
        )
        positive, negative, minimum, digest = shift_and_homogenize(
            rows, power_count=2, simplex_length=len(simplex), threshold=13
        )
        print(
            "RESULT", args.mode, "EDGES", edges, "SECTOR", sector,
            "CONE", cone, "RHO1", rho1,
            "DENOMINATOR", denominator,
            "POWER_TERMS", power_terms,
            "CUBE_DEGREES", degrees,
            "BERNSTEIN_ROWS", len(rows),
            "HOMOGENEOUS_POSITIVE", positive,
            "HOMOGENEOUS_NEGATIVE", negative,
            "MINIMUM", minimum,
            "ROWS_SHA256", digest,
            flush=True,
        )
    print("PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM")


if __name__ == "__main__":
    main()
