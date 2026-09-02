#!/usr/bin/env python3
"""Exact N>=19 endpoint-parent G2 shards with one induced row of order 0..6."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish import (
    M2_TERMS,
    R2_TERMS,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, sha256
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    L2_TERMS,
    compactify_one,
    row_corner,
    scaled_bilinear,
    split_simplex,
)
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import (
    d_coarse_corner_row,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
    "exact_root_20260831.json"
)
OCCUPATION_SHA256 = (
    "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437"
)
REDUCTION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
    "exact_root_20260831.json"
)
REDUCTION_SHA256 = (
    "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "WEDGE_SMALL_ORDER_FLINT_ROOT"
)


def build_source(context, geometry: str, small_order: int, orientation: str,
                 bmask: int, cmask: int, d2mask: int):
    y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 19 + h
    small = context.constant(small_order)
    if geometry == "common0":
        union_order = n
        edge_extra = one
    else:
        assert geometry == "common1"
        union_order = n - 1
        edge_extra = one * 0
    d = small * y
    large = union_order - small + d
    if orientation == "B_small":
        mb, mc = small, large
    else:
        assert orientation == "C_small"
        mb, mc = large, small

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
        (
            a3 * r3_num * r4_num * r5_num * r6_num * fmpq(1, 13440),
            4,
            4,
        ),
    )
    brow = row_corner(mb, bmask, one, reduced=True)
    crow = row_corner(mc, cmask, one, reduced=True)
    drow = d_coarse_corner_row(d, d2mask, one)
    source = balanced_batched_sum((
        scaled_bilinear(arow, arow, A2_TERMS, n, a2),
        scaled_bilinear(arow, brow, L2_TERMS, n, a2),
        scaled_bilinear(arow, crow, M2_TERMS, n, a2),
        scaled_bilinear(brow, crow, R2_TERMS, n, a2),
        scaled_bilinear(arow, drow, R2_TERMS, n, a2),
    ), batch_size=5)
    return source, {
        "geometry": geometry,
        "small_order": small_order,
        "orientation": orientation,
        "B_mask": bmask,
        "C_mask": cmask,
        "D2_mask": d2mask,
        "positive_multiplier": "N^4*a2^4",
        "functional": "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)",
        "parameterization": (
            f"N=19+h; union_order={'N' if geometry == 'common0' else 'N-1'}; "
            f"small={small_order}; d=small*y; large=union_order-small+d; "
            "e=(d+edge_extra)z; Omega=e^2*w/2"
        ),
        "simplex": "u0+u1+u2+u3+u4=1",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7), required=True)
    parser.add_argument(
        "--orientation", choices=("B_small", "C_small"), required=True
    )
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
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
        source_context,
        args.geometry,
        args.small_order,
        args.orientation,
        args.b_mask,
        args.c_mask,
        args.d2_mask,
    )
    source_terms = list(source.terms())
    coefficient_context = fmpq_mpoly_ctx.get(("y", "z", "w", "h"), "degrevlex")
    simplex_degree, betas, coefficients, grouped = split_simplex(
        source, coefficient_context, prefix_count=3, tail_count=1
    )
    summary = {
        **metadata,
        "source_terms": len(source_terms),
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
        mapped, degree_h, coefficient_term_count = compactify_one(
            coefficients[beta_index], target_context, bounded_count=3
        )
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 4, chunk_columns=args.chunk_columns
        )
        assert replay_terms == len(list(mapped.terms()))
        minimum = min(values.flat)
        record = {
            "beta_index": beta_index,
            "beta": betas[beta_index],
            "coefficient_terms": coefficient_term_count,
            "compactification_degree_h": degree_h,
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(values.size),
            "negative": sum(1 for value in values.flat if value < 0),
            "zero": sum(1 for value in values.flat if value == 0),
            "minimum": str(minimum),
        }
        records.append(record)
        digest.update(json.dumps(
            record, separators=(",", ":"), sort_keys=True
        ).encode())
        print(json.dumps(record, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        **summary,
        "start_beta": args.start_beta,
        "stop_beta": stop,
        "processed_betas": len(records),
        "negative_betas": sum(record["negative"] > 0 for record in records),
        "negative_controls": sum(record["negative"] for record in records),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": (
            "N>=19 nonadjacent endpoint-parent rank-six G2; one fixed small "
            "induced order/orientation and one B2/C2/D2 corner"
        ),
        "occupation_report_sha256": OCCUPATION_SHA256,
        "reduction_report_sha256": REDUCTION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_endpoint_wedge_small_order_"
        f"{args.geometry}_k{args.small_order}_{args.orientation}_"
        f"B{args.b_mask}_C{args.c_mask}_D2{args.d2_mask}_"
        f"beta{args.start_beta}_{stop}_flint_probe_root_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "processed_betas": len(records),
        "negative_betas": report["negative_betas"],
        "negative_controls": report["negative_controls"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
