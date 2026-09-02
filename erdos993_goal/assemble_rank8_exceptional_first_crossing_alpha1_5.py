#!/usr/bin/env python3
"""Fail-closed cumulative exceptional first-crossing theorem, alpha1..5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json"
PINNED = {
    1: {
        "report": (
            "rank8_exceptional_first_crossing_alpha1_pilot_exact_20260820.json",
            "193BE4F3BC1418BAEE4F070D0AC1F215E2EAE035A9A07AFE71539AD1D1011F04",
            "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_PILOT",
        ),
        "audit": (
            "rank8_exceptional_first_crossing_alpha1_pilot_audit_exact_20260820.json",
            "14DE98471DD87DB704E5F97776F00016FE692494CF039B9F8887B626FDEE9D2E",
            "PASS_INDEPENDENT_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_PILOT_AUDIT",
        ),
        "type_range": [1, 2],
    },
    2: {
        "report": (
            "rank8_exceptional_first_crossing_alpha2_exact_20260820.json",
            "E7F7367B14C38F4298500FDC657B375120997657DACB64DBBA90DC3B657C386A",
            "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA2_BAND",
        ),
        "audit": (
            "rank8_exceptional_first_crossing_alpha2_audit_exact_20260820.json",
            "D20CD466290D88256D9DCB6A529C8CF32591F2070BEE7EBA6CAB0A2D39AB6B70",
            "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA2_AUDIT",
        ),
        "type_range": [3, 4],
    },
    3: {
        "report": (
            "rank8_exceptional_first_crossing_alpha3_exact_20260820.json",
            "55E3215E4205BD6B1673B35F7ED1A7BCA1B63147555B1C5C3F1E8A87F969C0BA",
            "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA3_BAND",
        ),
        "audit": (
            "rank8_exceptional_first_crossing_alpha3_audit_exact_20260820.json",
            "904EC889C7CD57B78BECE572BEEBB65B881B5E51C933E8A612BE008F55074867",
            "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA3_AUDIT",
        ),
        "type_range": [5, 9],
    },
    4: {
        "report": (
            "rank8_exceptional_first_crossing_alpha4_exact_20260820.json",
            "0737ACA3606D2B733C67BBE1CF9C10365C935FBB0C89776C6556EE219F9E5779",
            "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_BAND",
        ),
        "audit": (
            "rank8_exceptional_first_crossing_alpha4_audit_exact_20260820.json",
            "56A7253B6CCAAA2608D0F429B7AEE8348A48549D22A3E915033F94C9CE54A888",
            "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_AUDIT",
        ),
        "type_range": [10, 24],
    },
    5: {
        "report": (
            "rank8_exceptional_first_crossing_alpha5_complete_assembly_exact_20260820.json",
            "067E8986AC825027D65F22B9E4595A63BC1C5A5D4DC3795C17CCBCD9A39C775F",
            "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_COMPLETE",
        ),
        "audit": (
            "rank8_exceptional_first_crossing_alpha5_complete_assembly_audit_exact_20260820.json",
            "E48B9770ABF4BE1500E1FDC34B653BBBE518F96BEF883A9C3764A512AC251316",
            "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_ASSEMBLY_AUDIT",
        ),
        "type_range": [25, 72],
    },
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_pinned(entry):
    filename, expected_hash, expected_status = entry
    path = ROOT / filename
    assert path.is_file(), f"missing pinned input {filename}"
    assert digest(path) == expected_hash, f"hash drift in {filename}"
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["status"] == expected_status, f"status drift in {filename}"
    return path, payload


def normalize_cells(alpha, report, audit):
    if alpha == 1:
        split = report["scope"]["certified_alpha_split"]
        assert split == {"source": 13, "terminal": 1, "total": 14}
        assert audit["certified_alpha_split"] == split
        pilot = report["pilot"]
        assert pilot["ordered_covering_checks"] == pilot["distinct_crossing_jets"] == 15
        assert audit["checks"] == 15
        assert audit["negative_Q8"] == audit["zero_Q8"] == 0
        return {
            "13": {
                "source_alpha": 13,
                "terminal_alpha": 1,
                "total_alpha": 14,
                "independently_enumerated_multisets": 15,
                "canonical_check_keys": 15,
                "distinct_crossing_jets": 15,
                "multiset_to_canonical_key_collisions": 0,
                "canonical_key_to_product_collisions": 0,
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": audit["minimum_Q8"],
                "maximum_Q8": audit["maximum_Q8"],
            }
        }
    if alpha in (2, 3, 4):
        cells = {}
        for source, original in audit["cells"].items():
            cell = dict(original)
            reported = report["cells"][source]
            assert cell["canonical_check_keys"] == reported["ordered_covering_checks"]
            assert cell["distinct_crossing_jets"] == reported["distinct_crossing_jets"]
            assert cell["negative_Q8"] == reported["negative_Q8"] == 0
            assert cell["zero_Q8"] == reported["zero_Q8"] == 0
            cell["multiset_to_canonical_key_collisions"] = (
                int(cell["independently_enumerated_multisets"])
                - int(cell["canonical_check_keys"])
            )
            cell["canonical_key_to_product_collisions"] = (
                int(cell["canonical_check_keys"])
                - int(cell["distinct_crossing_jets"])
            )
            if alpha == 2:
                assert cell["source_jet_collisions_within_largest_type"] == 0
            cells[source] = cell
        return cells
    assert alpha == 5
    cells = report["cells"]
    assert audit["coverage"]["missing_sources"] == []
    assert audit["coverage"]["duplicate_source_partitions"] == []
    assert audit["aggregate"] == report["aggregate"]
    return cells


def main() -> int:
    bands = {}
    coverage_pairs = []
    pinned_hashes = {}
    for alpha in range(1, 6):
        spec = PINNED[alpha]
        report_path, report = load_pinned(spec["report"])
        audit_path, audit = load_pinned(spec["audit"])
        pinned_hashes[report_path.name] = digest(report_path)
        pinned_hashes[audit_path.name] = digest(audit_path)
        cells = normalize_cells(alpha, report, audit)
        expected_sources = list(range(14 - alpha, 14))
        assert sorted(map(int, cells)) == expected_sources
        for source in expected_sources:
            cell = cells[str(source)]
            assert cell["source_alpha"] == source
            assert cell["terminal_alpha"] == alpha
            assert cell["total_alpha"] == source + alpha
            assert cell["negative_Q8"] == cell["zero_Q8"] == 0
            assert cell["minimum_Q8"] > 0
            pair = (alpha, source)
            assert pair not in coverage_pairs
            coverage_pairs.append(pair)
        bands[str(alpha)] = {
            "terminal_alpha": alpha,
            "source_alpha_range": [14 - alpha, 13],
            "crossing_total_range": [14, 13 + alpha],
            "terminal_component_type_indices": spec["type_range"],
            "cells": cells,
            "report": report_path.name,
            "report_sha256": digest(report_path),
            "audit": audit_path.name,
            "audit_sha256": digest(audit_path),
        }

    expected_pairs = [
        (alpha, source)
        for alpha in range(1, 6)
        for source in range(14 - alpha, 14)
    ]
    assert coverage_pairs == expected_pairs
    all_cells = [
        cell for band in bands.values() for cell in band["cells"].values()
    ]
    aggregate = {
        "terminal_bands": 5,
        "source_cells": len(all_cells),
        "independently_enumerated_multisets": sum(
            int(cell["independently_enumerated_multisets"]) for cell in all_cells
        ),
        "canonical_check_keys": sum(int(cell["canonical_check_keys"]) for cell in all_cells),
        "distinct_cell_crossing_jets_sum": sum(
            int(cell["distinct_crossing_jets"]) for cell in all_cells
        ),
        "multiset_to_canonical_key_collisions": sum(
            int(cell["multiset_to_canonical_key_collisions"]) for cell in all_cells
        ),
        "canonical_key_to_product_collisions": sum(
            int(cell["canonical_key_to_product_collisions"]) for cell in all_cells
        ),
        "negative_Q8": sum(int(cell["negative_Q8"]) for cell in all_cells),
        "zero_Q8": sum(int(cell["zero_Q8"]) for cell in all_cells),
        "minimum_Q8": min(int(cell["minimum_Q8"]) for cell in all_cells),
        "maximum_Q8": max(int(cell["maximum_Q8"]) for cell in all_cells),
    }
    assert aggregate == {
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
        "schema": "rank8-exceptional-first-crossing-alpha1-5-cumulative-v1",
        "status": "PASS_FAIL_CLOSED_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5",
        "theorem": (
            "Every exceptional-only threshold-14 first crossing whose unique "
            "largest sorted component type has alpha at most5 has literal Q8>0."
        ),
        "fail_closed_policy": (
            "The assembly fails on any missing file, pinned SHA drift, non-PASS "
            "status, missing or duplicate (terminal alpha,source alpha) cell, audit/report "
            "count mismatch, nonpositive minimum, negative sign, or zero sign."
        ),
        "coverage": {
            "terminal_alpha_range": [1, 5],
            "terminal_component_type_indices": [1, 72],
            "source_rule": "14-terminal_alpha <= source_alpha <= 13",
            "source_cells": [
                {"terminal_alpha": alpha, "source_alpha": source}
                for alpha, source in coverage_pairs
            ],
            "missing_cells": [],
            "duplicate_cells": [],
        },
        "bands": bands,
        "aggregate": aggregate,
        "remaining_terminal_bands": [6, 7, 8, 9],
        "scope_warning": (
            "This is a cumulative partial first-crossing theorem, not the complete "
            "exceptional-only crossing certificate or full forest lift."
        ),
        "hashes": {
            **pinned_hashes,
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"bands=5 cells=15 raw={aggregate['independently_enumerated_multisets']} "
        f"keys={aggregate['canonical_check_keys']} products={aggregate['distinct_cell_crossing_jets_sum']} "
        "negative=0 zero=0"
    )
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
