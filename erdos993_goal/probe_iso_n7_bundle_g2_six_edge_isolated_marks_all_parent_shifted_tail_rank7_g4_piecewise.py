#!/usr/bin/env python3
"""Bounded exact all-parent rank-seven G2 audit for isolated marks and e=6."""

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
from probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise import (
    component_edge_partition,
    tail_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g2_six_edge_isolated_marks_all_parent_shifted_tail_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SIX_EDGE_ISOLATED_MARKS_ALL_PARENT_"
    "SHIFTED_TAIL_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    g2 = coefficients[2]
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)

    core_reports = []
    global_stream = hashlib.sha256()
    failures = []
    total_literal = 0
    total_unique = 0
    maximum_threshold = 0
    global_finite_minimum = None
    global_finite_witness = None

    for order in range(7, 13):
        local_index = 0
        for graph in forests_without_isolates(order):
            if graph.number_of_edges() != 6:
                continue
            edges = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
            cases = [
                case for case in literal_cases(order, edges)
                if case["u"] == "isolated_u" and case["v"] == "isolated_v"
            ]
            assert len(cases) == order + 4
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
                certificate = tail_certificate(numerator, n, tail, minimum_order)
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
                if certificate["kind"] not in {"proved_nonnegative", "identically_zero"}:
                    failures.append({
                        "core_order": order,
                        "core_index_within_order": local_index,
                        "edges": [list(edge) for edge in edges],
                        **record,
                    })
                maximum_threshold = max(
                    maximum_threshold, certificate.get("tail_threshold", 0)
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
                "literal_parent_cases": len(cases),
                "unique_CD_row_signatures": len(grouped),
                "literal_case_stream_sha256": literal_stream.hexdigest().upper(),
                "unique_rows": unique_rows,
            })
            print(json.dumps({
                "core_order": order,
                "core_index": local_index,
                "literal_parent_cases": len(cases),
                "unique_signatures": len(grouped),
                "failures_so_far": len(failures),
                "maximum_threshold_so_far": maximum_threshold,
            }, sort_keys=True), flush=True)
            local_index += 1

    counts = [
        sum(core["core_order"] == order for core in core_reports)
        for order in range(7, 13)
    ]
    assert counts == [11, 12, 6, 3, 1, 1]
    assert len(core_reports) == 34
    report = {
        "marker": MARKER,
        "status": (
            "exact bounded isolated-marks/all-parent probe; promotion requires replay"
            if not failures else "exact bounded obstruction probe; no theorem promotion"
        ),
        "rank": 7,
        "coefficient": "G2",
        "edge_count": 6,
        "marked_geometry": "two distinct isolated marks (nonadjacent/common0/sum0)",
        "parent_modes": [
            "no_parent", "endpoint_u", "endpoint_v",
            "ordinary_parent_isolate", "ordinary_parent_core",
        ],
        "isolate_free_cores": len(core_reports),
        "cores_by_order_7_through_12": counts,
        "literal_parent_cases": total_literal,
        "unique_CD_row_signatures": total_unique,
        "failure_count": len(failures),
        "failure_records": failures,
        "maximum_tail_threshold": maximum_threshold,
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
        "tail_engine_source_sha256": sha256(
            HERE / "probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise.py"
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
        "cores_by_order_7_through_12": counts,
        "literal_parent_cases": total_literal,
        "unique_CD_row_signatures": total_unique,
        "failure_count": len(failures),
        "maximum_tail_threshold": maximum_threshold,
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
