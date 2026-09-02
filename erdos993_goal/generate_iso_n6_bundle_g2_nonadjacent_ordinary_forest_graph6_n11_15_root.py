#!/usr/bin/env python3
"""Generate the deterministic unlabeled-forest graph6 stream for N=9..13."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
DATA = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_"
    "n11_15_root_20260831.txt"
)
REPORT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_"
    "n11_15_manifest_root_20260831.json"
)
MARKER = (
    "GENERATED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "FOREST_GRAPH6_N11_15_ROOT"
)


def main() -> None:
    lines = ["# order graph6\n"]
    counts = {}
    stream = hashlib.sha256()
    total = 0
    for order in range(11, 16):
        count = 0
        for graph0 in forest_graphs(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            code = nx.to_graph6_bytes(graph, header=False).decode().strip()
            line = f"{order} {code}\n"
            lines.append(line)
            stream.update(line.encode())
            count += 1
        counts[str(order)] = count
        total += count
        print(f"ENUMERATED order={order} forests={count}", flush=True)

    raw_data = "".join(lines)
    DATA.write_text(raw_data, encoding="ascii", newline="\n")
    report = {
        "marker": MARKER,
        "coverage": (
            "every unlabeled forest of marked orders 11..15 generated as a "
            "multiset of NetworkX nonisomorphic tree components"
        ),
        "orders": counts,
        "total_forests": total,
        "ordered_record_sha256": stream.hexdigest().upper(),
        "data_file": DATA.name,
        "data_sha256": hashlib.sha256(raw_data.encode()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw_report = json.dumps(report, indent=2, sort_keys=True) + "\n"
    REPORT.write_text(raw_report, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_forests": total,
        "orders": counts,
        "data_sha256": report["data_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw_report.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
