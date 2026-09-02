#!/usr/bin/env python3
"""Assemble g1/g2 for every canonical no-parent/root-star mode."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
STRUCTURE = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
PURE = HERE / "iso_n4_bundle_g12_no_parent_pure_root_star_exact_agent_20260829.json"
DOUBLE = HERE / "iso_n4_bundle_g12_no_parent_double_protected_root_star_exact_agent_20260829.json"
ENDPOINT_CONFIG = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_G1 = HERE / "iso_n4_bundle_g1_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_G2 = HERE / "iso_n4_bundle_g2_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_AUDIT = HERE / "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json"
K0_AUDIT = HERE / "iso_n4_bundle_g12_no_parent_k0_independent_audit_agent_20260829.json"
K1_AUDIT = HERE / "iso_n4_bundle_g12_no_parent_k1_endpoint_import_independent_audit_agent_20260829.json"
K2_AUDIT = HERE / "iso_n4_bundle_g12_no_parent_k2_independent_audit_g1_bernstein_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_root_star_all_modes_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    structure = load(STRUCTURE)
    pure = load(PURE)
    double = load(DOUBLE)
    endpoint_config = load(ENDPOINT_CONFIG)
    endpoint_g1 = load(ENDPOINT_G1)
    endpoint_g2 = load(ENDPOINT_G2)
    endpoint_audit = load(ENDPOINT_AUDIT)
    k0_audit = load(K0_AUDIT)
    k1_audit = load(K1_AUDIT)
    k2_audit = load(K2_AUDIT)

    assert structure["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert pure["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_PURE_ROOT_STAR_AGENT"
    assert double["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_DOUBLE_PROTECTED_ROOT_STAR_AGENT"
    assert endpoint_config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert endpoint_g1["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_AGENT"
    assert endpoint_g2["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G2_ENDPOINT_PARENT_AGENT"
    assert endpoint_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN"
    assert k0_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_AUDIT_AGENT"
    assert k1_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K1_ENDPOINT_IMPORT_AGENT"
    assert k2_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K2_AUDIT_G1_BERNSTEIN"

    # The one-protected no-parent geometry and endpoint-parent geometry have
    # literally the same D-row tuple, hence the same raw Gamma coefficients.
    k1 = structure["modes"]["k1_protected_u_leaf"]
    assert k1["D_row_identity"] == "D=(C_U,C_U,C_W,C_W)"
    assert endpoint_config["endpoint_row_identity"] == "D=(C_U,C_U,C_W,C_W)"
    assert k1["g1_raw"]["factor"] == endpoint_config["raw_forms"]["g1"]
    assert k1["g2_raw"]["factor"] == endpoint_config["raw_forms"]["g2"]

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_ROOT_STAR_ALL_MODES_AGENT",
        "theorem": (
            "For every canonical no-parent/root-star sibling bundle at rank four, "
            "the first two nonconstant binomial coefficients g1 and g2 are "
            "nonnegative, for all zero, one, or two protected marked leaf neighbors."
        ),
        "exhaustive_modes": {
            "k0": {
                "row_identity": "D=C",
                "proof_marker": pure["marker"],
                "independent_audit_marker": k0_audit["marker"],
                "minimum_small_g1_g2": [
                    pure["finite_census"]["minima"]["g1"]["value"],
                    pure["finite_census"]["minima"]["g2"]["value"],
                ],
            },
            "k1": {
                "row_identity": "D=(C_U,C_U,C_W,C_W)",
                "extra_constraint": "the protected mark is isolated in C",
                "import": (
                    "The raw g1/g2 forms are literally identical to the broader "
                    "endpoint-parent forms; the independently audited endpoint "
                    "theorems therefore apply."
                ),
                "proof_markers": [endpoint_g1["marker"], endpoint_g2["marker"], endpoint_audit["marker"]],
                "independent_audit_marker": k1_audit["marker"],
                "symmetry": "A protected v leaf follows by swapping U,V.",
            },
            "k2": {
                "row_identity": "D=(C_W,C_W,C_W,C_W)",
                "isolated_mark_constraint": "C=((1+x)^2K,(1+x)K,(1+x)K,K)",
                "proof_marker": double["marker"],
                "independent_audit_marker": k2_audit["marker"],
                "empty_R_g1_g2": [double["empty_R"]["g1"], double["empty_R"]["g2"]],
            },
        },
        "exhaustiveness_dependency": structure["structural_lemma"],
        "dependencies": {
            path.name: sha256(path)
            for path in (
                STRUCTURE,
                PURE,
                DOUBLE,
                ENDPOINT_CONFIG,
                ENDPOINT_G1,
                ENDPOINT_G2,
                ENDPOINT_AUDIT,
                K0_AUDIT,
                K1_AUDIT,
                K2_AUDIT,
            )
        },
        "scope": (
            "Exact for canonical no-parent root-star g1/g2 only. Combining this "
            "with singleton-parent theorems is a separate assembly; noncanonical "
            "or non-singleton supports, g3/top coefficients, all N4, and Erdos 993 "
            "are not asserted here."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "theorem": report["theorem"],
        "exhaustive_modes": report["exhaustive_modes"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
