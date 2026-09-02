#!/usr/bin/env python3
"""Exact N>=19 wedge/simplex shard for nonadjacent no-parent rank-six g1.

The literal no_parent_k0 occupation identity is evaluated after the proved
32-corner endpoint reduction.  Each shard certifies one common-neighbor
geometry, one induced-order chart, and one of the five endpoint bits.  This
producer is fail-closed: a theorem requires the complete matrix, finite-order
coverage, an assembler, and an independent replay.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, path_floor, sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    compactify_one,
    row_corner,
    scaled_bilinear,
    split_simplex,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / "iso_n6_bundle_g1_no_parent_occupation_exact_g1_nonadjacent_20260831.json"
OCCUPATION_SHA256 = "5153BD29BE22ABC6C1FE693A8C32E7988BF07AC54844707447C32332E1C4AE9A"
REDUCTION = HERE / "iso_n6_bundle_g1_no_parent_wedge_corner_reduction_exact_g1_nonadjacent_20260831.json"
REDUCTION_SHA256 = "32903FE61BE8371D9890A0712417F3A1171001CAC24A30EDF2E01C0CE07F3F7D"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_NO_PARENT_NONADJACENT_WEDGE_SIMPLEX_FLINT_G1_NONADJACENT"


AA_TERMS = (
    (4, 2, 4), (-2, 2, 5), (-17, 2, 6), (-7, 2, 7),
    (4, 3, 3), (10, 3, 4), (-4, 3, 5), (-9, 3, 6),
    (13, 4, 4), (8, 4, 5),
)
AB_TERMS = (
    (4, 2, 3), (-16, 2, 5), (-7, 2, 6),
    (4, 3, 2), (8, 3, 3), (12, 3, 4), (-2, 3, 5),
    (12, 4, 3), (10, 4, 4),
    (-16, 5, 2), (-2, 5, 3), (-7, 6, 2),
)
BC_TERMS = (
    (4, 2, 2), (2, 2, 3), (-15, 2, 4), (-7, 2, 5),
    (2, 3, 2), (26, 3, 3), (5, 3, 4),
    (-15, 4, 2), (5, 4, 3), (-7, 5, 2),
)
# AD has the same coefficient table as BC with A in the left slot.
AD_TERMS = BC_TERMS


def induced_row(order, mask: int, one):
    """Ranks 2,3 are the two free endpoint bits; 4 lower; 5,6 upper."""
    return row_corner(order, mask, one, reduced=False)[:4] + (
        (path_floor(order, 4, one), 0, 0),
        (choose(order, 5, one), 0, 0),
        (choose(order, 6, one), 0, 0),
    )


def intersection_row(order, d2_mask: int, one):
    """D2 is free; D3,D4 lower; D5 upper."""
    return (
        (one, 0, 0),
        (order, 0, 0),
        (
            choose(order, 2, one) if d2_mask else path_floor(order, 2, one),
            0, 0,
        ),
        (path_floor(order, 3, one), 0, 0),
        (path_floor(order, 4, one), 0, 0),
        (choose(order, 5, one), 0, 0),
    )


def build_source(context, geometry: str, chart: str,
                 bmask: int, cmask: int, d2mask: int):
    x, y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 19 + h
    if geometry == "common0":
        union_order = n
        edge_extra = one
        geometry_text = "no common neighbor; d=mB+mC-N; e(A)<=(d+1)"
    else:
        assert geometry == "common1"
        union_order = n - 1
        edge_extra = one * 0
        geometry_text = "one common neighbor; d=mB+mC-N+1; e(A)<=d"
    if chart == "low":
        mb = 7 + (union_order - 14) * x * fmpq(1, 2)
        mc = union_order - mb + mb * y
        d = mb * y
        order_text = "mB=7+(union_order-14)*x/2; mC=union_order-mB+mB*y"
    else:
        assert chart == "high"
        mb = union_order * (one + x) * fmpq(1, 2)
        mc = mb + (union_order - mb) * y
        d = mb + mc - union_order
        order_text = "mB=union_order*(1+x)/2; mC=mB+(union_order-mB)*y"

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
    brow = induced_row(mb, bmask, one)
    crow = induced_row(mc, cmask, one)
    drow = intersection_row(d, d2mask, one)
    source = balanced_batched_sum((
        scaled_bilinear(arow, arow, AA_TERMS, n, a2),
        scaled_bilinear(arow, brow, AB_TERMS, n, a2),
        scaled_bilinear(arow, crow, AB_TERMS, n, a2),
        scaled_bilinear(brow, crow, BC_TERMS, n, a2),
        scaled_bilinear(arow, drow, AD_TERMS, n, a2),
    ), batch_size=5)
    return source, {
        "geometry": geometry,
        "geometry_description": geometry_text,
        "order_chart": chart,
        "order_parameterization": order_text,
        "common_row_order": "N=19+h",
        "B_mask_B2_B3": bmask,
        "C_mask_C2_C3": cmask,
        "D2_mask": d2mask,
        "positive_multiplier": "N^4*a2^4",
        "edge_wedge": "e=edge_cap*z; Omega=e^2*w/2",
        "simplex": "u0+u1+u2+u3+u4=1",
    }


def coefficient_records_slice(polynomial, coefficient_context, target_context,
                              start_beta: int, max_betas: int,
                              chunk_columns: int):
    simplex_degree, betas, coefficients, grouped = split_simplex(
        polynomial, coefficient_context, prefix_count=4, tail_count=1
    )
    stop = min(len(coefficients), start_beta + max_betas)
    records = []
    digest = hashlib.sha256()
    for beta_index in range(start_beta, stop):
        mapped, degree_h, coefficient_terms = compactify_one(
            coefficients[beta_index], target_context, bounded_count=4
        )
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 5, chunk_columns=chunk_columns
        )
        assert replay_terms == len(list(mapped.terms()))
        record = {
            "beta_index": beta_index,
            "beta": betas[beta_index],
            "coefficient_terms": coefficient_terms,
            "compactification_degree_h": degree_h,
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(values.size),
            "negative": sum(1 for value in values.flat if value < 0),
            "zero": sum(1 for value in values.flat if value == 0),
            "minimum": str(min(values.flat)),
        }
        records.append(record)
        digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
        print(json.dumps(record, sort_keys=True), flush=True)
    return {
        "simplex_degree": simplex_degree,
        "raw_simplex_monomials": grouped,
        "homogeneous_simplex_coefficients": len(coefficients),
        "start_beta": start_beta,
        "stop_beta": stop,
        "processed_betas": len(records),
        "negative": sum(row["negative"] for row in records),
        "zero": sum(row["zero"] for row in records),
        "minimum": str(min(fmpq(row["minimum"]) for row in records)),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument("--order-chart", choices=("low", "high"), required=True)
    parser.add_argument("--b-mask", type=int, choices=range(4), required=True)
    parser.add_argument("--c-mask", type=int, choices=range(4), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1_000_000)
    parser.add_argument("--inspect-only", action="store_true")
    args = parser.parse_args()
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(REDUCTION) == REDUCTION_SHA256
    names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = build_source(
        context, args.geometry, args.order_chart,
        args.b_mask, args.c_mask, args.d2_mask,
    )
    inspect = {**metadata, "source_terms": len(list(source.terms()))}
    print(json.dumps(inspect, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    coefficient_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "h"), "degrevlex")
    target_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "H"), "degrevlex")
    certificate = coefficient_records_slice(
        source, coefficient_context, target_context,
        args.start_beta, args.max_betas, args.chunk_columns,
    )
    report = {
        "marker": MARKER,
        **inspect,
        "certificate": certificate,
        "negative": certificate["negative"],
        "zero": certificate["zero"],
        "scope": "one N>=19 nonadjacent no-parent rank-six g1 geometry/chart/corner shard",
        "occupation_report_sha256": OCCUPATION_SHA256,
        "corner_reduction_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g1_no_parent_nonadjacent_wedge_simplex_"
        f"{args.geometry}_{args.order_chart}_B{args.b_mask}_C{args.c_mask}_D2{args.d2_mask}_"
        f"beta{certificate['start_beta']}_{certificate['stop_beta']}_"
        "flint_probe_g1_nonadjacent_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative": certificate["negative"],
        "zero": certificate["zero"],
        "minimum": certificate["minimum"],
        "simplex_coefficients": certificate["homogeneous_simplex_coefficients"],
        "tensor_bernstein_coefficients": sum(row["bernstein_coefficients"] for row in certificate["records"]),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
