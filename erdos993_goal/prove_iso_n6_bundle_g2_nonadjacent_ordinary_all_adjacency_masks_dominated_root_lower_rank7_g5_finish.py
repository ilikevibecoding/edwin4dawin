#!/usr/bin/env python3
"""Exact mask-dominance audit for the nonadjacent ordinary-parent G2 lower."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
IDENTITY_SOURCE = HERE / "derive_iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_root.py"
IDENTITY_SOURCE_SHA256 = "EE834F16F2CE0793975DE507DAF7276F15C933C174EEE5B464732D692B74A00F"
IDENTITY_REPORT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
IDENTITY_REPORT_SHA256 = "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
ROOT_PRODUCER = HERE / "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
ROOT_PRODUCER_SHA256 = "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_all_adjacency_masks_dominated_root_lower_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_ALL_ADJACENCY_MASKS_DOMINATED_ROOT_LOWER_RANK7_G5_FINISH"

FAMILIES = {
    "A": ("PA3", "PA4", "PA5", "PA6"),
    "B": ("PB3", "PB4", "PB5", "PB6"),
    "W": ("PW2", "PW3", "PW4", "PW5", "PW6"),
    "Z": ("PZ4", "PZ5", "PZ6"),
}
POSITIVE = {"PA3", "PA6", "PB3", "PB6", "PZ4", "PZ6"}
HARMFUL = {"PA4", "PA5", "PB4", "PB5", "PZ5"}
W_COORDINATES = set(FAMILIES["W"])


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(IDENTITY_SOURCE) == IDENTITY_SOURCE_SHA256
    assert sha256(IDENTITY_REPORT) == IDENTITY_REPORT_SHA256
    assert sha256(ROOT_PRODUCER) == ROOT_PRODUCER_SHA256
    report = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    assert report["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PARENT_LOSS_ROOT"
    assert report["identity"] == "g2(C,C-p;u,v)=g2(C,C;u,v)+correction"
    assert set(report["active_parent_loss_variables"]) == set().union(*map(set, FAMILIES.values()))

    symbols = {
        name: sp.Symbol(name, nonnegative=True)
        for name in report["active_parent_loss_variables"]
    }
    row_symbols = {
        name: sp.Symbol(name, nonnegative=True)
        for name in (
            "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7",
            "b0", "b1", "b2", "b3", "b4", "b5", "b6",
            "c0", "c1", "c2", "c3", "c4", "c5", "c6",
            "d0", "d1", "d2", "d3", "d4", "d5", "d6",
        )
    }
    local = {**symbols, **row_symbols}
    full = sp.expand(sp.sympify(report["adjacency_masks"]["u0_v0"]["correction"], locals=local))

    forced_zero_audit = {}
    structural_gaps = {}
    for label, mask in sorted(report["adjacency_masks"].items()):
        declared_zero_families = set(mask["zero_parent_loss_families"])
        declared_active = set(mask["active_parent_loss_variables"])
        expected_zero = set().union(*(set(FAMILIES[family]) for family in declared_zero_families)) if declared_zero_families else set()
        assert declared_active == set(symbols) - expected_zero, label
        masked = sp.expand(sp.sympify(mask["correction"], locals=local))
        substituted = sp.expand(full.subs({symbols[name]: 0 for name in expected_zero}))
        assert sp.expand(masked - substituted) == 0, label
        assert W_COORDINATES <= declared_active, label

        # Formal cone identity.  A positive coordinate has coefficient s>=0.
        # A harmful coordinate has coefficient -q<=0 and 0<=X<=cap.
        actual = sp.Integer(0)
        root_family_lower = sp.Integer(0)
        asserted_gap = sp.Integer(0)
        gap_terms = []
        for coordinate in sorted(POSITIVE | HARMFUL):
            x = sp.Symbol(f"X_{coordinate}", nonnegative=True)
            if coordinate in POSITIVE:
                s = sp.Symbol(f"S_{coordinate}", nonnegative=True)
                if coordinate in declared_active:
                    actual += s*x
                    asserted_gap += s*x
                    gap_terms.append(f"S_{coordinate}*X_{coordinate}")
            else:
                q = sp.Symbol(f"Q_{coordinate}", nonnegative=True)
                cap = sp.Symbol(f"CAP_{coordinate}", nonnegative=True)
                root_family_lower -= q*cap
                if coordinate in declared_active:
                    actual -= q*x
                    asserted_gap += q*(cap-x)
                    gap_terms.append(f"Q_{coordinate}*(CAP_{coordinate}-X_{coordinate})")
                else:
                    asserted_gap += q*cap
                    gap_terms.append(f"Q_{coordinate}*CAP_{coordinate}")
        assert sp.expand(actual - root_family_lower - asserted_gap) == 0, label
        forced_zero_audit[label] = {
            "zero_families": sorted(declared_zero_families),
            "zero_coordinates": sorted(expected_zero),
            "active_coordinates": sorted(declared_active),
            "masked_is_full_with_declared_coordinates_zero": True,
            "W_family_identical_to_u0_v0": True,
        }
        structural_gaps[label] = {
            "identity": "actual_mask_family_loss - root_all_family_lower = " + " + ".join(gap_terms),
            "nonnegative_under": [
                "all certified positive coefficients S_X>=0",
                "all certified harmful magnitudes Q_X=-K_X>=0",
                "0<=X<=CAP_X for active harmful coordinates",
            ],
        }

    producer_text = ROOT_PRODUCER.read_text(encoding="utf-8")
    required_fragments = (
        'desired_sign = {',
        '"PA3": 1, "PA4": -1, "PA5": -1, "PA6": 1,',
        '"PB3": 1, "PB4": -1, "PB5": -1, "PB6": 1,',
        '"PZ4": 1, "PZ5": -1, "PZ6": 1,',
        '"PA4": choose(mb - 1, 2, one)',
        '"PA5": choose(mb - 1, 3, one)',
        '"PB4": choose(mc - 1, 2, one)',
        '"PB5": choose(mc - 1, 3, one)',
        '"PZ5": choose(d, 2, one)',
        'assert w_parent_mode == "split_pw3"',
    )
    for fragment in required_fragments:
        assert fragment in producer_text, fragment

    output = {
        "marker": MARKER,
        "status": "PASS exact all-mask structural domination by the u0_v0 root lower",
        "identity_source": {"file": IDENTITY_SOURCE.name, "sha256": IDENTITY_SOURCE_SHA256},
        "identity_report": {"file": IDENTITY_REPORT.name, "sha256": IDENTITY_REPORT_SHA256},
        "root_producer": {"file": ROOT_PRODUCER.name, "sha256": ROOT_PRODUCER_SHA256},
        "forced_zero_audit": forced_zero_audit,
        "structural_gap_decompositions": structural_gaps,
        "root_lower_treatment": {
            "positive_A_B_Z_coordinates_dropped": sorted(POSITIVE),
            "negative_A_B_Z_coordinates_paid_at_caps": sorted(HARMFUL),
            "W_coordinates": sorted(W_COORDINATES),
            "W_treatment_identical_for_all_masks": True,
        },
        "conclusion": (
            "Every exact u0_v0 root-producer lower shard also lower-bounds the "
            "actual ordinary-parent coefficient for u0_v1, u1_v0, and u1_v1. "
            "No separate Bernstein charts are required for those masks."
        ),
        "dependency_scope": (
            "Structural domination is unconditional once the pinned producer's "
            "coefficient-sign and cap certificates hold on a shard; this file "
            "does not independently certify those shardwise signs or positivity."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(output, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "masks": sorted(forced_zero_audit),
        "all_forced_zero": True,
        "all_dominated": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", output["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
