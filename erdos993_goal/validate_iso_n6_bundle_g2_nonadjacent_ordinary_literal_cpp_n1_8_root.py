#!/usr/bin/env python3
"""Cross-validate the optimized C++ census against the frozen Python N=1..8 census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

import networkx as nx

from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
EXECUTABLE = HERE / "census_iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_root.exe"
REFERENCE = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_actual_n1_8_exact_root_20260831.json"
REFERENCE_SHA256 = "15AEB1C663087F05F63AB19B40EE6B1ACD10C00C75E926CB53A16C345AD3324F"
DATA = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_"
    "n3_10_validation_root_20260831.txt"
)
CPP_REPORT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_literal_cpp_"
    "n1_8_validation_raw_root_20260831.json"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_literal_cpp_"
    "n1_8_cross_validation_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_LITERAL_"
    "CPP_AGAINST_PYTHON_N1_8_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(REFERENCE) == REFERENCE_SHA256
    assert EXECUTABLE.exists()
    lines = ["# order graph6\n"]
    counts = {}
    for order in range(3, 11):
        count = 0
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = nx.to_graph6_bytes(graph, header=False).decode().strip()
            lines.append(f"{order} {code}\n")
            count += 1
        counts[str(order)] = count
    DATA.write_text("".join(lines), encoding="ascii", newline="\n")

    completed = subprocess.run(
        [str(EXECUTABLE), str(DATA), str(CPP_REPORT)],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError({
            "returncode": completed.returncode,
            "stdout": completed.stdout[-2000:],
            "stderr": completed.stderr[-2000:],
        })
    cpp = json.loads(CPP_REPORT.read_text(encoding="utf-8"))
    reference = json.loads(REFERENCE.read_text(encoding="utf-8"))
    assert cpp["aggregate"]["negative"] == 0
    assert cpp["aggregate"]["triples"] == reference["aggregate"][
        "unordered_nonedge_parent_triples"
    ]

    comparisons = {}
    for common_order in range(1, 9):
        rows = [
            cpp["rows"].get(f"N{common_order}_common{geometry}")
            for geometry in (0, 1)
        ]
        rows = [row for row in rows if row is not None]
        expected = reference["per_common_order"][str(common_order)]
        actual = {
            "triples": sum(row["triples"] for row in rows),
            "negative": sum(row["negative"] for row in rows),
            "negative_correction": sum(
                row["negative_correction"] for row in rows
            ),
            "minimum": min(row["minimum"] for row in rows),
            "minimum_correction": min(
                row["minimum_correction"] for row in rows
            ),
        }
        target = {
            "triples": expected["unordered_nonedge_parent_triples"],
            "negative": expected["negative_ordinary_g2"],
            "negative_correction": expected["negative_transfer_corrections"],
            "minimum": expected["minimum_ordinary_g2"],
            "minimum_correction": expected["minimum_correction"],
        }
        assert actual == target, (common_order, actual, target)
        assert counts[str(common_order + 2)] == expected["unlabeled_forests"]
        comparisons[str(common_order)] = actual

    report = {
        "marker": MARKER,
        "status": "PASS byte-exact aggregate cross-validation on every N=1..8 order",
        "reference": {
            "file": REFERENCE.name,
            "sha256": REFERENCE_SHA256,
            "implementation": "Python NetworkX/SymPy literal evaluator",
        },
        "candidate": {
            "executable": EXECUTABLE.name,
            "executable_sha256": sha256(EXECUTABLE),
            "raw_report": CPP_REPORT.name,
            "raw_report_sha256": sha256(CPP_REPORT),
            "implementation": "optimized C++ bitmask independence-polynomial evaluator",
        },
        "coverage": (
            "all unlabeled forests of marked orders 3..10, every unordered "
            "nonedge uv, and every p distinct from u,v"
        ),
        "matched_fields_per_order": [
            "forest count", "triple count", "negative total", "negative correction total",
            "minimum ordinary g2", "minimum correction"
        ],
        "orders": comparisons,
        "aggregate": {
            "triples": cpp["aggregate"]["triples"],
            "negative": cpp["aggregate"]["negative"],
            "global_minimum": cpp["aggregate"]["global_minimum"],
            "ordered_record_fnv1a64": cpp["aggregate"]["ordered_record_fnv1a64"],
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders_matched": len(comparisons),
        "triples": report["aggregate"]["triples"],
        "global_minimum": report["aggregate"]["global_minimum"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
