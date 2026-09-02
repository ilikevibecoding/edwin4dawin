#!/usr/bin/env python3
"""Exact-arithmetic Bernstein probe for the stable internal-ordinary g2 origin.

No theorem marker is emitted.  The exact deletion partition and forest
coefficient bounds are valid, but this exploratory program scans fixed convex
weights/cutoffs and reports whether the resulting deliberately loose box has
nonnegative tensor-Bernstein controls.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt import (
    stable_forms,
)
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from explore_rank4_three_halves_grouped import tensor_bernstein_fast
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_BERNSTEIN_ROOT"


def parse_rational(value: str) -> sp.Rational:
    parsed = sp.Rational(value)
    if parsed < 0 or parsed > 1:
        raise argparse.ArgumentTypeError("weight must lie in [0,1]")
    return parsed


def path_floor(order, rank):
    return choose_polynomial(order - rank + 1, rank)


def edge_union_floor(order, edges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
    )


def build_face(origin, rows, epsilon, theta, lam, cutoff):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    edge_by_row = {a: ea, b: eb, c: ec, d: ed}
    remaining = {}
    for row, order, start in ((a, n, 4), (b, nb, 3), (c, nc, 3), (d, nd, 3)):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    high_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base_variables, *high_variables)

    partition = {}
    for rank in range(1, 7):
        partition.update({
            rows["W"][rank]: at(a, rank),
            rows["P"][rank]: at(a, rank) + at(b, rank - 1),
            rows["V"][rank]: at(a, rank) + at(c, rank - 1),
            rows["E"][rank]: (
                at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                + epsilon * at(d, rank - 2)
            ),
        })
    exact = sp.Poly(sp.expand(origin.subs(partition).subs(low_rules)), *variables)
    lower = sp.Integer(0)
    positive_high = negative_high = 0
    for powers, coefficient in exact.terms():
        high_powers = powers[len(base_variables):]
        assert sum(high_powers) <= 1
        term = coefficient
        for variable, power in zip(base_variables, powers[:len(base_variables)]):
            term *= variable**power
        if any(high_powers):
            variable = high_variables[high_powers.index(1)]
            order, edges, rank = remaining[variable]
            if coefficient > 0:
                positive_high += 1
                bound = sp.expand(
                    lam * path_floor(order, rank)
                    + (1 - lam) * edge_union_floor(order, edges, rank)
                )
            else:
                negative_high += 1
                wedges = qa if order == n else edges * (edges - 1) / 2
                bound = sp.expand(
                    theta * multiplicity_upper(order, edges, rank)
                    + (1 - theta) * bonferroni_upper(order, edges, wedges, rank)
                )
            term *= bound
        lower += term

    x, y, z, u, v, s, w, r, t = sp.symbols(
        "x y z u v s w r t", nonnegative=True
    )
    normalized = sp.expand(lower.subs({
        nb: n * x,
        nc: n * y,
        nd: n * z,
        ea: n * u,
        qa: n**2 * u**2 * v / 2,
        eb: n * x * s,
        ec: n * y * w,
        ed: n * z * r,
    }).subs(n, cutoff + t))
    box = (x, y, u, v, s, w) if epsilon == 0 else (x, y, z, u, v, s, w, r)
    degrees, controls = tensor_bernstein_fast(normalized, box)
    negative_rows = []
    zero_count = coefficient_count = 0
    minimum = None
    for control_index, value in enumerate(controls.flat):
        coefficients = sp.Poly(value, t).all_coeffs()
        for power_index, coefficient in enumerate(coefficients):
            coefficient_count += 1
            if minimum is None or coefficient < minimum:
                minimum = coefficient
            if coefficient == 0:
                zero_count += 1
            elif coefficient < 0 and len(negative_rows) < 20:
                negative_rows.append({
                    "control_flat_index": control_index,
                    "power_coefficient_index": power_index,
                    "value": str(coefficient),
                })
    all_negative_count = sum(
        1
        for value in controls.flat
        for coefficient in sp.Poly(value, t).all_coeffs()
        if coefficient < 0
    )
    stream = "".join(f"{index}:{sp.sstr(value)};" for index, value in enumerate(controls.flat))
    return {
        "epsilon": epsilon,
        "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
        "expanded_monomials": len(exact.terms()),
        "positive_high_monomials": positive_high,
        "negative_high_monomials": negative_high,
        "box_variables": [str(value) for value in box],
        "bernstein_degrees": list(degrees),
        "bernstein_controls": int(controls.size),
        "power_coefficients": coefficient_count,
        "negative_power_coefficients": all_negative_count,
        "zero_power_coefficients": zero_count,
        "minimum_power_coefficient": str(minimum),
        "first_negative_rows": negative_rows,
        "control_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, default=11)
    parser.add_argument("--theta", type=parse_rational, default=sp.Rational(1, 2))
    parser.add_argument("--lambda-floor", type=parse_rational, default=sp.Rational(1, 2))
    parser.add_argument("--ell", type=int, choices=range(1, 9), default=8)
    parser.add_argument("--k-index", type=int, choices=range(0, 6), default=0)
    args = parser.parse_args()
    if args.ell == 8:
        degrees, cells, rows = stable_forms()
        assert degrees == (5, 5)
        target = cells[(0, args.k_index)]
        chart = "stable h=0"
    else:
        expression, rows = ordinary_expression()
        k = sp.symbols("k", integer=True, nonnegative=True)
        xrow, urow, yrow, zrow = child_rows(args.ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degrees, cells = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        assert degrees == (5,)
        target = cells[(args.k_index,)]
        chart = "literal small length"
    faces = [
        build_face(target, rows, epsilon, args.theta, args.lambda_floor, args.cutoff)
        for epsilon in (0, 1)
    ]
    report = {
        "marker": MARKER,
        "ell": args.ell,
        "k_index": args.k_index,
        "chart": chart,
        "cutoff_A_order": args.cutoff,
        "negative_upper_blend_theta": str(args.theta),
        "positive_lower_path_blend_lambda": str(args.lambda_floor),
        "faces": faces,
        "all_nonnegative": all(face["negative_power_coefficients"] == 0 for face in faces),
        "scope": "Exact-arithmetic diagnostic only; no theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    suffix = (
        f"ell{args.ell}_k{args.k_index}_n{args.cutoff}_"
        f"theta{str(args.theta).replace('/', '_')}_"
        f"lambda{str(args.lambda_floor).replace('/', '_')}"
    )
    output = HERE / f"iso_n5_g2_internal_ordinary_origin_bernstein_probe_{suffix}_root_20260830.json"
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cutoff_A_order": args.cutoff,
        "ell": args.ell,
        "k_index": args.k_index,
        "theta": str(args.theta),
        "lambda": str(args.lambda_floor),
        "faces": [
            {
                "geometry": face["geometry"],
                "controls": face["bernstein_controls"],
                "negative": face["negative_power_coefficients"],
                "minimum": face["minimum_power_coefficient"],
            }
            for face in faces
        ],
        "all_nonnegative": report["all_nonnegative"],
    }, indent=2, sort_keys=True))
    print("OUTPUT", output.name)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
