#!/usr/bin/env python3
"""Exact N>=19 ratio-floor probe for nonadjacent endpoint-parent G2.

For a deleted parent at the marked endpoint u, the exact occupation form is

  A2(A) + L2(A,B) + M2(A,C) + R2(B,C) + R2(A,D),

where D=B intersect C.  The adjacent endpoint four-corner theorem controls
the B,C rows; the extra term is independent of those rows.  Its D3
coefficient is positive, its D4,D5 coefficients are negative, and D2 is
affine, so both D2 endpoints suffice.  The ambient A row and the complete
order/edge charts are the same exact N>=19 ratio-floor relaxation used by the
ordinary-parent theorem.

This file produces one exact orientation/chart/corner Bernstein certificate.
It is not an all-order theorem assembler by itself.
"""

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
    row_corner,
    scaled_bilinear,
)
from probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root import (
    coefficient_records,
)
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import (
    d_coarse_corner_row,
)


HERE = Path(__file__).resolve().parent
OCCUPATION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
    "exact_root_20260831.json"
)
OCCUPATION_SHA256 = (
    "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437"
)
ADJACENT_REDUCTION = HERE / (
    "iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_"
    "rank7_g5_finish_20260831.json"
)
ADJACENT_REDUCTION_SHA256 = (
    "CC5E2172087C7CE76992B680F1CC84E1E44A2A31F64FCA92ED0C9AFA989E9E38"
)
LARGE_REDUCTION = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
    "exact_root_20260831.json"
)
LARGE_REDUCTION_SHA256 = (
    "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69"
)
RATIO_FLOOR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_"
    "20260831.json"
)
RATIO_FLOOR_SHA256 = (
    "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_RATIO_FLOOR_"
    "WEDGE_FLINT_ROOT"
)
BASE_ORDER = 19


