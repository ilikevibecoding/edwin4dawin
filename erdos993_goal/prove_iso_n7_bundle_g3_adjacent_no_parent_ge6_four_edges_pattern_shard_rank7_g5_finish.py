#!/usr/bin/env python3
"""Restartable exact one-pattern shard for the remaining four-edge cores."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

import prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core_shard_rank7_g5_finish as core_shard


HERE = Path(__file__).resolve().parent
CORE_SHARD_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core_shard_rank7_g5_finish.py"
CORE_SHARD_SOURCE_SHA = "6B26B69B2ED5589B5845FAACA3E29AE3A89990B55640FC1F977DEEA274BB01FE"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_PATTERN_SHARD_RANK7_G5_FINISH"
EXPECTED_PATTERN_COUNTS = {4: 15, 5: 15, 6: 30, 7: 15}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-index", type=int, choices=range(4, 8), required=True)
    parser.add_argument("--pattern-index", type=int, required=True)
    args = parser.parse_args()
    assert sha256(CORE_SHARD_SOURCE) == CORE_SHARD_SOURCE_SHA
    for path, digest in (
        (core_shard.INPUT, core_shard.INPUT_SHA),
        (core_shard.FOREST_SOURCE, core_shard.FOREST_SOURCE_SHA),
        (core_shard.ONE_EDGE_SOURCE, core_shard.ONE_EDGE_SOURCE_SHA),
        (core_shard.THREE_EDGE_SOURCE, core_shard.THREE_EDGE_SOURCE_SHA),
    ):
        assert sha256(path) == digest, path.name
    order, encoding, graph = core_shard.four_edge_cores()[args.core_index]
    patterns = sorted(core_shard.rooted_patterns(graph).items(), key=lambda item: str(item[0]))
    assert len(patterns) == EXPECTED_PATTERN_COUNTS[args.core_index]
    assert 0 <= args.pattern_index < len(patterns)
    signature, witness = patterns[args.pattern_index]
    upstream = json.loads(core_shard.INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail, unrelated_isolates, split = sp.symbols(
        "root_tail unrelated_isolates split", nonnegative=True
    )
    roots = root_tail + 6
    core_rows = core_shard.independent_counts(graph)
    x_count, y_count, x_deleted_rows, y_deleted_rows = signature
    rooted_core_count = x_count + y_count
    b_value = y_count + (roots / 2 - y_count) * split
    a_value = roots - b_value
    base_isolates = roots - rooted_core_count + unrelated_isolates
    m_value = order + base_isolates
    w_rows = {k: core_shard.convolved_row(core_rows, base_isolates, k) for k in W}
    avoid_y_isolates = sp.expand(base_isolates - (b_value - y_count))
    avoid_x_isolates = sp.expand(base_isolates - (a_value - x_count))
    p_rows = {
        k: w_rows[k] - core_shard.convolved_row(y_deleted_rows, avoid_y_isolates, k)
        for k in P
    }
    q_rows = {
        k: w_rows[k] - core_shard.convolved_row(x_deleted_rows, avoid_x_isolates, k)
        for k in Q
    }
    specialized = sp.cancel(identity.subs({
        m: m_value,
        a: a_value,
        b: b_value,
        **{W[k]: w_rows[k] for k in W},
        **{P[k]: p_rows[k] for k in P},
        **{Q[k]: q_rows[k] for k in Q},
    }, simultaneous=True))
    certificate = core_shard.bernstein_tail_certificate(
        specialized, split, (root_tail, unrelated_isolates)
    )
    assert certificate["negative_tail_scalar_coefficients"] == 0, certificate["first_negative"]
    output = HERE / (
        "iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_"
        f"core{args.core_index}_pattern{args.pattern_index:02d}_exact_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "core_index": args.core_index,
        "pattern_index": args.pattern_index,
        "core_order": order,
        "canonical_edges": encoding,
        "total_patterns_in_core": len(patterns),
        "root_pattern_signature": {
            "x_count": x_count,
            "y_count": y_count,
            "witness": witness,
        },
        "parameterization": {"m": str(m_value), "a": str(a_value), "b": str(b_value)},
        "certificate": certificate,
        "coverage_gap_within_stated_pattern": None,
        "scope": "One exact root-pattern class in one isolate-free four-edge core, all >=6 attachment distributions compatible with the class, and arbitrary unrelated isolates.",
        "dependencies_sha256": {
            CORE_SHARD_SOURCE.name: CORE_SHARD_SOURCE_SHA,
            core_shard.INPUT.name: core_shard.INPUT_SHA,
            core_shard.FOREST_SOURCE.name: core_shard.FOREST_SOURCE_SHA,
            core_shard.ONE_EDGE_SOURCE.name: core_shard.ONE_EDGE_SOURCE_SHA,
            core_shard.THREE_EDGE_SOURCE.name: core_shard.THREE_EDGE_SOURCE_SHA,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_index": args.core_index,
        "pattern_index": args.pattern_index,
        "total_patterns_in_core": len(patterns),
        "minimum_coefficient": certificate["minimum_tail_scalar_coefficient"],
        "coverage_gap_within_stated_pattern": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
