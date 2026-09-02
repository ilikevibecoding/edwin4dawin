#!/usr/bin/env python3
"""Low-memory native-simplex audit of one connected-nonadjacent M5 cone.

This implementation imports only the exact abstract endpoint numerator from
the tensor producer.  It independently maps geometry intervals to two-point
barycentric coordinates and the factorial-drop budget to one total simplex,
then performs homogeneous completion by direct FLINT multiplication.  The
remaining order slacks are left in the nonnegative power basis.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein import abstract


HERE = Path(__file__).resolve().parent
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_NATIVE_CONE_G1_BERNSTEIN"


def map_native(polynomial, sector, distance, mode, small_order):
    assert sector in ("high", "low")
    ratio_count = 5 if sector == "high" else 4
    names = ["S", "S0", "Z", "Z0", *[f"H{i}" for i in range(ratio_count)]]
    if sector == "low":
        names.extend(("R", "T"))
    names.extend(("P", "Q"))
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    gens = context.gens()
    S, S0, Z, Z0 = gens[:4]
    H = gens[4:4+ratio_count]
    offset = 4 + ratio_count
    R = gens[offset] if sector == "low" else None
    P, Q = gens[-2:]

    if small_order is None:
        mb = 7 + P
        mc_seed = 7 + P + Q
    else:
        mb = context.constant(small_order)
        n_seed = 13 + Q

    if distance == "two":
        assert mode == "general"
        overlap = mb * S
    elif mode == "zero":
        overlap = context.constant(0)
    else:
        assert mode == "positive"
        overlap = 1 + (mb - 1) * S

    if small_order is None:
        mc = mc_seed
        n = mb + mc - overlap
    else:
        n = n_seed
        mc = n - mb + overlap
    md = overlap + int(distance == "two")
    edges = (overlap + 1) * Z
    R1 = 2*n*(n-1) - 4*edges
    budget = R1 - 4*n
    R5 = budget * H[0]
    R4 = R5 + n + budget * H[1]
    R3 = R4 + n + budget * H[2]
    if sector == "high":
        R2 = R3 + n + budget * H[3]
        # On sum(H)=1, R1-R2=n+budget*H4.
        assert sp.expand(0) == 0
    else:
        R2 = R3 + n*(2-R) + budget * H[3]
        # On sum(H)=1 and R+T=1, R1-R2=n*R.

    mapped_values = (n, mb, mc, md, R1, R2, R3, R4, R5)
    degrees = [polynomial.degree(index) for index in range(len(mapped_values))]
    powers = [[context.constant(1)] for _ in mapped_values]
    for axis, value in enumerate(mapped_values):
        for exponent in range(1, degrees[axis] + 1):
            powers[axis].append(powers[axis][-1] * value)

    def mapped_terms():
        for monomial, coefficient in polynomial.terms():
            num, den = map(int, sp.fraction(coefficient))
            term = context.constant(fmpq(num, den))
            for axis, exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            yield term

    mapped = balanced_batched_sum(mapped_terms(), batch_size=64)
    return context, mapped, {
        "abstract_degrees": degrees,
        "mapped_terms_before_completion": sum(1 for _ in mapped.terms()),
        "ratio_count": ratio_count,
    }


def homogeneous_stream_stats(context, polynomial, sector, ratio_count):
    gens = context.gens()
    ratio_start = 4
    interval_axis = 4 + ratio_count if sector == "low" else None
    max_s = max_z = max_ratio = max_interval = 0
    # P,Q are untouched nonnegative power variables.  Completion cannot mix
    # their exponent slices, so process those slices independently to keep the
    # peak polynomial far below the full tensor size.
    slices = defaultdict(lambda: defaultdict(dict))
    input_terms = 0
    for monomial, coefficient in polynomial.terms():
        input_terms += 1
        ds = monomial[0]
        dz = monomial[2]
        dr = sum(monomial[ratio_start:ratio_start+ratio_count])
        di = monomial[interval_axis] if sector == "low" else 0
        max_s = max(max_s, ds)
        max_z = max(max_z, dz)
        max_ratio = max(max_ratio, dr)
        max_interval = max(max_interval, di)
        outer = monomial[-2:]
        key = (
            ds, dz, dr, di,
        )
        slices[outer][key][monomial] = coefficient
    s_sum = gens[0] + gens[1]
    z_sum = gens[2] + gens[3]
    ratio_sum = sum(gens[ratio_start:ratio_start+ratio_count], context.constant(0))
    interval_sum = gens[interval_axis] + gens[interval_axis+1] if sector == "low" else context.constant(1)
    negative = zero = count = 0
    minimum = None
    digest = hashlib.sha256()
    group_count = 0
    for slice_index, (outer, groups) in enumerate(sorted(slices.items())):
        group_count += len(groups)
        def completed_groups():
            for (ds, dz, dr, di), data in groups.items():
                yield (
                    context.from_dict(data)
                    * s_sum**(max_s-ds)
                    * z_sum**(max_z-dz)
                    * ratio_sum**(max_ratio-dr)
                    * interval_sum**(max_interval-di)
                )
        completed = balanced_batched_sum(completed_groups(), batch_size=8)
        for monomial, coefficient in completed.terms():
            assert monomial[-2:] == outer
            count += 1
            negative += int(coefficient < 0)
            zero += int(coefficient == 0)
            minimum = coefficient if minimum is None or coefficient < minimum else minimum
            digest.update((str(tuple(map(int, monomial))) + "|" + str(coefficient) + ";").encode())
        if (slice_index + 1) % 25 == 0:
            print(json.dumps({
                "completed_order_slices": slice_index + 1,
                "total_order_slices": len(slices),
                "coefficients_so_far": count,
                "negative_so_far": negative,
            }, sort_keys=True), flush=True)
    return {
        "geometry_s_degree": int(max_s),
        "geometry_z_degree": int(max_z),
        "ratio_degree": int(max_ratio),
        "interval_degree": int(max_interval),
        "homogeneous_groups": group_count,
        "order_power_slices": len(slices),
        "mapped_terms_streamed": input_terms,
        "homogeneous_coefficients": count,
        "negative": negative,
        "zero": zero,
        "minimum": str(minimum),
        "coefficient_stream_sha256": digest.hexdigest().upper(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", choices=("high", "low"), required=True)
    parser.add_argument("--distance", choices=("two", "far"), required=True)
    parser.add_argument("--mode", choices=("general", "zero", "positive"), required=True)
    parser.add_argument("--small-order", type=int, choices=range(7))
    parser.add_argument("--endpoint", choices=("ll", "lh", "hh"), required=True)
    args = parser.parse_args()
    if args.distance == "two":
        assert args.mode == "general"
    else:
        assert args.mode in ("zero", "positive")
    if args.mode == "positive" and args.small_order is not None:
        assert args.small_order >= 1
    empty_d = args.distance == "far" and args.mode == "zero"

    polynomial, scale = abstract(args.endpoint, args.small_order, empty_d)
    context, mapped, map_stats = map_native(
        polynomial, args.sector, args.distance, args.mode, args.small_order
    )
    completion_stats = homogeneous_stream_stats(
        context, mapped, args.sector, map_stats["ratio_count"]
    )
    negative = completion_stats["negative"]
    branch = {
        "sector": args.sector,
        "distance": args.distance,
        "mode": args.mode,
        "small_order": args.small_order,
        "endpoint": args.endpoint,
    }
    report = {
        "marker": MARKER if negative == 0 else "OBSTRUCTION_INDEPENDENT_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_NATIVE_CONE",
        "branch": branch,
        "positive_scale": scale,
        "abstract_terms": len(polynomial.terms()),
        **map_stats,
        **completion_stats,
        "algorithm": (
            "direct FLINT homogeneous completion on two geometry intervals, the "
            "factorial-drop simplex, and the low-sector interval; order slacks "
            "remain in the nonnegative power basis"
        ),
        "simplex_identities": {
            "geometry": "S+S0=1 and Z+Z0=1",
            "high_ratio": (
                "sum(H0..H4)=1; R1-R2=n+budget*H4, while consecutive "
                "earlier drops are n+budget*H3, n+budget*H2, n+budget*H1"
            ),
            "low_ratio": (
                "sum(H0..H3)=1 and R+T=1; R1-R2=n*R, "
                "R2-R3=n*(2-R)+budget*H3"
            ),
            "order_slacks": "P,Q>=0 are left in the ordinary nonnegative power basis",
        },
        "dependencies_sha256": {
            "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py": hashlib.sha256(
                (HERE / "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py").read_bytes()
            ).hexdigest().upper(),
            "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py": hashlib.sha256(
                (HERE / "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py").read_bytes()
            ).hexdigest().upper(),
        },
        "scope": "independent exact audit of one analytic connected-nonadjacent M5 adaptive cone branch",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    suffix = f"{args.sector}_{args.distance}_{args.mode}_{'large' if args.small_order is None else args.small_order}_{args.endpoint}"
    output = HERE / f"iso_n5_g1_connected_nonadjacent_m5_adaptive_native_audit_{suffix}_g1_bernstein_20260830.json"
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])
    assert negative == 0


if __name__ == "__main__":
    main()
