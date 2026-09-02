#!/usr/bin/env python3
"""Bounded exact all-marked/all-parent audit for five-edge rank-seven G2."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients
from prove_iso_n7_bundle_g23_two_edge_all_parent_rank7_g5_finish import (
    literal_cases,
    row_expression,
)
from prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise import (
    forests_without_isolates,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_FIVE_EDGE_ALL_MARKED_ALL_PARENT_"
    "SHIFTED_TAIL_RANK7_G4_PIECEWISE"
)
MAX_TAIL_THRESHOLD = 1_000_000


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def component_edge_partition(order: int, edges) -> tuple[int, ...]:
    adjacency = {vertex: set() for vertex in range(order)}
    for left, right in edges:
        adjacency[left].add(right)
        adjacency[right].add(left)
    unseen = set(range(order))
    sizes = []
    while unseen:
        start = unseen.pop()
        component = {start}
        stack = [start]
        while stack:
            vertex = stack.pop()
            for neighbour in adjacency[vertex]:
                if neighbour in unseen:
                    unseen.remove(neighbour)
                    component.add(neighbour)
                    stack.append(neighbour)
        sizes.append(sum(
            left in component and right in component for left, right in edges
        ))
    return tuple(sorted(sizes, reverse=True))


def tail_certificate(numerator, order_variable, tail_variable, minimum_order):
    polynomial = sp.Poly(sp.expand(numerator), order_variable)
    if polynomial.is_zero:
        return {
            "kind": "identically_zero",
            "tail_threshold": minimum_order,
            "tail_coefficients": ["0"],
            "finite_integer_count": 0,
            "finite_minimum": None,
            "finite_minimum_order": None,
        }
    leading = polynomial.LC()
    if leading < 0:
        return {
            "kind": "negative_leading_coefficient",
            "leading_coefficient": str(leading),
        }

    threshold = minimum_order
    while True:
        shifted = sp.Poly(
            sp.expand(polynomial.as_expr().subs(
                order_variable, tail_variable + threshold
            )),
            tail_variable,
        )
        coefficients = shifted.all_coeffs()
        if all(value >= 0 for value in coefficients):
            break
        threshold = max(threshold + 1, 2*threshold)
        if threshold > MAX_TAIL_THRESHOLD:
            return {
                "kind": "tail_threshold_cap_exceeded",
                "last_threshold": threshold,
                "last_coefficients": list(map(str, coefficients)),
            }

    finite_values = [
        sp.expand(polynomial.as_expr().subs(order_variable, value))
        for value in range(minimum_order, threshold)
    ]
    if finite_values:
        finite_minimum = min(finite_values)
        finite_minimum_order = minimum_order + finite_values.index(finite_minimum)
    else:
        finite_minimum = None
        finite_minimum_order = None
    return {
        "kind": "proved_nonnegative" if not finite_values or finite_minimum >= 0
            else "negative_finite_value",
        "tail_threshold": threshold,
        "tail_coefficients": list(map(str, coefficients)),
        "finite_integer_count": len(finite_values),
        "finite_minimum": None if finite_minimum is None else str(finite_minimum),
        "finite_minimum_order": finite_minimum_order,
    }


def main() -> None:
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    g2 = coefficients[2]
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)

    core_reports = []
    global_stream = hashlib.sha256()
    failure_records = []
    total_literal = 0
    total_unique = 0
    global_tail_threshold = 0
    global_finite_minimum = None
    global_finite_witness = None

    for order in range(6, 11):
        local_index = 0
        for graph in forests_without_isolates(order):
            if graph.number_of_edges() != 5:
                continue
            edges = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            cases = literal_cases(order, edges)
            grouped = defaultdict(list)
            literal_stream = hashlib.sha256()
            for case in cases:
                descriptor = {key: value for key, value in case.items() if key != "signature"}
                grouped[case["signature"]].append(descriptor)
                literal_stream.update((repr((descriptor, case["signature"])) + "\n").encode("ascii"))

            row_cache = {}
            unique_rows = []
            for signature_index, (signature, represented_cases) in enumerate(
                sorted(grouped.items(), key=lambda item: str(item[0]))
            ):
                c_signatures, d_signatures = signature

                def cached_row(row_signature, rank):
                    key = (row_signature, rank)
                    if key not in row_cache:
                        row_cache[key] = row_expression(row_signature, order, n, rank)
                    return row_cache[key]

                mapping = {
                    sp.Symbol(f"{prefix}{family}{rank}"): cached_row(
                        (c_signatures if prefix == "c" else d_signatures)[family_index],
                        rank,
                    )
                    for prefix in "cd"
                    for family_index, family in enumerate("EUVW")
                    for rank in range(9)
                }
                direct = sp.cancel(sp.together(sp.expand(g2.xreplace(mapping))))
                numerator, denominator = sp.fraction(direct)
                assert not denominator.free_symbols and denominator > 0
                minimum_order = min(case["minimum_order"] for case in represented_cases)
                certificate = tail_certificate(
                    numerator, n, tail, minimum_order
                )
                record = {
                    "signature_index": signature_index,
                    "literal_case_multiplicity": len(represented_cases),
                    "minimum_actual_order": minimum_order,
                    "represented_cases": represented_cases,
                    "numerator": str(sp.expand(numerator)),
                    "positive_denominator": str(denominator),
                    "certificate": certificate,
                }
                unique_rows.append(record)
                global_stream.update((repr((order, local_index, signature, record)) + "\n").encode("ascii"))
                if certificate["kind"] != "proved_nonnegative" and certificate["kind"] != "identically_zero":
                    failure_records.append({
                        "core_order": order,
                        "core_index_within_order": local_index,
                        "edges": [list(edge) for edge in edges],
                        **record,
                    })
                if certificate.get("tail_threshold") is not None:
                    global_tail_threshold = max(
                        global_tail_threshold, certificate["tail_threshold"]
                    )
                finite_minimum = certificate.get("finite_minimum")
                if finite_minimum is not None:
                    finite_minimum = sp.Integer(finite_minimum)
                    if global_finite_minimum is None or finite_minimum < global_finite_minimum:
                        global_finite_minimum = finite_minimum
                        global_finite_witness = {
                            "core_order": order,
                            "core_index_within_order": local_index,
                            "signature_index": signature_index,
                            "order": certificate["finite_minimum_order"],
                            "numerator_value": str(finite_minimum),
                            "positive_denominator": str(denominator),
                            "representative": represented_cases[0],
                        }

            total_literal += len(cases)
            total_unique += len(grouped)
            core_reports.append({
                "core_order": order,
                "core_index_within_order": local_index,
                "edges": [list(edge) for edge in edges],
                "component_edge_partition": list(
                    component_edge_partition(order, edges)
                ),
                "literal_cases": len(cases),
                "unique_CD_row_signatures": len(grouped),
                "literal_case_stream_sha256": literal_stream.hexdigest().upper(),
                "unique_rows": unique_rows,
            })
            print(json.dumps({
                "core_order": order,
                "core_index": local_index,
                "literal_cases": len(cases),
                "unique_signatures": len(grouped),
                "failures_so_far": len(failure_records),
                "max_tail_threshold_so_far": global_tail_threshold,
            }, sort_keys=True), flush=True)
            local_index += 1

    assert len(core_reports) == 16
    report = {
        "marker": MARKER,
        "status": (
            "exact bounded all-marked/all-parent probe; promotion requires independent replay"
            if not failure_records else
            "exact bounded obstruction probe; no theorem promotion"
        ),
        "rank": 7,
        "coefficient": "G2",
        "edge_count": 5,
        "isolate_free_cores": len(core_reports),
        "cores_by_order_6_through_10": [
            sum(core["core_order"] == order for core in core_reports)
            for order in range(6, 11)
        ],
        "literal_cases": total_literal,
        "unique_CD_row_signatures": total_unique,
        "failure_count": len(failure_records),
        "failure_records": failure_records,
        "maximum_tail_threshold": global_tail_threshold,
        "global_finite_minimum_numerator": (
            None if global_finite_minimum is None else str(global_finite_minimum)
        ),
        "global_finite_minimum_witness": global_finite_witness,
        "core_reports": core_reports,
        "ordered_unique_row_stream_sha256": global_stream.hexdigest().upper(),
        "reconstruction_source_sha256": sha256(
            HERE / "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py"
        ),
        "literal_case_source_sha256": sha256(
            HERE / "prove_iso_n7_bundle_g23_two_edge_all_parent_rank7_g5_finish.py"
        ),
        "core_enumerator_source_sha256": sha256(
            HERE / "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py"
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "marker": MARKER,
        "isolate_free_cores": len(core_reports),
        "literal_cases": total_literal,
        "unique_CD_row_signatures": total_unique,
        "failure_count": len(failure_records),
        "maximum_tail_threshold": global_tail_threshold,
        "global_finite_minimum_numerator": report[
            "global_finite_minimum_numerator"
        ],
        "ordered_unique_row_stream_sha256": report[
            "ordered_unique_row_stream_sha256"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
