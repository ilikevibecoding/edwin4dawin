#!/usr/bin/env python3
"""Independent integrity and coverage audit of the alpha=7 shard assembly."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
ASSEMBLER = ROOT / "assemble_rank8_exceptional_fixed_alpha7.py"
ASSEMBLY = ROOT / "rank8_exceptional_fixed_alpha7_independent_assembly_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha7_independent_audit_exact_20260820.json"
SHARDS = tuple((start, start + 49) for start in range(248, 948, 50))
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert classification["distinct_by_alpha"]["7"] == 700
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA7_BOTH_FULL_CONES_ASSEMBLED"
    assert assembly["no_gap"]["shards"] == [list(shard) for shard in SHARDS]

    alpha_by_index = {}
    q8_by_index = {}
    polynomial_by_index = {}
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            alpha_by_index[index] = int(row["alpha"])
            q8_by_index[index] = int(row["q8"])
            polynomial_by_index[index] = tuple(int(row[f"i{rank}"]) for rank in range(10))
    expected = list(range(248, 948))
    assert [index for index in alpha_by_index if alpha_by_index[index] == 7] == expected
    assert alpha_by_index[247] == 6 and alpha_by_index[948] == 8
    assert all(q8_by_index[index] == 0 for index in expected)
    assert len({polynomial_by_index[index] for index in expected}) == 700

    audited = {}
    all_hashes = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        indices = []
        total_terms = total_cases = total_negative = 0
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
            shard_indices = [int(row["index"]) for row in report["rows"]]
            assert shard_indices == list(range(start, stop + 1))
            assert all(alpha_by_index[index] == 7 and q8_by_index[index] == 0 for index in shard_indices)
            assert all(row["alpha"] == 7 and row["fixed_Q8"] == 0 for row in report["rows"])
            assert all(row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
            assert all(row["terms"] == terms_per_case for row in report["rows"])
            assert report["peak_private_bytes"] < LIMIT
            indices.extend(shard_indices)
            total_cases += len(report["rows"])
            total_terms += sum(row["terms"] for row in report["rows"])
            total_negative += sum(row["negative"] for row in report["rows"])
            row_minimum = min(row["minimum"] for row in report["rows"])
            minimum = row_minimum if minimum is None else min(minimum, row_minimum)
            elapsed += report["elapsed_seconds"]
            peak = max(peak, report["peak_private_bytes"])
            all_hashes[path.name] = sha
        assert indices == expected and len(indices) == len(set(indices)) == 700
        assert total_cases == 700
        assert total_terms == terms_per_case * 700
        assert total_negative == 0 and minimum == 1
        assert assembly["cones"][mode]["cases"] == total_cases
        assert assembly["cones"][mode]["terms"] == total_terms
        assert assembly["cones"][mode]["peak_private_bytes"] == peak
        assert abs(assembly["cones"][mode]["elapsed_seconds"] - elapsed) < 1e-9
        audited[mode] = {
            "cases": total_cases,
            "terms": total_terms,
            "negative_coefficients": total_negative,
            "minimum_coefficient": minimum,
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
        }

    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    assert assembly["totals"]["fixed_cone_cases"] == 1400
    assert assembly["totals"]["symbolic_terms"] == 1525791400
    assert assembly["totals"]["negative_coefficients"] == 0
    assert assembly["totals"]["minimum_coefficient"] == 1
    payload = {
        "schema": "rank8-exceptional-fixed-alpha7-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA7_BOTH_FULL_CONES",
        "coverage": {
            "alpha": 7,
            "classification_count": 700,
            "database_indices": [248, 947],
            "unique_indices": 700,
            "preceding_index_alpha": 6,
            "following_index_alpha": 8,
            "shards": [list(shard) for shard in SHARDS],
        },
        "audited_cones": audited,
        "totals": {
            "fixed_cone_cases": 1400,
            "symbolic_terms": 1525791400,
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "maximum_peak_private_bytes": max(audited["high"]["peak_private_bytes"], audited["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This independently audits only alpha=7 fixed/full. It does not certify alpha>=8, full/full cones, first crossing, connected Q8, forest Q8, or Delta4.",
        "hashes": {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            VERIFIER.name: digest(VERIFIER),
            ASSEMBLER.name: digest(ASSEMBLER),
            ASSEMBLY.name: digest(ASSEMBLY),
            Path(__file__).name: digest(Path(__file__)),
            **all_hashes,
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
