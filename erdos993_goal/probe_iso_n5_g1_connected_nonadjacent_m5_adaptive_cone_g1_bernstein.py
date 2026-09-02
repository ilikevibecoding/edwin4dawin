#!/usr/bin/env python3
"""Exact tensor-Bernstein probe for one adaptive connected-nonadjacent M5 cone.

The front end is the frozen three-endpoint adaptive row reduction.  This
source handles one ratio sector, one connected-path geometry/order branch,
and one rank-two endpoint.  It is fail-closed: a PASS marker is emitted only
when every exact Bernstein coefficient is nonnegative.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein import compactify
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
MARKER = "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_CONE_BRANCH_G1_BERNSTEIN"


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def hm(a):
    return (
        2*a[1]*a[4] - 2*a[1]*a[5] - 6*a[1]*a[6]
        + 6*a[2]*a[3] - 8*a[2]*a[5] + 2*a[3]**2 + 6*a[3]*a[4]
    )


def lm(a, b):
    return (
        2*a[1]*b[3] - a[1]*b[4] - 6*a[1]*b[5]
        + 4*a[2]*b[2] + a[2]*b[3] - 2*a[2]*b[4]
        + 2*a[3]*b[1] + a[3]*b[2] + 8*a[3]*b[3]
        - a[4]*b[1] - 2*a[4]*b[2] - 6*a[5]*b[1]
    )


def km(b, c):
    return (
        2*b[1]*c[2] - 6*b[1]*c[4]
        + 2*b[2]*c[1] + 4*b[2]*c[3]
        + 4*b[3]*c[2] - 6*b[4]*c[1]
    )


def adaptive(ak, n, m, rank):
    cn = choose(n, rank)
    return ak * (cn - ak + choose(m, rank)) / cn


def abstract(endpoint: str, small_order: int | None, empty_d: bool):
    assert endpoint in ("ll", "lh", "hh")
    n, mb, mc, md, R1, R2, R3, R4, R5 = sp.symbols(
        "n mb mc md R1 R2 R3 R4 R5"
    )
    variables = (n, mb, mc, md, R1, R2, R3, R4, R5)
    a = (
        sp.Integer(1), n, R1/4, R1*R2/(24*n),
        R1*R2*R3/(192*n**2),
        R1*R2*R3*R4/(1920*n**3),
        R1*R2*R3*R4*R5/(23040*n**4),
    )

    def row(m, upper2: bool, exact_small: int | None = None):
        if exact_small is None:
            lower2 = choose(m - 1, 2)
            lower3 = choose(m - 2, 3)
        else:
            lower2 = sp.Integer(max(0, math.comb(exact_small - 1, 2))) if exact_small >= 1 else sp.Integer(0)
            lower3 = sp.Integer(math.comb(exact_small - 2, 3)) if exact_small >= 5 else sp.Integer(0)
        return (
            sp.Integer(1), m,
            choose(m, 2) if upper2 else lower2,
            lower3,
            adaptive(a[4], n, m, 4),
            adaptive(a[5], n, m, 5),
        )

    b_upper = endpoint == "hh"
    c_upper = endpoint in ("lh", "hh")
    b = row(mb, b_upper, small_order)
    c = row(mc, c_upper)
    if empty_d:
        d = (sp.Integer(1), sp.Integer(0), sp.Integer(0), sp.Integer(0), sp.Integer(0))
    else:
        d = (
            sp.Integer(1), md, choose(md - 1, 2), choose(md - 2, 3),
            adaptive(a[4], n, md, 4),
        )
    value = hm(a) + lm(a, b) + lm(a, c) + km(b, c) + km(a, d)
    # `together` is substantially cheaper here than a global `cancel` after
    # multiplying by a deliberately over-large common scale.  Its denominator
    # is positive for n>=13, so the exact numerator has the same sign.
    numerator, denominator = sp.fraction(sp.together(value))
    denominator = sp.factor(denominator)
    assert denominator.free_symbols <= {n}
    constant, factors = sp.factor_list(denominator, n)
    assert constant > 0
    for factor, _multiplicity in factors:
        linear = sp.Poly(factor, n)
        assert linear.degree() == 1 and linear.LC() > 0
        root = -linear.TC() / linear.LC()
        assert root <= 4
    assert denominator.subs(n, 13) > 0
    polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    return polynomial, str(denominator)


def map_branch(polynomial, sector, distance, mode, small_order):
    assert sector in ("high", "low")
    assert distance in ("two", "far")
    assert mode in ("general", "zero", "positive")
    bounded = ["s", "z", "h0", "h1", "h2", "h3" if sector == "high" else "t"]
    source_context = fmpq_mpoly_ctx.get((*bounded, "p", "q"), "degrevlex")
    s, z, h0, h1, h2, hlast, p, q = source_context.gens()
    one = source_context.constant(1)

    if small_order is None:
        mb = 7 + p
        mc_seed = 7 + p + q
    else:
        mb = source_context.constant(small_order)
        n_seed = 13 + q

    if distance == "two":
        assert mode == "general"
        overlap = mb * s
    elif mode == "zero":
        overlap = source_context.constant(0)
    else:
        assert mode == "positive"
        overlap = 1 + (mb - 1) * s

    if small_order is None:
        mc = mc_seed
        n = mb + mc - overlap
    else:
        n = n_seed
        mc = n - mb + overlap
    md = overlap + int(distance == "two")
    edges = (overlap + 1) * z
    R1 = 2*n*(n-1) - 4*edges
    budget = R1 - 4*n

    terminal = budget * h0
    excess4 = budget * (1-h0) * h1
    excess3 = budget * (1-h0) * (1-h1) * h2
    R5 = terminal
    R4 = R5 + n + excess4
    R3 = R4 + n + excess3
    if sector == "high":
        excess2 = budget * (1-h0) * (1-h1) * (1-h2) * hlast
        R2 = R3 + n + excess2
        remainder = budget * (1-h0) * (1-h1) * (1-h2) * (1-hlast)
        assert R1 - R2 == n + remainder
    else:
        bounded_delta1 = hlast
        excess2 = budget * (1-h0) * (1-h1) * (1-h2)
        R2 = R3 + n*(2-bounded_delta1) + excess2
        assert R1 - R2 == n * bounded_delta1

    mapped_values = (n, mb, mc, md, R1, R2, R3, R4, R5)
    degrees = [polynomial.degree(index) for index in range(len(mapped_values))]
    powers = [[one] for _ in mapped_values]
    for axis, value in enumerate(mapped_values):
        for exponent in range(1, degrees[axis] + 1):
            powers[axis].append(powers[axis][-1] * value)

    def terms():
        for monomial, coefficient in polynomial.terms():
            num, den = map(int, sp.fraction(coefficient))
            term = source_context.constant(fmpq(num, den))
            for axis, exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            yield term

    source = balanced_batched_sum(terms(), batch_size=64)
    target_context = fmpq_mpoly_ctx.get((*bounded, "P", "Q"), "degrevlex")
    mapped, degree_p, degree_q, source_terms = compactify(source, target_context, bounded_count=6)
    return target_context, mapped, {
        "source_terms": source_terms,
        "compactification_degrees_p_q": [degree_p, degree_q],
        "abstract_degrees": degrees,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    parser.add_argument("--distance", choices=("two", "far"), required=True)
    parser.add_argument("--mode", choices=("general", "zero", "positive"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7))
    parser.add_argument("--endpoint", choices=("ll", "lh", "hh"), required=True)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    if args.distance == "two":
        assert args.mode == "general"
    else:
        assert args.mode in ("zero", "positive")
    if args.mode == "positive" and args.small_order is not None:
        assert args.small_order >= 1
    empty_d = args.distance == "far" and args.mode == "zero"

    polynomial, scale = abstract(args.endpoint, args.small_order, empty_d)
    context, mapped, map_stats = map_branch(
        polynomial, args.sector, args.distance, args.mode, args.small_order
    )
    mapped_terms = list(mapped.terms())
    degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, 8, chunk_columns=args.chunk_columns
    )
    assert replay_terms == len(mapped_terms)
    negative = sum(value < 0 for value in coefficients.flat)
    zero = sum(value == 0 for value in coefficients.flat)
    minimum = min(coefficients.flat)
    stream = hashlib.sha256()
    for value in coefficients.flat:
        stream.update(f"{value};".encode())
    branch = {
        "sector": args.sector,
        "distance": args.distance,
        "mode": args.mode,
        "small_order": args.small_order,
        "endpoint": args.endpoint,
    }
    report = {
        "marker": MARKER if negative == 0 else "OBSTRUCTION_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_CONE_BRANCH",
        "branch": branch,
        "positive_scale": scale,
        "abstract_terms": len(polynomial.terms()),
        **map_stats,
        "mapped_terms": len(mapped_terms),
        "bernstein_degrees": list(map(int, degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": negative,
        "zero": zero,
        "minimum": str(minimum),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "dependency_sha256": {
            "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py": hashlib.sha256(
                (HERE / "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py").read_bytes()
            ).hexdigest().upper(),
        },
        "status": "exact branch certificate" if negative == 0 else "exact relaxation obstruction; not a forest counterexample",
        "scope": "one analytic connected-nonadjacent M5 adaptive cone branch only",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    suffix = f"{args.sector}_{args.distance}_{args.mode}_{'large' if args.small_order is None else args.small_order}_{args.endpoint}"
    output = HERE / f"iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_{suffix}_g1_bernstein_20260830.json"
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])
    assert negative == 0


if __name__ == "__main__":
    main()
