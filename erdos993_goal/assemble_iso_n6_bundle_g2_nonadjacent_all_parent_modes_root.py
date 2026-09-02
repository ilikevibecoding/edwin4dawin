#!/usr/bin/env python3
"""Assemble every rank-six nonadjacent G2 deletion-parent mode."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_all_parent_modes_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_"
    "ALL_PARENT_MODES_ROOT"
)
PINS = {
    "probe_iso_n6_bundle_g2_exact_parent_modes_root.py":
        "25189D7DE6C31E028E06B9CE9C46652D734B44560248BAD167E6E9C19990D9A7",
    "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json":
        "75D782A4C3986088F9DF44DE5F1FA1F7620C9ACAED27C938784ED61222C89116",
    "assemble_iso_n6_bundle_g2_nonadjacent_no_parent_all_order_root.py":
        "5F86D54F2274C26C4E6E04A66AF13AF40A6FC2712C3CEE8BA7E73F1078681C0F",
    "iso_n6_bundle_g2_nonadjacent_no_parent_all_order_exact_root_20260831.json":
        "6A671E41F9E2E98BE68FB9D9968E76D88AD0E6CE6E1F61601C45392F041CCCDA",
    "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_all_order_root.py":
        "2282CEC31E26ABEB2597AE49EAF80D08A68A6AEB6D94D6C1FFAF27372894F54F",
    "iso_n6_bundle_g2_nonadjacent_ordinary_all_order_assembled_exact_root_20260831.json":
        "39CFB23031356C91FBC2C5126C15D6D27B26677BD03DA97A76D5BFA22DDA46F4",
    "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_all_order_root.py":
        "6A7A6214A5B79815432C7EDF2820B2AFA7FEDB97B48CB726FFABCBE2C6F6388A",
    "iso_n6_bundle_g2_nonadjacent_endpoint_all_order_assembled_exact_root_20260831.json":
        "D8EF935D4437CBD43E31FD3A297154EA861A2F0A7F4EAE3F90B27F95B69129E5",
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
        "iso_n6_bundle_g2_nonadjacent_no_parent_all_order_exact_root_20260831.json"
    )
    ordinary = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_all_order_"
        "assembled_exact_root_20260831.json"
    )
    endpoint = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_all_order_"
        "assembled_exact_root_20260831.json"
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
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_NO_PARENT_ALL_ORDER_ROOT"
    )
    assert ordinary["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "ALL_ORDER_ASSEMBLY_ROOT"
    )
    assert endpoint["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "ALL_ORDER_ASSEMBLY_ROOT"
    )
    assert no_parent["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_nonadjacent_no_parent_all_order_root.py"
    ]
    assert ordinary["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_all_order_root.py"
    ]
    assert endpoint["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_all_order_root.py"
    ]

    report = {
        "schema": "iso-n6-bundle-g2-nonadjacent-all-parent-modes-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact all-order rank-six nonadjacent G2 theorem for every "
            "deletion-parent mode"
        ),
        "theorem": (
            "For every rank-six nonadjacent marked-pair forest bundle and every "
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
                "coverage": "both marked endpoint orientations",
            },
            {
                "modes": [
                    "ordinary_parent_no_mark",
                    "ordinary_parent_marked_spine",
                ],
                "certificate": ordinary["marker"],
                "coverage": (
                    "every feasible ordinary parent and all four parent-"
                    "adjacency masks"
                ),
            },
        ],
        "logical_exhaustion": (
            "A deletion parent is absent, equals one of the two marked endpoints, "
            "or is an ordinary vertex. The pinned exact parent-mode algebra names "
            "the first three literal modes and the two ordinary submodes; the "
            "three all-order sign theorems cover these five cases without a gap."
        ),
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "This closes rank-six G2 only for nonadjacent marks. Adjacent-mark "
            "parent-mode assembly, rank-six G1, rank-seven propagation, Newton "
            "m=0, final proof assembly, and Erdos Problem 993 remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
