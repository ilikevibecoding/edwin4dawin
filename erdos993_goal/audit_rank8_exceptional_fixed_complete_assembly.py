#!/usr/bin/env python3
"""Independent audit of the complete exceptional fixed/full database assembly."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
ASSEMBLER = ROOT / "assemble_rank8_exceptional_fixed_complete.py"
ASSEMBLY = ROOT / "rank8_exceptional_fixed_complete_independent_assembly_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_fixed_complete_independent_audit_exact_20260820.json"
PARTITIONS = (
    (1, 2), (3, 4), (5, 9), (10, 24), (25, 72), (73, 247),
    *((start, start + 49) for start in range(248, 948, 50)),
    (948, 997), (998, 1047), (1048, 1097), (1098, 1147), (1148, 1197), (1198, 1200),
    (1201, 1215),
)
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_FULL_DATABASE_COMPLETE"
    assert assembly["coverage"]["partitions"] == [list(partition) for partition in PARTITIONS]
    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)

    alpha = {}
    q8 = {}
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(10))
            alpha[index] = int(row["alpha"])
            q8[index] = int(row["q8"])
            assert q8[index] == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
    assert list(alpha) == list(range(1, 1216))
    assert sum(value < 0 for value in q8.values()) == 268

    report_hashes = {}
    audited = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        indices = []
        counts_by_alpha = {str(value): 0 for value in range(1, 10)}
        cases = terms = negative = fixed_negative = 0
        minimum = None
        elapsed = 0.0
        peak = 0
        for start, stop in PARTITIONS:
            path = ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"
            report = json.loads(path.read_text(encoding="utf-8"))
            sha = digest(path)
            assert assembly["hashes"][path.name] == sha
            assert report["hashes"][JETS.name] == digest(JETS)
            assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
            assert report["hashes"][VERIFIER.name] == digest(VERIFIER)
            shard_indices = [row["index"] for row in report["rows"]]
            assert shard_indices == list(range(start, stop + 1))
            assert all(row["alpha"] == alpha[row["index"]] and row["fixed_Q8"] == q8[row["index"]] for row in report["rows"])
            assert all(row["terms"] == terms_per_case and row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
            assert report["peak_private_bytes"] < LIMIT
            indices.extend(shard_indices)
            for row in report["rows"]:
                counts_by_alpha[str(row["alpha"])] += 1
                fixed_negative += row["fixed_Q8"] < 0
            cases += len(report["rows"])
            terms += sum(row["terms"] for row in report["rows"])
            negative += sum(row["negative"] for row in report["rows"])
            row_min = min(row["minimum"] for row in report["rows"])
            minimum = row_min if minimum is None else min(minimum, row_min)
            elapsed += report["elapsed_seconds"]
            peak = max(peak, report["peak_private_bytes"])
            report_hashes[path.name] = sha
        assert indices == list(range(1, 1216)) and len(indices) == len(set(indices)) == 1215
        assert cases == 1215 and terms == terms_per_case * 1215
        assert negative == 0 and minimum == 1 and fixed_negative == 268
        assert counts_by_alpha == classification["distinct_by_alpha"]
        assert assembly["cones"][mode]["cases"] == cases
        assert assembly["cones"][mode]["terms"] == terms
        assert assembly["cones"][mode]["peak_private_bytes"] == peak
        assert abs(assembly["cones"][mode]["elapsed_seconds"] - elapsed) < 1e-9
        audited[mode] = {
            "cases": cases,
            "terms": terms,
            "negative_coefficients": negative,
            "minimum_coefficient": minimum,
            "fixed_Q8_negative_cases": fixed_negative,
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
            "cases_by_alpha": counts_by_alpha,
        }

    assert assembly["totals"]["fixed_cone_cases"] == 2430
    assert assembly["totals"]["symbolic_terms"] == 2648337930
    payload = {
        "schema": "rank8-exceptional-fixed-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_FULL_DATABASE_COMPLETE",
        "coverage": {
            "database_indices": [1, 1215],
            "unique_exceptional_jets": 1215,
            "alpha_range": [1, 9],
            "negative_fixed_Q8_jets": 268,
            "report_partitions_per_mode": 27,
            "no_gaps_or_duplicates": True,
        },
        "audited_cones": audited,
        "totals": {
            "fixed_cone_cases": 2430,
            "symbolic_terms": 2648337930,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "maximum_peak_private_bytes": max(audited["high"]["peak_private_bytes"], audited["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This independently closes fixed-exceptional/full only. Full/full cones, first crossing, connected Q8, forest Q8, PGC, and Delta4 remain separate obligations.",
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
