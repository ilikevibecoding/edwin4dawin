#!/usr/bin/env python3
"""Complete small-order census for the one-sided adjacent deficit face.

For each unlabeled forest A and every set containing at most one vertex from
each component, set B=A-S and C=A.  The source records S(A,B,A), the face
reserve S(A,A,A), and the exact correction T(A,A-B).  This is finite evidence
and a structural diagnostic only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from prove_iso_compact_ordinary_r5_alpha4_root import polynomial_table
from prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
    s_face_value,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_one_sided_deficit_finite_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_ONE_SIDED_DEFICIT_FINITE_G1_BERNSTEIN"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def t_value(a, x):
    return (
        (2*at(a,2)-at(a,3)-10*at(a,4)-6*at(a,5))*at(x,1)
        +2*(at(a,1)+5*at(a,2)+4*at(a,3)-at(a,4))*at(x,2)
        +(-at(a,1)+8*at(a,2)+8*at(a,3))*at(x,3)
        -2*(5*at(a,1)+at(a,2))*at(x,4)
        -6*at(a,1)*at(x,5)
    )


def update(bucket, value, witness):
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    bucket["zero"] += int(value == 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}
    if bucket["maximum"] is None or value > bucket["maximum"]["value"]:
        bucket["maximum"] = {"value": value, **witness}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=12)
    args = parser.parse_args()
    report = {
        "marker": MARKER,
        "orders": [0, args.max_order],
        "forests": 0,
        "deletion_cells": 0,
        "S_one_sided": {"checks": 0, "negative": 0, "zero": 0, "minimum": None, "maximum": None},
        "T_correction": {"checks": 0, "negative": 0, "zero": 0, "minimum": None, "maximum": None},
        "rows": {},
    }
    digest = hashlib.sha256()
    for order in range(args.max_order + 1):
        forest_count = 0
        cells = 0
        local_minimum = None
        local_witness = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            forest_count += 1
            table = polynomial_table(graph)
            full = table[0]
            face = s_face_value(full)
            components = [tuple(component) for component in nx.connected_components(graph)]
            choices = [(-1, *component) for component in components]
            for selected in itertools.product(*choices):
                deleted = tuple(vertex for vertex in selected if vertex >= 0)
                mask = sum(1 << vertex for vertex in deleted)
                b = table[mask]
                length = max(len(full), len(b))
                x = tuple(
                    (full[index] if index < len(full) else 0)
                    - (b[index] if index < len(b) else 0)
                    for index in range(length)
                )
                correction = t_value(full, x)
                value = face - correction
                assert value >= 0, (order, forest_index, deleted, value)
                witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "deleted_vertices": deleted,
                    "A": full,
                    "B": b,
                    "S_AAA": face,
                }
                update(report["S_one_sided"], value, witness)
                update(report["T_correction"], correction, witness)
                if local_minimum is None or value < local_minimum:
                    local_minimum = value
                    local_witness = witness
                digest.update(f"{order}|{forest_index}|{deleted}|{value}|{correction};".encode())
                cells += 1
        assert forest_count == KNOWN_FOREST_COUNTS[order]
        report["forests"] += forest_count
        report["deletion_cells"] += cells
        report["rows"][str(order)] = {
            "unlabeled_forests": forest_count,
            "deletion_cells": cells,
            "minimum_S": local_minimum,
            "witness": local_witness,
        }
        print(json.dumps({"order": order, **report["rows"][str(order)]}, sort_keys=True), flush=True)
    report["ordered_stream_sha256"] = digest.hexdigest().upper()
    report["scope"] = "Complete finite diagnostic only; no all-order one-sided theorem."
    report["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "forests": report["forests"],
        "deletion_cells": report["deletion_cells"],
        "S_minimum": report["S_one_sided"]["minimum"],
        "T_minimum": report["T_correction"]["minimum"],
        "T_maximum": report["T_correction"]["maximum"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
