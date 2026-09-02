#!/usr/bin/env python3
"""Independent no-gap assembly of the complete exceptional fixed/full database."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
OUTPUT = ROOT / "rank8_exceptional_fixed_complete_independent_assembly_exact_20260820.json"
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
    flattened = [index for start, stop in PARTITIONS for index in range(start, stop + 1)]
    assert flattened == list(range(1, 1216))
    assert len(PARTITIONS) == 27

    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["distinct_negative_Q8_jets"] == 268
    assert classification["hashes"][JETS.name] == digest(JETS)

    jets = {}
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(10))
            alpha = int(row["alpha"])
            q8 = int(row["q8"])
            assert q8 == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
            jets[index] = {"alpha": alpha, "q8": q8, "polynomial": polynomial}
    assert list(jets) == list(range(1, 1216))
    assert len({row["polynomial"] for row in jets.values()}) == 1215
    assert sum(row["q8"] < 0 for row in jets.values()) == 268

    report_hashes = {}
    modes = {}
    for mode, terms_per_case in (("high", 886350), ("low", 1293352)):
        covered = []
        alpha_counts = {str(alpha): 0 for alpha in range(1, 10)}
        cases = terms = negative = 0
        minimum = maximum = None
        elapsed = 0.0
        peak = 0
        fixed_negative = 0
        reports = []
        for start, stop in PARTITIONS:
            path = ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"
            report = json.loads(path.read_text(encoding="utf-8"))
            expected_cases = stop - start + 1
            expected_status = f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
            assert report["status"] == expected_status and report["mode"] == mode
            assert report["range_start"] == start and report["range_stop"] == stop
            assert report["exceptional_jet_total"] == 1215 and report["cases"] == expected_cases
            assert [row["index"] for row in report["rows"]] == list(range(start, stop + 1))
            assert all(row["alpha"] == jets[row["index"]]["alpha"] for row in report["rows"])
            assert all(row["fixed_Q8"] == jets[row["index"]]["q8"] for row in report["rows"])
            assert all(row["terms"] == terms_per_case and row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
            assert report["statistics"]["terms"] == terms_per_case * expected_cases
            assert report["statistics"]["negative"] == 0 and report["statistics"]["minimum"] == 1
            assert report["peak_private_bytes"] < LIMIT
            assert report["hashes"][JETS.name] == digest(JETS)
            assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
            assert report["hashes"][VERIFIER.name] == digest(VERIFIER)

            covered.extend(row["index"] for row in report["rows"])
            for row in report["rows"]:
                alpha_counts[str(row["alpha"])] += 1
                fixed_negative += row["fixed_Q8"] < 0
            cases += expected_cases
            terms += report["statistics"]["terms"]
            negative += report["statistics"]["negative"]
            minimum = report["statistics"]["minimum"] if minimum is None else min(minimum, report["statistics"]["minimum"])
            maximum = report["statistics"]["maximum"] if maximum is None else max(maximum, report["statistics"]["maximum"])
            elapsed += report["elapsed_seconds"]
            peak = max(peak, report["peak_private_bytes"])
            sha = digest(path)
            report_hashes[path.name] = sha
            reports.append({
                "report": path.name,
                "sha256": sha,
                "range": [start, stop],
                "cases": expected_cases,
                "elapsed_seconds": report["elapsed_seconds"],
                "peak_private_bytes": report["peak_private_bytes"],
            })
        assert covered == list(range(1, 1216)) and len(covered) == len(set(covered)) == 1215
        assert cases == 1215 and terms == terms_per_case * 1215
        assert negative == 0 and minimum == 1 and fixed_negative == 268
        assert alpha_counts == classification["distinct_by_alpha"]
        modes[mode] = {
            "reports": reports,
            "report_count": len(reports),
            "cases": cases,
            "terms": terms,
            "negative_coefficients": negative,
            "minimum_coefficient": minimum,
            "maximum_coefficient": maximum,
            "fixed_Q8_negative_cases": fixed_negative,
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
            "cases_by_alpha": alpha_counts,
        }

    payload = {
        "schema": "rank8-exceptional-fixed-complete-independent-assembly-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_FULL_DATABASE_COMPLETE",
        "theorem": "Adjoining any classified exceptional connected-tree jet to an abstract rank-eight high or low full factor preserves Q8.",
        "coverage": {
            "database_indices": [1, 1215],
            "distinct_exceptional_jets": 1215,
            "distinct_negative_fixed_Q8_jets": 268,
            "alpha_range": [1, 9],
            "partitions": [list(partition) for partition in PARTITIONS],
            "no_gaps_or_duplicates": True,
        },
        "cones": modes,
        "totals": {
            "fixed_cone_cases": 2430,
            "symbolic_terms": modes["high"]["terms"] + modes["low"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "elapsed_seconds_sequential": modes["high"]["elapsed_seconds"] + modes["low"]["elapsed_seconds"],
            "maximum_peak_private_bytes": max(modes["high"]["peak_private_bytes"], modes["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This completes the fixed-exceptional/full obligation only. It does not close any full/full cone, exceptional first crossing, connected Q8, forest Q8, PGC, or Delta4.",
        "hashes": {
            CLASSIFICATION.name: digest(CLASSIFICATION),
            JETS.name: digest(JETS),
            VERIFIER.name: digest(VERIFIER),
            Path(__file__).name: digest(Path(__file__)),
            **report_hashes,
        },
    }
    assert payload["totals"]["symbolic_terms"] == 2648337930
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
