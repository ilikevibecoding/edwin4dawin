#!/usr/bin/env python3
"""Exact Bernstein shards for endpoint-parent g2 with one small induced row."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq_mpoly_ctx

from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import compactify_one, split_simplex
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import (
    OCCUPATION,
    OCCUPATION_SHA256,
    REDUCTION,
    REDUCTION_SHA256,
    scaled_source,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_SMALL_ORDER_FLINT_RANK7_G5_FINISH"


def build_source(context, small_side, small_order, bmask, cmask):
    y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 19 + h
    small = context.constant(small_order)
    large = n - small + small*y
    if small_side == "B":
        mb, mc = small, large
    else:
        mb, mc = large, small
    overlap = small*y
    source = scaled_source(
        n, mb, mc, overlap, z, w, (u0, u1, u2, u3, u4),
        bmask, cmask, one,
    )
    return source, {
        "mode": "endpoint_u",
        "small_side": small_side,
        "small_order": small_order,
        "B_mask": bmask,
        "C_mask": cmask,
        "positive_multiplier": "N^4*a2^4",
        "geometry": (
            f"N=19+h; small={small_side}={small_order}; large=N-small+small*y; "
            "overlap=small*y; e=overlap*z; Omega=e^2*w/2"
        ),
        "simplex": "u0+u1+u2+u3+u4=1",
        "reduced_four_corner_mode": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--small-side", choices=("B", "C"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7), required=True)
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1_000_000)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(REDUCTION) == REDUCTION_SHA256

    names = ("y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = build_source(
        source_context, args.small_side, args.small_order, args.b_mask, args.c_mask
    )
    source_terms = list(source.terms())
    source_degrees = {
        name: int(max(monomial[axis] for monomial, _ in source_terms))
        for axis, name in enumerate(names)
    }
    coefficient_context = fmpq_mpoly_ctx.get(("y", "z", "w", "h"), "degrevlex")
    simplex_degree, betas, coefficients, grouped = split_simplex(
        source, coefficient_context, prefix_count=3, tail_count=1
    )
    summary = {
        **metadata,
        "source_terms": len(source_terms),
        "source_degrees": source_degrees,
        "simplex_degree": simplex_degree,
        "raw_simplex_monomials": grouped,
        "homogeneous_simplex_coefficients": len(betas),
    }
    print(json.dumps(summary, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    stop = min(len(betas), args.start_beta + args.max_betas)
    target_context = fmpq_mpoly_ctx.get(("y", "z", "w", "H"), "degrevlex")
    records = []
    digest = hashlib.sha256()
    for beta_index in range(args.start_beta, stop):
        mapped, degree_h, coefficient_terms = compactify_one(
            coefficients[beta_index], target_context, bounded_count=3
        )
        mapped_terms = list(mapped.terms())
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 4, chunk_columns=args.chunk_columns
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
            "compactification_degree_h": degree_h,
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
        "negative_betas": sum(record["negative"] > 0 for record in records),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "adjacent endpoint-parent rank-six g2; N>=19; one induced order 0..6",
        "occupation_report_sha256": OCCUPATION_SHA256,
        "four_corner_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_adjacent_endpoint_small_order_"
        f"{args.small_side}{args.small_order}_B{args.b_mask}_C{args.c_mask}_"
        f"beta{args.start_beta}_{stop}_flint_rank7_g5_finish_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