def build_source(context, geometry: str, chart: str, orientation: str,
                 bmask: int, cmask: int, d2mask: int):
    x, y, z, w, t, r0, r1, r2, r3, h = context.gens()
    one = context.constant(1)
    n = BASE_ORDER + h

    # The pinned rank-ratio floor is u4<=2/3.  This parameterization covers
    # exactly that complete truncated simplex.
    active_scale = 1 - 2 * t * fmpq(1, 3)
    u0, u1, u2, u3 = (
        active_scale * r0,
        active_scale * r1,
        active_scale * r2,
        active_scale * r3,
    )
    u4 = 2 * t * fmpq(1, 3)

    if geometry == "common0":
        union_order = n
    else:
        assert geometry == "common1"
        union_order = n - 1

    # First construct the ordered sizes mlo<=mhi.  The endpoint functional is
    # asymmetric, so both assignments to (B,C) are separate orientation
    # shards.
    if chart == "low":
        mlo = 7 + (union_order - 14) * x * fmpq(1, 2)
        mhi = union_order - mlo + mlo * y
        d = mlo * y
    elif chart == "high":
        assert geometry == "common1"
        mlo = union_order * (one + x) * fmpq(1, 2)
        mhi = mlo + (union_order - mlo) * y
        d = mlo + mhi - union_order
    elif chart == "high_far":
        assert geometry == "common0"
        deficit_lo = 2 + (n - 4) * x * fmpq(1, 2)
        deficit_hi = deficit_lo * y
        mlo = n - deficit_lo
        mhi = n - deficit_hi
        d = n - deficit_lo - deficit_hi
    elif chart == "high_band":
        assert geometry == "common0"
        deficit_lo = one + x
        deficit_hi = one - x + 2 * x * y
        mlo = n - deficit_lo
        mhi = n - deficit_hi
        d = n - deficit_lo - deficit_hi
    else:
        assert chart in (
            "high_near_lowedge",
            "high_near_highedge",
        )
        assert geometry == "common0"
        deficit_lo = x * (2 - y)
        deficit_hi = x * y
        mlo = n - deficit_lo
        mhi = n - deficit_hi
        d = n - 2 * x

    if orientation == "B_le_C":
        mb, mc = mlo, mhi
    else:
        assert orientation == "B_ge_C"
        mb, mc = mhi, mlo

    if geometry == "common1":
        edge_cap = d
    elif chart.startswith("high_near"):
        edge_cap = n - 1
    else:
        edge_cap = d + 1

    if chart == "high_near_lowedge":
        edges = n * z * fmpq(1, 2)
        omega = edges**2 * w * fmpq(1, 2)
    elif chart == "high_near_highedge":
        edges = n * fmpq(1, 2) + (n * fmpq(1, 2) - 1) * z
        wedge_floor = 2 * edges - n
        omega = wedge_floor + (edges**2 * fmpq(1, 2) - wedge_floor) * w
    else:
        edges = edge_cap * z
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
    metadata = {
        "geometry": geometry,
        "order_chart": chart,
        "orientation": orientation,
        "B_mask": bmask,
        "C_mask": cmask,
        "D2_mask": d2mask,
        "ambient_order": "N=19+h",
        "positive_multiplier": "N^4*a2^4",
        "ratio_floor_parameterization": (
            "u4=2t/3 and ui=(1-2t/3)ri for i=0..3, sum ri=1"
        ),
        "functional": "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)",
        "D_relaxation": (
            f"i2={'C(d,2)' if d2mask else '0'}; i3=0; "
            "i4=C(d,4); i5=C(d,5)"
        ),
    }
    return source, metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument(
        "--order-chart",
        choices=(
            "low",
            "high",
            "high_far",
            "high_band",
            "high_near_lowedge",
            "high_near_highedge",
        ),
        required=True,
    )
    parser.add_argument(
        "--orientation", choices=("B_le_C", "B_ge_C"), required=True
    )
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--inspect-only", action="store_true")
    args = parser.parse_args()

    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(ADJACENT_REDUCTION) == ADJACENT_REDUCTION_SHA256
    assert sha256(LARGE_REDUCTION) == LARGE_REDUCTION_SHA256
    assert sha256(RATIO_FLOOR) == RATIO_FLOOR_SHA256
    names = ("x", "y", "z", "w", "t", "r0", "r1", "r2", "r3", "h")
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = build_source(
        context,
        args.geometry,
        args.order_chart,
        args.orientation,
        args.b_mask,
        args.c_mask,
        args.d2_mask,
    )
    inspect = {
        **metadata,
        "source_terms": len(list(source.terms())),
    }
    print(json.dumps(inspect, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    coefficient_context = fmpq_mpoly_ctx.get(
        ("x", "y", "z", "w", "t", "h"), "degrevlex"
    )
    target_context = fmpq_mpoly_ctx.get(
        ("x", "y", "z", "w", "t", "H"), "degrevlex"
    )
    certificate = coefficient_records(
        source,
        coefficient_context,
        target_context,
        "endpoint_parent_lower",
        args.chunk_columns,
        prefix_count=5,
        simplex_count=4,
        tail_count=1,
        bounded_count=5,
    )
    report = {
        "marker": MARKER,
        **inspect,
        "endpoint_lower_certificate": certificate,
        "negative_controls": certificate["negative"],
        "scope": (
            "N>=19, one ordered nonadjacent endpoint-parent orientation/chart/"
            "B2/C2/D2 corner; exact relaxation probe only"
        ),
        "occupation_report_sha256": OCCUPATION_SHA256,
        "adjacent_four_corner_report_sha256": ADJACENT_REDUCTION_SHA256,
        "large_corner_reduction_report_sha256": LARGE_REDUCTION_SHA256,
        "ratio_floor_report_sha256": RATIO_FLOOR_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_"
        f"{args.geometry}_{args.order_chart}_{args.orientation}_"
        f"B{args.b_mask}_C{args.c_mask}_D2{args.d2_mask}_"
        "N19_flint_probe_root_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_controls": certificate["negative"],
        "minimum": certificate["minimum"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
