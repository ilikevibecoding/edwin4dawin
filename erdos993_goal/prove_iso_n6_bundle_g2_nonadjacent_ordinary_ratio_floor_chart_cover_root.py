#!/usr/bin/env python3
"""Exact chart-cover certificate for the 56-shard N>=19 matrix."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
)
PRODUCER_SHA256 = (
    "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
)
RATIO = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
)
RATIO_SHA256 = (
    "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
)
CORNER_BRIDGE = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_bridge_"
    "exact_rank7_g5_finish_20260831.json"
)
CORNER_BRIDGE_SHA256 = (
    "DFB5125039602403E11085D9AFEC0E65A0CCD4BA28E671DFA50421A54B714C60"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
    "CHART_COVER_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def zero(expression) -> bool:
    return sp.expand(sp.together(expression)) == 0


def main() -> None:
    assert sha256(PRODUCER) == PRODUCER_SHA256
    assert sha256(RATIO) == RATIO_SHA256
    assert sha256(CORNER_BRIDGE) == CORNER_BRIDGE_SHA256

    n, mb, mc, b, c, e, omega = sp.symbols(
        "N mB mC b c e omega", real=True
    )
    x, y, z, w = sp.symbols("x y z w", real=True)

    # common0 low: 7<=mB<=N/2 and d=mB+mC-N in [0,mB].
    d0 = mb + mc - n
    low_x = 2 * (mb - 7) / (n - 14)
    low_y = d0 / mb
    low_mb = 7 + (n - 14) * low_x / 2
    low_mc = n - low_mb + low_mb * low_y

    # common0 high uses deficits b=N-mB, c=N-mC, 0<=c<=b<=N/2.
    far_x = 2 * (b - 2) / (n - 4)
    far_y = c / b
    far_b = 2 + (n - 4) * far_x / 2
    far_c = far_b * far_y

    band_x = b - 1
    band_y = (c - (2 - b)) / (2 * (b - 1))
    band_b = 1 + band_x
    band_c = 1 - band_x + 2 * band_x * band_y

    near_x = (b + c) / 2
    near_y = 2 * c / (b + c)
    near_b = near_x * (2 - near_y)
    near_c = near_x * near_y

    # common1 has union order U=N-1.
    union = n - 1
    d1 = mb + mc - union
    common1_low_x = 2 * (mb - 7) / (union - 14)
    common1_low_y = d1 / mb
    common1_low_mb = 7 + (union - 14) * common1_low_x / 2
    common1_low_mc = union - common1_low_mb + common1_low_mb * common1_low_y
    common1_high_x = 2 * mb / union - 1
    common1_high_y = (mc - mb) / (union - mb)
    common1_high_mb = union * (1 + common1_high_x) / 2
    common1_high_mc = (
        common1_high_mb + (union - common1_high_mb) * common1_high_y
    )

    lowedge_z = 2 * e / n
    lowedge_e = n * lowedge_z / 2
    highedge_z = (e - n / 2) / (n / 2 - 1)
    highedge_e = n / 2 + (n / 2 - 1) * highedge_z
    wedge_floor = 2 * e - n
    highedge_w = (omega - wedge_floor) / (e**2 / 2 - wedge_floor)
    highedge_omega = (
        wedge_floor + (e**2 / 2 - wedge_floor) * highedge_w
    )

    identities = {
        "common0_low_mB": zero(low_mb - mb),
        "common0_low_mC": zero(low_mc - mc),
        "common0_high_far_b": zero(far_b - b),
        "common0_high_far_c": zero(far_c - c),
        "common0_high_band_b": zero(band_b - b),
        "common0_high_band_c": zero(band_c - c),
        "common0_high_near_b": zero(near_b - b),
        "common0_high_near_c": zero(near_c - c),
        "common1_low_mB": zero(common1_low_mb - mb),
        "common1_low_mC": zero(common1_low_mc - mc),
        "common1_high_mB": zero(common1_high_mb - mb),
        "common1_high_mC": zero(common1_high_mc - mc),
        "common0_near_lowedge_e": zero(lowedge_e - e),
        "common0_near_highedge_e": zero(highedge_e - e),
        "common0_near_highedge_omega": zero(highedge_omega - omega),
        "highedge_omega_denominator_square_identity": zero(
            e**2 / 2 - wedge_floor - ((e - 2) ** 2 / 2 + n - 2)
        ),
    }
    assert all(identities.values())

    report = {
        "marker": MARKER,
        "status": "PASS exact algebraic inverse-map and exhaustive case cover",
        "ambient_floor": "N>=19",
        "identities": identities,
        "common0_order_partition": [
            {
                "chart": "low",
                "domain": "7<=mB<=N/2, 0<=d=mB+mC-N<=mB",
                "inverse": "x=2(mB-7)/(N-14), y=d/mB",
            },
            {
                "chart": "high_far",
                "domain": "b=N-mB>=2, 0<=c=N-mC<=b<=N/2",
                "inverse": "x=2(b-2)/(N-4), y=c/b",
            },
            {
                "chart": "high_band",
                "domain": "1<b<=2, 2-b<=c<=b",
                "inverse": "x=b-1, y=(c-(2-b))/(2(b-1))",
            },
            {
                "chart": "high_near",
                "domain": "0<=c<=b and b+c<=2",
                "inverse": "x=(b+c)/2, y=2c/(b+c); choose y=0 when b=c=0",
            },
        ],
        "common0_partition_argument": (
            "For mB>=N/2, ordered deficits obey 0<=c<=b<=N/2. "
            "If b>=2 use high_far. If b<2 and b+c>=2 use high_band "
            "(the b=1 boundary is b=c=1 and is also high_near). Otherwise "
            "b+c<=2 and high_near applies. These cases are exhaustive."
        ),
        "common1_order_partition": [
            {
                "chart": "low",
                "domain": "7<=mB<=(N-1)/2, 0<=d=mB+mC-(N-1)<=mB",
                "inverse": "x=2(mB-7)/(N-15), y=d/mB",
            },
            {
                "chart": "high",
                "domain": "(N-1)/2<=mB<=mC<=N-1",
                "inverse": (
                    "x=2mB/(N-1)-1, y=(mC-mB)/(N-1-mB); "
                    "at mB=mC=N-1 choose y=0"
                ),
            },
        ],
        "common1_partition_argument": (
            "The ordered interval splits at mB=(N-1)/2. In the low half, "
            "0<=d<=mB gives x,y in [0,1]. In the high half, "
            "mB<=mC<=N-1 gives x,y in [0,1]; the sole zero-denominator "
            "boundary is mB=mC=N-1 and is represented by x=1 with any y."
        ),
        "edge_wedge_partition": {
            "ordinary_charts": (
                "0<=e<=edge_cap and 0<=omega<=C(e,2)<=e^2/2, so "
                "z=e/edge_cap and w=2omega/e^2 lie in [0,1] (zero at e=0)."
            ),
            "common0_high_near_lowedge": (
                "0<=e<=N/2 with z=2e/N; forest bound 0<=omega<=e^2/2."
            ),
            "common0_high_near_highedge": (
                "N/2<=e<=N-1 with z=(e-N/2)/(N/2-1). For a forest, "
                "omega=sum C(deg(v),2)>=sum_nonisolated(deg(v)-1)>=2e-N; "
                "the upper bound is C(e,2)<=e^2/2. The denominator "
                "e^2/2-(2e-N)=(e-2)^2/2+N-2 is positive."
            ),
        },
        "simplex_cover": (
            "The pinned ratio-floor theorem proves u4<=2/3. Thus t=3u4/2 "
            "lies in [0,1], active_scale=1-u4>=1/3, and ri=ui/active_scale "
            "form the complete four-coordinate simplex."
        ),
        "corner_cover": (
            "The pinned producer bridge proves the reduced B/C row endpoints "
            "are valid for every listed geometry/chart/D2 shard. The matrix "
            "enumerates both B2, both C2, and both D2 endpoints."
        ),
        "expected_shards": 56,
        "dependencies": {
            "producer": {"file": PRODUCER.name, "sha256": PRODUCER_SHA256},
            "ratio_floor": {"file": RATIO.name, "sha256": RATIO_SHA256},
            "corner_bridge": {
                "file": CORNER_BRIDGE.name,
                "sha256": CORNER_BRIDGE_SHA256,
            },
        },
        "scope_guard": (
            "This proves parameter coverage and endpoint validity, not shard "
            "positivity; the 56 exact shard reports and replay remain separate."
        ),
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "identities": len(identities),
        "expected_shards": 56,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
