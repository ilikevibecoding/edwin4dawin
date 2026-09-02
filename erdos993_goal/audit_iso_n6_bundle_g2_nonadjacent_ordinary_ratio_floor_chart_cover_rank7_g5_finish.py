#!/usr/bin/env python3
"""Independent exact audit of the 56-chart cover and total-lower endpoints."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_rank7_g5_finish import (
    reconstruct_lower,
)
from run_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root import cases


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
PRODUCER_SHA256 = "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
RUNNER = HERE / "run_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root.py"
RUNNER_SHA256 = "358FD3ADE1F5B877D8CBA8EB76D1D37AC54EADB04A8C2C7491A49C24039534CE"
COVER_SOURCE = HERE / "prove_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_root.py"
COVER_SOURCE_SHA256 = "BADC07EC8CE3BA0B6FA8CB381C430A8B3C158D78D28A7F32538F30AF9032FAC1"
COVER_REPORT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_exact_root_20260831.json"
COVER_REPORT_SHA256 = "593F42AED78D6D6B736A3FAF4FC45CE5F2C5891DCF72DC920D733EA449BFC70B"
RATIO_REPORT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
RATIO_REPORT_SHA256 = "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
CORNER_BRIDGE = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_bridge_exact_rank7_g5_finish_20260831.json"
CORNER_BRIDGE_SHA256 = "DFB5125039602403E11085D9AFEC0E65A0CCD4BA28E671DFA50421A54B714C60"
MASK_TRANSFER = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_all_adjacency_masks_dominated_root_lower_exact_rank7_g5_finish_20260831.json"
MASK_TRANSFER_SHA256 = "6FDB912F7B6F3992A3DED7A794C932380FD9B3DDBDCD5F702F54A4E550113722"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_independent_audit_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_CHART_COVER_INDEPENDENT_AUDIT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def in_unit(value: Fraction) -> bool:
    return Fraction(0) <= value <= Fraction(1)


def audit_integer_order_maps(stop_n: int = 160):
    counts = {"common0_low": 0, "common0_far": 0, "common0_near": 0,
              "common1_low": 0, "common1_high": 0}
    for n in range(19, stop_n + 1):
        for mb in range(7, n + 1):
            for mc in range(max(mb, n - mb), n + 1):
                d = mb + mc - n
                assert 0 <= d <= mb
                if 2*mb <= n:
                    x = Fraction(2*(mb-7), n-14)
                    y = Fraction(d, mb)
                    assert in_unit(x) and in_unit(y)
                    assert Fraction(7) + Fraction(n-14, 2)*x == mb
                    assert n - mb + mb*y == mc
                    counts["common0_low"] += 1
                else:
                    b, c = n-mb, n-mc
                    assert 0 <= c <= b and 2*b <= n
                    if b >= 2:
                        x = Fraction(2*(b-2), n-4)
                        y = Fraction(c, b)
                        assert in_unit(x) and in_unit(y)
                        reconstructed_b = Fraction(2) + Fraction(n-4, 2)*x
                        assert reconstructed_b == b and reconstructed_b*y == c
                        counts["common0_far"] += 1
                    else:
                        total = b+c
                        x = Fraction(total, 2)
                        y = Fraction(2*c, total) if total else Fraction(0)
                        assert in_unit(x) and in_unit(y)
                        assert x*(2-y) == b and x*y == c
                        counts["common0_near"] += 1

        union = n-1
        for mb in range(7, union + 1):
            for mc in range(max(mb, union-mb), union + 1):
                d = mb+mc-union
                assert 0 <= d <= mb
                if 2*mb <= union:
                    x = Fraction(2*(mb-7), union-14)
                    y = Fraction(d, mb)
                    assert in_unit(x) and in_unit(y)
                    assert Fraction(7) + Fraction(union-14, 2)*x == mb
                    assert union-mb+mb*y == mc
                    counts["common1_low"] += 1
                else:
                    x = Fraction(2*mb, union)-1
                    y = (Fraction(mc-mb, union-mb)
                         if mb < union else Fraction(0))
                    assert in_unit(x) and in_unit(y)
                    reconstructed_mb = Fraction(union, 2)*(1+x)
                    assert reconstructed_mb == mb
                    assert (reconstructed_mb + (union-reconstructed_mb)*y) == mc
                    counts["common1_high"] += 1
    return counts


def audit_continuous_high_partition(grid_denominator: int = 32):
    # Exact rational sweep includes the high-band interior, which integer
    # order points generally touch only on its boundaries.
    n = Fraction(19)
    counts = {"far": 0, "band": 0, "near": 0}
    for bp in range(0, int(n*grid_denominator/2) + 1):
        b = Fraction(bp, grid_denominator)
        for cp in range(bp + 1):
            c = Fraction(cp, grid_denominator)
            if b >= 2:
                x = 2*(b-2)/(n-4)
                y = c/b
                rb = 2+(n-4)*x/2
                rc = rb*y
                label = "far"
            elif b+c >= 2 and b > 1:
                x = b-1
                y = (c-(2-b))/(2*(b-1))
                rb = 1+x
                rc = 1-x+2*x*y
                label = "band"
            else:
                x = (b+c)/2
                y = 2*c/(b+c) if b+c else Fraction(0)
                rb = x*(2-y)
                rc = x*y
                label = "near"
            assert in_unit(x) and in_unit(y)
            assert rb == b and rc == c
            counts[label] += 1
    assert counts["band"] > 0
    return counts


def audit_edge_maps(stop_n: int = 256):
    low = high = 0
    for n in range(19, stop_n + 1):
        for e in range(n):
            if 2*e <= n:
                z = Fraction(2*e, n)
                assert in_unit(z) and Fraction(n, 2)*z == e
                low += 1
            else:
                z = Fraction(2*e-n, n-2)
                assert in_unit(z)
                assert Fraction(n, 2) + (Fraction(n, 2)-1)*z == e
                wedge_floor = 2*e-n
                upper = Fraction(e*e, 2)
                denominator = upper-wedge_floor
                assert denominator == Fraction((e-2)**2, 2)+n-2 > 0
                # Both exact omega endpoints map to w=0 and w=1; every
                # intermediate actual value follows by affinity.
                assert (Fraction(wedge_floor)-wedge_floor)/denominator == 0
                assert (upper-wedge_floor)/denominator == 1
                high += 1
    return {"lowedge_integer_rows": low, "highedge_integer_rows": high}


def audit_total_lower_d_endpoints():
    shared_lower, a, _b, _c, d = reconstruct_lower()
    n, delta = a[1], d[1]
    root_lower = sp.expand(
        shared_lower - 12*a[2]*(choose(delta, 2)-choose(delta-1, 2))
    )
    derivatives = {
        f"D{rank}": sp.expand(sp.diff(root_lower, d[rank]))
        for rank in range(2, 7)
    }
    expected = {
        "D2": -6*n**2 + 22*n + 6*a[2] + 11*a[3] - 2*a[4] - 12,
        "D3": n + 11*a[2] + 10*a[3],
        "D4": -15*n - 2*a[2],
        "D5": -7*n,
        "D6": sp.Integer(0),
    }
    for label in expected:
        assert sp.expand(derivatives[label]-expected[label]) == 0
    # D2 is affine and is retained at both 0 and C(d,2).  The other signs
    # are immediate for N>=19 and nonnegative forest counts.
    return {
        "exact_derivatives": {key: str(sp.factor(value)) for key, value in derivatives.items()},
        "D2": "affine; both endpoints 0 and C(d,2) enumerated",
        "D3": "strictly positive; use zero lower endpoint",
        "D4_D5": "strictly negative; use edgeless upper endpoints",
        "D6": "absent",
    }


def main():
    pins = {
        "producer": (PRODUCER, PRODUCER_SHA256),
        "runner": (RUNNER, RUNNER_SHA256),
        "cover_source": (COVER_SOURCE, COVER_SOURCE_SHA256),
        "cover_report": (COVER_REPORT, COVER_REPORT_SHA256),
        "ratio_report": (RATIO_REPORT, RATIO_REPORT_SHA256),
        "corner_bridge": (CORNER_BRIDGE, CORNER_BRIDGE_SHA256),
        "mask_transfer": (MASK_TRANSFER, MASK_TRANSFER_SHA256),
    }
    for _label, (path, expected) in pins.items():
        assert sha256(path) == expected, (_label, expected, sha256(path))
    cover = json.loads(COVER_REPORT.read_text(encoding="utf-8"))
    ratio = json.loads(RATIO_REPORT.read_text(encoding="utf-8"))
    mask = json.loads(MASK_TRANSFER.read_text(encoding="utf-8"))
    assert cover["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_CHART_COVER_ROOT"
    assert ratio["ratio_floor"]["valid_for"] == "N>=19"
    assert ratio["ratio_floor"]["simplex_active_mass"] == "s=u0+u1+u2+u3=1-u4"
    assert mask["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_ALL_ADJACENCY_MASKS_DOMINATED_ROOT_LOWER_RANK7_G5_FINISH"

    matrix_cases = cases()
    expected_cases = {
        (geometry, chart, bmask, cmask, d2mask)
        for geometry, charts in {
            "common0": ("low", "high_far", "high_band", "high_near_lowedge", "high_near_highedge"),
            "common1": ("low", "high"),
        }.items()
        for chart in charts
        for bmask in (0, 1)
        for cmask in (0, 1)
        for d2mask in (0, 1)
    }
    assert len(matrix_cases) == len(set(matrix_cases)) == 56
    assert set(matrix_cases) == expected_cases

    integer_maps = audit_integer_order_maps()
    continuous_maps = audit_continuous_high_partition()
    edge_maps = audit_edge_maps()
    d_endpoints = audit_total_lower_d_endpoints()
    report = {
        "marker": MARKER,
        "status": "PASS independent exact 56-chart cover and endpoint audit",
        "shard_index": {
            "common0_charts": 5,
            "common1_charts": 2,
            "B2_C2_D2_corners_each": 8,
            "expected_and_actual_shards": 56,
            "runner_cases_exactly_match": True,
        },
        "all_order_partition_proof": {
            "common0_low": "7<=mB<=N/2 gives x=2(mB-7)/(N-14), y=d/mB in [0,1].",
            "common0_high_far": "0<=c<=b<=N/2 and b>=2 gives x=2(b-2)/(N-4), y=c/b in [0,1].",
            "common0_high_band": "1<b<2 and 2-b<=c<=b gives x=b-1 and y=(c-(2-b))/(2(b-1)) in [0,1]; b=c=1 is covered by near.",
            "common0_high_near": "0<=c<=b and b+c<=2 gives x=(b+c)/2 and y=2c/(b+c) in [0,1], with y=0 at b=c=0.",
            "common1_low_high": "The split at mB=(N-1)/2 gives the stated low/high inverse maps; the sole high denominator-zero point mB=mC=N-1 is represented with y=0.",
            "exact_integer_sweep_N19_160": integer_maps,
            "exact_continuous_rational_high_sweep_denominator32": continuous_maps,
        },
        "edge_wedge_audit": {
            "ordinary": "e=cap*z and omega=e^2*w/2 cover e=0 by z=w=0 and every e>0 by exact inverse.",
            "near_split": "lowedge covers 2e<=N; highedge covers 2e>=N; the common boundary overlaps.",
            "highedge_floor": "For a forest, Omega=sum C(deg,2)>=sum_nonisolated(deg-1)=2e-v_nonisolated>=2e-N.",
            "exact_integer_sweep_N19_256": edge_maps,
        },
        "simplex_audit": "Pinned active mass s>=1/3 is exactly u4<=2/3; t=3u4/2 and ri=ui/(1-u4) cover the complete restricted simplex.",
        "B_C_endpoints": "Pinned total-lower bridge proves only B2 and C2 remain free.",
        "D_endpoints_total_root_lower": d_endpoints,
        "all_parent_adjacency_masks": "Pinned structural transfer makes every u0_v0 shard valid for u0_v1, u1_v0, and u1_v1 as well.",
        "scope_guard": "This proves coverage/endpoints/mask transfer, not positivity of the 56 reports or their forced replay.",
        "pins": {label: {"file": path.name, "sha256": expected} for label, (path, expected) in pins.items()},
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "shards": 56,
        "integer_order_rows": sum(integer_maps.values()),
        "continuous_grid_rows": sum(continuous_maps.values()),
        "edge_rows": sum(edge_maps.values()),
        "D_endpoint_gap": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
