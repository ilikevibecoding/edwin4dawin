#!/usr/bin/env python3
"""Exact finite census for the adjacent two-deficit interaction.

A deletion state chooses at most one root in each component of A and assigns
that root to either the B-deletion or C-deletion side.  Thus the two sides are
disjoint componentwise, exactly as for the components behind an adjacent
marked edge.  The default full run covers every forest through order twelve,
writes a deterministic replay report, and asserts the exact expected totals.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx

from prove_iso_compact_ordinary_r5_alpha4_root import polynomial_table
from prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
    s_face_value,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE/"iso_n5_g1_adjacent_two_deficit_finite_census_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_FINITE_ISO_N5_G1_ADJACENT_TWO_DEFICIT_G1_BERNSTEIN"
EXPECTED_CELLS = {
    "0": 1, "1": 3, "2": 14, "3": 49, "4": 190, "5": 638,
    "6": 2256, "7": 7399, "8": 24772, "9": 79847,
    "10": 258809, "11": 821086, "12": 2608953,
}


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def sub(left, right):
    length = max(len(left), len(right))
    return tuple(at(left, index)-at(right, index) for index in range(length))


def t_value(a, x):
    return (
        (2*at(a,2)-at(a,3)-10*at(a,4)-6*at(a,5))*at(x,1)
        +2*(at(a,1)+5*at(a,2)+4*at(a,3)-at(a,4))*at(x,2)
        +(-at(a,1)+8*at(a,2)+8*at(a,3))*at(x,3)
        -2*(5*at(a,1)+at(a,2))*at(x,4)-6*at(a,1)*at(x,5)
    )


def k_value(x, y):
    return (
        2*at(x,1)*at(y,2)-3*at(x,1)*at(y,3)-6*at(x,1)*at(y,4)
        +2*at(x,2)*at(y,1)+6*at(x,2)*at(y,2)+4*at(x,2)*at(y,3)
        -3*at(x,3)*at(y,1)+4*at(x,3)*at(y,2)-6*at(x,4)*at(y,1)
    )


def edgeless_interaction(order, deficit_x, deficit_y):
    a = tuple(math.comb(order, rank) if order >= rank else 0 for rank in range(7))
    x = tuple(
        at(a, rank)-(math.comb(order-deficit_x, rank) if order-deficit_x >= rank else 0)
        for rank in range(7)
    )
    y = tuple(
        at(a, rank)-(math.comb(order-deficit_y, rank) if order-deficit_y >= rank else 0)
        for rank in range(7)
    )
    w = tuple(
        at(a, rank)-(math.comb(order-deficit_x-deficit_y, rank) if order-deficit_x-deficit_y >= rank else 0)
        for rank in range(7)
    )
    z = tuple(at(x, rank)+at(y, rank)-at(w, rank) for rank in range(7))
    return k_value(x, y)-t_value(a, z)


def update(bucket, value, witness):
    bucket["checks"] += 1
    bucket["negative"] += int(value < 0)
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=10)
    args = parser.parse_args()
    stats = {
        key: {"checks": 0, "negative": 0, "minimum": None}
        for key in (
            "KXY", "face_minus_Tsum", "S", "one_x", "one_y",
            "union_one_sided", "interaction_K_minus_TZ",
            "interaction_minus_edgeless",
        )
    }
    rows = {}
    digest = hashlib.sha256()
    for order in range(args.max_order+1):
        cells = 0
        local_min = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            table = polynomial_table(graph)
            a = table[0]
            face = s_face_value(a)
            components = [tuple(component) for component in nx.connected_components(graph)]
            # choice (side,vertex): 0=unhit, 1=X/B deletion, 2=Y/C deletion
            choices = [[(0, -1), *[(1, v) for v in component], *[(2, v) for v in component]] for component in components]
            for assignment in itertools.product(*choices):
                mask_x = sum(1 << v for side, v in assignment if side == 1)
                mask_y = sum(1 << v for side, v in assignment if side == 2)
                x = sub(a, table[mask_x])
                y = sub(a, table[mask_y])
                w = sub(a, table[mask_x | mask_y])
                z = tuple(at(x, index)+at(y, index)-at(w, index) for index in range(max(len(x), len(y), len(w))))
                tx, ty = t_value(a, x), t_value(a, y)
                tw, tz = t_value(a, w), t_value(a, z)
                kxy = k_value(x, y)
                core = face-tx-ty
                value = core+kxy
                digest.update(
                    f"{order}|{forest_index}|{mask_x}|{mask_y}|{a}|{x}|{y}|{value};".encode()
                )
                witness = {
                    "order": order,
                    "forest_index": forest_index,
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                    "mask_x": mask_x,
                    "mask_y": mask_y,
                    "A": a,
                    "X": x,
                    "Y": y,
                    "Z": z,
                    "face": face,
                    "TX": tx,
                    "TY": ty,
                    "TW": tw,
                    "TZ": tz,
                    "KXY": kxy,
                }
                update(stats["KXY"], kxy, witness)
                update(stats["face_minus_Tsum"], core, witness)
                update(stats["S"], value, witness)
                update(stats["one_x"], face-tx, witness)
                update(stats["one_y"], face-ty, witness)
                update(stats["union_one_sided"], face-tw, witness)
                update(stats["interaction_K_minus_TZ"], kxy-tz, witness)
                update(
                    stats["interaction_minus_edgeless"],
                    kxy-tz-edgeless_interaction(order, at(x, 1), at(y, 1)),
                    witness,
                )
                if local_min is None or value < local_min:
                    local_min = value
                cells += 1
        rows[str(order)] = {"forests": KNOWN_FOREST_COUNTS[order], "cells": cells, "minimum_S": local_min}
        print(json.dumps({"order": order, **rows[str(order)]}, sort_keys=True), flush=True)
    full = args.max_order == 12
    if full:
        assert {order: row["cells"] for order,row in rows.items()} == EXPECTED_CELLS
        assert sum(row["cells"] for row in rows.values()) == 3_804_017
        assert stats["S"]["negative"] == 0
    report = {
        "marker": MARKER if full else "PROBE_EXACT_FINITE_ISO_N5_G1_ADJACENT_TWO_DEFICIT_G1_BERNSTEIN",
        "orders": [0,args.max_order],
        "forests": sum(row["forests"] for row in rows.values()),
        "deletion_states": sum(row["cells"] for row in rows.values()),
        "negative_S": stats["S"]["negative"],
        "minimum_S": stats["S"]["minimum"],
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "rows": rows,
        "diagnostics": stats,
        "enumeration": (
            "every unlabeled forest A; independently for each component choose no root, "
            "one X root, or one Y root"
        ),
        "scope": (
            "complete finite adjacent two-deficit census through order twelve; "
            "the all-order sign remains separate"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    if full:
        raw = json.dumps(report,indent=2,sort_keys=True)+"\n"
        OUTPUT.write_text(raw,encoding="utf-8")
        print(json.dumps({key:report[key] for key in (
            "marker","orders","forests","deletion_states","negative_S",
            "ordered_stream_sha256","scope",
        )},indent=2,sort_keys=True))
        print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
        print(MARKER)
    else:
        print(json.dumps(report,indent=2,sort_keys=True))


if __name__ == "__main__":
    main()
