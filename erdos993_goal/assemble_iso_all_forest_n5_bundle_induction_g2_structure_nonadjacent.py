#!/usr/bin/env python3
"""Fail-closed assembly of the all-marked-forest rank-five theorem.

This upgrades the frozen conditional rank-five bundle induction once the
all-five-mode g1 and g2 reports are both pinned.  Until the g2 pin below is
filled, it emits an explicitly pending report and never a PASS marker.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from math import comb
from pathlib import Path

import networkx as nx

from assemble_iso_all_forest_n4_bundle_induction_root import (
    MODES,
    add_isolates,
    add_leaves,
    binomial_coefficients,
    classify_deepest_support,
    classify_terminal,
    deepest_eligible_support,
    fixture_cells,
    rank_value,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json"
PASS_MARKER = "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
PENDING_MARKER = "PENDING_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"

DEPENDENCIES = {
    "bundle_identity": {
        "report": "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json",
        "report_sha256": "545B3AF80F49A2158EE59C3128F42C694651210CB2D82F1CDCE48DA20E43B1F7",
        "marker": "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT",
        "source": "derive_iso_n5_bundle_polynomial_root.py",
        "source_sha256": "7920BF20C19B24CBFF877F23BC069644242BB9282AD03125A049F01C180F9AB7",
    },
    "g1_all_five_modes": {
        "report": "iso_n5_g1_all_five_modes_exact_root_20260830.json",
        "report_sha256": "F0FBA92CD71F72DB8E6CA6A3BACCFA0DD501102177598DE80CEE2792E9D143A4",
        "marker": "PASS_EXACT_ISO_N5_G1_ALL_FIVE_CANONICAL_MODES_ROOT",
        "source": "assemble_iso_n5_g1_all_five_modes_root.py",
        "source_sha256": "2A963B1DB2723F8CA44FE9ACA32BB4A385CDE82551BB6433917F3C0DBB89E0BE",
    },
    "g2_all_five_modes": {
        "report": "iso_n5_g2_all_canonical_modes_assembled_exact_rank5_g2_alt_20260830.json",
        "report_sha256": "2935D559B127BE25EC9183560CBBB83287BA8DCAEFD74430B4D7B386B2A019EC",
        "marker": "PASS_EXACT_ISO_N5_G2_ALL_CANONICAL_MODES_RANK5_G2_ALT",
        "source": "assemble_iso_n5_g2_all_canonical_modes_rank5_g2_alt.py",
        "source_sha256": "C85F938AF7605ABBFF864481C113A3F7AA5B756E495A4FFE0205FF288127DED3",
    },
    "g3_all_five_modes_independent": {
        "report": "iso_n5_bundle_g3_all_five_modes_independent_audit_bundle_g12_20260830.json",
        "report_sha256": "B556DA5B5A67BDBF2DAFD39A1922C8D423E5934B4C3EE2DDF8A94EB9299C6EB0",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G3_ALL_FIVE_MODES_AUDIT_BUNDLE_G12",
        "source": "audit_iso_n5_bundle_g3_all_five_modes_independent_bundle_g12.py",
        "source_sha256": "0723E4C9E63BDA23DE4CE81358125F2C6890073DC5626B00B74A77307D84902B",
    },
    "g4_universal": {
        "report": "iso_n5_bundle_g4_coarse_cone_independent_audit_rank5_g4_20260829.json",
        "report_sha256": "AAC5100D82DD3421BB9DAA3703A42CA0775149DB53C5178E9C7E4AE3FCD4BA61",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_AUDIT_RANK5_G4",
        "source": "audit_iso_n5_bundle_g4_coarse_cone_independent_rank5_g4.py",
        "source_sha256": "92CEDE4CCA2049B8779D6565FD5F58E5B9BE40D6281D6E893E9D0D9B87DB32DC",
    },
    "g5_g8_universal": {
        "report": "iso_n5_bundle_top_g5_g8_independent_audit_g1_bernstein_20260829.json",
        "report_sha256": "D8637776BB6FE734E290163EC76B8D5EEBC542E5C538E84A45B1146A13A8E2F1",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_TOP_G5_G8_AUDIT_G1_BERNSTEIN",
        "source": "audit_iso_n5_bundle_top_g5_g8_independent_g1_bernstein.py",
        "source_sha256": "CCCD421D17852A42499F53DF5DA66B9E2CB58C1EED455615D35909262A82A1DB",
    },
    "all_forest_n4": {
        "report": "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json",
        "report_sha256": "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
        "marker": "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12",
        "source": "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py",
        "source_sha256": "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    },
    "terminal_rank5_independent": {
        "report": "iso_n5_terminal_brooms_isolates_independent_exact_rank5_g4_20260829.json",
        "report_sha256": "56885DB0082AF7B72865CBE5E4C9A4F42921A88A17DE192D87F1506A74493627",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_TERMINAL_BROOMS_ISOLATES_RANK5_G4",
        "source": "prove_iso_n5_terminal_brooms_isolates_independent_rank5_g4.py",
        "source_sha256": "90E628693E70A9BA105042A7C35122DE46A87DF25017372B40F1BDC7C3015F27",
    },
}

CLASSIFIER_SOURCE = "assemble_iso_all_forest_n4_bundle_induction_root.py"
CLASSIFIER_SOURCE_SHA256 = "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720"

CLASSIFIER_TO_CANONICAL = {
    "no_mark_root_k0": "no_parent_k0",
    "singleton_ordinary": "singleton_ordinary",
    "singleton_endpoint": "singleton_endpoint",
    "internal_spine_ordinary": "internal_spine_broom_ordinary",
    "internal_spine_endpoint": "internal_spine_broom_endpoint",
}

G2_CANONICAL_MODES = {
    "no_parent_k0",
    "singleton_ordinary",
    "singleton_endpoint_p_equals_u",
    "internal_spine_broom_ordinary",
    "internal_spine_broom_endpoint",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def is_pending(spec: dict[str, str]) -> bool:
    return any(value.startswith("__PENDING_") for value in spec.values())


def load_dependencies() -> tuple[dict[str, dict[str, str]], dict[str, dict]]:
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA256
    pins, reports = {}, {}
    for name, spec in DEPENDENCIES.items():
        if is_pending(spec):
            assert name == "g2_all_five_modes"
            continue
        report_path, source_path = HERE / spec["report"], HERE / spec["source"]
        assert report_path.is_file() and source_path.is_file(), name
        assert sha256(report_path) == spec["report_sha256"], name
        assert sha256(source_path) == spec["source_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report.get("source_sha256") == spec["source_sha256"], name
        pins[name], reports[name] = dict(spec), report

    bundle = reports["bundle_identity"]
    assert bundle["rank"] == 5 and bundle["degree_in_M"] == 8
    assert bundle["identity"] == (
        "Gamma_M=N5((1+x)^M C+xD)-N5(C+xD)-"
        "sum_(t=0)^(M-1)N4((1+x)^t C)"
    )
    g1 = reports["g1_all_five_modes"]
    assert g1["coverage_count"] == 5 and not g1["missing_modes"] and g1["duplicate_modes"] == 0
    assert set(g1["canonical_modes"]) == set(CLASSIFIER_TO_CANONICAL.values())
    assert reports["g3_all_five_modes_independent"]["theorem_audited"] == (
        "For every forest-realizable canonical deepest-support rank-five whole-bundle cell, "
        "the binomial coefficient g3 is nonnegative."
    )
    assert reports["g4_universal"]["theorem_audited"] == (
        "For every forest-realizable marked rank-five sibling-bundle cell, "
        "the binom(M,4) coefficient g4 is positive."
    )
    assert reports["g5_g8_universal"]["theorem"] == (
        "For every forest-realizable marked rank-five sibling-bundle cell, "
        "g5,g6,g7,g8 are nonnegative."
    )
    assert reports["all_forest_n4"]["theorem"] == (
        "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    assert reports["terminal_rank5_independent"]["theorem"] == (
        "N5(B;u,v)>=0 for every terminal marked forest B consisting of either two disjoint "
        "rooted stars or a connected double broom, together with arbitrarily many unmarked isolates."
    )
    if "g2_all_five_modes" in reports:
        g2 = reports["g2_all_five_modes"]
        assert g2["canonical_mode_count"] == 5
        assert g2["all_mode_markers_pass"] is True
        assert g2["coverage_is_disjoint_and_exhaustive"] is True
        assert {row["mode"] for row in g2["canonical_modes"]} == G2_CANONICAL_MODES
    return pins, reports


def direct_bundle_coefficients(base: nx.Graph, support: int, u: int, v: int) -> list[int]:
    """Return literal g0,...,g8 from nine rank-five Gamma values."""
    assert support not in (u, v)
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_n5 = rank_value(base, u, v, 5)
    gamma = []
    for bundle_size in range(9):
        bundled = add_leaves(base, support, bundle_size)
        lower_payment = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 4)
            for isolates in range(bundle_size)
        )
        gamma.append(rank_value(bundled, u, v, 5) - base_n5 - lower_payment)
    coefficients = binomial_coefficients(gamma)
    assert len(coefficients) == 9 and coefficients[0] == 0
    return coefficients


def finite_structural_and_literal_replay(maximum_order: int = 6) -> dict:
    mode_counts, terminal_counts = Counter(), Counter()
    minima = {index: None for index in range(1, 9)}
    marked_cells = bundle_cells = 0
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= maximum_order and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u in graph for v in graph if u < v)
    cases.extend(fixture_cells())

    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_eligible_support(graph, u, v)
        if cell is None:
            assert expected_mode is None
            terminal_counts[classify_terminal(graph, u, v)] += 1
            assert rank_value(graph, u, v, 5) >= 0
            continue
        classification = classify_deepest_support(graph, u, v, cell)
        mode = classification["mode"]
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1

        base = graph.copy()
        base.remove_nodes_from(cell["bundle"])
        coefficients = direct_bundle_coefficients(base, cell["support"], u, v)
        assert all(value >= 0 for value in coefficients[1:])
        for index in range(1, 9):
            old = minima[index]
            minima[index] = coefficients[index] if old is None else min(old, coefficients[index])

        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 4)
            for isolates in range(actual_bundle)
        )
        gamma = rank_value(graph, u, v, 5) - rank_value(base, u, v, 5) - lower
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index) for index in range(1, 9)
        )
        assert gamma == reconstructed >= 0

    assert set(mode_counts) == set(MODES) == set(CLASSIFIER_TO_CANONICAL)
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates",
        "disconnected_rooted_stars_plus_isolates",
    }
    return {
        "atlas_orders": [2, maximum_order],
        "unordered_marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "minimum_direct_binomial_coefficients": {f"g{index}": minima[index] for index in range(1, 9)},
        "all_direct_g1_through_g8_nonnegative": True,
        "role": (
            "Direct finite replay of the exact five-mode classifier, rank-five Gamma telescope, "
            "and all nine forward differences. Universal signs come only from pinned theorems."
        ),
    }


def assemble_report() -> dict:
    pins, reports = load_dependencies()
    replay = finite_structural_and_literal_replay()
    pending = "g2_all_five_modes" not in reports
    marker = PENDING_MARKER if pending else PASS_MARKER
    report = {
        "marker": marker,
        "status": (
            "fail-closed draft; exactly the all-five-mode g2 pin remains"
            if pending else "exact all-order all-marked-forest rank-five theorem"
        ),
        "theorem": (
            None if pending else
            "N5(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
        ),
        "rooting_and_exhaustion": {
            "classifier_source": CLASSIFIER_SOURCE,
            "classifier_source_sha256": CLASSIFIER_SOURCE_SHA256,
            "mode_map": CLASSIFIER_TO_CANONICAL,
            "modes_pairwise_disjoint_and_exhaustive": True,
            "terminal": (
                "No eligible unmarked support is exactly a terminal connected double broom or "
                "two disconnected rooted stars, together with unmarked isolates."
            ),
        },
        "bundle_payment": {
            "rows": "For H=B-Z, C=H-s and D=H-N_H[s], the marked rows of B are (1+x)^M C+xD.",
            "identity": (
                "N5(B)-N5(H)-sum_(t=0)^(M-1)N4((H-s) union tK1) "
                "=sum_(j=1)^8 g_j binom(M,j)."
            ),
            "coefficient_coverage": {
                "g1": "g1_all_five_modes",
                "g2": "g2_all_five_modes" if not pending else "PENDING exact all-five-mode report pin",
                "g3": "g3_all_five_modes_independent",
                "g4": "g4_universal",
                "g5_g6_g7_g8": "g5_g8_universal",
            },
            "lower_rank_payment": "all_forest_n4",
        },
        "strong_induction": {
            "measure": "number of unmarked vertices",
            "step": (
                "For a nonempty complete leaf bundle Z, every g1,...,g8 and every N4 payment "
                "is nonnegative, hence N5(B)>=N5(B-Z); the latter forest has fewer unmarked vertices."
            ),
            "base": "The pinned terminal rank-five theorem covers exactly the no-support forests.",
            "conclusion": None if pending else "N5(B;u,v)>=0 for every finite marked forest.",
        },
        "open_obligations": (
            ["Insert and verify the frozen all-five-mode g2 source/report/marker hashes."] if pending else []
        ),
        "dependencies": pins,
        "pending_dependency_template": DEPENDENCIES["g2_all_five_modes"] if pending else None,
        "finite_replay": replay,
        "scope_guard": (
            "This artifact concerns only the all-marked-forest rank-five N5 theorem. "
            "It does not establish higher-rank N_r, final independence-sequence propagation, "
            "or Erdos Problem 993 by itself."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    return report


def main():
    report = assemble_report()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "status": report["status"],
        "open_obligations": report["open_obligations"],
        "finite_replay": report["finite_replay"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True), flush=True)
    print(report["marker"], flush=True)


if __name__ == "__main__":
    main()
