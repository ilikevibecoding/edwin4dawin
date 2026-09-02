#!/usr/bin/env python3
"""Exact universal G2/G3 theorem for every four-edge marked core.

The eight isolate-free core shapes are classified by the partition of four
edges among components.  Every literal mark/parent placement is generated,
quotienting only identical C/D row signatures, and every n>=11 row is proved
by exact shifted-numerator positivity.
"""

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
from prove_iso_n7_bundle_g23_three_edge_all_parent_rank7_g5_finish import literal_count


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_four_edge_all_parent_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G23_FOUR_EDGE_ALL_PARENT_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "three_edge_source": "prove_iso_n7_bundle_g23_three_edge_all_parent_rank7_g5_finish.py",
    "three_edge_report": "iso_n7_bundle_g23_three_edge_all_parent_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "three_edge_source": "1F21ADB9680DC76FCFC5AFABF82E19F095F0C08B978B28F30943C3C01751EC08",
    "three_edge_report": "32BF8BA4A338E0FED56AA850C083434A8B394DB536D329DA8886DD594E3B5AF9",
}
CORES = {
    "P5": {"order": 5, "edges": ((0, 1), (1, 2), (2, 3), (3, 4)), "unique": 121},
    "K1_4": {"order": 5, "edges": ((0, 1), (0, 2), (0, 3), (0, 4)), "unique": 44},
    "T5": {"order": 5, "edges": ((0, 1), (0, 2), (0, 3), (1, 4)), "unique": 151},
    "P4_plus_K2": {"order": 6, "edges": ((0, 1), (1, 2), (2, 3), (4, 5)), "unique": 133},
    "K1_3_plus_K2": {"order": 6, "edges": ((0, 1), (0, 2), (0, 3), (4, 5)), "unique": 98},
    "P3_plus_P3": {"order": 6, "edges": ((0, 1), (1, 2), (3, 4), (4, 5)), "unique": 85},
    "P3_plus_2K2": {"order": 7, "edges": ((0, 1), (1, 2), (3, 4), (5, 6)), "unique": 112},
    "4K2": {"order": 8, "edges": ((0, 1), (2, 3), (4, 5), (6, 7)), "unique": 29},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def component_edge_sizes(order: int, edges) -> list[int]:
    adjacency = {vertex: set() for vertex in range(order)}
    for left, right in edges:
        adjacency[left].add(right)
        adjacency[right].add(left)
    unseen, sizes = set(range(order)), []
    while unseen:
        stack = [unseen.pop()]
        vertices = set(stack)
        while stack:
            vertex = stack.pop()
            for neighbour in adjacency[vertex]:
                if neighbour in unseen:
                    unseen.remove(neighbour)
                    vertices.add(neighbour)
                    stack.append(neighbour)
        sizes.append(sum(left in vertices and right in vertices for left, right in edges))
    return sorted(sizes, reverse=True)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    three_edge = json.loads((HERE / FILES["three_edge_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert three_edge["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_THREE_EDGE_ALL_PARENT_RANK7_G5_FINISH"
    )

    # Component edge partitions exhaust 4, while the three connected trees on
    # five vertices are P5, K1,4, and T5.
    assert all(len(core["edges"]) == 4 for core in CORES.values())
    partitions = {name: component_edge_sizes(core["order"], core["edges"]) for name, core in CORES.items()}
    assert partitions == {
        "P5": [4], "K1_4": [4], "T5": [4],
        "P4_plus_K2": [3, 1], "K1_3_plus_K2": [3, 1],
        "P3_plus_P3": [2, 2], "P3_plus_2K2": [2, 1, 1],
        "4K2": [1, 1, 1, 1],
    }

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    n, tail = sp.symbols("n tail", integer=True, nonnegative=True)
    core_reports = {}
    global_minima = {2: None, 3: None}
    global_stream = hashlib.sha256()

    for core_name, core in CORES.items():
        order, edges = core["order"], core["edges"]
        cases = literal_cases(order, edges)
        assert len(cases) == literal_count(order)
        grouped = defaultdict(list)
        literal_stream = hashlib.sha256()
        for case in cases:
            descriptor = {key: value for key, value in case.items() if key != "signature"}
            grouped[case["signature"]].append(descriptor)
            literal_stream.update(f"{core_name}:{descriptor}:{case['signature']};".encode())
        assert len(grouped) == core["unique"]

        unique_rows = {"G2": [], "G3": []}
        for signature_index, (signature, represented_cases) in enumerate(
            sorted(grouped.items(), key=lambda item: str(item[0]))
        ):
            c_signatures, d_signatures = signature
            mapping = {
                sp.Symbol(f"{prefix}{family}{rank}"): row_expression(
                    (c_signatures if prefix == "c" else d_signatures)[family_index],
                    order, n, rank,
                )
                for prefix in "cd"
                for family_index, family in enumerate("EUVW")
                for rank in range(9)
            }
            for coefficient_index in (2, 3):
                direct = sp.cancel(sp.together(sp.expand(
                    coefficients[coefficient_index].xreplace(mapping)
                )))
                numerator, denominator = sp.fraction(direct)
                assert not denominator.free_symbols and denominator > 0
                shifted = sp.Poly(sp.expand(numerator.subs(n, tail + THRESHOLD)), tail)
                shifted_coefficients = shifted.all_coeffs()
                assert all(value >= 0 for value in shifted_coefficients), (
                    core_name, signature_index, coefficient_index, represented_cases[0]
                )
                assert shifted_coefficients[0] > 0 and shifted_coefficients[-1] > 0
                local_minimum = min(shifted_coefficients)
                global_minima[coefficient_index] = (
                    local_minimum if global_minima[coefficient_index] is None
                    else min(global_minima[coefficient_index], local_minimum)
                )
                record = {
                    "signature_index": signature_index,
                    "literal_case_multiplicity": len(represented_cases),
                    "representative": represented_cases[0],
                    "expression": str(direct),
                    "positive_denominator": str(denominator),
                    "shifted_coefficients": list(map(str, shifted_coefficients)),
                    "minimum_shifted_coefficient": str(local_minimum),
                }
                unique_rows[f"G{coefficient_index}"].append(record)
                global_stream.update(
                    f"{core_name}:G{coefficient_index}:{signature}:{record};".encode()
                )
        for coefficient_rows in unique_rows.values():
            assert sum(row["literal_case_multiplicity"] for row in coefficient_rows) == len(cases)
        core_reports[core_name] = {
            "core_order": order,
            "edges": [list(edge) for edge in edges],
            "component_edge_partition": partitions[core_name],
            "literal_cases_per_coefficient": len(cases),
            "unique_CD_row_signatures": len(grouped),
            "literal_case_stream_sha256": literal_stream.hexdigest().upper(),
            "unique_rows": unique_rows,
        }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with exactly four edges, every distinct marked "
            "pair, and each compatible canonical parent mode, the exact rank-seven "
            "bundle coefficients G2 and G3 are nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive all-forest/all-parent finite certificate"},
            {"orders": "n>=11", "method": "exhaustive eight-core role classification and positive shifted numerators"},
        ],
        "cores": core_reports,
        "literal_cases_per_coefficient": sum(row["literal_cases_per_coefficient"] for row in core_reports.values()),
        "unique_CD_row_signatures": sum(row["unique_CD_row_signatures"] for row in core_reports.values()),
        "global_shifted_minima": {f"G{k}": str(v) for k, v in global_minima.items()},
        "ordered_unique_row_stream_sha256": global_stream.hexdigest().upper(),
        "coverage_gap_within_four_edge_G23": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for exactly-four-edge C and rank-seven G2/G3. "
            "Cores with five or more edges remain open for these coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert report["literal_cases_per_coefficient"] == 3038
    assert report["unique_CD_row_signatures"] == 773
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_cases_per_coefficient": report["literal_cases_per_coefficient"],
        "unique_CD_row_signatures": report["unique_CD_row_signatures"],
        "global_shifted_minima": report["global_shifted_minima"],
        "coverage_gap_within_four_edge_G23": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
