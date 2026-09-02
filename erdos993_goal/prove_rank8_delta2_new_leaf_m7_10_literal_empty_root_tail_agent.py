#!/usr/bin/env python3
"""Literal all-order Delta2 new-leaf endpoint subcase for 7<=|F|<=10."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf
import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_m7_10_literal_empty_root_tail_exact_agent_20260823.json"
MIN_M = 7
MAX_M = 10
EXPECTED = {
    "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": "6B533FFBCF504FFB3CAB5BF1B08FF6BB1BC70B8AB773DF3C4C0A4751C14BC2E1",
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": "23ABB3E543DD19CE9B0E4963675A89099F4A111692049FCC3D971B1BA54EC7CB",
    "prove_rank8_forest16_f5_f6_ratio_agent.py": "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_records():
    records = {}
    counts = [0]
    peak = forest.gate()
    for order in range(1, MAX_M + 1):
        trees = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        counts.append(len(trees))
        records[order] = tuple(
            literal.TreeRecord(order, index, forest.tree_jet(tree), literal.deletion_jet_set(tree))
            for index, tree in enumerate(trees)
        )
        peak = max(peak, forest.gate())
    assert counts == literal.EXPECTED_TREE_COUNTS[: MAX_M + 1]
    return records, peak


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED
    base, metadata = corner.new_leaf_corner(2, 3)
    assert metadata["endpoint_mask"] == 3
    generators = (leaf.d[3], leaf.d[4], leaf.d[5], leaf.d[6], leaf.f[3], leaf.f[4], leaf.f[5], leaf.f[6])
    polynomial = sp.Poly(base, *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    assert hashlib.sha256(serial).hexdigest().upper() == "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"
    degree = max(
        3 * monomial[0] + 4 * monomial[1] + 5 * monomial[2] + 6 * monomial[3]
        for monomial, _ in terms
    )
    assert degree == 52

    records, peak = build_records()
    rows = []
    totals = {
        "forest_types": 0,
        "quotient_cases": 0,
        "negative_values_at_minimum_order": 0,
        "negative_forward_differences": 0,
    }
    fingerprint = {"xor": 0, "sum": 0, "sum_squares": 0}
    first_obstructions = []
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
            for components in literal.forest_types(records, m, component_count):
                row["forest_types"] += 1
                totals["forest_types"] += 1
                fjet = literal.product_jets(record.jet for record in components)
                quotients = literal.nonempty_root_quotients(components)
                for (nonempty_roots, nonempty_jet), representative in sorted(quotients.items()):
                    minimum_empty = (26 - m) - nonempty_roots
                    assert minimum_empty >= 0
                    values = [
                        low.evaluate_terms(terms, low.empty_extension(nonempty_jet, minimum_empty + t), fjet)
                        for t in range(degree + 1)
                    ]
                    differences = low.forward_differences(values)
                    negative_value = values[0] < 0
                    negative_differences = sum(value < 0 for value in differences)
                    row["quotient_cases"] += 1
                    totals["quotient_cases"] += 1
                    row["negative_values_at_minimum_order"] += int(negative_value)
                    totals["negative_values_at_minimum_order"] += int(negative_value)
                    row["negative_forward_differences"] += negative_differences
                    totals["negative_forward_differences"] += negative_differences
                    row["minimum_value"] = values[0] if row["minimum_value"] is None else min(row["minimum_value"], values[0])
                    local_min = min(differences)
                    row["minimum_forward_difference"] = local_min if row["minimum_forward_difference"] is None else min(row["minimum_forward_difference"], local_min)
                    signature = [
                        m,
                        component_count,
                        list(fjet),
                        nonempty_roots,
                        list(nonempty_jet),
                        minimum_empty,
                        str(values[0]),
                        [str(value) for value in differences],
                    ]
                    low.update_fingerprint(fingerprint, signature)
                    if (negative_value or negative_differences) and len(first_obstructions) < 20:
                        deletion_choices, partition = representative
                        first_obstructions.append(
                            {
                                "m": m,
                                "component_count": component_count,
                                "component_tree_order_and_networkx_index": [
                                    [record.order, record.index] for record in components
                                ],
                                "attachment_deletion_jets": [list(jet) for jet in deletion_choices],
                                "component_partition": [list(block) for block in partition],
                                "nonempty_roots": nonempty_roots,
                                "fjet": list(fjet),
                                "nonempty_jet": list(nonempty_jet),
                                "minimum_empty_roots": minimum_empty,
                                "minimum_value": str(values[0]),
                                "negative_difference_ranks": [
                                    rank for rank, value in enumerate(differences) if value < 0
                                ],
                            }
                        )
                peak = max(peak, forest.gate())
        rows.append(row)
        print("M", m, "FORESTS", row["forest_types"], "QUOTIENTS", row["quotient_cases"], "NEG", row["negative_values_at_minimum_order"], row["negative_forward_differences"], flush=True)

    peak = max(peak, forest.gate())
    status = (
        "PASS_EXACT_DELTA2_NEW_LEAF_M7_10_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL"
        if totals["negative_values_at_minimum_order"] == totals["negative_forward_differences"] == 0
        else "OPEN_EXACT_M7_10_LITERAL_TAIL_FORWARD_DIFFERENCE_OBSTRUCTION_NO_COUNTEREXAMPLE_CLAIM"
    )
    payload = {
        "schema": "rank8-delta2-new-leaf-m7-10-literal-empty-root-tail-v1",
        "status": status,
        "scope": "Delta2 new-leaf Q7(C)-upper/Q6(D)-upper endpoint corner, source n>=27, 7<=|F|<=10",
        "structural_exhaustion": "Every forest F, every attachment deletion jet, and every set partition of its components among nonempty neighbor roots is enumerated. Remaining roots are isolated vertices of D.",
        "tail_certificate": "For each literal quotient, values at s_min+t are expanded exactly in binomial(t,k) by forward differences. All nonnegative differences imply all integer t>=0 values are nonnegative.",
        "degree_in_empty_roots": degree,
        "rows": rows,
        "counts": totals,
        "first_obstructions": first_obstructions,
        "canonical_quotient_fingerprint_mod_2_256": {
            key: f"{value:064X}" for key, value in fingerprint.items()
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "input_sha256": hashes,
        "proof_boundary": "A PASS closes only this endpoint corner for 7<=|F|<=10. The full Delta2 new-leaf gate and all broader arbitrary-leaf/Q8/PGC/Problem993 claims remain open. A forward-difference obstruction alone is not a graph counterexample.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("FORESTS", totals["forest_types"], "QUOTIENTS", totals["quotient_cases"])
    print("NEG_VALUES", totals["negative_values_at_minimum_order"], "NEG_DIFFS", totals["negative_forward_differences"])
    print("PEAK_MIB", round(peak / 1024**2, 2))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
