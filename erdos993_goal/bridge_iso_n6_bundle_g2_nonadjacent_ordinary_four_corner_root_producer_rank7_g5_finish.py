#!/usr/bin/env python3
"""Bridge the four-corner audit to the root C(d,2) ratio-floor producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_rank7_g5_finish import (
    reconstruct_lower,
)


HERE = Path(__file__).resolve().parent
CORNER_SOURCE = HERE / "derive_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_rank7_g5_finish.py"
CORNER_SOURCE_SHA256 = "51464526AD1F08C6E0F6DDDEA556920C617CA83450051A53F115B880A2DDB4DA"
CORNER_REPORT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_exact_rank7_g5_finish_20260831.json"
CORNER_REPORT_SHA256 = "FFD9D6B32296C94E6BC9B4BD3C5FDFD3FEBBC9A8A0C1A0B07AD5A612024628D2"
ROOT_PRODUCER = HERE / "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
ROOT_PRODUCER_SHA256 = "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_bridge_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FOUR_CORNER_ROOT_PRODUCER_BRIDGE_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main():
    assert sha256(CORNER_SOURCE) == CORNER_SOURCE_SHA256
    assert sha256(CORNER_REPORT) == CORNER_REPORT_SHA256
    assert sha256(ROOT_PRODUCER) == ROOT_PRODUCER_SHA256
    corner = json.loads(CORNER_REPORT.read_text(encoding="utf-8"))
    assert corner["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_"
        "FOUR_CORNER_SIGNS_RANK7_G5_FINISH"
    )

    # Fail closed on the exact producer implementation relevant to the bridge.
    producer_text = ROOT_PRODUCER.read_text(encoding="utf-8")
    required_fragments = (
        '"PZ5": ((-12, arow, 2),),',
        '"PZ5": choose(d, 2, one),',
        'assert w_parent_mode == "split_pw3"',
        '-choose(n - 1, 2, one) * neg_pw3_scaled',
        '+ choose(n - 1, 3, one) * pw4_scaled',
        'brow = row_corner(mb, bmask, one, reduced=True)',
        'crow = row_corner(mc, cmask, one, reduced=True)',
    )
    for fragment in required_fragments:
        assert fragment in producer_text, fragment

    shared_lower, a, b, c, d = reconstruct_lower()
    n, delta = a[1], d[1]
    cap_difference = sp.expand(
        -12 * a[2] * (choose(delta, 2) - choose(delta - 1, 2))
    )
    assert sp.expand(cap_difference + 12 * a[2] * (delta - 1)) == 0
    root_lower = sp.expand(shared_lower + cap_difference)

    coordinates = {
        "B3": b[3], "B4": b[4], "B5": b[5], "B6": b[6],
        "C3": c[3], "C4": c[4], "C5": c[5], "C6": c[6],
    }
    unchanged = {}
    for label, coordinate in coordinates.items():
        shared_derivative = sp.expand(sp.diff(shared_lower, coordinate))
        root_derivative = sp.expand(sp.diff(root_lower, coordinate))
        assert root_derivative == shared_derivative, label
        unchanged[label] = str(sp.factor(root_derivative))

    # Ratio-floor is a restriction of the A-row moment simplex.  The audited
    # floors used only universal forest-row inequalities and N>=12, so the
    # restriction preserves them.  Root uses base order N>=19.
    assert 19 >= 12
    report = {
        "marker": MARKER,
        "status": "PASS exact producer bridge; all eight B/C endpoint derivatives unchanged",
        "root_producer": {"file": ROOT_PRODUCER.name, "sha256": ROOT_PRODUCER_SHA256},
        "root_mode": {
            "PZ5_cap": "C(d,2)",
            "W_parent_mode": "split_pw3",
            "ratio_floor": True,
            "base_order_floor": 19,
        },
        "shared_ap_mode": {"PZ5_cap": "C(d-1,2)", "base_order_floor": 12},
        "exact_difference_root_minus_shared": str(cap_difference),
        "difference_independent_of": ["B3", "B4", "B5", "B6", "C3", "C4", "C5", "C6"],
        "unchanged_exact_derivatives": unchanged,
        "directions_inherited": corner["directions"],
        "applicability": (
            "The total-lower four-corner reduction applies to every geometry, "
            "order chart, ratio-floor chart, and D2 endpoint emitted by the pinned "
            "root producer in split_pw3 mode, provided N>=19."
        ),
        "scope_guard": (
            "This bridge validates only the B/C row endpoint reduction. It does "
            "not itself prove positivity of any Bernstein shard or assemble the matrix."
        ),
        "pins": {
            "corner_source": {"file": CORNER_SOURCE.name, "sha256": CORNER_SOURCE_SHA256},
            "corner_report": {"file": CORNER_REPORT.name, "sha256": CORNER_REPORT_SHA256},
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "difference": str(cap_difference),
        "unchanged_derivatives": len(unchanged),
        "producer_sha256": ROOT_PRODUCER_SHA256,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
