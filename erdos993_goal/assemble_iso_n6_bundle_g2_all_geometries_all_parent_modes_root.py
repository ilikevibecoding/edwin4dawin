#!/usr/bin/env python3
"""Assemble the complete rank-six whole-bundle G2 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_"
    "ALL_PARENT_MODES_ROOT"
)
PINS = {
    "assemble_iso_n6_bundle_g2_adjacent_all_parent_modes_root.py":
        "C88433C32EEDBC6E1F63F4935A0D82CD3C223DEAF8A49F4969A41B4AE34B2FC9",
    "iso_n6_bundle_g2_adjacent_all_parent_modes_assembled_exact_root_20260831.json":
        "F13A6B85D3A928F542E2A664A76D0669D89036C212186E4644DE60DF1D1C4890",
    "assemble_iso_n6_bundle_g2_nonadjacent_all_parent_modes_root.py":
        "A4BD7F8992CB416C879FED50F877057CEB279610D9B2A0AE7DD4069382409F03",
    "iso_n6_bundle_g2_nonadjacent_all_parent_modes_assembled_exact_root_20260831.json":
        "40C462B2E1530A76F8A36FBFAD2C91EB7F95A3C78DA2E4C5E734DC2DC5A529F8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    adjacent = load(
        "iso_n6_bundle_g2_adjacent_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    nonadjacent = load(
        "iso_n6_bundle_g2_nonadjacent_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    assert adjacent["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ALL_PARENT_MODES_ROOT"
    )
    assert nonadjacent["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ALL_PARENT_MODES_ROOT"
    )
    assert adjacent["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_adjacent_all_parent_modes_root.py"
    ]
    assert nonadjacent["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_nonadjacent_all_parent_modes_root.py"
    ]

    report = {
        "schema": "iso-n6-bundle-g2-complete-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact all-order rank-six G2 theorem for every mark geometry "
            "and deletion-parent mode"
        ),
        "theorem": (
            "For every finite forest in the canonical rank-six whole-bundle "
            "construction, every ordered pair of distinct marks, and every "
            "canonical deletion-parent mode, the coefficient G2 is nonnegative."
        ),
        "exhaustive_mark_geometry_partition": [
            {
                "geometry": "the two distinct marks are adjacent",
                "certificate": adjacent["marker"],
            },
            {
                "geometry": "the two distinct marks are nonadjacent",
                "certificate": nonadjacent["marker"],
            },
        ],
        "logical_exhaustion": (
            "Two distinct marked vertices either form an edge or do not. Each "
            "pinned geometry theorem separately exhausts no-parent, both "
            "endpoint-parent, and every ordinary-parent submode at every order."
        ),
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "coverage_gap_within_rank_six_G2": None,
        "scope_guard": (
            "This closes the rank-six whole-bundle G2 obligation. Rank-six G1, "
            "rank-seven propagation, Newton m=0, final proof assembly, and Erdos "
            "Problem 993 remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
