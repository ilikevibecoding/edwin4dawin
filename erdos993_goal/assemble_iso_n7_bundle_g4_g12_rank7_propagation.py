#!/usr/bin/env python3
"""Fail-closed assembly of the currently proved rank-seven g4,...,g12 signs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g4_g12_assembled_exact_rank7_propagation_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_G12_ASSEMBLED_RANK7_PROPAGATION"

PINS = {
    "bundle_identity_source": (
        "derive_iso_n7_bundle_polynomial_root.py",
        "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    ),
    "bundle_identity_report": (
        "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json",
        "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    ),
    "g4_source": (
        "assemble_iso_n7_bundle_g4_universal_piecewise_rank7_g4_piecewise.py",
        "B9D9EDA88C461D33277EF3533B7BED6D1D31CA3176EC421D3412C16EAFCD3939",
    ),
    "g4_report": (
        "iso_n7_bundle_g4_universal_piecewise_assembled_exact_rank7_g4_piecewise_20260831.json",
        "A5A352C227F4AD8A29D3016AE291BB29E47EAB7961B6EBDF632B6B40D30C9A41",
    ),
    "g5_source": (
        "prove_iso_n7_bundle_g5_universal_rank7_g5_finish.py",
        "41E6B6C03F949C97C0159E59FFAED85DD4174AD36F08CEEAFA84F4F761E8D60A",
    ),
    "g5_report": (
        "iso_n7_bundle_g5_universal_exact_rank7_g5_finish_20260831.json",
        "E21582FD28D4811B24B00CACEDBB4C1001E21AF281BEAC645C32F5097EC9DB65",
    ),
    "g6_g12_source": (
        "assemble_iso_n7_bundle_g6_g12_root.py",
        "6ED165ECE27858AF67B2CE72A5F372BDB0160C8EFD8B0A444BCE99F30045E0D7",
    ),
    "g6_g12_report": (
        "iso_n7_bundle_g6_g12_assembled_exact_root_20260830.json",
        "B6722E52DB8CDF12D25E69FD8F1FA0FAA37D8D8EA7540C16358AF3C963BA2A8B",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / PINS[key][0]).read_text(encoding="utf-8"))


def main():
    observed = {}
    for key, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (key, expected, actual)
        observed[key] = {"file": name, "sha256": actual}

    identity = load("bundle_identity_report")
    assert identity["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert identity["rank"] == 7 and identity["degree_in_M"] == 12
    assert identity["identity"] == (
        "Gamma_M=N7((1+x)^M C+xD)-N7(C+xD)-"
        "sum_(t=0)^(M-1)N6((1+x)^t C)"
    )
    assert identity["source_sha256"] == PINS["bundle_identity_source"][1]

    g4 = load("g4_report")
    assert g4["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_UNIVERSAL_PIECEWISE_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert g4["source_sha256"] == PINS["g4_source"][1]
    assert g4["geometry_partition"]["exhaustive"] is True
    assert g4["geometry_partition"]["pairwise_disjoint"] is True
    assert g4["certificate_accounting"]["closed_geometries"] == 5
    assert g4["certificate_accounting"]["total_geometries"] == 5

    g5 = load("g5_report")
    assert g5["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G5_UNIVERSAL_RANK7_G5_FINISH"
    assert g5["source_sha256"] == PINS["g5_source"][1]
    assert g5["status"] == "proved exact"
    assert g5["coverage_gap"] is None
    assert len(g5["coverage"]) == 5

    high = load("g6_g12_report")
    assert high["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G6_G12_ROOT"
    assert high["source_sha256"] == PINS["g6_g12_source"][1]
    assert high["covered_coefficients"] == [6, 7, 8, 9, 10, 11, 12]
    assert high["theorem"] == (
        "For every forest-realizable marked rank-seven sibling-bundle cell, "
        "each binomial coefficient g6,g7,...,g12 is nonnegative."
    )

    closed = [4, 5, 6, 7, 8, 9, 10, 11, 12]
    open_coefficients = [1, 2, 3]
    assert set(closed).isdisjoint(open_coefficients)
    assert sorted(closed + open_coefficients) == list(range(1, 13))

    report = {
        "marker": MARKER,
        "rank": 7,
        "bundle_identity": identity["identity"],
        "closed_coefficients": closed,
        "open_coefficients": open_coefficients,
        "coefficient_packages": {
            "g4": {
                "marker": g4["marker"],
                "geometry_pieces": 5,
                "coverage_gap": None,
            },
            "g5": {
                "marker": g5["marker"],
                "coverage_gap": g5["coverage_gap"],
            },
            "g6_g12": {
                "marker": high["marker"],
                "covered_coefficients": high["covered_coefficients"],
            },
        },
        "theorem": (
            "For every forest-realizable marked rank-seven sibling-bundle cell, "
            "the exact binomial coefficients g4,g5,...,g12 are nonnegative."
        ),
        "minimal_bundle_residual": {
            "coefficients": ["g1", "g2", "g3"],
            "geometry_status": (
                "No universal all-geometry rank-seven certificate for g1, g2, "
                "or g3 is pinned by this assembly."
            ),
        },
        "proof_boundary": (
            "This assembles only rank-seven bundle signs g4..g12.  It does not "
            "supply g1..g3, the lower-rank all-N6 payment, the all-N7 strong "
            "induction, the terminal q3 Newton payment, or Erdos Problem 993."
        ),
        "pins": observed,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(MARKER)


if __name__ == "__main__":
    main()
