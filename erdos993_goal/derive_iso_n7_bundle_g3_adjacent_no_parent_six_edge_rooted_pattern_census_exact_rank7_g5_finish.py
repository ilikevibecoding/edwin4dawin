#!/usr/bin/env python3
"""Dependency-pinned exact rooted-pattern census for all six-edge cores."""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

import networkx as nx

from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_three_edges_all_distributions_rank7_g5_finish import rooted_patterns


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_six_edge_rooted_pattern_"
    "census_exact_rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_"
    "SIX_EDGE_ROOTED_PATTERN_CENSUS_RANK7_G5_FINISH"
)
CLASSIFIER_SOURCE = HERE / (
    "derive_iso_n7_bundle_g3_adjacent_no_parent_"
    "six_edge_core_classifier_exact_rank7_g5_finish.py"
)
CLASSIFIER_REPORT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_six_edge_core_"
    "classifier_exact_rank7_g5_finish_20260831.json"
)
ROOTED_SOURCE = HERE / (
    "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_"
    "three_edges_all_distributions_rank7_g5_finish.py"
)
EXPECTED = {
    CLASSIFIER_SOURCE.name: (
        "936DD8D10D1926E648EEEE9D736F9102EFA7F60B0F3D84DFDB04ACAC454018DE"
    ),
    CLASSIFIER_REPORT.name: (
        "21CF5ACEA04E0905230EA4B15A790E0B6775911EF7A038E68CF7893DABD23FD7"
    ),
    ROOTED_SOURCE.name: (
        "D0BAF4FC3BE88662DABB30D0759759FB07EF70749642D847ADC340C57407EBD3"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_pattern_hash(patterns) -> str:
    stream = []
    for signature, witness in sorted(patterns.items(), key=lambda item: str(item[0])):
        x_count, y_count, x_rows, y_rows = signature
        stream.append(
            {
                "x_count": x_count,
                "y_count": y_count,
                "x_deleted_independent_rows": x_rows,
                "y_deleted_independent_rows": y_rows,
                "equivalent_raw_patterns": witness["equivalent_raw_patterns"],
            }
        )
    raw = json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest().upper()


def main() -> None:
    for path in (CLASSIFIER_SOURCE, CLASSIFIER_REPORT, ROOTED_SOURCE):
        assert sha256(path) == EXPECTED[path.name], path.name
    classifier = json.loads(CLASSIFIER_REPORT.read_text(encoding="utf-8"))
    assert classifier["coverage_gap_within_six_edge_core_classifier"] is None
    assert classifier["exact_isomorphism_class_count"] == 34
    cores = []
    total_raw = 0
    total_deduplicated = 0
    partition_totals = defaultdict(
        lambda: {
            "cores": 0,
            "raw_root_patterns": 0,
            "deduplicated_root_patterns": 0,
        }
    )
    graphs = []
    for expected_index, core in enumerate(classifier["isomorphism_classes"]):
        assert core["core_index"] == expected_index
        graph = nx.Graph()
        graph.add_nodes_from(range(core["order"]))
        graph.add_edges_from(tuple(tuple(edge) for edge in core["representative_edges"]))
        assert graph.number_of_edges() == 6
        assert nx.is_forest(graph)
        assert all(graph.degree(vertex) > 0 for vertex in graph)
        assert nx.number_connected_components(graph) == core["components"]
        patterns = rooted_patterns(graph)
        raw_formula = math.prod(
            1 + 2 * len(component) for component in nx.connected_components(graph)
        )
        raw_from_dedup = sum(
            witness["equivalent_raw_patterns"] for witness in patterns.values()
        )
        assert raw_formula == raw_from_dedup
        deduplicated = len(patterns)
        distribution_counts = defaultdict(lambda: {"deduplicated": 0, "raw": 0})
        for signature, witness in patterns.items():
            x_count, y_count, _x_rows, _y_rows = signature
            key = f"x{x_count}_y{y_count}"
            distribution_counts[key]["deduplicated"] += 1
            distribution_counts[key]["raw"] += witness["equivalent_raw_patterns"]
        partition_key = "+".join(map(str, core["component_edge_partition"]))
        partition_totals[partition_key]["cores"] += 1
        partition_totals[partition_key]["raw_root_patterns"] += raw_formula
        partition_totals[partition_key]["deduplicated_root_patterns"] += deduplicated
        total_raw += raw_formula
        total_deduplicated += deduplicated
        cores.append(
            {
                "core_index": expected_index,
                "order": core["order"],
                "components": core["components"],
                "component_edge_partition": core["component_edge_partition"],
                "component_type_descriptor": core["component_type_descriptor"],
                "representative_edges": core["representative_edges"],
                "raw_root_patterns": raw_formula,
                "deduplicated_deleted_row_patterns": deduplicated,
                "deduplication_ratio": f"{deduplicated}/{raw_formula}",
                "root_count_distribution": dict(sorted(distribution_counts.items())),
                "ordered_deleted_row_signature_sha256": ordered_pattern_hash(patterns),
            }
        )
        graphs.append(graph)
    assert all(
        not nx.is_isomorphic(graphs[left], graphs[right])
        for left in range(len(graphs))
        for right in range(left + 1, len(graphs))
    )
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "method": (
            "For every dependency-pinned six-edge core, assign each connected "
            "component either no root or exactly one X/Y root, then deduplicate "
            "only by (X count, Y count, exact X-deleted independent rows, exact "
            "Y-deleted independent rows)."
        ),
        "cores": cores,
        "partition_totals": dict(sorted(partition_totals.items())),
        "total_core_count": len(cores),
        "total_raw_root_patterns": total_raw,
        "total_exact_deleted_row_certificate_classes": total_deduplicated,
        "coverage_gap_within_six_edge_rooted_pattern_census": None,
        "scope_guard": (
            "This is an exhaustive classifier/census only. It does not assert "
            "positivity of any G3 certificate."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "total_core_count": len(cores),
                "total_raw_root_patterns": total_raw,
                "total_exact_deleted_row_certificate_classes": total_deduplicated,
                "per_core_counts": [
                    [
                        core["core_index"],
                        core["raw_root_patterns"],
                        core["deduplicated_deleted_row_patterns"],
                    ]
                    for core in cores
                ],
                "coverage_gap": None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
