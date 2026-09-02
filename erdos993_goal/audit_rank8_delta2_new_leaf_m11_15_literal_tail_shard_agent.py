#!/usr/bin/env python3
"""Independent one-order audit for Delta2 new-leaf |F|=11,...,15 shards."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
from collections import Counter
from pathlib import Path

import networkx as nx

import audit_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as base


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "prove_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent.py": "AA21F0AF4121715E64DA360C32AD995751943B05EBC032A576364C431400C68C",
    "audit_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "A81909B99E0CD09B6F0BF698972E18F226C0C858DEA88A11BD5091B749467BEE",
    "nauty2_8_9/geng.exe": "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}
TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741]


def sha256(path: Path) -> str:
    return hashlib.sha256(base.stable_bytes(path)).hexdigest().upper()


def build_records(max_order: int):
    records = []
    stream = hashlib.sha256()
    counts = [0]
    peak = base.gate()
    for order in range(1, max_order + 1):
        codes = base.geng_codes(order)
        counts.append(len(codes))
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jet, deletions = base.literal_graph_jets(graph)
            records.append(base.Record(order, code, jet, deletions))
            stream.update(f"order={order};".encode())
            stream.update(code)
            stream.update(b"\n")
        peak = max(peak, base.gate())
    assert counts == TREE_COUNTS[: max_order + 1]
    records.sort(key=lambda row: (row.order, row.code))
    return tuple(records), stream.hexdigest().upper(), peak


def encode(counter: Counter):
    return tuple(sorted((pair[0], pair[1], multiplicity) for pair, multiplicity in counter.items()))


def decode(state):
    return Counter({(excluded, deleted): multiplicity for excluded, deleted, multiplicity in state})


def alternate_quotient_states(components):
    """Counter-of-block-types DP, processing components in reverse order."""
    states = {()}
    peak_states = 1
    transitions = 0
    for component in reversed(components):
        following = set()
        for state in states:
            blocks = decode(state)
            for deletion in reversed(component.deletion_jets):
                added = blocks.copy()
                added[(component.jet, deletion)] += 1
                following.add(encode(added))
                transitions += 1
                for pair in tuple(blocks):
                    merged = (
                        base.convolution(pair[0], component.jet),
                        base.convolution(pair[1], deletion),
                    )
                    changed = blocks.copy()
                    changed[pair] -= 1
                    if changed[pair] == 0:
                        del changed[pair]
                    changed[merged] += 1
                    following.add(encode(changed))
                    transitions += 1
        states = following
        peak_states = max(peak_states, len(states))
        base.gate()
    quotients = set()
    for state in states:
        blocks = decode(state)
        product = (1, 0, 0, 0, 0, 0, 0)
        roots = 0
        for (excluded, deleted), multiplicity in blocks.items():
            factor = base.plus(excluded, (0,) + deleted[:6])
            for _ in range(multiplicity):
                product = base.convolution(product, factor)
                roots += 1
        quotients.add((roots, product))
    return quotients, peak_states, transitions


def validate_alternate_dp(records):
    forests = quotients = 0
    by_order = {}
    for record in records:
        by_order.setdefault(record.order, []).append(record)
    small_records = tuple(record for record in records if record.order <= 6)
    for total in range(0, 7):
        component_range = (0,) if total == 0 else range(1, total + 1)
        for component_count in component_range:
            for components in base.multiset_forests(small_records, total, component_count):
                expected = base.quotient_states(components)
                observed, _, _ = alternate_quotient_states(components)
                assert observed == expected
                forests += 1
                quotients += len(observed)
    assert (forests, quotients) == (43, 205)
    return {"forest_types": forests, "quotient_cases": quotients}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--m", type=int, choices=range(11, 16), required=True)
    args = parser.parse_args()
    m = args.m
    primary_path = HERE / f"rank8_delta2_new_leaf_m{m}_literal_empty_root_tail_exact_agent_20260823.json"
    output = HERE / f"rank8_delta2_new_leaf_m{m}_literal_empty_root_tail_independent_audit_agent_20260823.json"

    before = {name: sha256(HERE / name) for name in EXPECTED}
    assert before == EXPECTED
    primary_hash_before = sha256(primary_path)
    primary = json.loads(base.stable_bytes(primary_path).decode("utf-8"))
    assert primary["status"] == f"PASS_EXACT_DELTA2_NEW_LEAF_M{m}_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL"
    assert primary["coverage_complete"] is True
    terms, degree = base.independent_gate_terms()
    assert degree == primary["degree_in_empty_roots"] == 52
    records, geng_stream, peak = build_records(m)
    dp_self_test = validate_alternate_dp(records)

    rows = []
    totals = {
        "forest_types": 0,
        "quotient_cases": 0,
        "negative_values_at_minimum_order": 0,
        "negative_forward_differences": 0,
    }
    algorithm = {"canonical_block_states_peak": 0, "block_dp_transitions": 0}
    fingerprint = [0, 0, 0]
    for component_count in range(1, m + 1):
        row = {
            "components": component_count,
            "forest_types": 0,
            "quotient_cases": 0,
            "negative_values_at_minimum_order": 0,
            "negative_forward_differences": 0,
            "minimum_value": None,
            "minimum_forward_difference": None,
        }
        for components in base.multiset_forests(records, m, component_count):
            row["forest_types"] += 1
            totals["forest_types"] += 1
            fjet = base.multiply_all(component.jet for component in components)
            quotients, state_peak, transitions = alternate_quotient_states(components)
            algorithm["canonical_block_states_peak"] = max(algorithm["canonical_block_states_peak"], state_peak)
            algorithm["block_dp_transitions"] += transitions
            for nonempty_roots, nonempty_jet in sorted(quotients, reverse=True):
                minimum_total_roots = max(26 - m, nonempty_roots)
                minimum_empty = minimum_total_roots - nonempty_roots
                values = [
                    base.evaluate_terms(
                        terms,
                        base.empty_extension(nonempty_jet, minimum_empty + t),
                        fjet,
                    )
                    for t in range(degree + 1)
                ]
                differences = base.forward_differences(values)
                assert all(value >= 0 for value in differences)
                row["quotient_cases"] += 1
                totals["quotient_cases"] += 1
                row["minimum_value"] = values[0] if row["minimum_value"] is None else min(row["minimum_value"], values[0])
                local_min = min(differences)
                row["minimum_forward_difference"] = local_min if row["minimum_forward_difference"] is None else min(row["minimum_forward_difference"], local_min)
                base.fingerprint_add(
                    fingerprint,
                    [
                        m,
                        component_count,
                        list(fjet),
                        nonempty_roots,
                        list(nonempty_jet),
                        minimum_total_roots,
                        minimum_empty,
                        str(values[0]),
                        [str(value) for value in differences],
                    ],
                )
            peak = max(peak, base.gate())
        rows.append(row)
        print("M", m, "C", component_count, "FORESTS", row["forest_types"], "QUOTIENTS", row["quotient_cases"], flush=True)
        gc.collect()
        peak = max(peak, base.gate())

    primary_rows = primary["component_rows"]
    assert len(rows) == len(primary_rows) == m
    for row, expected in zip(rows, primary_rows):
        for key in (
            "components",
            "forest_types",
            "quotient_cases",
            "negative_values_at_minimum_order",
            "negative_forward_differences",
            "minimum_value",
            "minimum_forward_difference",
        ):
            assert row[key] == expected[key], (component_count, key)
    for key in totals:
        assert totals[key] == primary["counts"][key]
    fingerprint_hex = {
        name: f"{value:064X}" for name, value in zip(("xor", "sum", "sum_squares"), fingerprint)
    }
    assert fingerprint_hex == primary["canonical_quotient_fingerprint_mod_2_256"]
    assert sha256(primary_path) == primary_hash_before
    after = {name: sha256(HERE / name) for name in EXPECTED}
    assert after == before
    peak = max(peak, base.gate())
    payload = {
        "schema": "rank8-delta2-new-leaf-m11-15-literal-tail-shard-independent-audit-v1",
        "status": f"PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M{m}_ALL_ORDER_TAIL",
        "scope": primary["scope"],
        "method": "nauty geng, literal bitmask deletion jets, reversed component order, Counter-of-block-types partition DP, independently derived endpoint polynomial, and exact forward differences",
        "primary_sha256": primary_hash_before,
        "counts": totals,
        "degree_in_empty_roots": degree,
        "alternate_dp_self_test_m0_6": dp_self_test,
        "alternate_dp_statistics": algorithm,
        "canonical_quotient_fingerprint_mod_2_256": fingerprint_hex,
        "geng_reverse_stream_sha256": geng_stream,
        "hashes": before,
        "resources": {"abort_private_bytes": base.ABORT_BYTES},
        "proof_boundary": primary["proof_boundary"],
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FORESTS", totals["forest_types"], "QUOTIENTS", totals["quotient_cases"], "NEGATIVE 0")
    print("PEAK_MIB", round(peak / 1024**2, 2))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
