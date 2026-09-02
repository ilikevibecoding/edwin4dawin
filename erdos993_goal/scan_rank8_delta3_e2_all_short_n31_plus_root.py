#!/usr/bin/env python3
"""Exact literal scan of every all-short rooted e=2 Delta3 cell at n>=31."""

from __future__ import annotations

import hashlib
import json
import time
from collections import Counter
from pathlib import Path

from scan_rank8_delta01_e2_all_short_n31_plus_agent import build_graph, cells
from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta3_e2_all_short_n31_plus_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "scan_rank8_delta01_e2_all_short_n31_plus_agent.py":
        "CA0221222CA95ACFF63A80D34A924E9C58FF8B04BCB5CF1618874EFBEE4B1D9A",
    "scan_rank8_delta23_e1_subdivided_claws_n23_n28.py":
        "0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def canonical_line(root_type, key, order, value):
    return json.dumps([root_type, key, order, value], separators=(",", ":"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    partition = json.loads(
        (ROOT / "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    expected_root_counts = {
        name: partition["roots"][name]["all_short_target_n31_plus_points"]
        for name in ("branch", "pendant", "bridge_internal")
    }

    started = time.perf_counter()
    evaluators = {order: evaluator(3, order)[0] for order in range(31, 40)}
    rows = {
        name: {
            "cells": 0,
            "orders": Counter(),
            "negative": 0,
            "zero": 0,
            "positive": 0,
            "minimum": None,
            "witness": None,
        }
        for name in expected_root_counts
    }
    lines = []
    for root_type, key, lengths, descriptor, order in cells():
        adjacency, descriptors = build_graph(lengths)
        vertex = descriptors[descriptor]
        core = forest_poly(adjacency)
        deleted = forest_poly(adjacency, vertex)
        inputs = (*core[3:9], deleted[6], deleted[7])
        value = evaluators[order](inputs)
        row = rows[root_type]
        row["cells"] += 1
        row["orders"][order] += 1
        label = "negative" if value < 0 else "zero" if value == 0 else "positive"
        row[label] += 1
        if row["minimum"] is None or value < row["minimum"]:
            row["minimum"] = value
            row["witness"] = {
                "key": key,
                "lengths": lengths,
                "root_descriptor": descriptor,
                "order": order,
                "value": value,
            }
        lines.append(canonical_line(root_type, key, order, value))

    assert {name: row["cells"] for name, row in rows.items()} == expected_root_counts
    for row in rows.values():
        assert row["negative"] == row["zero"] == 0
        assert row["positive"] == row["cells"] and row["minimum"] > 0
        row["orders"] = {str(key): value for key, value in sorted(row["orders"].items())}
    stream = hashlib.sha256(
        ("\n".join(sorted(lines)) + "\n").encode()
    ).hexdigest().upper()

    payload = {
        "schema": "rank8-delta3-e2-all-short-n31-plus-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS",
        "theorem": "For every rooted all-short e=2 double claw at every possible order n>=31, Delta3>0.",
        "state_scope": "arms 1..6; direct bridge 1..7; root-split near/tail or bridge gaps 0..6",
        "roots": rows,
        "totals": {"cells": sum(row["cells"] for row in rows.values())},
        "literal_value_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "All-short n>=31 e=2 Delta3 only; mixed rays and the all-long sector remain separately gated.",
    }
    assert payload["totals"] == {"cells": 2412}
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", payload["totals"])
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
