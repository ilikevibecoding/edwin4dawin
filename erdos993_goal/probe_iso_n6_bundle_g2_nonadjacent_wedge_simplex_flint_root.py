#!/usr/bin/env python3
"""Exact wedge/simplex Bernstein probe for nonadjacent rank-six g2.

For nonadjacent marked vertices the exact occupation identity is

  g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D),

where D=B intersect C.  The two possible forest geometries are encoded by

  common0: d=|D|=mB+mC-N,     e(A)<=d+1,
  common1: d=|D|=mB+mC-N+1,   e(A)<=d.

The common0 bound also contains the disconnected case (where e(A)<=d).
The A row uses the exact edge/wedge formulas and the proven rank-six ratio
simplex.  The already-derived B,C derivative reduction leaves four rank-two
corners.  For D, K2(A,D) is affine in i2(D), its i2 derivative changes sign,
its i3 derivative is positive, and its i4,i5 derivatives are negative.  We
therefore check both universal i2 endpoints, use the coarse lower floor
i3(D)=0, and use the edgeless ceilings at ranks four and five.

This file is a relaxation producer only.  A theorem requires every chart and
corner to pass, deterministic replay, finite-order coverage, and a fail-closed
assembler.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
    compactify_one,
    row_corner,
    scaled_bilinear,
    split_simplex,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import (
    choose,
    sha256,
)


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OCCUPATION_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_SIMPLEX_FLINT_ROOT"


def d_coarse_corner_row(d, d2_mask: int, one):
    """Coefficientwise valid endpoint row for K2(A,D).

    The D-rank derivatives are
      i2: 4*A1+6*A2+11*A3-2*A4,
      i3: A1+11*A2+10*A3,
      i4: -15*A1-2*A2,
      i5: -7*A1.
    The i2 derivative changes sign, so both the universal zero floor and the
    edgeless ceiling are checked.  The i3 derivative is positive, so zero is
    a universal lower floor.  The last two derivatives are negative, so
    edgeless ceilings are used.  Ranks zero and one are exact, and rank six
    is unused by K2.
    """
    zero = one * 0
    return (
        (one, 0, 0),
        (d, 0, 0),
        (choose(d, 2, one) if d2_mask else zero, 0, 0),
        (zero, 0, 0),
        (choose(d, 4, one), 0, 0),
        (choose(d, 5, one), 0, 0),
        (choose(d, 6, one), 0, 0),
    )


def source_polynomial_chart(context, geometry: str, chart: str,
                            bmask: int, cmask: int, d2_mask: int):
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
        # 7 <= mB <= union_order/2 and union_order-mB <= mC <= union_order.
        mb = 7 + (union_order - 14) * x * fmpq(1, 2)
        mc = union_order - mb + mb * y
        d = mb * y
        order_text = (
            "mB=7+(union_order-14)*x/2; "
            "mC=union_order-mB+mB*y"
        )
    else:
        assert chart == "high"
        # union_order/2 <= mB <= mC <= union_order.
        mb = union_order * (one + x) * fmpq(1, 2)
        mc = mb + (union_order - mb) * y
        d = mb + mc - union_order
        order_text = (
            "mB=union_order*(1+x)/2; "
            "mC=mB+(union_order-mB)*y"
        )

    edges = (d + edge_extra) * z
    omega = edges**2 * w * fmpq(1, 2)
    a2 = choose(n, 2, one) - edges
    a3 = choose(n, 3, one) - edges * (n - 2) + omega

    # Exact rank-six factorial-ratio simplex after the four mandatory drops.
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
    drow = d_coarse_corner_row(d, d2_mask, one)
    source = balanced_batched_sum((
        scaled_bilinear(arow, arow, A2_TERMS, n, a2),
        scaled_bilinear(arow, brow, L2_TERMS, n, a2),
        scaled_bilinear(arow, crow, L2_TERMS, n, a2),
        scaled_bilinear(brow, crow, K2_TERMS, n, a2),
        scaled_bilinear(arow, drow, K2_TERMS, n, a2),
    ), batch_size=5)
    metadata = {
        "geometry": geometry,
        "geometry_description": geometry_text,
        "order_chart": chart,
        "order_parameterization": order_text,
        "ambient_order": "N=19+h",
        "union_order": "N" if geometry == "common0" else "N-1",
        "B_mask": bmask,
        "C_mask": cmask,
        "D2_mask": d2_mask,
        "D_relaxation": (
            f"i2={'C(d,2)' if d2_mask else '0'}; i3=0; "
            "i4=C(d,4); i5=C(d,5)"
        ),
        "positive_multiplier": "N^4*a2^4",
        "edge_wedge": "e=edge_cap*z; Omega=e^2*w/2",
        "simplex": "u0+u1+u2+u3+u4=1",
    }
    return source, metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument("--order-chart", choices=("low", "high"), required=True)
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--start-beta", type=int, default=0)
    parser.add_argument("--max-betas", type=int, default=1_000_000)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--inspect-only", action="store_true")
    args = parser.parse_args()

    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = source_polynomial_chart(
        context, args.geometry, args.order_chart, args.b_mask, args.c_mask,
        args.d2_mask
    )
    source_terms = list(source.terms())
    source_degrees = [
        int(max(monomial[axis] for monomial, _ in source_terms))
        for axis in range(len(names))
    ]
    coefficient_context = fmpq_mpoly_ctx.get(("x", "y", "z", "w", "h"), "degrevlex")
    simplex_degree, betas, coefficients, grouped = split_simplex(
        source, coefficient_context, prefix_count=4, tail_count=1
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
        coefficient = coefficients[beta_index]
        mapped, degree_h, coefficient_terms = compactify_one(
            coefficient, target_context, bounded_count=4
        )
        mapped_terms = list(mapped.terms())
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, 5, chunk_columns=args.chunk_columns
        )
        assert replay_terms == len(mapped_terms)
        minimum = min(values.flat)
        minimum_flat_index = min(
            range(values.size), key=lambda index: values.flat[index]
        )
        minimum_multiindex = list(map(int, __import__("numpy").unravel_index(
            minimum_flat_index, values.shape
        )))
        negative = sum(1 for value in values.flat if value < 0)
        zero = sum(1 for value in values.flat if value == 0)
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
            "negative": negative,
            "zero": zero,
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
        "scope": "large N>=19 nonadjacent no-parent rank-six g2 relaxation probe only",
        "occupation_report_sha256": OCCUPATION_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_wedge_simplex_"
        f"{args.geometry}_{args.order_chart}_B{args.b_mask:02d}_C{args.c_mask:02d}_"
        f"D2{args.d2_mask}_"
        f"beta{args.start_beta}_{stop}_flint_probe_root_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "geometry", "order_chart", "B_mask", "C_mask", "D2_mask",
        "processed_betas", "negative_betas"
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
