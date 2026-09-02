#!/usr/bin/env python3
"""Exact refined simplex probes for the marked-edge singleton g1 branches.

This source splits only zero versus positive selected-vertex degree excess.
On each cell it uses the true structural neighbor-excess endpoint and the
exact disjoint unmarked excess-pool wedge cap.  It is a fail-closed probe;
the separate theorem assembler must check exhaustive coverage.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_SELECTED_EDGE_REFINED_G1_BERNSTEIN"


def state(positive: bool) -> str:
    return "P" if positive else "Z"


def cases():
    rows = []

    def add(target, adjacency, common, endpoints, uv_common, states,
            endpoint_modes, parent_mode, wedge_mode, extra,
            positive_parent_interval="full"):
        rows.append({
            "target_index": target,
            "adjacency": adjacency,
            "common": common,
            "endpoints": endpoints,
            "uv_common": uv_common,
            "states": states,
            "endpoint_modes": endpoint_modes,
            "parent_mode": parent_mode,
            "wedge_mode": wedge_mode,
            "additional_remainder_base": extra,
            "positive_parent_interval": positive_parent_interval,
        })

    # One selected edge p-v; the three unmarked neighbor sets are disjoint.
    for ypos in (False, True):
        for zpos in (False, True):
            # If y=z=0, p and v form an isolated selected edge and xp=0,
            # contradicting the positive-parent-excess branch.
            if not ypos and not zpos:
                continue
            add(70, (0, 0, 1), (0, 0), ("L", "L"), 0,
                ("F", state(ypos), state(zpos)),
                ("one", "structural" if zpos else "one"),
                "structural" if ypos else "one", "pv_disjoint",
                int(not ypos) + int(not zpos))

    # The u-v common center is fixed at excess one by the displayed L row.
    for target, endpoints, endpoint_modes in (
        (76, ("L", "U"), ("structural", "current")),
        (82, ("U", "L"), ("current", "structural")),
    ):
        # The edge p-v and the distinct unmarked u-v common centre force
        # degree(v)>=2, hence y=d(v)-1 is positive.
        add(target, (0, 0, 1), (0, 0), endpoints, 1,
            ("F", "P", "F"), endpoint_modes,
            "structural", "pv_uv_common", 0)

    # The same incidence forces y>0 on the LL row.  If z=0 then p is the
    # leaf whose only neighbour is v, so xp=y exactly (the lower face).
    # If z>0 the full structural interval is retained.  These two cells are
    # exhaustive and replace the unrealizable y=0 cell plus the formerly
    # mixed z>=0 cell.
    add(72, (0, 0, 1), (0, 0), ("L", "L"), 1,
        ("F", "P", "Z"), ("structural", "structural"),
        "structural", "pv_uv_common", 0, "lower")
    add(72, (0, 0, 1), (0, 0), ("L", "L"), 1,
        ("F", "P", "P"), ("structural", "structural"),
        "structural", "pv_uv_common", 0)

    # Zero neighbor excess at u,v forces z=0; split whether the selected
    # neighbor v already supplies the positive parent excess.
    # Here xv=0 forces z=0.  Positive parent excess then comes entirely from
    # the selected neighbour v, so y must be positive.
    add(94, (0, 0, 1), (0, 0), ("Z", "Z"), 0,
        ("F", "P", "Z"), ("current", "current"),
        "structural", "pv_disjoint", 0)

    # One p-u common center is fixed; v's unmarked lower pool is present
    # exactly when z=0.
    # The selected edge p-v and the distinct unmarked p-u common centre force
    # degree(p)>=2, hence z=d(p)-1 is positive.
    add(96, (0, 0, 1), (1, 0), ("L", "L"), 0,
        ("F", "F", "P"), ("structural", "structural"),
        "structural", "pv_pu_common", 0)

    # Two selected edges u-p and p-v.  Both endpoint lower pools occur when
    # z=0; the parent structural lower is x+y unless both are zero.
    for xpos in (False, True):
        for ypos in (False, True):
            # The two selected edges incident with p force degree(p)>=2.
            add(106, (0, 1, 1), (0, 0), ("L", "L"), 1,
                (state(xpos), state(ypos), "P"),
                ("structural", "structural"),
                "structural" if (xpos or ypos) else "one",
                "two_edge_parent_center", int(not xpos and not ypos))

    # Selected edge u-v, with p in a disjoint selected-neighbor class.
    for xpos in (False, True):
        for ypos in (False, True):
            add(112, (1, 0, 0), (0, 0), ("L", "L"), 0,
                (state(xpos), state(ypos), "F"),
                ("structural" if ypos else "one",
                 "structural" if xpos else "one"),
                "one", "uv_parent_separate", int(not xpos) + int(not ypos))

    # Edge u-v and a fixed p-v common center.
    # The selected edge u-v and the distinct unmarked p-v common centre force
    # degree(v)>=2.
    add(124, (1, 0, 0), (0, 1), ("L", "L"), 0,
        ("F", "P", "F"), ("structural", "structural"),
        "structural", "uv_pv_common", 0)

    # Selected path u-v-p.  The forced common incidence is the selected
    # center v itself, so the three unmarked neighbor classes are disjoint.
    for xpos in (False, True):
        for zpos in (False, True):
            # The selected path u-v-p forces degree(v)>=2.
            add(130, (1, 0, 1), (1, 0), ("L", "L"), 0,
                (state(xpos), "P", state(zpos)),
                ("structural",
                 "structural" if (xpos or zpos) else "one"),
                "structural", "two_edge_endpoint_parent",
                int(not xpos and not zpos))

    assert len(rows) == 22
    return rows


def key(row) -> str:
    return "/".join((
        str(row["target_index"]),
        "".join(map(str, row["adjacency"])),
        "".join(map(str, row["common"])),
        "".join(row["endpoints"]),
        str(row["uv_common"]),
        "".join(row["states"]),
        "".join(mode[0].upper() for mode in row["endpoint_modes"]),
        row["parent_mode"][0].upper(),
        row["positive_parent_interval"],
        row["wedge_mode"],
        str(row["additional_remainder_base"]),
    ))


def main() -> None:
    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])
    reports = []
    for offset, row in enumerate(cases()):
        polynomial, _variables = mapped_polynomial(
            (1, 1, 1), row["adjacency"], row["common"], row["endpoints"],
            "centers", 1, 0, 0, row["uv_common"], 14, numerator=numerator,
            parent_state="P", selected_excess_states=row["states"],
            positive_parent_interval=row["positive_parent_interval"],
            endpoint_lower_modes=row["endpoint_modes"],
            parent_lower_mode=row["parent_mode"],
            wedge_partition_mode=row["wedge_mode"],
            additional_remainder_base=row["additional_remainder_base"],
        )
        attempts = []
        passed = False
        for elevation in range(11):
            coefficients, stats = homogeneous_coefficients_fast(
                polynomial, elevation, elevation
            )
            negative = sum(value < 0 for value in coefficients.values())
            attempts.append({
                "elevation": elevation,
                **stats,
                "negative": int(negative),
                "minimum": str(min(coefficients.values())),
            })
            if not negative:
                passed = True
                break
        reports.append({"case": key(row), "passed": passed, "attempts": attempts})
        print(json.dumps({
            "progress": f"{offset + 1}/{len(cases())}", "case": key(row),
            "passed": passed, "last": attempts[-1],
        }, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "case_count": len(reports),
        "passed": sum(row["passed"] for row in reports),
        "failed": sum(not row["passed"] for row in reports),
        "target_indices": sorted(set(row["target_index"] for row in cases())),
        "rows": reports,
        "scope": (
            "Exact refined simplex probes for ten displayed marked-edge "
            "canonical branches only. No theorem or all-mode claim."
        ),
        "dependencies_sha256": {
            "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py":
                hashlib.sha256((HERE / "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py").read_bytes()).hexdigest().upper(),
            "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py":
                hashlib.sha256((HERE / "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py").read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "passed": report["passed"],
        "failed": report["failed"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
