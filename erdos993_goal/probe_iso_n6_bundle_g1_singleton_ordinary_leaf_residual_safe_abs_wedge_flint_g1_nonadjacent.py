#!/usr/bin/env python3
"""Safe absolute-envelope probe for the singleton-ordinary G1 leaf residual.

The complete canonical leaf delta is

    g2_6(H,H-P) + R(H,K;P,Q).

The first summand uses the existing exact quantitative ordinary-parent G2
lower polynomial.  For the residual, every positive scalar monomial is
dropped and every negative monomial is charged at unconditional occupation
ceilings.  Since K, P, and Q are all induced/loss subsets of H, each of their
W,A,B,Z occupation coordinates is at most the corresponding H coordinate.

This is deliberately coarse and is a probe only.  A pass would be a valid
lower certificate for one wedge shard; a failure is only a route obstruction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent import (
    occupation,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import row_corner
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose
from probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root import (
    MAX_A2_DEN,
    MAX_N_DEN,
    build_source as build_g2_source,
    coefficient_records,
)
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import (
    d_coarse_corner_row,
)


HERE = Path(__file__).resolve().parent
OCCUPATION_REPORT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_"
    "g1_nonadjacent_20260831.json"
)
OCCUPATION_REPORT_SHA256 = (
    "2AC2037F0D5F2F33B306ED325B7573C7F2D3CEBA062CC0335A5FE06187262C4A"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_RESIDUAL_"
    "SAFE_ABS_WEDGE_FLINT_G1_NONADJACENT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def residual_occupation() -> sp.Expr:
    components = build_expressions()
    hrows, krows, jrows, lrows = (symbolic_rows(prefix) for prefix in "HKJL")
    prows, qrows = (symbolic_rows(prefix) for prefix in "PQ")
    jrules = {
        jvalue: hvalue - pvalue
        for jrow, hrow, prow in zip(jrows, hrows, prows)
        for jvalue, hvalue, pvalue in zip(jrow, hrow, prow)
    }
    lrules = {
        lvalue: kvalue - qvalue
        for lrow, krow, qrow in zip(lrows, krows, qrows)
        for lvalue, kvalue, qvalue in zip(lrow, krow, qrow)
    }
    residual = sp.expand(
        components["F"] + components["QHL"] + components["QHJ"]
        + components["QKJ"] + components["T"]
    ).subs(jrules | lrules)
    rules = {}
    for prefix, rows in (("H", hrows), ("K", krows), ("P", prows), ("Q", qrows)):
        rules.update(occupation(prefix, rows)[0])
    return sp.expand(residual.subs(rules))


RESIDUAL = residual_occupation()


def build_rows(context, geometry, chart, bmask, cmask, d2mask):
    x, y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 19 + h
    if geometry == "common0":
        union_order = n
        edge_extra = one
    else:
        assert geometry == "common1"
        union_order = n - 1
        edge_extra = one * 0
    if chart == "low":
        mb = 7 + (union_order - 14) * x * fmpq(1, 2)
        mc = union_order - mb + mb * y
        d = mb * y
    else:
        assert chart == "high"
        mb = union_order * (one + x) * fmpq(1, 2)
        mc = mb + (union_order - mb) * y
        d = mb + mc - union_order
    edges = (d + edge_extra) * z
    omega = edges**2 * w * fmpq(1, 2)
    a2 = choose(n, 2, one) - edges
    a3 = choose(n, 3, one) - edges * (n - 2) + omega
    budget_num = 6 * n * a3 - 4 * n * a2
    r3_num = 3 * n * a2 + budget_num * (u0 + u1 + u2 + u3)
    r4_num = 2 * n * a2 + budget_num * (u0 + u1 + u2)
    r5_num = n * a2 + budget_num * (u0 + u1)
    r6_num = budget_num * u0
    arow = (
        (one, 0, 0),
        (n, 0, 0),
        (a2, 0, 0),
        (a3, 0, 0),
        (a3 * r3_num * fmpq(1, 8), 1, 1),
        (a3 * r3_num * r4_num * fmpq(1, 80), 2, 2),
        (a3 * r3_num * r4_num * r5_num * fmpq(1, 960), 3, 3),
        (a3 * r3_num * r4_num * r5_num * r6_num * fmpq(1, 13440), 4, 4),
    )
    brow = row_corner(mb, bmask, one, reduced=True)
    crow = row_corner(mc, cmask, one, reduced=True)
    drow = d_coarse_corner_row(d, d2mask, one)
    return n, a2, arow, brow, crow, drow


def cap_entry(symbol: sp.Symbol, arow, brow, crow, drow):
    name = str(symbol)
    assert name[0] in "HKPQ" and name[1] in "WABZ"
    family, rank = name[1], int(name[2:])
    if family == "W":
        row, shifted = arow, rank
    elif family == "A":
        row, shifted = brow, rank - 1
    elif family == "B":
        row, shifted = crow, rank - 1
    else:
        row, shifted = drow, rank - 2
    if shifted < 0 or shifted >= len(row):
        return None
    return row[shifted]


def negative_residual_envelope(n, a2, arow, brow, crow, drow):
    variables = tuple(sorted(RESIDUAL.free_symbols, key=str))
    polynomial = sp.Poly(RESIDUAL, *variables)
    charges = []
    negative_terms = 0
    zero_cap_terms = 0
    maximum_n_den = 0
    maximum_a2_den = 0
    for exponents, coefficient in polynomial.terms():
        if coefficient >= 0:
            continue
        negative_terms += 1
        numerator = arow[0][0] * int(-coefficient)
        n_den = 0
        a2_den = 0
        zero_cap = False
        for variable, exponent in zip(variables, exponents):
            if not exponent:
                continue
            entry = cap_entry(variable, arow, brow, crow, drow)
            if entry is None:
                zero_cap = True
                break
            value, dn, da = entry
            numerator *= value**exponent
            n_den += dn * exponent
            a2_den += da * exponent
        if zero_cap:
            zero_cap_terms += 1
            continue
        assert n_den <= MAX_N_DEN and a2_den <= MAX_A2_DEN, (
            coefficient, exponents, n_den, a2_den
        )
        maximum_n_den = max(maximum_n_den, n_den)
        maximum_a2_den = max(maximum_a2_den, a2_den)
        charges.append(
            numerator * n ** (MAX_N_DEN - n_den)
            * a2 ** (MAX_A2_DEN - a2_den)
        )
    return balanced_batched_sum(charges, batch_size=32), {
        "negative_scalar_monomials": negative_terms,
        "zero_actual_cap_monomials": zero_cap_terms,
        "charged_monomials": len(charges),
        "maximum_N_denominator": maximum_n_den,
        "maximum_a2_denominator": maximum_a2_den,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument("--order-chart", choices=("low", "high"), required=True)
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--inspect-only", action="store_true")
    args = parser.parse_args()
    assert sha256(OCCUPATION_REPORT) == OCCUPATION_REPORT_SHA256

    names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    g2_lower, _signs, _uncertain, g2_metadata = build_g2_source(
        context, args.geometry, args.order_chart,
        args.b_mask, args.c_mask, args.d2_mask
    )
    n, a2, arow, brow, crow, drow = build_rows(
        context, args.geometry, args.order_chart,
        args.b_mask, args.c_mask, args.d2_mask
    )
    envelope, envelope_metadata = negative_residual_envelope(
        n, a2, arow, brow, crow, drow
    )
    complete_lower = g2_lower - envelope
    inspect = {
        "geometry": args.geometry,
        "order_chart": args.order_chart,
        "B_mask": args.b_mask,
        "C_mask": args.c_mask,
        "D2_mask": args.d2_mask,
        "g2_lower_terms": len(list(g2_lower.terms())),
        "residual_envelope_terms": len(list(envelope.terms())),
        "complete_lower_terms": len(list(complete_lower.terms())),
        "envelope": envelope_metadata,
        "positive_multiplier": "N^4*a2^4",
        "g2_metadata": g2_metadata,
    }
    print(json.dumps(inspect, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    coefficient_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "h"), "degrevlex")
    target_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "H"), "degrevlex")
    certificate = coefficient_records(
        complete_lower, coefficient_context, target_context,
        "ordinary_g2_plus_safe_absolute_residual_lower", args.chunk_columns
    )
    report = {
        "marker": MARKER,
        **inspect,
        "lower_certificate": certificate,
        "negative_lower_controls": certificate["negative"],
        "minimum": certificate["minimum"],
        "scope": (
            "N>=19, one nonadjacent geometry/chart/corner; safe but deliberately "
            "coarse relaxation probe only"
        ),
        "occupation_report_sha256": OCCUPATION_REPORT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_residual_safe_abs_wedge_"
        f"{args.geometry}_{args.order_chart}_B{args.b_mask}_C{args.c_mask}_"
        f"D2{args.d2_mask}_flint_probe_g1_nonadjacent_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_lower_controls": report["negative_lower_controls"],
        "minimum": report["minimum"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
