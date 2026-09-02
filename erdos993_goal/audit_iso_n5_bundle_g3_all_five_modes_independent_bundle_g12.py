#!/usr/bin/env python3
"""Independent fail-closed audit of the all-five-mode rank-five g3 assembly."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx
import sympy as sp

import derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12 as config_algebra
import probe_iso_n5_bundle_g3_five_modes_bundle_g12 as literal_algebra
from assemble_iso_all_forest_n4_bundle_induction_root import (
    MODES,
    classify_deepest_support,
    deepest_eligible_support,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g3_all_five_modes_independent_audit_bundle_g12_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_BUNDLE_G3_ALL_FIVE_MODES_AUDIT_BUNDLE_G12"

TARGET = {
    "source": "assemble_iso_n5_bundle_g3_all_five_modes_bundle_g12.py",
    "source_sha256": "A79683017A0B767F3F8D5154868BF69C179F14E246C9EA5E15E53FF63666AF45",
    "report": "iso_n5_bundle_g3_all_five_modes_exact_bundle_g12_20260830.json",
    "report_sha256": "3D57E8988353049A412B35F751645EBE921AE2EAEFD28736E2FE1C285E76BA52",
    "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_ALL_FIVE_MODES_BUNDLE_G12",
}

CLASSIFIER_AUDIT = {
    "source": "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py",
    "source_sha256": "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "report": "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json",
    "report_sha256": "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
    "marker": "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12",
    "classifier_source": "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "classifier_source_sha256": "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
}

RAW_INPUTS = {
    "configuration_source": (
        "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py",
        "22ABD29E84AE5EAC21FF62C14C3137F6013658DFD301D5D70EEF913F68C20467",
    ),
    "literal_source": (
        "probe_iso_n5_bundle_g3_five_modes_bundle_g12.py",
        "5253552753A4142FE9ED0757D31888F927EEA4ED92375E5663D94B10BD5152B1",
    ),
    "degree_eight_source": (
        "derive_iso_n5_bundle_polynomial_root.py",
        "7920BF20C19B24CBFF877F23BC069644242BB9282AD03125A049F01C180F9AB7",
    ),
    "degree_eight_report": (
        "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json",
        "545B3AF80F49A2158EE59C3128F42C694651210CB2D82F1CDCE48DA20E43B1F7",
    ),
}

THEOREMS = {
    "root_endpoint": {
        "source": "prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12.py",
        "source_sha256": "7C9E118AA3F4AF92C0EB933D1CD2FD54144D8BF3913963D5BA7090B5A97BFBED",
        "report": "iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12_20260829.json",
        "report_sha256": "ABAB5290F2204EAAA5DECCCF6A7D72166D0CABF0A30040CC475D370E4C28017F",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_ROOT_ENDPOINT_ALL_ORDER_BUNDLE_G12",
        "modes": {"no_mark_root_k0", "singleton_endpoint"},
    },
    "singleton_ordinary": {
        "source": "prove_iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12.py",
        "source_sha256": "6170F8A9D70DC501C2F3D73D8DB490A0CDAC652334B29D00379E3D7772EBBCF1",
        "report": "iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12_20260829.json",
        "report_sha256": "1D55C2A2A89D165F8FA941A0589426F89BDB73560C61A02C404930559F441785",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_SINGLETON_ORDINARY_ALL_ORDER_BUNDLE_G12",
        "modes": {"singleton_ordinary"},
    },
    "internal_spine": {
        "source": "prove_iso_n5_bundle_g3_internal_spine_all_order_bundle_g12.py",
        "source_sha256": "E456ABF4AA9FF45A266F6B6A6340BEC7B4962D1C5769A3C2DA965C3F614DB934",
        "report": "iso_n5_bundle_g3_internal_spine_all_order_bundle_g12_20260829.json",
        "report_sha256": "27BCDAED6F647122EFF0783FE961976D23DCB024161559ABDAB7C1A193A9873F",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_INTERNAL_SPINE_ALL_ORDER_BUNDLE_G12",
        "modes": {"internal_spine_ordinary", "internal_spine_endpoint"},
    },
}

EXPECTED_COUNTS = {
    "internal_spine_endpoint": 149,
    "internal_spine_ordinary": 43,
    "no_mark_root_k0": 161,
    "singleton_endpoint": 326,
    "singleton_ordinary": 283,
}
EXPECTED_MINIMA = {
    "internal_spine_endpoint": 28,
    "internal_spine_ordinary": 143,
    "no_mark_root_k0": 18,
    "singleton_endpoint": 18,
    "singleton_ordinary": 89,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_pinned(path_name: str, digest: str) -> Path:
    path = HERE / path_name
    assert path.is_file(), path
    assert sha256(path) == digest, path_name
    return path


def audit_pins_and_coverage() -> tuple[dict, dict]:
    target_source = load_pinned(TARGET["source"], TARGET["source_sha256"])
    target_report_path = load_pinned(TARGET["report"], TARGET["report_sha256"])
    target = json.loads(target_report_path.read_text(encoding="utf-8"))
    assert target["marker"] == TARGET["marker"]
    assert target["source_sha256"] == sha256(target_source)

    load_pinned(CLASSIFIER_AUDIT["source"], CLASSIFIER_AUDIT["source_sha256"])
    classifier_report_path = load_pinned(
        CLASSIFIER_AUDIT["report"], CLASSIFIER_AUDIT["report_sha256"]
    )
    load_pinned(
        CLASSIFIER_AUDIT["classifier_source"],
        CLASSIFIER_AUDIT["classifier_source_sha256"],
    )
    classifier = json.loads(classifier_report_path.read_text(encoding="utf-8"))
    assert classifier["marker"] == CLASSIFIER_AUDIT["marker"]
    classifier_modes = set(classifier["rooted_five_mode_exhaustion"]["modes"])
    assert classifier_modes == set(MODES)

    multiplicity: Counter[str] = Counter()
    theorem_rows = {}
    for name, spec in THEOREMS.items():
        load_pinned(spec["source"], spec["source_sha256"])
        report_path = load_pinned(spec["report"], spec["report_sha256"])
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"]
        assert report["source_sha256"] == spec["source_sha256"]
        for mode in spec["modes"]:
            multiplicity[mode] += 1
        theorem_rows[name] = {
            "marker": spec["marker"],
            "modes": sorted(spec["modes"]),
            "theorem": report["theorem"],
        }

    assert set(multiplicity) == classifier_modes
    assert all(multiplicity[mode] == 1 for mode in classifier_modes)
    assert set(target["mode_coverage"]) == classifier_modes
    for mode, row in target["mode_coverage"].items():
        matching = [name for name, spec in THEOREMS.items() if mode in spec["modes"]]
        assert len(matching) == 1
        expected = THEOREMS[matching[0]]
        assert row["marker"] == expected["marker"]
        assert row["report"] == expected["report"]
    return target, {
        "independently_audited_classifier_marker": classifier["marker"],
        "canonical_modes": sorted(classifier_modes),
        "coverage_multiplicity": dict(sorted(multiplicity.items())),
        "theorem_rows": theorem_rows,
    }


def audit_raw_algebra() -> dict:
    for path_name, digest in RAW_INPUTS.values():
        load_pinned(path_name, digest)

    configured = sp.expand(config_algebra.raw_g3())
    symbols = {str(symbol): symbol for symbol in configured.free_symbols}
    literal = sp.sympify(str(literal_algebra.symbolic_raw_g3()), locals=symbols)
    frozen_report = json.loads(
        (HERE / RAW_INPUTS["degree_eight_report"][0]).read_text(encoding="utf-8")
    )
    frozen = sp.sympify(frozen_report["binomial_coefficients"][3]["factor"], locals=symbols)
    assert sp.expand(configured - literal) == 0
    assert sp.expand(configured - frozen) == 0
    term_count = len(sp.Poly(configured, *sorted(configured.free_symbols, key=str)).terms())
    assert term_count == 79
    return {
        "configuration_reduction_equals_literal_newton_reconstruction": True,
        "literal_newton_reconstruction_equals_frozen_degree_eight_g3": True,
        "raw_term_count": term_count,
    }


def audit_finite_classifier_and_values() -> dict:
    counts: Counter[str] = Counter()
    minima: dict[str, int] = {}
    negatives: Counter[str] = Counter()
    exact_cell_matches = 0

    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u, v in itertools.combinations(graph.nodes(), 2):
            root_cell = deepest_eligible_support(graph, u, v)
            alternate_cell = literal_algebra.deepest_cell(graph, u, v)
            assert (root_cell is None) == (alternate_cell is None)
            if root_cell is None:
                continue

            support, bundle, *_ = alternate_cell
            assert support == root_cell["support"]
            assert set(bundle) == set(root_cell["bundle"])
            root_mode = classify_deepest_support(graph, u, v, root_cell)["mode"]
            alternate_mode = literal_algebra.classify(graph, u, v, alternate_cell)
            assert root_mode == alternate_mode
            exact_cell_matches += 1

            base = graph.copy()
            base.remove_nodes_from(root_cell["bundle"])
            values = [
                literal_algebra.gamma(base, root_cell["support"], u, v, number)
                for number in range(4)
            ]
            g3 = int(literal_algebra.forward(values)[3])
            counts[root_mode] += 1
            negatives[root_mode] += int(g3 < 0)
            minima[root_mode] = g3 if root_mode not in minima else min(minima[root_mode], g3)

    assert exact_cell_matches == 962
    assert dict(counts) == EXPECTED_COUNTS
    assert minima == EXPECTED_MINIMA
    assert not any(negatives.values())
    return {
        "role": "supplementary finite census, not extrapolated to all orders",
        "scope": "all unlabeled atlas forests of orders 2 through 7 and every mark pair",
        "two_independent_classifiers_exact_cell_matches": exact_cell_matches,
        "mode_counts": dict(sorted(counts.items())),
        "mode_minima": dict(sorted(minima.items())),
        "mode_negative_counts": dict(sorted(negatives.items())),
    }


def main() -> None:
    target, coverage = audit_pins_and_coverage()
    algebra = audit_raw_algebra()
    finite = audit_finite_classifier_and_values()
    report = {
        "marker": MARKER,
        "verdict": "The all-five-mode rank-five g3 assembly passes a fail-closed independent audit.",
        "theorem_audited": target["theorem"],
        "scope_guard": (
            "This audit proves the rank-five whole-bundle coefficient g3 sign only. It does not "
            "prove g1, g2, all N5, higher ranks, or Problem 993."
        ),
        "target": TARGET,
        "structural_and_dependency_coverage": coverage,
        "independent_raw_algebra": algebra,
        "finite_replay": finite,
        "proof_status_distinctions": {
            "theorem": "the three pinned all-order certificates cover each canonical mode exactly once",
            "finite_census": "962 exact cells are supplementary verification only",
            "failed_relaxation": "no arbitrary-support or finite-census extrapolation is used",
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "coverage_multiplicity": coverage["coverage_multiplicity"],
        "raw_term_count": algebra["raw_term_count"],
        "finite_total": finite["two_independent_classifiers_exact_cell_matches"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
