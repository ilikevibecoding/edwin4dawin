#!/usr/bin/env python3
"""Independent fail-closed audit of cumulative alpha1..5 crossing theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_exceptional_first_crossing_alpha1_5.py"
ASSEMBLY = ROOT / "rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha1_5_cumulative_audit_exact_20260820.json"
EXPECTED_ASSEMBLER = "DA3DF4C794E803544C7FC2A0E8FB87F460A3A67B805ED599DB2A26CF4F5E3213"
EXPECTED_ASSEMBLY = "13D2FEF2B889A8F85FDB7A2D8F38CDE7E0B9DA9A0C5C9EA249E632845E264EE7"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    assert digest(ASSEMBLER) == EXPECTED_ASSEMBLER
    assert digest(ASSEMBLY) == EXPECTED_ASSEMBLY
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert (
        assembly["status"]
        == "PASS_FAIL_CLOSED_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5"
    )
    assert set(assembly["bands"]) == {"1", "2", "3", "4", "5"}
    expected_pairs = []
    recomputed_cells = []
    last_type = 0
    for alpha in range(1, 6):
        band = assembly["bands"][str(alpha)]
        expected_sources = list(range(14 - alpha, 14))
        assert band["terminal_alpha"] == alpha
        assert band["source_alpha_range"] == [14 - alpha, 13]
        assert band["crossing_total_range"] == [14, 13 + alpha]
        assert band["terminal_component_type_indices"][0] == last_type + 1
        last_type = band["terminal_component_type_indices"][1]
        assert sorted(map(int, band["cells"])) == expected_sources
        report = ROOT / band["report"]
        audit = ROOT / band["audit"]
        assert digest(report) == band["report_sha256"] == assembly["hashes"][report.name]
        assert digest(audit) == band["audit_sha256"] == assembly["hashes"][audit.name]
        for source in expected_sources:
            cell = band["cells"][str(source)]
            assert cell["source_alpha"] == source
            assert cell["terminal_alpha"] == alpha
            assert cell["total_alpha"] == source + alpha
            assert cell["negative_Q8"] == cell["zero_Q8"] == 0
            assert cell["minimum_Q8"] > 0
            expected_pairs.append((alpha, source))
            recomputed_cells.append(cell)
    assert last_type == 72
    assert len(expected_pairs) == len(set(expected_pairs)) == 15
    reported_pairs = [
        (row["terminal_alpha"], row["source_alpha"])
        for row in assembly["coverage"]["source_cells"]
    ]
    assert reported_pairs == expected_pairs
    assert assembly["coverage"]["missing_cells"] == []
    assert assembly["coverage"]["duplicate_cells"] == []
    assert assembly["remaining_terminal_bands"] == [6, 7, 8, 9]

    aggregate = {
        "terminal_bands": 5,
        "source_cells": 15,
        "independently_enumerated_multisets": sum(
            int(cell["independently_enumerated_multisets"]) for cell in recomputed_cells
        ),
        "canonical_check_keys": sum(
            int(cell["canonical_check_keys"]) for cell in recomputed_cells
        ),
        "distinct_cell_crossing_jets_sum": sum(
            int(cell["distinct_crossing_jets"]) for cell in recomputed_cells
        ),
        "multiset_to_canonical_key_collisions": sum(
            int(cell["multiset_to_canonical_key_collisions"]) for cell in recomputed_cells
        ),
        "canonical_key_to_product_collisions": sum(
            int(cell["canonical_key_to_product_collisions"]) for cell in recomputed_cells
        ),
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": min(int(cell["minimum_Q8"]) for cell in recomputed_cells),
        "maximum_Q8": max(int(cell["maximum_Q8"]) for cell in recomputed_cells),
    }
    assert aggregate == assembly["aggregate"] == {
        "terminal_bands": 5,
        "source_cells": 15,
        "independently_enumerated_multisets": 3688718,
        "canonical_check_keys": 2747704,
        "distinct_cell_crossing_jets_sum": 2141645,
        "multiset_to_canonical_key_collisions": 941014,
        "canonical_key_to_product_collisions": 606059,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": 9324000,
        "maximum_Q8": 105099639472256,
    }
    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha1-5-cumulative-audit-v1",
        "status": "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5_AUDIT",
        "coverage": {
            "terminal_alphas": list(range(1, 6)),
            "terminal_type_indices": [1, 72],
            "source_cells": 15,
            "missing_cells": [],
            "duplicate_cells": [],
        },
        "aggregate": aggregate,
        "scope_warning": (
            "The cumulative theorem ends at terminal alpha5; terminal alpha6 "
            "through9 and the other forest-lift inputs remain."
        ),
        "hashes": {
            ASSEMBLER.name: digest(ASSEMBLER),
            ASSEMBLY.name: digest(ASSEMBLY),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
