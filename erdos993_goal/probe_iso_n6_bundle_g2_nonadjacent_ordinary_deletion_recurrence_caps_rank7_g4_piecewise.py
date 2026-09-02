#!/usr/bin/env python3
"""Exact arbitrary-parent deletion-recurrence cap probe for rank-six G2.

This is intentionally separate from the live root producer.  It replaces the
independent PW2/PW3/PW4 box by the exact coupled deletion consequence

    I(A,x) = I(A-p,x) + x I(A-N[p],x),

so that PWk=i_(k-1)(A-N[p]) lies in [0,i_k(A)] for every vertex p.  The
certificate is still a relaxation probe: a PASS proves this one chart/corner
lower polynomial, not the universal G2 theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose
import probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root as base


HERE = Path(__file__).resolve().parent
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_DELETION_"
    "RECURRENCE_CAPS_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ambient_row_data(context, geometry: str, chart: str, base_order: int,
                     ratio_floor: bool):
    """Rebuild only the ambient A-row data used by the pinned root probe."""
    if ratio_floor:
        x, y, z, w, ratio, r0, r1, r2, r3, h = context.gens()
        active_scale = 1 - 2 * ratio * fmpq(1, 3)
        u0, u1, u2, u3 = (
            active_scale * r0,
            active_scale * r1,
            active_scale * r2,
            active_scale * r3,
        )
    else:
        x, y, z, w, u0, u1, u2, u3, _u4, h = context.gens()
    one = context.constant(1)
    n = base_order + h
    if geometry == "common0":
        union_order = n
    else:
        assert geometry == "common1"
        union_order = n - 1

    if chart == "low":
        mb = 7 + (union_order - 14) * x * fmpq(1, 2)
        mc = union_order - mb + mb * y
        d = mb * y
    elif chart == "high":
        assert geometry == "common1"
        mb = union_order * (one + x) * fmpq(1, 2)
        mc = mb + (union_order - mb) * y
        d = mb + mc - union_order
    elif chart == "high_far":
        assert geometry == "common0"
        deficit_b = 2 + (n - 4) * x * fmpq(1, 2)
        deficit_c = deficit_b * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - deficit_b - deficit_c
    elif chart == "high_band":
        assert geometry == "common0"
        deficit_b = one + x
        deficit_c = one - x + 2 * x * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - deficit_b - deficit_c
    else:
        assert chart in ("high_near", "high_near_lowedge", "high_near_highedge")
        assert geometry == "common0"
        deficit_b = x * (2 - y)
        deficit_c = x * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - 2 * x

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
    # In the root row, a4=(a3*r3_num/8)/(n*a2).
    a4_clear_numerator = a3 * r3_num * fmpq(1, 8)
    return n, a2, a3, a4_clear_numerator


def build_recurrence_lower(context, geometry: str, chart: str,
                           bmask: int, cmask: int, d2mask: int,
                           base_order: int, ratio_floor: bool):
    zero_lower, signs, uncertain, base_metadata = base.build_source(
        context, geometry, chart, bmask, cmask, d2mask, "zero",
        base_order, ratio_floor,
    )
    n, a2, a3, a4_clear_numerator = ambient_row_data(
        context, geometry, chart, base_order, ratio_floor
    )

    # The root producer clears S=N^4*a2^4.  Multiply the complete lower bound
    # by T=N*a2 so the i4(A) cap is polynomial as well; the new positive
    # multiplier is S*T=N^5*a2^5.
    positive_scale = n * a2
    baseline = positive_scale * zero_lower

    pw2_cap = positive_scale * a2 * uncertain["PW2"]
    pw3_cap = positive_scale * a3 * uncertain["PW3"]
    pw2_lower, pw2_envelope, _, _ = base.structured_uncertain_envelope(
        pw2_cap, context, "PW2"
    )
    pw3_lower, pw3_envelope, _, _ = base.structured_uncertain_envelope(
        pw3_cap, context, "PW3"
    )

    # signs[PW4] = -S*coefficient(PW4) >= 0.  Since
    # i3(A-N[p])<=i4(A)=a4_clear_numerator/T, multiplication by T gives the
    # exact harmful endpoint -signs[PW4]*a4_clear_numerator.
    pw4_lower = -signs["PW4"] * a4_clear_numerator
    lower = balanced_batched_sum(
        (baseline, pw2_lower, pw3_lower, pw4_lower), batch_size=4
    )
    metadata = {
        **base_metadata,
        "positive_multiplier": "N^5*a2^5",
        "W_parent_endpoint_mode": "arbitrary_p_deletion_recurrence_caps",
        "W_parent_deletion_identity": (
            "I(A,x)=I(A-p,x)+x*I(A-N[p],x)"
        ),
        "W_parent_universal_caps": {
            "PW2": "0<=i1(A-N[p])<=i2(A)",
            "PW3": "0<=i2(A-N[p])<=i3(A)",
            "PW4": "0<=i3(A-N[p])<=i4(A)",
        },
        "W_parent_sign_payment": {
            "PW2": "one-sided lower envelope of coefficient*i2(A)",
            "PW3": "one-sided lower envelope of coefficient*i3(A)",
            "PW4": "certified nonpositive coefficient times i4(A)",
            "PW5/PW6": "discarded using certified nonnegative coefficients",
        },
        "PW2_capped_envelope": pw2_envelope,
        "PW3_capped_envelope": pw3_envelope,
        "logical_scope": (
            "arbitrary vertex p; no isolated-parent assumption; each cap follows "
            "coefficientwise from the exact deletion recurrence"
        ),
    }
    return lower, signs, metadata


def build_forest_endpoint_lower(context, geometry: str, chart: str,
                                bmask: int, cmask: int, d2mask: int,
                                endpoint: str, base_order: int,
                                ratio_floor: bool):
    """Build one of the two exact forest-row endpoints.

    If Q=A-N[p] has t vertices, f edges and wedge count omega, then

      q2=C(t,2)-f,
      q3=C(t,3)-f(t-2)+omega,       0<=omega<=C(f,2).

    The PW4 coefficient is nonpositive, so replacing omega by C(f,2) is a
    lower bound.  The result is concave in 0<=f<=t-1 and hence is minimized
    at f=0 or f=t-1.  Each endpoint's first-difference sequence has constant
    nonpositive third difference PW4.  Since its initial first difference is
    PW2>=0, the endpoint sequence cannot have an interior minimum.  Thus only
    t=N-1 remains besides the already nonnegative t=0/1 boundary.
    """
    zero_lower, signs, uncertain, base_metadata = base.build_source(
        context, geometry, chart, bmask, cmask, d2mask, "zero",
        base_order, ratio_floor,
    )
    n, _a2, _a3, _a4_clear_numerator = ambient_row_data(
        context, geometry, chart, base_order, ratio_floor
    )
    one = context.constant(1)
    raw_pw4 = -signs["PW4"]
    pw2_positive = uncertain["PW2"]
    endpoint_t = n - 1
    if endpoint == "edgeless":
        q2_cap = choose(endpoint_t, 2, one)
        q3_cap = choose(endpoint_t, 3, one)
    else:
        assert endpoint == "star"
        q2_cap = choose(endpoint_t - 1, 2, one)
        q3_cap = choose(endpoint_t - 1, 3, one)
    w_parent_endpoint = (
        endpoint_t * uncertain["PW2"]
        + q2_cap * uncertain["PW3"]
        + q3_cap * raw_pw4
    )
    lower = zero_lower + w_parent_endpoint
    endpoint_signs = {
        **signs,
        "PW2_GLOBAL_POSITIVE": pw2_positive,
    }
    metadata = {
        **base_metadata,
        "base_order": base_order,
        "scope": (
            f"N>={base_order}, common0/high-near-high-edge ratio-floor "
            "chart corner; one arbitrary-p forest endpoint"
        ),
        "base_loss_report_sha256": base.LOSS_SHA256,
        "base_ratio_floor_report_sha256": base.RATIO_FLOOR_SHA256,
        "W_parent_endpoint_mode": f"arbitrary_p_forest_{endpoint}_endpoint",
        "W_parent_endpoint_reduction": (
            "exact deletion recurrence plus forest (t,f,omega) endpoint lemma"
        ),
        "W_parent_deletion_identity": (
            "I(A,x)=I(A-p,x)+x*I(A-N[p],x)"
        ),
        "W_parent_forest_row_reduction": {
            "row": "Q=A-N[p], t=|Q|, f=e(Q), omega=sum_v C(deg_Q(v),2)",
            "identities": [
                "PW2=t",
                "PW3=C(t,2)-f",
                "PW4=C(t,3)-f(t-2)+omega",
            ],
            "wedge_cap": "0<=omega<=C(f,2)",
            "edge_endpoint_reason": (
                "PW4<=0 makes the paid expression concave in 0<=f<=t-1; "
                "check f=0 and f=t-1"
            ),
            "order_endpoint_reason": (
                "the first-difference sequence has constant nonpositive third "
                "difference PW4 and starts at PW2>=0, so it cannot produce an "
                "interior minimum; t=0 is zero"
            ),
            "checked_endpoint": endpoint,
            "checked_order": "t=N-1",
        },
        "logical_scope": (
            "arbitrary vertex p and arbitrary induced forest Q=A-N[p]; "
            "one of two exhaustive edge endpoints"
        ),
    }
    return lower, endpoint_signs, metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument(
        "--order-chart",
        choices=(
            "low", "high", "high_far", "high_band", "high_near",
            "high_near_lowedge", "high_near_highedge",
        ),
        required=True,
    )
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--base-order", type=int, default=20)
    parser.add_argument("--ratio-floor", action="store_true")
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument(
        "--forest-endpoint", choices=("none", "edgeless", "star"),
        default="none",
    )
    args = parser.parse_args()

    if args.ratio_floor:
        names = ("x", "y", "z", "w", "t", "r0", "r1", "r2", "r3", "h")
        coefficient_names = ("x", "y", "z", "w", "t", "h")
        target_names = ("x", "y", "z", "w", "t", "H")
        prefix_count, simplex_count, tail_count, bounded_count = 5, 4, 1, 5
    else:
        names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
        coefficient_names = ("x", "y", "z", "w", "h")
        target_names = ("x", "y", "z", "w", "H")
        prefix_count, simplex_count, tail_count, bounded_count = 4, 5, 1, 4
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    if args.forest_endpoint == "none":
        lower, signs, metadata = build_recurrence_lower(
            context, args.geometry, args.order_chart,
            args.b_mask, args.c_mask, args.d2_mask, args.base_order,
            args.ratio_floor,
        )
        mode = "recurrence_caps"
    else:
        lower, signs, metadata = build_forest_endpoint_lower(
            context, args.geometry, args.order_chart,
            args.b_mask, args.c_mask, args.d2_mask, args.forest_endpoint,
            args.base_order, args.ratio_floor,
        )
        mode = f"forest_{args.forest_endpoint}_endpoint"
    inspect = {
        **metadata,
        "ordinary_lower_terms": len(list(lower.terms())),
        "sign_terms": {
            label: len(list(polynomial.terms()))
            for label, polynomial in sorted(signs.items())
        },
        "base_source_sha256": sha256(Path(base.__file__)),
    }
    print(json.dumps(inspect, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    coefficient_context = fmpq_mpoly_ctx.get(coefficient_names, "degrevlex")
    target_context = fmpq_mpoly_ctx.get(target_names, "degrevlex")
    lower_certificate = base.coefficient_records(
        lower, coefficient_context, target_context,
        "ordinary_parent_deletion_recurrence_lower", args.chunk_columns,
        prefix_count, simplex_count, tail_count, bounded_count,
    )
    sign_certificates = {
        label: base.coefficient_records(
            polynomial, coefficient_context, target_context,
            f"desired_sign_{label}", args.chunk_columns,
            prefix_count, simplex_count, tail_count, bounded_count,
        )
        for label, polynomial in sorted(signs.items())
    }
    report = {
        "marker": MARKER,
        **inspect,
        "ordinary_lower_certificate": lower_certificate,
        "sign_certificates": sign_certificates,
        "negative_lower_controls": lower_certificate["negative"],
        "negative_sign_controls": sum(
            certificate["negative"] for certificate in sign_certificates.values()
        ),
        "status": (
            "exact arbitrary-p deletion-recurrence relaxation probe; "
            "not a universal G2 proof"
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_deletion_recurrence_caps_"
        f"{args.geometry}_{args.order_chart}_B{args.b_mask:02d}_"
        f"C{args.c_mask:02d}_D2{args.d2_mask}_{mode}_"
        f"{'ratiofloor_' if args.ratio_floor else ''}"
        "rank7_g4_piecewise_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_lower_controls": report["negative_lower_controls"],
        "negative_sign_controls": report["negative_sign_controls"],
        "lower_minimum": lower_certificate["minimum"],
        "report": output.name,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
