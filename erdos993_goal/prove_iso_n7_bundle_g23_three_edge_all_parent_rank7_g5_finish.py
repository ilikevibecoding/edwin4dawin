#!/usr/bin/env python3
"""Exact universal G2/G3 theorem for every three-edge marked core.

The isolate-free core is P4, K1,3, P3+K2, or 3K2.  Every literal placement
of ordered marks and the canonical parent is generated, quotienting only
identical C/D row signatures.  Literal G2/G3 reconstruction then reduces all
n>=11 cases to polynomials with nonnegative shifted numerator coefficients.
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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_three_edge_all_parent_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G23_THREE_EDGE_ALL_PARENT_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "two_edge_source": "prove_iso_n7_bundle_g23_two_edge_all_parent_rank7_g5_finish.py",
    "two_edge_report": "iso_n7_bundle_g23_two_edge_all_parent_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "two_edge_source": "F803D6C168169A87AC2825EE2FA172D084A0853A43E5040EFAC844172BC8E3E6",
    "two_edge_report": "56D3F49F194A5EE349D20C360F3F0F47BFFA65333D65732FAB29305DAC14D72E",
}
CORES = {
    "P4": {"order": 4, "edges": ((0, 1), (1, 2), (2, 3)), "unique": 70},
    "K1_3": {"order": 4, "edges": ((0, 1), (0, 2), (0, 3)), "unique": 44},
    "P3_plus_K2": {"order": 5, "edges": ((0, 1), (1, 2), (3, 4)), "unique": 97},
    "3K2": {"order": 6, "edges": ((0, 1), (2, 3), (4, 5)), "unique": 29},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_count(order: int) -> int:
    # Four base/endpoint/isolate-parent cases for every ordered marked type,
    # plus every ordinary core-parent choice not occupied by a core mark.
    return order**3 + 3 * order**2 + 5 * order + 4


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    two_edge = json.loads((HERE / FILES["two_edge_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert two_edge["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_TWO_EDGE_ALL_PARENT_RANK7_G5_FINISH"
    )

    # Exhaustive isolate-free three-edge forest classification: a connected
    # four-vertex tree is P4 or K1,3; orders five and six force P3+K2 and 3K2.
    assert {core["order"] for core in CORES.values()} == {4, 5, 6}
    assert all(len(core["edges"]) == 3 for core in CORES.values())
    degree_sequences = {}
    for name, core in CORES.items():
        degrees = [0] * core["order"]
        for left, right in core["edges"]:
            degrees[left] += 1
            degrees[right] += 1
        assert all(degrees)
        degree_sequences[name] = sorted(degrees, reverse=True)
    assert degree_sequences == {
        "P4": [2, 2, 1, 1],
        "K1_3": [3, 1, 1, 1],
        "P3_plus_K2": [2, 1, 1, 1, 1],
        "3K2": [1, 1, 1, 1, 1, 1],
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
                    order,
                    n,
                    rank,
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
            "literal_cases_per_coefficient": len(cases),
            "unique_CD_row_signatures": len(grouped),
            "literal_case_stream_sha256": literal_stream.hexdigest().upper(),
            "unique_rows": unique_rows,
        }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with exactly three edges, every distinct marked "
            "pair, and each compatible canonical parent mode, the exact rank-seven "
            "bundle coefficients G2 and G3 are nonnegative."
        ),
        "coverage": [
            {"orders": "2<=n<=10", "method": "pinned exhaustive all-forest/all-parent finite certificate"},
            {"orders": "n>=11", "method": "exhaustive four-core role classification and positive shifted numerators"},
        ],
        "cores": core_reports,
        "literal_cases_per_coefficient": sum(
            row["literal_cases_per_coefficient"] for row in core_reports.values()
        ),
        "unique_CD_row_signatures": sum(
            row["unique_CD_row_signatures"] for row in core_reports.values()
        ),
        "global_shifted_minima": {f"G{k}": str(v) for k, v in global_minima.items()},
        "ordered_unique_row_stream_sha256": global_stream.hexdigest().upper(),
        "coverage_gap_within_three_edge_G23": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for exactly-three-edge C and rank-seven G2/G3. "
            "Cores with four or more edges remain open for these coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert report["literal_cases_per_coefficient"] == 859
    assert report["unique_CD_row_signatures"] == 240
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_cases_per_coefficient": report["literal_cases_per_coefficient"],
        "unique_CD_row_signatures": report["unique_CD_row_signatures"],
        "global_shifted_minima": report["global_shifted_minima"],
        "coverage_gap_within_three_edge_G23": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
