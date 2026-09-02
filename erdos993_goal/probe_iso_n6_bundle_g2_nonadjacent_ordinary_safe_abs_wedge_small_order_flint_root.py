#!/usr/bin/env python3
"""Exact N>=19 ordinary-parent shards with the smaller induced row of order 0..6.

Five manifestly positive parent-loss terms are discarded, three manifestly
negative terms are paid exactly at their subset ceilings, and the remaining
eight terms are charged by unconditional absolute subset envelopes.  This
keeps the boundary argument sign-safe without the overpayment of the initial
all-absolute probe.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
    OCCUPATION_SHA256,
    compactify_one,
    row_corner,
    scaled_bilinear,
    sha256,
    split_simplex,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose
from probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root import (
    coefficient_terms,
    scaled_linear,
)
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import (
    d_coarse_corner_row,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
LOSS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_SHA256 = "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SAFE_ABS_"
    "WEDGE_SMALL_ORDER_FLINT_ROOT"
)


def build_source(context, geometry: str, small_order: int,
                 bmask: int, cmask: int, d2mask: int):
    y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = 19 + h
    mb = context.constant(small_order)
    if geometry == "common0":
        union_order = n
        edge_extra = one
        geometry_text = "no common neighbor; d=mB+mC-N; e(A)<=(d+1)"
    else:
        assert geometry == "common1"
        union_order = n - 1
        edge_extra = one * 0
        geometry_text = "one common neighbor; d=mB+mC-N+1; e(A)<=d"
    d = mb * y
    mc = union_order - mb + d
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
    no_parent = balanced_batched_sum((
        scaled_bilinear(arow, arow, A2_TERMS, n, a2),
        scaled_bilinear(arow, brow, L2_TERMS, n, a2),
        scaled_bilinear(arow, crow, L2_TERMS, n, a2),
        scaled_bilinear(brow, crow, K2_TERMS, n, a2),
        scaled_bilinear(arow, drow, K2_TERMS, n, a2),
    ), batch_size=5)

    terms = coefficient_terms(arow, brow, crow, drow)
    row_orders = {
        id(arow): n,
        id(brow): mb,
        id(crow): mc,
        id(drow): d,
    }
    envelopes = {}
    for label, pieces in terms.items():
        envelopes[label] = balanced_batched_sum(tuple(
            abs(scalar) * choose(row_orders[id(row)], rank, one)
            for scalar, row, rank in pieces
        ), batch_size=16)

    caps = {}
    for label in terms:
        rank = int(label[-1])
        if label.startswith("PA"):
            caps[label] = choose(mb, rank - 2, one)
        elif label.startswith("PB"):
            caps[label] = choose(mc, rank - 2, one)
        elif label.startswith("PW"):
            caps[label] = choose(n, rank - 1, one)
        else:
            assert label.startswith("PZ")
            caps[label] = choose(d, rank - 3, one)

    obvious_positive = {"PA6", "PB6", "PW5", "PW6", "PZ6"}
    obvious_negative = {"PA4", "PB4", "PZ5"}
    uncertain = set(terms) - obvious_positive - obvious_negative
    assert len(uncertain) == 8
    positive_scale = n**4 * a2**4
    signed_negative_lower = tuple(
        scaled_linear(terms[label], caps[label], n, a2)
        for label in sorted(obvious_negative)
    )
    absolute_lower = tuple(
        -envelopes[label] * caps[label] * positive_scale
        for label in sorted(uncertain)
    )
    correction_lower = balanced_batched_sum(
        signed_negative_lower + absolute_lower, batch_size=11
    )
    source = no_parent + correction_lower
    return source, {
        "geometry": geometry,
        "geometry_description": geometry_text,
        "small_B_order": small_order,
        "B_mask": bmask,
        "C_mask": cmask,
        "D2_mask": d2mask,
        "positive_multiplier": "N^4*a2^4",
        "method": (
            "manifest positive coordinates discarded; manifest negative "
            "coordinates paid exactly at subset ceilings; remaining coordinates "
            "charged by absolute coefficient envelopes"
        ),
        "manifest_positive_coordinates": sorted(obvious_positive),
        "manifest_negative_coordinates": sorted(obvious_negative),
        "absolute_envelope_coordinates": sorted(uncertain),
        "parameterization": (
            f"N=19+h; union_order={'N' if geometry == 'common0' else 'N-1'}; "
            f"mB={small_order}; d=mB*y; mC=union_order-mB+d; "
            "e=(d+edge_extra)z; Omega=e^2*w/2"
        ),
        "simplex": "u0+u1+u2+u3+u4=1",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7), required=True)
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1_000_000)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    args = parser.parse_args()
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(LOSS) == LOSS_SHA256

    names = ("y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    source_context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = build_source(
        source_context,
        args.geometry,
        args.small_order,
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
            "N>=19 nonadjacent ordinary-parent rank-six g2; ordered smaller "
            "induced row of fixed order 0..6; safe exact endpoint relaxation"
        ),
        "occupation_report_sha256": OCCUPATION_SHA256,
        "loss_report_sha256": LOSS_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_safe_abs_wedge_small_order_"
        f"{args.geometry}_k{args.small_order}_B{args.b_mask}_C{args.c_mask}_"
        f"D2{args.d2_mask}_beta{args.start_beta}_{stop}_flint_probe_root_20260831.json"
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
