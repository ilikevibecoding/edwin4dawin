#!/usr/bin/env python3
"""Freeze the independently audited rank-seven bundle coefficients g6..g12."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g6_g12_assembled_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G6_G12_ROOT"

PINS = {
    "g6_source": (
        "prove_iso_n7_bundle_g6_root.py",
        "77CBADCE4460CBF00888E413485BF0CF48FAFA11F054A8434C6416AC6FAE6E70",
    ),
    "g6_report": (
        "iso_n7_bundle_g6_exact_root_20260830.json",
        "6AE52352491AE7CD135D0EA1C22CA54D28C99A04134A82B4C20121C69DA11744",
    ),
    "g6_audit_source": (
        "audit_iso_n7_bundle_g6_independent_rank5_g2_alt.py",
        "91FA4CFADAF98C48BDAD74DE73E9B18320D66A98442E27BC543A68C5D678D363",
    ),
    "g6_audit_report": (
        "iso_n7_bundle_g6_independent_audit_exact_rank5_g2_alt_20260830.json",
        "271ED7433573B902ECC3312E01606D7B9CFECB556A90F7A53200E88226B25797",
    ),
    "g7_g12_audit_source": (
        "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
        "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    ),
    "g7_g12_audit_report": (
        "iso_n7_bundle_g7_g12_independent_audit_exact_rank5_g2_alt_20260830.json",
        "DA5E14A0769A8D35FA33574E91E0CDD7066BABBB3D6E5B38E7E3A28F17DB1E2D",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {label: sha256(HERE / name) for label, (name, _) in PINS.items()}
    expected = {label: digest for label, (_, digest) in PINS.items()}
    assert actual == expected

    g6 = json.loads((HERE / PINS["g6_report"][0]).read_text(encoding="utf-8"))
    g6_audit = json.loads(
        (HERE / PINS["g6_audit_report"][0]).read_text(encoding="utf-8")
    )
    high_audit = json.loads(
        (HERE / PINS["g7_g12_audit_report"][0]).read_text(encoding="utf-8")
    )
    assert g6["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G6_ROOT"
    assert g6_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G6_RANK5_G2_ALT"
    assert high_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G7_G12_RANK5_G2_ALT"
    assert g6_audit["join_scope"]["no_gap"] is True
    assert g6_audit["join_scope"]["unresolved_orders"] == []
    assert "g7,g8,g9,g10,g11,g12" in high_audit["theorem_audited"]

    covered = list(range(6, 13))
    assert covered == [6, 7, 8, 9, 10, 11, 12]
    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest-realizable marked rank-seven sibling-bundle "
            "cell, each binomial coefficient g6,g7,...,g12 is nonnegative."
        ),
        "rank": 7,
        "covered_coefficients": covered,
        "open_coefficients": [1, 2, 3, 4, 5],
        "g6_join": g6_audit["join_scope"],
        "audit_markers": [g6_audit["marker"], high_audit["marker"]],
        "pins": {
            label: {"file": name, "sha256": digest}
            for label, (name, digest) in PINS.items()
        },
        "scope": (
            "Exact universal rank-seven bundle signs only for g6..g12. "
            "Coefficients g1..g5, terminal N7, all-N7, the Newton-tail bridge, "
            "and Erdos Problem 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "covered_coefficients": covered,
        "open_coefficients": report["open_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
