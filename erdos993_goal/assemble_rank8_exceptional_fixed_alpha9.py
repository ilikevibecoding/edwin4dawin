#!/usr/bin/env python3
"""Independent terminal assembly of the alpha=9 fixed/full cone reports."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha9_independent_assembly_exact_20260820.json"
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_by_alpha"]["9"] == 15
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["hashes"][JETS.name] == digest(JETS)

    jets = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = [int(row[f"i{rank}"]) for rank in range(10)]
            alpha = int(row["alpha"])
            q8 = int(row["q8"])
            assert q8 == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
            jets.append({"index": index, "alpha": alpha, "polynomial": polynomial, "q8": q8})
    alpha9 = [row for row in jets if row["alpha"] == 9]
    assert len(alpha9) == 15
    assert [row["index"] for row in alpha9] == list(range(1201, 1216))
    assert len({tuple(row["polynomial"]) for row in alpha9}) == 15
    assert all(row["polynomial"][0] == 1 and row["polynomial"][9] > 0 for row in alpha9)
    assert all(row["q8"] < 0 for row in alpha9)
    assert jets[1199]["alpha"] == 8 and len(jets) == 1215

    modes = {}
    report_hashes = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        path = ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_1201_1215.json"
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["status"] == f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
        assert report["mode"] == mode and report["range_start"] == 1201 and report["range_stop"] == 1215
        assert report["exceptional_jet_total"] == 1215 and report["cases"] == 15
        assert [row["index"] for row in report["rows"]] == list(range(1201, 1216))
        assert all(row["alpha"] == 9 and row["fixed_Q8"] < 0 for row in report["rows"])
        assert all(row["negative"] == 0 and row["minimum"] == 1 and row["terms"] == terms_per_case for row in report["rows"])
        assert report["statistics"]["terms"] == terms_per_case * 15
        assert report["statistics"]["negative"] == 0 and report["statistics"]["minimum"] == 1
        assert report["peak_private_bytes"] < LIMIT
        assert report["hashes"][JETS.name] == digest(JETS)
        assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
        assert report["hashes"][VERIFIER.name] == digest(VERIFIER)
        fixed_q8 = [row["fixed_Q8"] for row in report["rows"]]
        assert fixed_q8 == [row["q8"] for row in alpha9]
        report_hashes[path.name] = digest(path)
        modes[mode] = {
            "report": path.name,
            "report_sha256": digest(path),
            "cases": 15,
            "terms": report["statistics"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "maximum_coefficient": report["statistics"]["maximum"],
            "fixed_Q8_negative_cases": 15,
            "fixed_Q8_minimum": min(fixed_q8),
            "fixed_Q8_maximum": max(fixed_q8),
            "elapsed_seconds": report["elapsed_seconds"],
            "peak_private_bytes": report["peak_private_bytes"],
            "peak_private_MiB": report["peak_private_bytes"] / 1024**2,
        }

    payload = {
        "schema": "rank8-exceptional-fixed-alpha9-independent-assembly-v1",
        "status": "PASS_EXACT_TERMINAL_RANK8_EXCEPTIONAL_FIXED_ALPHA9_BOTH_FULL_CONES_ASSEMBLED",
        "theorem": "Adjoining any exceptional connected-tree jet with alpha=9 to an abstract rank-eight high or low full factor preserves Q8, despite every fixed jet having negative Q8.",
        "terminal_coverage": {
            "classification_alpha9_count": 15,
            "covered_database_indices": [1201, 1215],
            "preceding_index_alpha": 8,
            "database_terminal_index": 1215,
            "no_following_exceptional_jet": True,
        },
        "cones": modes,
        "totals": {
            "fixed_cone_cases": 30,
            "symbolic_terms": modes["high"]["terms"] + modes["low"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "fixed_Q8_negative_jets": 15,
            "elapsed_seconds_sequential": modes["high"]["elapsed_seconds"] + modes["low"]["elapsed_seconds"],
            "maximum_peak_private_bytes": max(modes["high"]["peak_private_bytes"], modes["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This closes exactly alpha=9 fixed/full and ends the classified exceptional database. It does not close full/full cones, first crossing, connected Q8, forest Q8, PGC, or Delta4.",
        "hashes": {
            CLASSIFICATION.name: digest(CLASSIFICATION),
            JETS.name: digest(JETS),
            VERIFIER.name: digest(VERIFIER),
            Path(__file__).name: digest(Path(__file__)),
            **report_hashes,
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
