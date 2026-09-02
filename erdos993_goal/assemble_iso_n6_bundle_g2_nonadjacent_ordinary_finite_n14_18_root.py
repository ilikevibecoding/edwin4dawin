#!/usr/bin/env python3
"""Fail-closed finite N=14..18 ordinary-parent G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n14_18_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "FINITE_N14_18_ROOT"
)
SOURCES = {
    "single_case_producer": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_"
        "corner_paid_single_case_root.py",
        "B8C126E58383981588D08A7AAE525D6F0209191B4486F0ADC2FA6FD5EB7C8CD8",
    ),
    "sequential_definition": (
        "census_iso_n6_bundle_g2_nonadjacent_ordinary_"
        "safe_abs_forest_jets_n9_18_root.py",
        "92EB4E82A429A5E7A1616D26B76AD92E4CB921A7C8EBAC34027019405491D4A1",
    ),
}
REPORTS = {
    (14, "common0"): "E892974D7B7F363F21137E559338A0F9F8DD71F0FE842A7D181A06EBE24FBF94",
    (14, "common1"): "876870CB0E91AE0BE9DDEC0E2FA5A8870B9CDE5D7F28FB78D7DFFAD53C117357",
    (15, "common0"): "13B2CDDB2E29D02730831C9367275376B2F29DB9228572DF35131885A2FA60DB",
    (15, "common1"): "C2A858E01E067739261637EE21353F26360A4F7226CAC88927E19D50B7973542",
    (16, "common0"): "EA2A556AC79103B7170A0D1D832AF53B7875435E35D268EF30BC085FD43EE232",
    (16, "common1"): "34A1E2854435D32F8F4037A49A1713E56A17778BD08EEFE5327CDACF4D5C6A8A",
    (17, "common0"): "0B96FBC6C36ED06E89ACC495775A8E67B4A0E00E19783B4E7564A57183C47F1B",
    (17, "common1"): "34713298C0ADD574AC6C94CCFCD3229161B7C1CAD61AB770255F0DF1B9763D7C",
    (18, "common0"): "5B23BD42D55E5522469E2BF502D942B8CFE689AA702686E757A9438B30E0DFA8",
    (18, "common1"): "C9A0953E5382098119E9B356C65E7A7A78F5A6E6B195E38D2483DC3277D8F027",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(order: int, geometry: str) -> Path:
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_corner_paid_forest_jets_"
        f"n{order}_{geometry}_single_exact_root_20260831.json"
    )


def main() -> None:
    for filename, expected in SOURCES.values():
        assert sha256(HERE / filename) == expected
    assert set(REPORTS) == {
        (order, geometry)
        for order in range(14, 19)
        for geometry in ("common0", "common1")
    }
    rows = []
    for (order, geometry), expected in sorted(REPORTS.items()):
        path = report_path(order, geometry)
        assert sha256(path) == expected
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["marker"] == (
            "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
            "CORNER_PAID_FOREST_JETS_SINGLE_CASE_ROOT"
        )
        assert report["N"] == order
        assert report["geometry"] == geometry
        assert report["source_sha256"] == SOURCES["single_case_producer"][1]
        assert report["sequential_source_sha256"] == (
            SOURCES["sequential_definition"][1]
        )
        result = report["result"]
        assert result["negative_corner_paid_corners"] == 0
        assert not result["negative_order_pairs"]
        rows.append({
            "N": order,
            "geometry": geometry,
            "report": path.name,
            "report_sha256": expected,
            "checks": result["literal_corner_paid_checks"],
            "minimum": result["minimum"],
            "ordered_stream_sha256": (
                result["ordered_jet_minimum_stream_sha256"]
            ),
        })

    aggregate = {
        "cases": len(rows),
        "literal_corner_paid_checks": sum(row["checks"] for row in rows),
        "negative": 0,
        "minimum": min(row["minimum"] for row in rows),
    }
    report = {
        "marker": MARKER,
        "status": "PASS exact finite N=14..18 ordinary-parent G2",
        "theorem_component": (
            "For every rank-six nonadjacent ordinary-parent forest bundle "
            "with 14<=N<=18, G2 is nonnegative."
        ),
        "coverage": (
            "Every distinct forest i0..i7 jet in each ambient order, both "
            "common-neighbor geometries, every feasible sorted B,C order "
            "triple, all retained row endpoints, both D2 endpoints, and all "
            "sixteen independently paid parent-loss coordinates."
        ),
        "rows": rows,
        "aggregate": aggregate,
        "dependencies": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in SOURCES.items()
        },
        "scope_guard": (
            "Finite N=14..18 ordinary-parent G2 only; N<=13, N>=19, "
            "endpoint-parent mode, replay, and all-mode assembly are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **aggregate}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
