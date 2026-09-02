#!/usr/bin/env python3
"""Fail-closed union theorem for rank-six g1 when W=C-{u,v} is edgeless."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, rows

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_edgeless_w_actual_d_assembled_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_EDGELESS_W_ACTUAL_D_G1_NONADJACENT"

DEPENDENCIES = {
    "adjacent": {
        "source": "prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent.py",
        "source_sha256": "78A1E3442813835BE8B8C9E55C4BB915377316784F44AB20CE29E0F9D308DE38",
        "report": "iso_n6_bundle_g1_adjacent_double_star_actual_d_exact_g1_nonadjacent_20260831.json",
        "report_sha256": "729F03F1035092A9BCE0DDDED169A987D2AF926E2D72A5C6D5588B109ED087F1",
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_ACTUAL_D_G1_NONADJACENT",
        "cases": 4,
        "rows": 87808,
        "scalars": 790272,
    },
    "nonadjacent_common0": {
        "source": "prove_iso_n6_bundle_g1_nonadjacent_common0_double_star_actual_d_g1_nonadjacent.py",
        "source_sha256": "E5A87EB0A8ABC8D0C595A0EAE1DF96371A4F82B014A3B3D91BF13BBD75173957",
        "report": "iso_n6_bundle_g1_nonadjacent_common0_double_star_actual_d_exact_g1_nonadjacent_20260831.json",
        "report_sha256": "764596B6046E82E5C724653535373D6FBF165ECB564B27DB2B587394FC1B9C91",
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON0_DOUBLE_STAR_ACTUAL_D_G1_NONADJACENT",
        "cases": 3,
        "rows": 65856,
        "scalars": 592704,
    },
    "nonadjacent_common1": {
        "source": "prove_iso_n6_bundle_g1_nonadjacent_common1_double_star_actual_d_g1_nonadjacent.py",
        "source_sha256": "5F2B88355C7F5F56DB413F6544D76FA9B185683EC084EFA0E1FF128286E5DBF1",
        "report": "iso_n6_bundle_g1_nonadjacent_common1_double_star_actual_d_exact_g1_nonadjacent_20260831.json",
        "report_sha256": "7722DF69C29639281340C6900A72AB99D22F23BB55DF2AE72CAEFFC9D2F20311",
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON1_DOUBLE_STAR_ACTUAL_D_G1_NONADJACENT",
        "cases": 6,
        "rows": 131712,
        "scalars": 1185408,
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    reports = {}
    for name, spec in DEPENDENCIES.items():
        source = HERE / spec["source"]
        report_path = HERE / spec["report"]
        assert source.is_file() and report_path.is_file(), name
        assert sha256(source) == spec["source_sha256"], name
        assert sha256(report_path) == spec["report_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report["source_sha256"] == spec["source_sha256"], name
        assert report["claim"] == "rank-six bundle g1 is nonnegative", name
        assert report["bernstein_rows"] == spec["rows"], name
        assert report["tail_power_coefficients"] == spec["scalars"], name
        assert len(report["cases"]) == spec["cases"], name
        assert report["minimum_tail_power_coefficient"] == "377/47040", name
        assert all(case["exact_power_inversion"] is True for case in report["cases"]), name
        reports[name] = report

    assert {(case["keep_u"], case["keep_v"]) for case in reports["adjacent"]["cases"]} == {
        (0, 0), (0, 1), (1, 0), (1, 1)
    }
    assert reports["nonadjacent_common0"]["calculated_mark_retention_cases"] == [
        [0, 0], [0, 1], [1, 1]
    ]
    assert reports["nonadjacent_common0"]["inferred_mark_retention_case"] == [1, 0]
    assert reports["nonadjacent_common0"]["mark_swap_identity_verified"] is True
    assert reports["nonadjacent_common1"]["calculated_mark_retention_cases"] == [
        [0, 0], [0, 1], [1, 1]
    ]
    assert reports["nonadjacent_common1"]["inferred_mark_retention_case"] == [1, 0]
    assert reports["nonadjacent_common1"]["common_neighbour_retention_cases"] == [0, 1]
    assert reports["nonadjacent_common1"]["mark_swap_identity_verified"] is True

    evaluate = evaluator()
    finite_stream = hashlib.sha256()
    finite_cells = 0
    finite_minimum = None
    finite_witness = None
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            wnodes = set(nodes) - {u, v}
            if graph.subgraph(wnodes).number_of_edges():
                continue
            crows = rows(graph, u, v)
            for mask in range(1 << len(nodes)):
                retained = [node for node in nodes if mask & (1 << node)]
                drows = rows(graph.subgraph(retained).copy(), u, v)
                value = evaluate(crows, drows)
                assert value >= 0, (len(nodes), code, u, v, mask, value)
                finite_stream.update(f"{len(nodes)}|{code}|{u}|{v}|{mask}|{value};".encode())
                finite_cells += 1
                if finite_minimum is None or value < finite_minimum:
                    finite_minimum = value
                    finite_witness = [len(nodes), code, u, v, mask, value]

    report = {
        "marker": MARKER,
        "theorem": (
            "For every marked forest C of order n>=2 whose induced unmarked graph "
            "W=C-{u,v} is edgeless, and every actual induced marked minor D of C, "
            "the rank-six bundle coefficient g1(C,D) is nonnegative."
        ),
        "coverage": {
            "adjacent_marks": (
                "No unmarked vertex can meet both marks (triangle), hence exclusive "
                "marked arms plus isolates: the adjacent dependency."
            ),
            "nonadjacent_marks": (
                "Every unmarked vertex is an exclusive u-neighbour, exclusive v-neighbour, "
                "common neighbour, or isolate.  A forest has at most one common neighbour; "
                "the common0 and common1 dependencies exhaust the two possibilities."
            ),
            "actual_D": (
                "The dependencies exhaust all orbit-retention fractions, both mark bits, "
                "and, when present, the common-neighbour retention bit."
            ),
            "pairwise_disjoint": True,
            "exhaustive": True,
        },
        "certificate_totals": {
            "explicit_cases": sum(spec["cases"] for spec in DEPENDENCIES.values()),
            "bernstein_rows": sum(spec["rows"] for spec in DEPENDENCIES.values()),
            "tail_power_coefficients": sum(spec["scalars"] for spec in DEPENDENCIES.values()),
            "minimum_tail_power_coefficient": "377/47040",
            "all_exact_power_inversions": True,
        },
        "finite_certificate": {
            "orders": [2, 7],
            "actual_induced_D_cells": finite_cells,
            "minimum": finite_minimum,
            "minimum_witness": finite_witness,
            "ordered_stream_sha256": finite_stream.hexdigest().upper(),
        },
        "dependencies": DEPENDENCIES,
        "scope_guard": (
            "This theorem covers exactly the edgeless-W family.  It does not prove g1 "
            "when W contains an edge, the other rank-six bundle coefficients, N6 for all "
            "marked forests, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(raw)
    print(json.dumps({
        "marker": report["marker"],
        "certificate_totals": report["certificate_totals"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
