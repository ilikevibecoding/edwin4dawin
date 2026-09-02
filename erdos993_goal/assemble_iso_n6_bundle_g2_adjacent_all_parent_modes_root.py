#!/usr/bin/env python3
"""Assemble every rank-six adjacent G2 deletion-parent mode."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_adjacent_all_parent_modes_"
    "assembled_exact_root_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ALL_PARENT_MODES_ROOT"
PINS = {
    "probe_iso_n6_bundle_g2_exact_parent_modes_root.py":
        "25189D7DE6C31E028E06B9CE9C46652D734B44560248BAD167E6E9C19990D9A7",
    "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json":
        "75D782A4C3986088F9DF44DE5F1FA1F7620C9ACAED27C938784ED61222C89116",
    "assemble_iso_n6_bundle_g2_adjacent_no_parent_all_order_root.py":
        "4B5F5828F60784FBCC0A543217DB1C2CA1DC15F80D84075A36C01FE5B2A87531",
    "iso_n6_bundle_g2_adjacent_no_parent_all_order_exact_root_20260831.json":
        "B9323D7D6E2FC797BC47AB0844691B8AC70177744AEA165BCB34F033E7850CA9",
    "assemble_iso_n6_bundle_g2_adjacent_endpoint_all_order_rank7_g5_finish.py":
        "C18B7F57A3E430492FE1324B8BAD9E5E02186843D39C0EA19AC997DB9B953D01",
    "iso_n6_bundle_g2_adjacent_endpoint_all_order_exact_rank7_g5_finish_20260831.json":
        "8AA02C1A0B49630EB600E0DAAB6F29632496A71D3303B68FBF814A3530EFDAF5",
    "prove_iso_n6_bundle_g2_adjacent_ordinary_universal_rank7_g5_finish.py":
        "BB34A8DAB4BE7C2A7438B9319785B70D3A7569AC6A99D0EB6124560A20C5E12C",
    "iso_n6_bundle_g2_adjacent_ordinary_universal_exact_rank7_g5_finish_20260831.json":
        "F1FFEBB39658B2DD43D88C2F68B3C18CA9726A00B4B10393B257CB383301CFA1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    parent_modes = load(
        "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json"
    )
    no_parent = load(
        "iso_n6_bundle_g2_adjacent_no_parent_all_order_exact_root_20260831.json"
    )
    endpoint = load(
        "iso_n6_bundle_g2_adjacent_endpoint_all_order_"
        "exact_rank7_g5_finish_20260831.json"
    )
    ordinary = load(
        "iso_n6_bundle_g2_adjacent_ordinary_universal_"
        "exact_rank7_g5_finish_20260831.json"
    )

    assert parent_modes["marker"] == (
        "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODES_ROOT"
    )
    assert set(parent_modes["modes"]) == {
        "no_parent",
        "endpoint_u",
        "endpoint_v",
    }
    assert set(parent_modes["open_modes"]) == {
        "ordinary_parent_no_mark",
        "ordinary_parent_marked_spine",
    }
    assert no_parent["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_NO_PARENT_ALL_ORDER_ROOT"
    )
    assert endpoint["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_"
        "ALL_ORDER_RANK7_G5_FINISH"
    )
    assert ordinary["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_"
        "UNIVERSAL_RANK7_G5_FINISH"
    )
    assert no_parent["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_adjacent_no_parent_all_order_root.py"
    ]
    assert endpoint["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_adjacent_endpoint_all_order_rank7_g5_finish.py"
    ]
    assert ordinary["source_sha256"] == PINS[
        "prove_iso_n6_bundle_g2_adjacent_ordinary_universal_rank7_g5_finish.py"
    ]
    assert ordinary["coverage_gap"] is None

    report = {
        "schema": "iso-n6-bundle-g2-adjacent-all-parent-modes-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact all-order rank-six adjacent G2 theorem for every "
            "deletion-parent mode"
        ),
        "theorem": (
            "For every rank-six adjacent marked-pair forest bundle and every "
            "canonical deletion-parent mode, G2 is nonnegative at every ambient "
            "order N>=0."
        ),
        "exhaustive_parent_partition": [
            {
                "modes": ["no_parent"],
                "certificate": no_parent["marker"],
            },
            {
                "modes": ["endpoint_u", "endpoint_v"],
                "certificate": endpoint["marker"],
            },
            {
                "modes": [
                    "ordinary_parent_no_mark",
                    "ordinary_parent_marked_spine",
                ],
                "certificate": ordinary["marker"],
            },
        ],
        "logical_exhaustion": (
            "A deletion parent is absent, equals one of the two marked endpoints, "
            "or is an ordinary vertex. For adjacent marks in a forest, an ordinary "
            "parent can meet neither mark or exactly one mark; adjacency to both "
            "would create a triangle. The three pinned universal theorems cover "
            "all five canonical parent submodes."
        ),
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "This closes rank-six G2 only for adjacent marks. Nonadjacent marks, "
            "rank-six G1, rank-seven propagation, Newton m=0, final proof assembly, "
            "and Erdos Problem 993 remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
