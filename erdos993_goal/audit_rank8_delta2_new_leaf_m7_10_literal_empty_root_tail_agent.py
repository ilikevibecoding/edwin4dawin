#!/usr/bin/env python3
"""Independent geng/bitmask replay of the Delta2 7<=|F|<=10 tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

import audit_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as base


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_independent_audit_agent_20260823.json"
MIN_M = 7
MAX_M = 10
EXPECTED = {
    "prove_rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_agent.py": "9AFB3ECD684397B32B4DEE694E2F28B3CD7B768887EFA87877FE56E636F53D4A",
    "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_exact_agent_20260823.json": "2A0EA6145ACC420225B89AD4AF7025CDB87B45A1B30C3BA2AD2A403F02A0047E",
    "audit_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "A81909B99E0CD09B6F0BF698972E18F226C0C858DEA88A11BD5091B749467BEE",
    "nauty2_8_9/geng.exe": "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}
TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106]


def sha256(path: Path) -> str:
    return hashlib.sha256(base.stable_bytes(path)).hexdigest().upper()


def build_records():
    records = []
    stream = hashlib.sha256()
    counts = [0]
    peak = base.gate()
    for order in range(1, MAX_M + 1):
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
    assert counts == TREE_COUNTS
    records.sort(key=lambda row: (row.order, row.code))
    return tuple(records), stream.hexdigest().upper(), peak


def main() -> None:
    before = {name: sha256(HERE / name) for name in EXPECTED}
    assert before == EXPECTED
    primary = json.loads(base.stable_bytes(PRIMARY).decode("utf-8"))
    assert primary["status"] == "PASS_EXACT_DELTA2_NEW_LEAF_M7_10_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL"
    terms, degree = base.independent_gate_terms()
    assert degree == primary["degree_in_empty_roots"] == 52
    records, geng_stream, peak = build_records()

    rows = []
    totals = {
        "forest_types": 0,
        "quotient_cases": 0,
        "negative_values_at_minimum_order": 0,
        "negative_forward_differences": 0,
    }
    fingerprint = [0, 0, 0]
    for m in range(MIN_M, MAX_M + 1):
        row = {
            "m": m,
            "minimum_total_roots": 26 - m,
            "forest_types": 0,
            "quotient_cases": 0,
            "negative_values_at_minimum_order": 0,
            "negative_forward_differences": 0,
            "minimum_value": None,
            "minimum_forward_difference": None,
        }
        for component_count in range(1, m + 1):
            for components in base.multiset_forests(records, m, component_count):
                row["forest_types"] += 1
                totals["forest_types"] += 1
                fjet = base.multiply_all(component.jet for component in components)
                for nonempty_roots, nonempty_jet in sorted(base.quotient_states(components), reverse=True):
                    minimum_empty = (26 - m) - nonempty_roots
                    assert minimum_empty >= 0
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
                            minimum_empty,
                            str(values[0]),
                            [str(value) for value in differences],
                        ],
                    )
                peak = max(peak, base.gate())
        rows.append(row)
        print("M", m, "FORESTS", row["forest_types"], "QUOTIENTS", row["quotient_cases"], flush=True)

    assert rows == primary["rows"]
    assert totals == primary["counts"]
    assert (totals["forest_types"], totals["quotient_cases"]) == (595, 9911)
    fingerprint_hex = {
        name: f"{value:064X}" for name, value in zip(("xor", "sum", "sum_squares"), fingerprint)
    }
    assert fingerprint_hex == primary["canonical_quotient_fingerprint_mod_2_256"]
    after = {name: sha256(HERE / name) for name in EXPECTED}
    assert after == before
    peak = max(peak, base.gate())
    payload = {
        "schema": "rank8-delta2-new-leaf-m7-10-literal-empty-root-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_BITMASK_DELTA2_NEW_LEAF_M7_10_ALL_ORDER_TAIL",
        "scope": primary["scope"],
        "method": "nauty geng free trees, literal induced-subgraph deletion jets, multiset forests, restricted-growth partitions, independently derived endpoint polynomial, and exact forward differences",
        "counts": totals,
        "degree_in_empty_roots": degree,
        "canonical_quotient_fingerprint_mod_2_256": fingerprint_hex,
        "geng_reverse_stream_sha256": geng_stream,
        "hashes": before,
        "resources": {"abort_private_bytes": base.ABORT_BYTES},
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FORESTS", totals["forest_types"], "QUOTIENTS", totals["quotient_cases"], "NEGATIVE 0")
    print("PEAK_MIB", round(peak / 1024**2, 2))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
