#!/usr/bin/env python3
"""Literal all-order high-degree subcase for the Delta2 new-leaf corner.

The scope is F=A-N[v] of order m<=6 and source order n>=27.  Every forest F,
every deletion jet at each attachment, and every set partition of components
among nonempty neighbor roots is enumerated.  Remaining neighbor roots are
isolated vertices of D=A-v.  Exact forward differences in their count certify
the entire unbounded tail when all are nonnegative.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path

import networkx as nx
import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf
import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_exact_agent_20260823.json"
MAX_M = 6
MODULUS = 1 << 256


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tree_records():
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


def evaluate_terms(terms, djet: tuple[int, ...], fjet: tuple[int, ...]) -> int:
    values = (djet[3], djet[4], djet[5], djet[6], fjet[3], fjet[4], fjet[5], fjet[6])
    total = 0
    for monomial, coefficient in terms:
        term = int(coefficient)
        for value, exponent in zip(values, monomial):
            if exponent:
                term *= value**exponent
        total += term
    return total


def empty_extension(jet: tuple[int, ...], count: int) -> tuple[int, ...]:
    return tuple(
        sum(math.comb(count, selected) * jet[index - selected] for selected in range(index + 1))
        for index in range(7)
    )


def forward_differences(values: list[int]) -> tuple[int, ...]:
    answer = []
    current = values
    while current:
        answer.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return tuple(answer)


def update_fingerprint(state, signature) -> None:
    serial = json.dumps(signature, separators=(",", ":")).encode()
    value = int.from_bytes(hashlib.sha256(serial).digest(), "big")
    state["xor"] ^= value
    state["sum"] = (state["sum"] + value) % MODULUS
    state["sum_squares"] = (state["sum_squares"] + value * value) % MODULUS


def main() -> None:
    base, metadata = corner.new_leaf_corner(2, 3)
    assert metadata["endpoint_mask"] == 3
    generators = (leaf.d[3], leaf.d[4], leaf.d[5], leaf.d[6], leaf.f[3], leaf.f[4], leaf.f[5], leaf.f[6])
    polynomial = sp.Poly(base, *generators)
    terms = polynomial.terms()
    assert len(terms) == 281
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

    records, peak = tree_records()
    rows = []
    total_forest_types = 0
    total_quotients = 0
    total_negative_values = 0
    total_negative_differences = 0
    first_obstructions = []
    fingerprint = {"xor": 0, "sum": 0, "sum_squares": 0}
    canonical_fingerprint = {"xor": 0, "sum": 0, "sum_squares": 0}
    for m in range(MAX_M + 1):
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
        component_range = (0,) if m == 0 else range(1, m + 1)
        for component_count in component_range:
            for components in literal.forest_types(records, m, component_count):
                row["forest_types"] += 1
                total_forest_types += 1
                fjet = literal.product_jets(record.jet for record in components)
                quotients = literal.nonempty_root_quotients(components)
                for (nonempty_roots, nonempty_jet), representative in sorted(quotients.items()):
                    minimum_empty = (26 - m) - nonempty_roots
                    assert minimum_empty >= 0
                    values = [
                        evaluate_terms(terms, empty_extension(nonempty_jet, minimum_empty + t), fjet)
                        for t in range(degree + 1)
                    ]
                    differences = forward_differences(values)
                    assert len(differences) == degree + 1
                    row["quotient_cases"] += 1
                    total_quotients += 1
                    row["minimum_value"] = values[0] if row["minimum_value"] is None else min(row["minimum_value"], values[0])
                    local_min_difference = min(differences)
                    row["minimum_forward_difference"] = (
                        local_min_difference
                        if row["minimum_forward_difference"] is None
                        else min(row["minimum_forward_difference"], local_min_difference)
                    )
                    negative_value = values[0] < 0
                    negative_differences = sum(value < 0 for value in differences)
                    row["negative_values_at_minimum_order"] += int(negative_value)
                    row["negative_forward_differences"] += negative_differences
                    total_negative_values += int(negative_value)
                    total_negative_differences += negative_differences
                    deletion_choices, partition = representative
                    signature = [
                        m,
                        component_count,
                        [[record.order, record.index] for record in components],
                        [list(jet) for jet in deletion_choices],
                        [list(block) for block in partition],
                        nonempty_roots,
                        list(fjet),
                        list(nonempty_jet),
                        minimum_empty,
                        str(values[0]),
                        [str(value) for value in differences],
                    ]
                    update_fingerprint(fingerprint, signature)
                    update_fingerprint(
                        canonical_fingerprint,
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
                    if (negative_value or negative_differences) and len(first_obstructions) < 20:
                        first_obstructions.append(
                            {
                                "m": m,
                                "component_count": component_count,
                                "component_tree_order_and_networkx_index": signature[2],
                                "attachment_deletion_jets": signature[3],
                                "component_partition": signature[4],
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

    peak = max(peak, forest.gate())
    assert peak < 100 * 1024**2
    status = (
        "PASS_EXACT_DELTA2_NEW_LEAF_M0_6_LITERAL_EMPTY_ROOT_ALL_ORDER_TAIL"
        if total_negative_values == total_negative_differences == 0
        else "OPEN_EXACT_LITERAL_TAIL_FORWARD_DIFFERENCE_OBSTRUCTION_NO_COUNTEREXAMPLE_CLAIM"
    )
    payload = {
        "schema": "rank8-delta2-new-leaf-m0-6-literal-empty-root-tail-v1",
        "status": status,
        "scope": "Delta2 new-leaf Q7(C)-upper/Q6(D)-upper endpoint corner, source n>=27, |F|=m<=6",
        "structural_exhaustion": "Every forest F, every attachment deletion jet, and every set partition of its components among nonempty neighbor roots is enumerated. Remaining roots are isolated vertices of D.",
        "tail_certificate": "For each literal quotient, values at s_min+t are expanded exactly in binomial(t,k) by forward differences. All nonnegative differences imply all integer t>=0 values are nonnegative.",
        "degree_in_empty_roots": degree,
        "rows": rows,
        "counts": {
            "forest_types": total_forest_types,
            "quotient_cases": total_quotients,
            "negative_values_at_minimum_order": total_negative_values,
            "negative_forward_differences": total_negative_differences,
        },
        "first_obstructions": first_obstructions,
        "representative_fingerprint_mod_2_256": {key: f"{value:064X}" for key, value in fingerprint.items()},
        "canonical_quotient_fingerprint_mod_2_256": {
            key: f"{value:064X}" for key, value in canonical_fingerprint.items()
        },
        "resources": {
            "abort_private_bytes": forest.ABORT_BYTES,
            "verified_peak_private_bytes_strictly_less_than": 100 * 1024**2,
        },
        "input_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"),
            "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": sha256(HERE / "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py"),
            "prove_rank8_forest16_f5_f6_ratio_agent.py": sha256(HERE / "prove_rank8_forest16_f5_f6_ratio_agent.py"),
        },
        "proof_boundary": "A PASS closes only this endpoint corner for |F|<=6. The full Delta2 new-leaf gate and all broader arbitrary-leaf/Q8/PGC/Problem993 claims remain open. A forward-difference obstruction alone is not a graph counterexample.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("DEGREE", degree, "FORESTS", total_forest_types, "QUOTIENTS", total_quotients)
    print("NEG_VALUES", total_negative_values, "NEG_DIFFS", total_negative_differences)
    print("PEAK_MIB", round(peak / 1024**2, 2), "VERIFIED_LT_100")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
