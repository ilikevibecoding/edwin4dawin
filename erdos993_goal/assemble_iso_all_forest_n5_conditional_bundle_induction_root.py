#!/usr/bin/env python3
"""Fail-closed conditional assembly of the all-marked-forest rank-five step.

This verifier freezes the exact structural induction that will yield

    N5(B;u,v) >= 0

for every finite marked forest once the two remaining whole-bundle
coefficients g1,g2 have universal sign certificates.  It pins the already
proved ingredients (the degree-eight bundle identity, all-forest N4, g4,
g3--g8, and the independently audited terminal N5 theorem), replays the
deepest-support classifier, and directly reconstructs the Gamma telescope on
the graph atlas.  The output is deliberately conditional: it does not promote
finite evidence for g1--g2 into an all-order theorem.
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
OUTPUT = HERE / "iso_all_forest_n5_conditional_bundle_induction_exact_root_20260829.json"


DEPENDENCIES = {
    "bundle_identity": {
        "report": "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json",
        "report_sha256": "545B3AF80F49A2158EE59C3128F42C694651210CB2D82F1CDCE48DA20E43B1F7",
        "marker": "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT",
        "source": "derive_iso_n5_bundle_polynomial_root.py",
        "source_sha256": "7920BF20C19B24CBFF877F23BC069644242BB9282AD03125A049F01C180F9AB7",
    },
    "g4_universal": {
        "report": "iso_n5_bundle_g4_coarse_cone_independent_audit_rank5_g4_20260829.json",
        "report_sha256": "AAC5100D82DD3421BB9DAA3703A42CA0775149DB53C5178E9C7E4AE3FCD4BA61",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_AUDIT_RANK5_G4",
        "source": "audit_iso_n5_bundle_g4_coarse_cone_independent_rank5_g4.py",
        "source_sha256": "92CEDE4CCA2049B8779D6565FD5F58E5B9BE40D6281D6E893E9D0D9B87DB32DC",
    },
    "g3_all_five_modes_independent": {
        "report": "iso_n5_bundle_g3_all_five_modes_independent_audit_bundle_g12_20260830.json",
        "report_sha256": "B556DA5B5A67BDBF2DAFD39A1922C8D423E5934B4C3EE2DDF8A94EB9299C6EB0",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G3_ALL_FIVE_MODES_AUDIT_BUNDLE_G12",
        "source": "audit_iso_n5_bundle_g3_all_five_modes_independent_bundle_g12.py",
        "source_sha256": "0723E4C9E63BDA23DE4CE81358125F2C6890073DC5626B00B74A77307D84902B",
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


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_dependencies() -> dict[str, dict[str, str]]:
    assert sha256(HERE / CLASSIFIER_SOURCE) == CLASSIFIER_SOURCE_SHA256
    pins: dict[str, dict[str, str]] = {}
    for name, spec in DEPENDENCIES.items():
        report_path = HERE / spec["report"]
        source_path = HERE / spec["source"]
        assert report_path.is_file(), report_path
        assert source_path.is_file(), source_path
        assert sha256(report_path) == spec["report_sha256"], name
        assert sha256(source_path) == spec["source_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report.get("source_sha256") == spec["source_sha256"], name
        pins[name] = dict(spec)

    bundle = json.loads((HERE / DEPENDENCIES["bundle_identity"]["report"]).read_text())
    assert bundle["rank"] == 5
    assert bundle["degree_in_M"] == 8
    assert bundle["identity"] == (
        "Gamma_M=N5((1+x)^M C+xD)-N5(C+xD)-"
        "sum_(t=0)^(M-1)N4((1+x)^t C)"
    )

    g4 = json.loads((HERE / DEPENDENCIES["g4_universal"]["report"]).read_text())
    assert g4["theorem_audited"] == (
        "For every forest-realizable marked rank-five sibling-bundle cell, "
        "the binom(M,4) coefficient g4 is positive."
    )

    g3_complete = json.loads((HERE / DEPENDENCIES["g3_all_five_modes_independent"]["report"]).read_text())
    assert g3_complete["theorem_audited"] == (
        "For every forest-realizable canonical deepest-support rank-five whole-bundle cell, "
        "the binomial coefficient g3 is nonnegative."
    )

    top = json.loads((HERE / DEPENDENCIES["g5_g8_universal"]["report"]).read_text())
    assert top["theorem"] == (
        "For every forest-realizable marked rank-five sibling-bundle cell, "
        "g5,g6,g7,g8 are nonnegative."
    )

    lower = json.loads((HERE / DEPENDENCIES["all_forest_n4"]["report"]).read_text())
    assert lower["theorem"] == (
        "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )

    terminal = json.loads((HERE / DEPENDENCIES["terminal_rank5_independent"]["report"]).read_text())
    assert terminal["theorem"] == (
        "N5(B;u,v)>=0 for every terminal marked forest B consisting of either two disjoint "
        "rooted stars or a connected double broom, together with arbitrarily many unmarked isolates."
    )
    return pins


def direct_bundle_coefficients(
    base: nx.Graph, support: int, u: int, v: int
) -> list[int]:
    """Return g0,...,g8 from nine literal values of the rank-five Gamma."""
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
    assert len(coefficients) == 9
    assert coefficients[0] == 0
    return coefficients


def finite_structural_and_literal_replay(maximum_order: int = 6) -> dict:
    mode_counts: Counter[str] = Counter()
    terminal_counts: Counter[str] = Counter()
    minimum_coefficients = {index: None for index in range(1, 9)}
    marked_cells = bundle_cells = 0

    cases: list[tuple[nx.Graph, int, int, str | None]] = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2 or len(graph0) > maximum_order or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u in graph:
            for v in graph:
                if u < v:
                    cases.append((graph, u, v, None))
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
        for index in range(1, 9):
            value = coefficients[index]
            old = minimum_coefficients[index]
            minimum_coefficients[index] = value if old is None else min(old, value)
            # Finite replay only.  Universal g1--g2 signs remain explicit gaps.
            assert value >= 0

        actual_bundle = len(cell["bundle"])
        c_graph = base.copy()
        c_graph.remove_node(cell["support"])
        lower = sum(
            rank_value(add_isolates(c_graph, isolates), u, v, 4)
            for isolates in range(actual_bundle)
        )
        gamma = rank_value(graph, u, v, 5) - rank_value(base, u, v, 5) - lower
        reconstructed = sum(
            coefficients[index] * comb(actual_bundle, index)
            for index in range(1, 9)
        )
        assert gamma == reconstructed >= 0

    assert set(mode_counts) == MODES
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
        "minimum_direct_binomial_coefficients": {
            f"g{index}": value for index, value in minimum_coefficients.items()
        },
        "role": (
            "Independent finite replay of the five-mode structural classifier, the exact rank-five "
            "Gamma telescope, and all nine forward differences. It is not an all-order sign theorem "
            "for g1 or g2."
        ),
    }


def assemble_report() -> dict:
    pins = load_dependencies()
    replay = finite_structural_and_literal_replay()
    return {
        "marker": "PASS_EXACT_CONDITIONAL_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_ROOT",
        "conditional_theorem": (
            "If g1,g2 are nonnegative in every one of the five canonical deepest-support "
            "modes, then N5(B;u,v)>=0 for every finite forest B with distinct marks u,v."
        ),
        "rooting_and_exhaustion": {
            "classifier": (
                "The exact rank-four deepest-support classifier is rank-independent and is reused "
                "with its source hash pinned. It exhausts no-mark root k=0, singleton ordinary, "
                "singleton endpoint, internal-spine one-ended-broom ordinary, and internal-spine "
                "one-ended-broom endpoint modes."
            ),
            "modes": sorted(MODES),
            "terminal": (
                "No eligible support is equivalent to no unmarked vertex adjacent to an unmarked "
                "leaf, precisely the hypothesis of the pinned terminal N5 theorem."
            ),
        },
        "bundle_payment": {
            "rows": "For H=B-Z, C=H-s and D=H-N_H[s], the four independence rows of B are (1+x)^M C+xD.",
            "identity": (
                "N5(B)-N5(H)-sum_(t=0)^(M-1)N4((H-s) union tK1) "
                "=sum_(j=1)^8 g_j binom(M,j)."
            ),
            "proved_coefficient_coverage": {
                "g3": "g3_all_five_modes_independent",
                "g4": "g4_universal",
                "g5_g6_g7_g8": "g5_g8_universal",
            },
            "open_coefficient_coverage": {
                "g1": "universal sign in all five modes",
                "g2": "universal sign in all five modes",
            },
            "lower_rank_payment": (
                "Every N4((H-s) union tK1;u,v) is nonnegative by the pinned all-forest N4 theorem."
            ),
        },
        "conditional_strong_induction": {
            "measure": "number of unmarked vertices",
            "step": (
                "Assuming the two open coefficient signs, all g1,...,g8 and every lower-rank "
                "payment are nonnegative, so N5(B)>=N5(H). Since H has fewer unmarked vertices, "
                "strong induction gives N5(H)>=0."
            ),
            "base": "With no eligible support, the pinned terminal theorem gives N5>=0.",
            "conclusion": "N5(B;u,v)>=0 for every finite marked forest, conditional only on g1,g2.",
        },
        "open_obligations": [
            "Universal all-order g1>=0 in all five canonical modes.",
            "Universal all-order g2>=0 in all five canonical modes.",
        ],
        "dependencies": pins,
        "classifier_dependency": {
            "source": CLASSIFIER_SOURCE,
            "source_sha256": CLASSIFIER_SOURCE_SHA256,
        },
        "finite_replay": replay,
        "scope_guard": (
            "This is an exact conditional rank-five assembly, not an all-N5 theorem. Finite replay "
            "does not discharge g1,g2. Ranks six and above, the final ISO/Newton propagation, "
            "and Erdos Problem 993 remain separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }


def main() -> None:
    report = assemble_report()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "conditional_theorem": report["conditional_theorem"],
        "open_obligations": report["open_obligations"],
        "finite_replay": report["finite_replay"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
