#!/usr/bin/env python3
"""Assemble the exact all-parent theorem for small-broom k-Newton index 4."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k4_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K4_ALL_PARENT_ROOT"
CELLS = tuple((ell, 4) for ell in range(1, 8))

DEPENDENCIES = {
    "census_iso_n5_g1_internal_ordinary_small_all_parent_finite_root.py":
        "667E2560C0FC14D9E54249C9A79BC70EC22D3D46466737C375E7791086ACFACD",
    "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json":
        "6CF37C45B401E0BCB2A6B776EAE420F01C88A7AD626B7DE47D7A85764EA175DA",
    "prove_iso_n5_g1_internal_ordinary_small_k4_large_order_root.py":
        "F7AB1EFA09F7F47C1D8B2729FE5406E919BFDA4E2DC7F3EEBF7A7732466A9CEA",
    "iso_n5_g1_internal_ordinary_small_k4_large_order_exact_root_20260830.json":
        "A9576F5770D81C717D25CA09C5F3E94E6D088F06C60373FC888E30E4E19CE447",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual == DEPENDENCIES

    finite = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    large = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_small_k4_large_order_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )

    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_ALL_PARENT_FINITE_ROOT"
    assert finite["A_orders_covered"] == [0, 9]
    assert finite["small_lengths"] == [1, 7]
    assert finite["negative_values"] == 0
    assert finite["ordered_mark_pairs"] == 125_430
    assert finite["exact_cell_checks"] == 6_146_070
    finite_cells = {tuple(cell) for cell in finite["cells"]}
    assert set(CELLS) <= finite_cells

    assert large["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K4_LARGE_ORDER_ROOT"
    assert large["cutoff_A_order"] == 10
    assert large["lengths"] == [1, 7]
    assert large["k_index"] == 4
    assert len(large["faces"]) == 2
    assert {face["epsilon"] for face in large["faces"]} == {0, 1}
    assert all(len(face["rows"]) == 7 for face in large["faces"])
    assert all(
        [row["ell"] for row in face["rows"]] == list(range(1, 8))
        for face in large["faces"]
    )
    assert len(large["nonadjacent_corrections"]) == 7

    report = {
        "marker": MARKER,
        "cells": [list(cell) for cell in CELLS],
        "coverage": {
            "finite": "all parent forests and ordered distinct marks with A-order 0..9",
            "large": "all parent forests and both parent-mark geometries with A-order at least 10",
        },
        "finite_certificate": {
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "exact_cell_checks_in_shared_49_cell_census": finite["exact_cell_checks"],
            "negative_values": finite["negative_values"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_certificate": {
            "cutoff_A_order": large["cutoff_A_order"],
            "faces": len(large["faces"]),
            "rows_per_face": [len(face["rows"]) for face in large["faces"]],
            "nonadjacent_positive_corrections": len(large["nonadjacent_corrections"]),
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every ell=1..7 at k-Newton index 4",
        "scope": (
            "Internal-spine/broom ordinary-parent g1, small broom lengths ell=1..7, "
            "all integer collision-leaf counts, all parent forests, and only k-Newton "
            "index 4. Indices 0..3, the whole mode, other modes, and Erdos Problem 993 "
            "remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cells": report["cells"],
        "coverage": report["coverage"],
        "finite_certificate": report["finite_certificate"],
        "large_certificate": report["large_certificate"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
