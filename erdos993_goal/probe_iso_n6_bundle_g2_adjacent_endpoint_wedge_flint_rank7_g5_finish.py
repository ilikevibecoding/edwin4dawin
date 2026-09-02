#!/usr/bin/env python3
"""Exact wedge/simplex Bernstein shards for adjacent endpoint-parent g2."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    L2_TERMS,
    compactify_one,
    row_corner,
    scaled_bilinear,
    split_simplex,
)


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / "iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_rank7_g5_finish_20260831.json"
OCCUPATION_SHA256 = "E3085D7739627E4BAB837208DFF2E8DBCA1A97ACB5073538398F2E3BE17377CD"
REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "CC5E2172087C7CE76992B680F1CC84E1E44A2A31F64FCA92ED0C9AFA989E9E38"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_WEDGE_FLINT_RANK7_G5_FINISH"
MAX_N_DEN = 4
MAX_A2_DEN = 4


M2_TERMS = (
    (2, 1, 3), (-9, 1, 5), (-7, 1, 6),
    (6, 2, 2), (7, 2, 3), (-9, 2, 4), (-9, 2, 5),
    (4, 3, 1), (10, 3, 2), (19, 3, 3), (8, 3, 4),
    (-1, 4, 1), (3, 4, 2), (8, 4, 3),
    (-16, 5, 1), (-9, 5, 2), (-7, 6, 1),
)
R2_TERMS = (
    (2, 1, 2), (1, 1, 3), (-8, 1, 4), (-7, 1, 5),
    (4, 2, 1), (6, 2, 2), (-1, 2, 3), (-2, 2, 4),
    (1, 3, 1), (18, 3, 2), (10, 3, 3),
    (-15, 4, 1), (-2, 4, 2), (-7, 5, 1),
)


def scaled_source(n, mb, mc, overlap, z, w, simplex, bmask, cmask, one):
    u0, u1, u2, u3, u4 = simplex
    edges = overlap * z
    omega = edges**2 * w * fmpq(1, 2)
    a2 = choose(n, 2, one) - edges
    a3 = choose(n, 3, one) - edges*(n-2) + omega
    budget_num = 6*n*a3 - 4*n*a2
    r3_num = 3*n*a2 + budget_num*(u0+u1+u2+u3)
    r4_num = 2*n*a2 + budget_num*(u0+u1+u2)
    r5_num = n*a2 + budget_num*(u0+u1)
    r6_num = budget_num*u0
    a = (
        (one, 0, 0), (n, 0, 0), (a2, 0, 0), (a3, 0, 0),
        (a3*r3_num*fmpq(1, 8), 1, 1),
        (a3*r3_num*r4_num*fmpq(1, 80), 2, 2),
        (a3*r3_num*r4_num*r5_num*fmpq(1, 960), 3, 3),
        (a3*r3_num*r4_num*r5_num*r6_num*fmpq(1, 13440), 4, 4),
    )
    b = row_corner(mb, bmask, one, reduced=True)
    c = row_corner(mc, cmask, one, reduced=True)
    return balanced_batched_sum((
        scaled_bilinear(a, a, A2_TERMS, n, a2),
        scaled_bilinear(a, b, L2_TERMS, n, a2),
        scaled_bilinear(a, c, M2_TERMS, n, a2),
        scaled_bilinear(b, c, R2_TERMS, n, a2),
    ), batch_size=4)


def source_polynomial(context, chart, orientation, bmask, cmask):
    x, y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 14 + h
    if orientation == "B_le_C":
        if chart == "low":
            mb = 7 + h*x*fmpq(1, 2)
            mc = n-mb + mb*y
            overlap = mb*y
            geometry = "7<=mB<=N/2; mC=N-mB+mB*y"
        else:
            mb = n*(one+x)*fmpq(1, 2)
            mc = mb + (n-mb)*y
            overlap = mb+mc-n
            geometry = "N/2<=mB<=mC<=N"
    else:
        assert orientation == "B_ge_C"
        if chart == "low":
            mc = 7 + h*x*fmpq(1, 2)
            mb = n-mc + mc*y
            overlap = mc*y
            geometry = "7<=mC<=N/2; mB=N-mC+mC*y"
        else:
            mc = n*(one+x)*fmpq(1, 2)
            mb = mc + (n-mc)*y
            overlap = mb+mc-n
            geometry = "N/2<=mC<=mB<=N"
    source = scaled_source(
        n, mb, mc, overlap, z, w, (u0, u1, u2, u3, u4),
        bmask, cmask, one,
    )
    return source, {
        "mode": "endpoint_u",
        "B_mask": bmask,
        "C_mask": cmask,
        "positive_multiplier": "N^4*a2^4",
        "geometry": f"N=14+h; {geometry}; e=overlap*z; Omega=e^2*w/2",
        "order_chart": chart,
        "orientation": orientation,
        "simplex": "u0+u1+u2+u3+u4=1",
        "reduced_four_corner_mode": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--b-mask", type=int, choices=(0, 1), default=0)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), default=0)
    parser.add_argument("--order-chart", choices=("low", "high"), required=True)
    parser.add_argument("--orientation", choices=("B_le_C", "B_ge_C"), required=True)
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1_000_000)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(REDUCTION) == REDUCTION_SHA256

    names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    coefficient_names = ("x", "y", "z", "w", "h")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = source_polynomial(
        source_context, args.order_chart, args.orientation, args.b_mask, args.c_mask
    )
    source_terms = list(source.terms())
    source_degrees = [int(max(monomial[axis] for monomial, _ in source_terms)) for axis in range(len(names))]
    coefficient_context = fmpq_mpoly_ctx.get(coefficient_names, "degrevlex")
    simplex_degree, betas, coefficients, grouped = split_simplex(
        source, coefficient_context, 4, 1
    )
    summary = {
        **metadata,
        "source_terms": len(source_terms),
        "source_degrees": dict(zip(names, source_degrees)),
        "simplex_degree": simplex_degree,
        "raw_simplex_monomials": grouped,
        "homogeneous_simplex_coefficients": len(betas),
    }
    print(json.dumps(summary, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    stop = min(len(betas), args.start_beta + args.max_betas)
    target_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "H"), "degrevlex")
    records = []
    digest = hashlib.sha256()
    for beta_index in range(args.start_beta, stop):
        mapped, degree_h, coefficient_terms = compactify_one(
            coefficients[beta_index], target_context, 4
        )
        mapped_terms = list(mapped.terms())
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 5, chunk_columns=args.chunk_columns
        )
        assert replay_terms == len(mapped_terms)
        minimum = min(values.flat)
        minimum_flat_index = min(range(values.size), key=lambda index: values.flat[index])
        minimum_multiindex = list(map(int, __import__("numpy").unravel_index(minimum_flat_index, values.shape)))
        stream = hashlib.sha256()
        for value in values.flat:
            stream.update(f"{value};".encode())
        record = {
            "beta_index": beta_index,
            "beta": betas[beta_index],
            "coefficient_terms": coefficient_terms,
            "compactification_degrees_tail": [degree_h],
            "mapped_terms": len(mapped_terms),
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(values.size),
            "negative": sum(1 for value in values.flat if value < 0),
            "zero": sum(1 for value in values.flat if value == 0),
            "minimum": str(minimum),
            "minimum_multiindex": minimum_multiindex,
            "coefficient_stream_sha256": stream.hexdigest().upper(),
        }
        records.append(record)
        digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
        print(json.dumps(record, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        **summary,
        "start_beta": args.start_beta,
        "stop_beta": stop,
        "processed_betas": len(records),
        "negative_betas": sum(row["negative"] > 0 for row in records),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "large ordered adjacent endpoint-parent rank-six g2 wedge/simplex shard",
        "occupation_report_sha256": OCCUPATION_SHA256,
        "four_corner_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_adjacent_endpoint_wedge_"
        f"{args.orientation}_{args.order_chart}_B{args.b_mask}_C{args.c_mask}_"
        f"beta{args.start_beta}_{stop}_flint_rank7_g5_finish_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
