#!/usr/bin/env python3
"""Fail-closed conditional reduction of universal rank-six g1 to leaf monotonicity."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_reduction_conditional_g1_nonadjacent_20260831.json"
MARKER = "PENDING_EXACT_ISO_N6_BUNDLE_G1_LEAF_REDUCTION_G1_NONADJACENT"

PINS = {
    "assemble_iso_n6_bundle_g1_edgeless_w_actual_d_g1_nonadjacent.py":
        "824ED07DAC0625AE20E333989935E0C77D98BD593CBEE898918F3A66EE284031",
    "iso_n6_bundle_g1_edgeless_w_actual_d_assembled_exact_g1_nonadjacent_20260831.json":
        "F4B8BCF20D2364AA4A7CC01AEFB85674959BA6318C5DC134EFC9A15CA3BFCD66",
    "prove_iso_n6_bundle_g1_path_endpoint_marks_sector_g1_nonadjacent.py":
        "0FF10B1A361574DDBBE9019CBCDA6D929CF8A77AE13F5CB990ABC5FBD52E5A1D",
    "iso_n6_bundle_g1_path_endpoint_marks_sector_exact_g1_nonadjacent_20260831.json":
        "EA88CB4438590D59562022C5CB0BD48702CDFA7E01DA3745ED6094447117F3F6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    edgeless = json.loads((HERE / "iso_n6_bundle_g1_edgeless_w_actual_d_assembled_exact_g1_nonadjacent_20260831.json").read_text())
    path = json.loads((HERE / "iso_n6_bundle_g1_path_endpoint_marks_sector_exact_g1_nonadjacent_20260831.json").read_text())
    assert edgeless["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G1_EDGELESS_W_ACTUAL_D_G1_NONADJACENT"
    assert path["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G1_PATH_ENDPOINT_MARKS_SECTOR_G1_NONADJACENT"
    assert "n>=2" in path["theorem"]

    report = {
        "marker": MARKER,
        "status": "fail-closed conditional reduction; one universal sign lemma remains",
        "theorem": None,
        "conditional_leaf_lemma": (
            "For every marked forest C, every actual induced marked minor D, and every "
            "unmarked vertex ell of degree at most one, g1(C,D)>=g1(C-ell,D-ell)."
        ),
        "reduction": [
            "Repeatedly delete unmarked vertices of degree at most one.",
            "A surviving tree component with no mark is impossible because a nontrivial tree has a leaf, and a singleton has degree zero.",
            "A surviving component with exactly one mark is impossible unless it is the singleton marked vertex.",
            "If both marks survive in one nontrivial component, every leaf is marked; a tree with exactly two leaves is a path, so the marks are its endpoints.",
            "Thus the terminal state is either edgeless-W or an endpoint-marked path, both covered by pinned exact theorems.",
        ],
        "terminal_coverage": {
            "edgeless_W": "all orders n>=2, every actual D",
            "endpoint_marked_path": "all path orders n>=2, every actual D",
            "disjoint_and_exhaustive_after_pruning": True,
        },
        "open_obligations": ["Prove the displayed ordinary-leaf monotonicity lemma."],
        "nonpromotional_evidence": {
            "exact_atlas_cells_through_order_7": 414912,
            "negative_count": 0,
            "ordered_stream_sha256": "2457B1B4033F716BCC37EBBB6F68B33250AD28FE34F39033AFEAF1161AB72B66",
            "role": "falsification evidence only; not a universal proof",
        },
        "dependencies_sha256": PINS,
        "scope_guard": (
            "Because the leaf lemma is unproved, the universal rank-six g1 theorem is null. "
            "This artifact does not assert all N6, rank seven, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": report["marker"],
        "open_obligations": report["open_obligations"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
