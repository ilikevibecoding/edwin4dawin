#!/usr/bin/env python3
"""Fail-closed all-marked-forest N6 bundle-induction assembler.

The exact lower N5 payment, bundle algebra, g5..g10 package, and terminal N6
producer theorem are pinned.  Until g1..g4 and an independent terminal audit
are pinned, this script emits PENDING with theorem/conclusion null.
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
OUTPUT = HERE / "iso_all_forest_n6_bundle_induction_exact_g1_nonadjacent_20260830.json"
PASS_MARKER = "PASS_EXACT_ALL_MARKED_FOREST_N6_BUNDLE_INDUCTION_G1_NONADJACENT"
PENDING_MARKER = "PENDING_EXACT_ALL_MARKED_FOREST_N6_BUNDLE_INDUCTION_G1_NONADJACENT"

DEPENDENCIES = {
    "bundle_identity": {
        "source": "derive_iso_n6_bundle_polynomial_root.py",
        "source_sha256": "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
        "report": "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "report_sha256": "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
        "marker": "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT",
    },
    "all_N5_primary": {
        "source": "assemble_iso_all_forest_n5_bundle_induction_g2_structure_nonadjacent.py",
        "source_sha256": "9906E66E28717A80F1215DBCF75ADE913AFC5EE1911D1A08FD08317F6589AC38",
        "report": "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json",
        "report_sha256": "7F2845A77504828349E100371FEE2591CFDE70AF87E2504A91EE5D121357B3CB",
        "marker": "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT",
    },
    "all_N5_independent": {
        "source": "audit_iso_all_forest_n5_bundle_induction_g2_transfer_audit.py",
        "source_sha256": "4484285A467773D4C800C91D0E47542072AF6A71AC2C5BA15677BD9BC7EFD363",
        "report": "iso_all_forest_n5_bundle_induction_independent_audit_g2_transfer_audit_20260830.json",
        "report_sha256": "761A6AEA3C4ED2E16178DA1B5B5CC41ABAD4DFAFD1F993463E1682FC19456C87",
        "marker": "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_TRANSFER_AUDIT",
    },
    "g5_through_g10": {
        "source": "assemble_iso_n6_bundle_top_g5_g10_root.py",
        "source_sha256": "22642D68B0FD0A5EE53C80C6244E46950B5093E071E41E3BFD925F254F0801EE",
        "report": "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json",
        "report_sha256": "C26D5A80AD4617461971F8AA09ADC2E4C1AEE24BB592D71112992AAD2FA09AF7",
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_TOP_G5_G10_ROOT",
    },
    "terminal_N6_primary": {
        "source": "prove_iso_n6_terminal_brooms_isolates_g1_nonadjacent.py",
        "source_sha256": "2A925AF880B63389AA7F0BC4EAB16E9A49BFC589F6510D2A8527ED7C62028CC1",
        "report": "iso_n6_terminal_brooms_isolates_exact_g1_nonadjacent_20260830.json",
        "report_sha256": "FAB36BAAB45E5F33DC629C8EE3235CD1E2CC300CC1FD38942A0C9CF522BD6958",
        "marker": "PASS_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_G1_NONADJACENT",
    },
    "g1_all_five_modes": {
        "source": "__PENDING_G1_SOURCE_FILE__",
        "source_sha256": "__PENDING_G1_SOURCE_SHA256__",
        "report": "__PENDING_G1_REPORT_FILE__",
        "report_sha256": "__PENDING_G1_REPORT_SHA256__",
        "marker": "__PENDING_G1_MARKER__",
    },
    "g2_all_five_modes": {
        "source": "__PENDING_G2_SOURCE_FILE__",
        "source_sha256": "__PENDING_G2_SOURCE_SHA256__",
        "report": "__PENDING_G2_REPORT_FILE__",
        "report_sha256": "__PENDING_G2_REPORT_SHA256__",
        "marker": "__PENDING_G2_MARKER__",
    },
    "g3_all_five_modes": {
        "source": "__PENDING_G3_SOURCE_FILE__",
        "source_sha256": "__PENDING_G3_SOURCE_SHA256__",
        "report": "__PENDING_G3_REPORT_FILE__",
        "report_sha256": "__PENDING_G3_REPORT_SHA256__",
        "marker": "__PENDING_G3_MARKER__",
    },
    "g4_all_five_modes": {
        "source": "__PENDING_G4_SOURCE_FILE__",
        "source_sha256": "__PENDING_G4_SOURCE_SHA256__",
        "report": "__PENDING_G4_REPORT_FILE__",
        "report_sha256": "__PENDING_G4_REPORT_SHA256__",
        "marker": "__PENDING_G4_MARKER__",
    },
    "terminal_N6_independent": {
        "source": "__PENDING_TERMINAL_AUDIT_SOURCE_FILE__",
        "source_sha256": "__PENDING_TERMINAL_AUDIT_SOURCE_SHA256__",
        "report": "__PENDING_TERMINAL_AUDIT_REPORT_FILE__",
        "report_sha256": "__PENDING_TERMINAL_AUDIT_REPORT_SHA256__",
        "marker": "__PENDING_TERMINAL_AUDIT_MARKER__",
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


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def is_pending(spec):
    return any(isinstance(value, str) and value.startswith("__PENDING_") for value in spec.values())


def load_dependencies():
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA256
    pins, reports, pending = {}, {}, []
    for name, spec in DEPENDENCIES.items():
        if is_pending(spec):
            pending.append(name)
            continue
        source, report_path = HERE / spec["source"], HERE / spec["report"]
        assert source.is_file() and report_path.is_file(), name
        assert sha256(source) == spec["source_sha256"], name
        assert sha256(report_path) == spec["report_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report.get("source_sha256") == spec["source_sha256"], name
        pins[name], reports[name] = dict(spec), report

    bundle = reports["bundle_identity"]
    assert bundle["rank"] == 6 and bundle["degree_in_M"] == 10
    assert bundle["identity"] == (
        "Gamma_M=N6((1+x)^M C+xD)-N6(C+xD)-"
        "sum_(t=0)^(M-1)N5((1+x)^t C)"
    )
    all_n5 = reports["all_N5_primary"]
    assert all_n5["theorem"] == (
        "N5(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    assert reports["all_N5_independent"]["open_obligations"] == []
    top = reports["g5_through_g10"]
    assert top["closed_coefficients"] == [5, 6, 7, 8, 9, 10]
    terminal = reports["terminal_N6_primary"]
    assert terminal["coverage"]["no_gap"] is True
    assert terminal["theorem"].startswith("N6(B;u,v)>=0 for every terminal marked forest")

    if not pending:
        for index in range(1, 5):
            low = reports[f"g{index}_all_five_modes"]
            assert low["canonical_mode_count"] == 5
            assert low["coverage_is_disjoint_and_exhaustive"] is True
            assert low["all_mode_markers_pass"] is True
        terminal_audit = reports["terminal_N6_independent"]
        assert terminal_audit["coverage_no_gap"] is True
        assert "N6(B;u,v)>=0" in terminal_audit["theorem_audited"]
    return pins, reports, sorted(pending)


def direct_bundle_coefficients(base, support, u, v):
    assert support not in (u, v)
    c_graph = base.copy()
    c_graph.remove_node(support)
    base_n6 = rank_value(base, u, v, 6)
    gamma = []
    for bundle_size in range(11):
        bundled = add_leaves(base, support, bundle_size)
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 5)
            for isolates in range(bundle_size)
        )
        gamma.append(rank_value(bundled, u, v, 6) - base_n6 - lower)
    coefficients = binomial_coefficients(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    return coefficients


def finite_replay(maximum_order=7):
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= maximum_order and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u in graph for v in graph if u < v)
    cases.extend(fixture_cells())

    mode_counts, terminal_counts = Counter(), Counter()
    minima = {index: None for index in range(1, 11)}
    marked_cells = bundle_cells = terminal_checks = 0
    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_eligible_support(graph, u, v)
        if cell is None:
            assert expected_mode is None
            terminal_counts[classify_terminal(graph, u, v)] += 1
            assert rank_value(graph, u, v, 6) >= 0
            terminal_checks += 1
            continue
        mode = classify_deepest_support(graph, u, v, cell)["mode"]
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1
        base = graph.copy()
        base.remove_nodes_from(cell["bundle"])
        coefficients = direct_bundle_coefficients(base, cell["support"], u, v)
        assert all(value >= 0 for value in coefficients[1:])
        for index in range(1, 11):
            minima[index] = (
                coefficients[index]
                if minima[index] is None else min(minima[index], coefficients[index])
            )

        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 5)
            for isolates in range(actual_bundle)
        )
        gamma = rank_value(graph, u, v, 6) - rank_value(base, u, v, 6) - lower
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index) for index in range(1, 11)
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
        "terminal_direct_N6_checks": terminal_checks,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "minimum_direct_binomial_coefficients": {
            f"g{index}": minima[index] for index in range(1, 11)
        },
        "all_direct_g1_through_g10_nonnegative": True,
        "role": "finite replay only; universal signs come exclusively from pinned theorems",
    }


def assemble_report():
    pins, reports, pending = load_dependencies()
    replay = finite_replay()
    complete = not pending
    marker = PASS_MARKER if complete else PENDING_MARKER
    return {
        "marker": marker,
        "status": (
            "exact all-order all-marked-forest rank-six theorem"
            if complete else "fail-closed draft; five exact same-rank pins remain"
        ),
        "theorem": (
            "N6(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
            if complete else None
        ),
        "rooting_and_exhaustion": {
            "classifier_source": CLASSIFIER_SOURCE,
            "classifier_source_sha256": CLASSIFIER_SOURCE_SHA256,
            "mode_map": CLASSIFIER_TO_CANONICAL,
            "modes_pairwise_disjoint_and_exhaustive": True,
            "terminal_families": [
                "connected_double_broom_plus_isolates",
                "disconnected_rooted_stars_plus_isolates",
            ],
        },
        "bundle_payment": {
            "identity": (
                "N6(B)-N6(H)-sum_(t=0)^(M-1)N5((H-s) union tK1) "
                "=sum_(j=1)^10 g_j binom(M,j)."
            ),
            "coefficient_coverage": {
                "g1": "g1_all_five_modes" if complete else "PENDING",
                "g2": "g2_all_five_modes" if complete else "PENDING",
                "g3": "g3_all_five_modes" if complete else "PENDING",
                "g4": "g4_all_five_modes" if complete else "PENDING",
                "g5_through_g10": "g5_through_g10",
            },
            "lower_rank_payment": ["all_N5_primary", "all_N5_independent"],
        },
        "terminal_base": {
            "primary": "terminal_N6_primary",
            "independent": "terminal_N6_independent" if complete else "PENDING",
        },
        "strong_induction": {
            "measure": "number of unmarked vertices",
            "step": (
                "Remove a nonempty deepest sibling bundle. Nonnegative g1..g10 and every all-N5 "
                "lower payment imply N6(B)>=N6(B-Z), with fewer unmarked vertices."
            ),
            "base": "the exact no-eligible-support terminal theorem and its independent audit",
            "conclusion": (
                "N6(B;u,v)>=0 for every finite marked forest." if complete else None
            ),
        },
        "open_dependencies": pending,
        "open_obligations": (
            [
                "Pin all-five-mode universal rank-six g1 theorem.",
                "Pin all-five-mode universal rank-six g2 theorem.",
                "Pin all-five-mode universal rank-six g3 theorem.",
                "Pin all-five-mode universal rank-six g4 theorem.",
                "Pin an independent exact audit of the all-order terminal N6 theorem.",
            ] if not complete else []
        ),
        "dependencies": pins,
        "pending_dependency_templates": {
            name: DEPENDENCIES[name] for name in pending
        },
        "finite_replay": replay,
        "scope_guard": (
            "While any pending dependency remains, theorem and induction conclusion are null. "
            "This artifact concerns only marked N6 and never promotes finite evidence, N7, "
            "the final independence-sequence propagation, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }


def main():
    report = assemble_report()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "open_dependencies": report["open_dependencies"],
        "finite_replay": report["finite_replay"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
