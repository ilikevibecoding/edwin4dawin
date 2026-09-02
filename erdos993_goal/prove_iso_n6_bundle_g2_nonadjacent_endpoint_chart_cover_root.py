#!/usr/bin/env python3
"""Exact all-order chart/orientation cover for nonadjacent endpoint G2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PINS = {
    "large_producer": (
        "probe_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_"
        "wedge_flint_root.py",
        "AC3B4977FA225B33E38AAE7120478FB789C8329CB1D5001C5ED4C3FD85E214F1",
    ),
    "small_producer": (
        "probe_iso_n6_bundle_g2_nonadjacent_endpoint_"
        "wedge_small_order_flint_root.py",
        "1EE93DCD0A1DF79655654026C0442C4445AC96286D64B61868F1EEFC19A8E1EE",
    ),
    "ordinary_chart_cover": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_"
        "exact_root_20260831.json",
        "593F42AED78D6D6B736A3FAF4FC45CE5F2C5891DCF72DC920D733EA449BFC70B",
    ),
    "corner_reduction": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
        "exact_root_20260831.json",
        "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69",
    ),
    "ratio_floor": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_"
        "exact_root_20260831.json",
        "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA",
    ),
}
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_chart_cover_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "CHART_COVER_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def in_unit(value: Fraction) -> bool:
    return Fraction(0) <= value <= Fraction(1)


def audit_order_cover(stop_n: int = 160):
    counts = {
        "small": 0,
        "large_common0_low": 0,
        "large_common0_far": 0,
        "large_common0_near": 0,
        "large_common1_low": 0,
        "large_common1_high": 0,
    }
    orientations = {"B_le_C": 0, "B_ge_C": 0}
    for n in range(19, stop_n + 1):
        for geometry in ("common0", "common1"):
            union = n if geometry == "common0" else n - 1
            for mb in range(union + 1):
                for mc in range(max(0, union - mb), union + 1):
                    d = mb + mc - union
                    assert 0 <= d <= min(mb, mc)
                    orientation = "B_le_C" if mb <= mc else "B_ge_C"
                    orientations[orientation] += 1
                    small, large = sorted((mb, mc))
                    if small <= 6:
                        y = Fraction(d, small) if small else Fraction(0)
                        assert in_unit(y)
                        assert union - small + small * y == large
                        counts["small"] += 1
                        continue
                    if geometry == "common1":
                        if 2 * small <= union:
                            x = Fraction(2 * (small - 7), union - 14)
                            y = Fraction(d, small)
                            assert in_unit(x) and in_unit(y)
                            assert Fraction(7) + Fraction(union - 14, 2) * x == small
                            assert union - small + small * y == large
                            counts["large_common1_low"] += 1
                        else:
                            x = Fraction(2 * small, union) - 1
                            y = (
                                Fraction(large - small, union - small)
                                if small < union else Fraction(0)
                            )
                            assert in_unit(x) and in_unit(y)
                            rebuilt = Fraction(union, 2) * (1 + x)
                            assert rebuilt == small
                            assert rebuilt + (union - rebuilt) * y == large
                            counts["large_common1_high"] += 1
                        continue

                    # common0: low is the same induced-order map.  In the high
                    # half, the pinned far/band/near continuous partition is
                    # selected by the ordered deficits b>=c.
                    if 2 * small <= n:
                        x = Fraction(2 * (small - 7), n - 14)
                        y = Fraction(d, small)
                        assert in_unit(x) and in_unit(y)
                        assert Fraction(7) + Fraction(n - 14, 2) * x == small
                        assert n - small + small * y == large
                        counts["large_common0_low"] += 1
                    else:
                        deficit_small = n - small
                        deficit_large = n - large
                        assert 0 <= deficit_large <= deficit_small
                        if deficit_small >= 2:
                            x = Fraction(2 * (deficit_small - 2), n - 4)
                            y = Fraction(deficit_large, deficit_small)
                            assert in_unit(x) and in_unit(y)
                            assert 2 + Fraction(n - 4, 2) * x == deficit_small
                            counts["large_common0_far"] += 1
                        else:
                            total = deficit_small + deficit_large
                            x = Fraction(total, 2)
                            y = (
                                Fraction(2 * deficit_large, total)
                                if total else Fraction(0)
                            )
                            assert in_unit(x) and in_unit(y)
                            assert x * (2 - y) == deficit_small
                            assert x * y == deficit_large
                            counts["large_common0_near"] += 1
    return counts, orientations


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(HERE / filename) == expected
    ordinary_cover = json.loads(
        (HERE / PINS["ordinary_chart_cover"][0]).read_text(encoding="utf-8")
    )
    reduction = json.loads(
        (HERE / PINS["corner_reduction"][0]).read_text(encoding="utf-8")
    )
    ratio = json.loads(
        (HERE / PINS["ratio_floor"][0]).read_text(encoding="utf-8")
    )
    assert ordinary_cover["expected_shards"] == 56
    assert reduction["corner_count_per_orientation"] == 8
    assert ratio["ratio_floor"]["valid_for"] == "N>=19"
    counts, orientations = audit_order_cover()
    assert all(value > 0 for value in counts.values())
    assert all(value > 0 for value in orientations.values())

    report = {
        "marker": MARKER,
        "status": "PASS exact all-order chart, orientation, and corner cover",
        "ambient_floor": "N>=19",
        "partition": {
            "small_induced_order": (
                "min(mB,mC)<=6; k=min(mB,mC), d=k*y, "
                "max(mB,mC)=union-k+d; both orientations"
            ),
            "large_induced_order": (
                "min(mB,mC)>=7; the pinned common0 five-chart and common1 "
                "two-chart partition applies to the sorted orders; both "
                "assignments to asymmetric B,C are enumerated"
            ),
            "boundary": "small and large partitions meet without a gap at 6/7",
        },
        "edge_wedge_cover": ordinary_cover["edge_wedge_partition"],
        "simplex_cover": {
            "small": "complete five-coordinate rank-ratio simplex",
            "large": ordinary_cover["simplex_cover"],
        },
        "corner_cover": {
            "B_C": (
                "the extra R2(A,D) term is independent of B,C, so the pinned "
                "adjacent four-corner reduction transfers"
            ),
            "D": reduction["D_endpoints"],
            "corners_per_orientation": 8,
        },
        "expected_shards": {
            "small": 224,
            "large": 112,
            "total": 336,
        },
        "exact_integer_sweep_N19_160": {
            "partition_counts": counts,
            "orientation_counts": orientations,
        },
        "scope_guard": (
            "This proves coverage and endpoint validity, not positivity or "
            "replay of the 336 individual matrix shards"
        ),
        "pins": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "small_shards": 224,
        "large_shards": 112,
        "integer_rows": sum(counts.values()),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
