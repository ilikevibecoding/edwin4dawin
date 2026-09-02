#!/usr/bin/env python3
"""Fail-closed all-order assembly for rank-five singleton-ordinary g1.

For every forest G and ordered distinct marks u,v,p, C is the four marked
independence rows of G and D the corresponding rows of G-p.  This source
assembles the exact identity

    g1(C,D) = S(C) + N4(D) + F(C,Q),  Q=G-N[p],

with universal S,N4 theorems, a complete finite raw-g1 census through order
13, exact e=0,1 formulas, and the exhaustive 136-row strong-cone truth table
for n>=14,e>=2.  It proves this canonical coefficient mode only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein import raw_payment
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,
    canonical_branches,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_all_forests_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"

FILES = {
    "payment_source": "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py",
    "payment_report": "iso_n5_bundle_g1_singleton_ordinary_payment_exact_g1_bernstein_20260830.json",
    "parent_source": "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py",
    "parent_report": "iso_n5_bundle_g1_singleton_ordinary_parent_cone_exact_g1_bernstein_20260830.json",
    "finite_source": "census_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
    "finite_report": "iso_n5_bundle_g1_singleton_ordinary_all_forests_finite_3_13_g1_bernstein_20260830.json",
    "generic_source": "prove_exact_iso_n5_bundle_g1_singleton_ordinary_generic_branches_g1_bernstein.py",
    "generic_report": "iso_n5_bundle_g1_singleton_ordinary_generic_branches_exact_g1_bernstein_20260830.json",
    "common_source": "prove_exact_iso_n5_bundle_g1_singleton_ordinary_common_faces_g1_bernstein.py",
    "common_report": "iso_n5_bundle_g1_singleton_ordinary_common_faces_exact_g1_bernstein_20260830.json",
    "selected_source": "assemble_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_theorem_g1_bernstein.py",
    "selected_report": "iso_n5_bundle_g1_singleton_ordinary_selected_edge_theorem_exact_g1_bernstein_20260830.json",
    "empty_source": "prove_exact_iso_n5_bundle_g1_singleton_ordinary_empty_cycle_branches_g1_bernstein.py",
    "empty_report": "iso_n5_bundle_g1_singleton_ordinary_empty_cycle_branches_exact_g1_bernstein_20260830.json",
    "s_source": "assemble_iso_n5_s_all_marked_forests_root.py",
    "s_report": "iso_n5_s_all_marked_forests_exact_root_20260830.json",
    "n4_source": "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "n4_report": "iso_all_forest_n4_bundle_induction_exact_root_20260829.json",
    "simplex_source": "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py",
    "batch_source": "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein.py",
}

EXPECTED_HASHES = {
    "payment_source": "2225C499187485A4F3757802ACB4837EA47A4F168D6C28C723D96F3C7C0E36E4",
    "payment_report": "A8124941D5064C98B25A3330E907CA172A9E13E40FAECD8D3FA342E910683465",
    "parent_source": "B8365AD19EB91425B7A7437B87D27E8B5CB98ACCBE17ABB22F79F2996A92F531",
    "parent_report": "37E9E21521C5564D00A376F22E3C2D568CE8E4D67F8A37DB021C21FE11A2B41F",
    "finite_source": "AB045560A066732EE0CB92D6FC96441A98C660B7F4A362CB6EE942D2D2EAA9D3",
    "finite_report": "1C8C39960203508EC61CA872C77DD3585D62AD2A4B0670D67AA69EBB82F9F833",
    "generic_source": "1507B50A3E9B35078A864933D81F1F409CA87DD351B8FCD3716A9AB6334ADCF9",
    "generic_report": "CCCB18F2CE10E859FFF4E2F7AE91143CFC125D52B81EC687D8A26E3C89B8B79A",
    "common_source": "6F6D635FDA4413EE5F505E98FF37318CBD80E56984AC629ACA4C5D530FB2110B",
    "common_report": "718935FDFD33380C9E308C435D765362817A9E4B71B1A841B7CB5AE3551DA3CA",
    "selected_source": "C5F4F3F4ADCCF0DE6FC8EF941E42ABA6679DC8EFDA00C4296FBFF845EE583F07",
    "selected_report": "0DE287BEFFD7D940F03E736883EC7E145EC3A3EF04AB79B185299CFF2176D549",
    "empty_source": "EAE714A42422C77571CA682A918B14DA106B9821653309360C6B7C7F9194C2FA",
    "empty_report": "1DBD0227FCD8D102A165A3CE5F90CC0EF9A299555D46E1BB214A55661C561D3F",
    "s_source": "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "s_report": "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "n4_source": "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "n4_report": "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "simplex_source": "549FA8171D2686B063EDF670E4E5B0D42267312CB1583A411518713C84A461E2",
    "batch_source": "2ACB779AA69BA88C5A57B970CCBB57044A6D2A6585C29771A18EE7D4C1BD0FB0",
}


def sha256(name: str) -> str:
    return hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()


def load(label: str):
    return json.loads((HERE / FILES[label]).read_text(encoding="utf-8"))


def main() -> None:
    for label, name in FILES.items():
        assert sha256(name) == EXPECTED_HASHES[label], (
            label, name, sha256(name), EXPECTED_HASHES[label]
        )

    payment_report = load("payment_report")
    parent_report = load("parent_report")
    finite = load("finite_report")
    generic = load("generic_report")
    common = load("common_report")
    selected = load("selected_report")
    empty = load("empty_report")
    universal_s = load("s_report")
    universal_n4 = load("n4_report")

    assert payment_report["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PAYMENT_G1_BERNSTEIN"
    assert payment_report["source_sha256"] == EXPECTED_HASHES["payment_source"]
    assert parent_report["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PARENT_CONE_G1_BERNSTEIN"
    assert parent_report["source_sha256"] == EXPECTED_HASHES["parent_source"]
    assert universal_s["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert universal_s["source_sha256"] == EXPECTED_HASHES["s_source"]
    assert universal_n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert universal_n4["source_sha256"] == EXPECTED_HASHES["n4_source"]

    # Reconstruct the raw algebra in this final assembler.  Here no_parent is
    # g1(C,C), N4 is the rank-four nested form on C, and correction is the
    # exact D=C-xQ deletion correction.  Thus S=no_parent-2N4 and
    # ordinary=S+payment identically; derive() independently rechecks
    # payment=N4(D)+F before returning its parent cone.
    _crows, _qrows, no_parent, n4_c, correction, payment = raw_payment()
    scalar_s = sp.expand(no_parent - 2 * n4_c)
    ordinary = sp.expand(no_parent + correction)
    assert sp.expand(ordinary - scalar_s - payment) == 0
    cone = derive()

    # Exact e=0 and e=1 branches, shifted by n=N+14, have strictly positive
    # power coefficients.  These branches do not divide by e-1.
    N = sp.symbols("N", nonnegative=True)
    n_symbol = next(symbol for symbol in cone["edgeless"].free_symbols if str(symbol) == "n")
    edgeless_shift = sp.Poly(
        sp.expand(cone["edgeless"].subs(n_symbol, N + 14)), N
    )
    assert all(coefficient > 0 for coefficient in edgeless_shift.all_coeffs())
    assert len(cone["one_edge_shifted_coefficients"]) == 5
    assert all(
        coefficient > 0
        for coefficients in cone["one_edge_shifted_coefficients"].values()
        for coefficient in coefficients
    )

    # The e>=2 denominator is positive.  Verify exact u/v symmetry of the
    # pre-common numerator used by every branch certificate, justifying the
    # canonical quotient rather than assuming it from numerical agreement.
    before_common = cone["strong_parent_cone_before_common"]
    numerator, denominator = map(sp.expand, sp.fraction(before_common))
    names = {str(symbol): symbol for symbol in numerator.free_symbols}
    edge_count = names["edge_count"]
    assert sp.expand(denominator - 120 * (edge_count - 1)) == 0
    swap = {
        names["degree_u"]: names["degree_v"],
        names["degree_v"]: names["degree_u"],
        names["C_neighbor_excess_u"]: names["C_neighbor_excess_v"],
        names["C_neighbor_excess_v"]: names["C_neighbor_excess_u"],
        names["adjacent_pu"]: names["adjacent_pv"],
        names["adjacent_pv"]: names["adjacent_pu"],
        names["common_neighbor_pu"]: names["common_neighbor_pv"],
        names["common_neighbor_pv"]: names["common_neighbor_pu"],
    }
    assert sp.expand(numerator - numerator.xreplace(swap)) == 0

    # Finite raw-g1 theorem.
    assert finite["marker"] == "PASS_EXACT_FINITE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"
    assert finite["orders"] == [3, 13]
    assert finite["unlabeled_forests"] == 6603
    assert finite["ordered_distinct_uvp_cells"] == 9443808
    assert finite["global_minimum"]["value"] == 0
    assert finite["source_sha256"] == EXPECTED_HASHES["finite_source"]

    # Exhaustive n>=14,e>=2 canonical truth table.
    branches = canonical_branches()
    assert len(branches) == 136 and len(set(branches)) == 136
    key_to_index = {branch_key(branch): index for index, branch in enumerate(branches)}
    coverage = {}

    assert generic["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_GENERIC_BRANCHES_G1_BERNSTEIN"
    assert generic["canonical_branch_total"] == 136
    assert generic["generic_branch_count"] == 119
    assert generic["source_sha256"] == EXPECTED_HASHES["generic_source"]
    for row in generic["rows"]:
        assert row["statistics"]["negative"] == 0
        assert row["branch"] == branch_key(branches[row["index"]])
        assert row["index"] not in coverage
        coverage[row["index"]] = "generic_exact_cone"

    assert common["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_COMMON_FACES_G1_BERNSTEIN"
    assert common["source_sha256"] == EXPECTED_HASHES["common_source"]
    assert len(common["rows"]) == 3
    for row in common["rows"]:
        assert row["face"]["final_negative"] == 0
        index = key_to_index[row["branch"]]
        assert index not in coverage
        coverage[index] = "common_boundary_face"

    assert selected["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_SELECTED_EDGE_THEOREM_G1_BERNSTEIN"
    assert selected["source_sha256"] == EXPECTED_HASHES["selected_source"]
    assert selected["canonical_target_count"] == 10
    for index_text, branch in selected["canonical_targets"].items():
        index = int(index_text)
        assert branch == branch_key(branches[index])
        assert index not in coverage
        coverage[index] = "selected_edge_theorem"

    assert empty["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_EMPTY_CYCLE_BRANCHES_G1_BERNSTEIN"
    assert empty["source_sha256"] == EXPECTED_HASHES["empty_source"]
    assert empty["empty_branch_count"] == 4
    for row in empty["empty_rows"]:
        assert row["branch"] == branch_key(branches[row["index"]])
        assert row["index"] not in coverage
        coverage[row["index"]] = "structurally_empty_cycle"

    assert set(coverage) == set(range(136))
    assert list(coverage.values()).count("generic_exact_cone") == 119
    assert list(coverage.values()).count("common_boundary_face") == 3
    assert list(coverage.values()).count("selected_edge_theorem") == 10
    assert list(coverage.values()).count("structurally_empty_cycle") == 4

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every ordered triple of distinct "
            "vertices (u,v,p), the rank-five singleton-ordinary whole-bundle "
            "coefficient g1(C,rows(G-p)) is nonnegative."
        ),
        "exact_identity": "g1=S(C)+N4(D)+F(C,Q), D=G-p, Q=G-N[p]",
        "universal_reserves": {
            "S": "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT",
            "N4_D": "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT",
        },
        "finite": {
            "orders": finite["orders"],
            "unlabeled_forests": finite["unlabeled_forests"],
            "ordered_distinct_uvp_cells": finite["ordered_distinct_uvp_cells"],
            "global_minimum": finite["global_minimum"],
        },
        "all_order": {
            "order_range": "n>=14",
            "edge_zero_positive_power_certificate": True,
            "edge_one_cases_up_to_uv_symmetry": sorted(cone["one_edge_shifted_coefficients"]),
            "edge_ge_two_denominator": "120*(e-1)>0",
            "uv_exchange_symmetry_symbolic": True,
            "canonical_branch_total": len(branches),
            "coverage_counts": {
                "generic_exact_cone": 119,
                "common_boundary_face": 3,
                "selected_edge_theorem": 10,
                "structurally_empty_cycle": 4,
            },
            "coverage": {str(index): coverage[index] for index in range(136)},
        },
        "replay": {
            "all_dependency_hashes_matched": True,
            "raw_algebra_reconstructed": True,
            "parent_reduction_reconstructed": True,
            "canonical_truth_table_disjoint_and_exhaustive": True,
        },
        "scope": (
            "Exact rank-five singleton_ordinary canonical g1 theorem only. "
            "This does not prove endpoint/internal/no-parent g1 modes, g2, "
            "all N5, or Erdos Problem 993."
        ),
        "pinned_files": FILES,
        "pinned_sha256": EXPECTED_HASHES,
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "finite_cells": finite["ordered_distinct_uvp_cells"],
        "canonical_branch_total": len(branches),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
