#!/usr/bin/env python3
"""Independent terminal audit of the alpha=9 fixed/full assembly."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
ASSEMBLER = ROOT / "assemble_rank8_exceptional_fixed_alpha9.py"
ASSEMBLY = ROOT / "rank8_exceptional_fixed_alpha9_independent_assembly_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha9_independent_audit_exact_20260820.json"
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert classification["distinct_by_alpha"]["9"] == 15 and classification["distinct_exceptional_jets"] == 1215
    assert assembly["status"] == "PASS_EXACT_TERMINAL_RANK8_EXCEPTIONAL_FIXED_ALPHA9_BOTH_FULL_CONES_ASSEMBLED"

    alpha = {}
    q8 = {}
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(10))
            alpha[index] = int(row["alpha"])
            q8[index] = int(row["q8"])
            assert q8[index] == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
    expected = list(range(1201, 1216))
    assert [index for index in alpha if alpha[index] == 9] == expected
    assert alpha[1200] == 8 and max(alpha) == 1215
    assert all(q8[index] < 0 for index in expected)

    audited = {}
    report_hashes = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        path = ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_1201_1215.json"
        report = json.loads(path.read_text(encoding="utf-8"))
        sha = digest(path)
        assert assembly["hashes"][path.name] == sha
        assert report["hashes"][JETS.name] == digest(JETS)
        assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
        assert report["hashes"][VERIFIER.name] == digest(VERIFIER)
        assert [row["index"] for row in report["rows"]] == expected
        assert all(row["alpha"] == 9 and row["fixed_Q8"] == q8[row["index"]] < 0 for row in report["rows"])
        assert all(row["terms"] == terms_per_case and row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
        assert report["statistics"]["terms"] == terms_per_case * 15
        assert report["peak_private_bytes"] < LIMIT
        fixed_values = [row["fixed_Q8"] for row in report["rows"]]
        audited[mode] = {
            "cases": 15,
            "terms": report["statistics"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "fixed_Q8_negative_cases": 15,
            "fixed_Q8_minimum": min(fixed_values),
            "fixed_Q8_maximum": max(fixed_values),
            "elapsed_seconds": report["elapsed_seconds"],
            "peak_private_bytes": report["peak_private_bytes"],
        }
        report_hashes[path.name] = sha
    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    assert assembly["totals"]["fixed_cone_cases"] == 30
    assert assembly["totals"]["symbolic_terms"] == 32695530

    payload = {
        "schema": "rank8-exceptional-fixed-alpha9-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_TERMINAL_RANK8_EXCEPTIONAL_FIXED_ALPHA9_BOTH_FULL_CONES",
        "coverage": {
            "alpha": 9,
            "classification_count": 15,
            "database_indices": [1201, 1215],
            "unique_indices": 15,
            "preceding_index_alpha": 8,
            "terminal_database_index": 1215,
        },
        "audited_cones": audited,
        "totals": {
            "fixed_cone_cases": 30,
            "symbolic_terms": 32695530,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "fixed_Q8_negative_jets": 15,
            "maximum_peak_private_bytes": max(audited["high"]["peak_private_bytes"], audited["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This audits terminal alpha=9 fixed/full only. It does not certify full/full cones, first crossing, connected Q8, forest Q8, PGC, or Delta4.",
        "hashes": {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            VERIFIER.name: digest(VERIFIER),
            ASSEMBLER.name: digest(ASSEMBLER),
            ASSEMBLY.name: digest(ASSEMBLY),
            Path(__file__).name: digest(Path(__file__)),
            **report_hashes,
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
