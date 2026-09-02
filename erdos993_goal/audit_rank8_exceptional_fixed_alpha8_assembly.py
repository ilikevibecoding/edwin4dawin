#!/usr/bin/env python3
"""Independent integrity and coverage audit of the alpha=8 shard assembly."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
ASSEMBLER = ROOT / "assemble_rank8_exceptional_fixed_alpha8.py"
ASSEMBLY = ROOT / "rank8_exceptional_fixed_alpha8_independent_assembly_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha8_independent_audit_exact_20260820.json"
SHARDS = ((948, 997), (998, 1047), (1048, 1097), (1098, 1147), (1148, 1197), (1198, 1200))
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert classification["distinct_by_alpha"]["8"] == 253
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA8_BOTH_FULL_CONES_ASSEMBLED"
    assert assembly["no_gap"]["shards"] == [list(shard) for shard in SHARDS]

    rows = {}
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(10))
            alpha = int(row["alpha"])
            q8 = int(row["q8"])
            assert q8 == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
            rows[index] = {"alpha": alpha, "q8": q8, "polynomial": polynomial}
    expected = list(range(948, 1201))
    assert [index for index in rows if rows[index]["alpha"] == 8] == expected
    assert rows[947]["alpha"] == 7 and rows[1201]["alpha"] == 9
    assert all(rows[index]["q8"] < 0 for index in expected)
    assert len({rows[index]["polynomial"] for index in expected}) == 253

    audited = {}
    report_hashes = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        indices = []
        fixed_q8 = []
        cases = terms = negative = 0
        minimum = None
        elapsed = 0.0
        peak = 0
        for start, stop in SHARDS:
            path = ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"
            report = json.loads(path.read_text(encoding="utf-8"))
            sha = digest(path)
            assert assembly["hashes"][path.name] == sha
            assert report["hashes"][JETS.name] == digest(JETS)
            assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
            assert report["hashes"][VERIFIER.name] == digest(VERIFIER)
            shard_indices = [row["index"] for row in report["rows"]]
            assert shard_indices == list(range(start, stop + 1))
            assert all(row["alpha"] == 8 and row["fixed_Q8"] == rows[row["index"]]["q8"] < 0 for row in report["rows"])
            assert all(row["negative"] == 0 and row["minimum"] == 1 and row["terms"] == terms_per_case for row in report["rows"])
            assert report["peak_private_bytes"] < LIMIT
            indices.extend(shard_indices)
            fixed_q8.extend(row["fixed_Q8"] for row in report["rows"])
            cases += len(report["rows"])
            terms += sum(row["terms"] for row in report["rows"])
            negative += sum(row["negative"] for row in report["rows"])
            row_minimum = min(row["minimum"] for row in report["rows"])
            minimum = row_minimum if minimum is None else min(minimum, row_minimum)
            elapsed += report["elapsed_seconds"]
            peak = max(peak, report["peak_private_bytes"])
            report_hashes[path.name] = sha
        assert indices == expected and len(indices) == len(set(indices)) == 253
        assert cases == 253 and terms == terms_per_case * 253
        assert negative == 0 and minimum == 1
        assert fixed_q8 == [rows[index]["q8"] for index in expected]
        assert all(value < 0 for value in fixed_q8)
        assert assembly["cones"][mode]["cases"] == cases
        assert assembly["cones"][mode]["terms"] == terms
        assert assembly["cones"][mode]["peak_private_bytes"] == peak
        assert abs(assembly["cones"][mode]["elapsed_seconds"] - elapsed) < 1e-9
        assert assembly["cones"][mode]["fixed_Q8_minimum"] == min(fixed_q8)
        assert assembly["cones"][mode]["fixed_Q8_maximum"] == max(fixed_q8)
        audited[mode] = {
            "cases": cases,
            "terms": terms,
            "negative_coefficients": negative,
            "minimum_coefficient": minimum,
            "fixed_Q8_negative_cases": len(fixed_q8),
            "fixed_Q8_minimum": min(fixed_q8),
            "fixed_Q8_maximum": max(fixed_q8),
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
        }

    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    assert assembly["totals"]["fixed_cone_cases"] == 506
    assert assembly["totals"]["symbolic_terms"] == 551464606
    assert assembly["totals"]["negative_coefficients"] == 0
    assert assembly["totals"]["fixed_Q8_negative_jets"] == 253
    payload = {
        "schema": "rank8-exceptional-fixed-alpha8-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA8_BOTH_FULL_CONES",
        "coverage": {
            "alpha": 8,
            "classification_count": 253,
            "database_indices": [948, 1200],
            "unique_indices": 253,
            "preceding_index_alpha": 7,
            "following_index_alpha": 9,
            "shards": [list(shard) for shard in SHARDS],
        },
        "audited_cones": audited,
        "totals": {
            "fixed_cone_cases": 506,
            "symbolic_terms": 551464606,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "fixed_Q8_negative_jets": 253,
            "maximum_peak_private_bytes": max(audited["high"]["peak_private_bytes"], audited["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This independently audits only alpha=8 fixed/full. It does not certify alpha=9, full/full cones, first crossing, connected Q8, forest Q8, PGC, or Delta4.",
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
