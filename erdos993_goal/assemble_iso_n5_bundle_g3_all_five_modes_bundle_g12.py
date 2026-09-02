#!/usr/bin/env python3
"""Fail-closed assembly of the rank-five whole-bundle g3 theorem.

This script pins and checks the exact configuration reduction and the three
all-order sign certificates whose scopes partition the established five
canonical deepest-support modes.  It also performs a fresh direct atlas replay
using the independently frozen structural classifier and literal rank values.

The conclusion concerns g3 only.  It is not an all-N5 induction and makes no
claim about Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx

from assemble_iso_all_forest_n4_bundle_induction_root import (
    MODES,
    classify_deepest_support,
    deepest_eligible_support,
)
from probe_iso_n5_bundle_g3_five_modes_bundle_g12 import forward, gamma


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g3_all_five_modes_exact_bundle_g12_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_ALL_FIVE_MODES_BUNDLE_G12"


DEPENDENCIES = {
    "configuration": {
        "source": "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py",
        "source_sha256": "22ABD29E84AE5EAC21FF62C14C3137F6013658DFD301D5D70EEF913F68C20467",
        "report": "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json",
        "report_sha256": "847618FA1024494805D350B0D88A6A8F4B5332E9995CAA7F931BBCC8EC5CDF69",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12",
    },
    "high_motif": {
        "source": "prove_iso_n5_bundle_g3_high_motif_reduction_bundle_g12.py",
        "source_sha256": "D497B5E3C0DAE3CE8DAF1BCD35BFEAD32B49C7347A1C930DC787E58F6126F2C6",
        "report": "iso_n5_bundle_g3_high_motif_reduction_bundle_g12_20260829.json",
        "report_sha256": "88618ACBC1F0DC418DCE965CFEB8E9F36A7E693C1F27BA6B16E16625DE4D6413",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_HIGH_MOTIF_REDUCTION_BUNDLE_G12",
    },
    "root_and_singleton_endpoint": {
        "source": "prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12.py",
        "source_sha256": "7C9E118AA3F4AF92C0EB933D1CD2FD54144D8BF3913963D5BA7090B5A97BFBED",
        "report": "iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12_20260829.json",
        "report_sha256": "ABAB5290F2204EAAA5DECCCF6A7D72166D0CABF0A30040CC475D370E4C28017F",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_ROOT_ENDPOINT_ALL_ORDER_BUNDLE_G12",
    },
    "singleton_ordinary": {
        "source": "prove_iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12.py",
        "source_sha256": "6170F8A9D70DC501C2F3D73D8DB490A0CDAC652334B29D00379E3D7772EBBCF1",
        "report": "iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12_20260829.json",
        "report_sha256": "1D55C2A2A89D165F8FA941A0589426F89BDB73560C61A02C404930559F441785",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_SINGLETON_ORDINARY_ALL_ORDER_BUNDLE_G12",
    },
    "internal_spine": {
        "source": "prove_iso_n5_bundle_g3_internal_spine_all_order_bundle_g12.py",
        "source_sha256": "E456ABF4AA9FF45A266F6B6A6340BEC7B4962D1C5769A3C2DA965C3F614DB934",
        "report": "iso_n5_bundle_g3_internal_spine_all_order_bundle_g12_20260829.json",
        "report_sha256": "27BCDAED6F647122EFF0783FE961976D23DCB024161559ABDAB7C1A193A9873F",
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G3_INTERNAL_SPINE_ALL_ORDER_BUNDLE_G12",
    },
}

CLASSIFIER = {
    "source": "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "source_sha256": "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
}

MODE_COVERAGE = {
    "no_mark_root_k0": "root_and_singleton_endpoint",
    "singleton_endpoint": "root_and_singleton_endpoint",
    "singleton_ordinary": "singleton_ordinary",
    "internal_spine_ordinary": "internal_spine",
    "internal_spine_endpoint": "internal_spine",
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


def load_dependencies() -> dict[str, dict]:
    assert sha256(HERE / CLASSIFIER["source"]) == CLASSIFIER["source_sha256"]
    assert set(MODES) == set(MODE_COVERAGE)

    loaded: dict[str, dict] = {}
    for name, spec in DEPENDENCIES.items():
        source = HERE / spec["source"]
        report_path = HERE / spec["report"]
        assert source.is_file() and report_path.is_file(), name
        assert sha256(source) == spec["source_sha256"], name
        assert sha256(report_path) == spec["report_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report["source_sha256"] == spec["source_sha256"], name
        loaded[name] = report

    configuration = loaded["configuration"]
    assert configuration["generic_raw_exact_match"] is True
    assert configuration["raw_term_count"] == 79
    assert set(configuration["modes"]) == set(MODE_COVERAGE)

    root_endpoint = loaded["root_and_singleton_endpoint"]
    assert root_endpoint["theorem"] == (
        "The rank-five whole-bundle coefficient g3 is nonnegative in the canonical "
        "no-mark-root k0 mode and in either singleton endpoint-parent mode, at every order n>=2."
    )
    singleton = loaded["singleton_ordinary"]
    assert singleton["theorem"] == (
        "For every canonical deepest singleton support whose parent p is distinct from both "
        "protected marks, the rank-five whole-bundle coefficient g3 is nonnegative."
    )
    internal = loaded["internal_spine"]
    assert internal["theorem"] == (
        "The rank-five whole-bundle coefficient g3 is nonnegative in both canonical internal-spine "
        "modes, including a=u and/or p=v collision boundaries, at every order."
    )
    assert set(internal["mode_scope"]) == {"ordinary", "endpoint"}
    return loaded


def direct_finite_replay(maximum_order: int = 7) -> dict:
    """Fresh literal g3 replay using the frozen canonical classifier."""
    counts: Counter[str] = Counter()
    negative: Counter[str] = Counter()
    minima: dict[str, int] = {}
    orders = defaultdict(lambda: {"cells": 0, "minimum": None, "negative": 0})

    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= maximum_order and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u, v in itertools.combinations(graph.nodes(), 2):
            cell = deepest_eligible_support(graph, u, v)
            if cell is None:
                continue
            mode = classify_deepest_support(graph, u, v, cell)["mode"]
            assert mode in MODE_COVERAGE
            base = graph.copy()
            base.remove_nodes_from(cell["bundle"])
            values = [gamma(base, cell["support"], u, v, number) for number in range(4)]
            g3 = int(forward(values)[3])

            counts[mode] += 1
            negative[mode] += int(g3 < 0)
            minima[mode] = g3 if mode not in minima else min(minima[mode], g3)
            row = orders[len(graph)]
            row["cells"] += 1
            row["minimum"] = g3 if row["minimum"] is None else min(row["minimum"], g3)
            row["negative"] += int(g3 < 0)

    assert dict(counts) == EXPECTED_COUNTS
    assert minima == EXPECTED_MINIMA
    assert sum(counts.values()) == 962
    assert not any(negative.values())
    return {
        "role": "finite replay only; the all-order conclusion comes from the pinned symbolic certificates",
        "atlas_scope": "all canonical deepest bundle cells in every unlabeled forest of orders 2 through 7",
        "total_bundle_cells": sum(counts.values()),
        "mode_counts": dict(sorted(counts.items())),
        "mode_minima": dict(sorted(minima.items())),
        "mode_negative_counts": dict(sorted(negative.items())),
        "order_summary": {str(order): row for order, row in sorted(orders.items())},
    }


def main() -> None:
    loaded = load_dependencies()
    replay = direct_finite_replay()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest-realizable canonical deepest-support rank-five whole-bundle cell, "
            "the binomial coefficient g3 is nonnegative."
        ),
        "scope": (
            "Rank-five whole-bundle coefficient g3 across the five established canonical modes "
            "only; this does not prove g1 or g2, an all-N5 induction, or Problem 993."
        ),
        "structural_exhaustion": {
            "classifier": CLASSIFIER,
            "canonical_modes": sorted(MODE_COVERAGE),
            "coverage_is_exact": set(MODES) == set(MODE_COVERAGE),
        },
        "mode_coverage": {
            mode: {
                "certificate": certificate,
                "marker": DEPENDENCIES[certificate]["marker"],
                "report": DEPENDENCIES[certificate]["report"],
            }
            for mode, certificate in sorted(MODE_COVERAGE.items())
        },
        "exact_configuration": {
            "generic_raw_g3_matches_degree_eight_bundle_polynomial": loaded["configuration"][
                "generic_raw_exact_match"
            ],
            "raw_term_count": loaded["configuration"]["raw_term_count"],
            "configuration_marker": loaded["configuration"]["marker"],
            "high_motif_marker": loaded["high_motif"]["marker"],
        },
        "certificate_summary": {
            "root_and_singleton_endpoint": "all n>=2",
            "singleton_ordinary": "exact finite n=3..12 plus exact Bernstein tail n>=13",
            "internal_spine": (
                "exact finite n=2..7, fixed-order Bernstein n=8..15, and exact tail n>=16; "
                "ordinary and endpoint collision scopes both included"
            ),
        },
        "direct_finite_replay": replay,
        "dependencies": {
            name: {
                "source": spec["source"],
                "source_sha256": spec["source_sha256"],
                "report": spec["report"],
                "report_sha256": spec["report_sha256"],
                "marker": spec["marker"],
            }
            for name, spec in DEPENDENCIES.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "modes": sorted(MODE_COVERAGE),
        "finite_total": replay["total_bundle_cells"],
        "finite_minima": replay["mode_minima"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
