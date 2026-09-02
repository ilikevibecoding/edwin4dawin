#!/usr/bin/env python3
"""Independent no-gap assembly of all alpha=8 fixed/full cone shards."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha8_independent_assembly_exact_20260820.json"
SHARDS = ((948, 997), (998, 1047), (1048, 1097), (1098, 1147), (1148, 1197), (1198, 1200))
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(mode: str, start: int, stop: int) -> Path:
    return ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"


def main() -> None:
    assert [index for start, stop in SHARDS for index in range(start, stop + 1)] == list(range(948, 1201))
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_by_alpha"]["8"] == 253
    assert classification["hashes"][JETS.name] == digest(JETS)

    jets = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = [int(row[f"i{rank}"]) for rank in range(10)]
            alpha = int(row["alpha"])
            q8 = int(row["q8"])
            assert q8 == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
            jets.append({"index": index, "alpha": alpha, "polynomial": polynomial, "q8": q8})
    alpha8 = [row for row in jets if row["alpha"] == 8]
    assert len(alpha8) == 253
    assert [row["index"] for row in alpha8] == list(range(948, 1201))
    assert len({tuple(row["polynomial"]) for row in alpha8}) == 253
    assert all(row["polynomial"][0] == 1 and row["polynomial"][8] > 0 and row["polynomial"][9] == 0 for row in alpha8)
    assert all(row["q8"] < 0 for row in alpha8)
    assert jets[946]["alpha"] == 7 and jets[1200]["alpha"] == 9

    modes = {}
    report_hashes = {}
    for mode in ("high", "low"):
        covered = []
        cases = terms = negative = 0
        minimum = maximum = None
        fixed_q8_values = []
        elapsed = 0.0
        peak = 0
        reports = []
        for start, stop in SHARDS:
            path = report_path(mode, start, stop)
            report = json.loads(path.read_text(encoding="utf-8"))
            expected_cases = stop - start + 1
            expected_status = f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
            assert report["status"] == expected_status and report["mode"] == mode
            assert report["range_start"] == start and report["range_stop"] == stop
            assert report["exceptional_jet_total"] == 1215 and report["cases"] == expected_cases
            assert [row["index"] for row in report["rows"]] == list(range(start, stop + 1))
            assert [row["alpha"] for row in report["rows"]] == [8] * expected_cases
            assert all(row["fixed_Q8"] < 0 for row in report["rows"])
            assert all(row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
            assert report["statistics"]["terms"] == sum(row["terms"] for row in report["rows"])
            assert report["statistics"]["negative"] == 0 and report["statistics"]["minimum"] == 1
            assert report["peak_private_bytes"] < LIMIT
            assert report["hashes"][JETS.name] == digest(JETS)
            assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
            assert report["hashes"][VERIFIER.name] == digest(VERIFIER)

            covered.extend(row["index"] for row in report["rows"])
            fixed_q8_values.extend(row["fixed_Q8"] for row in report["rows"])
            cases += report["cases"]
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
        assert covered == list(range(948, 1201))
        assert len(covered) == len(set(covered)) == 253
        assert cases == 253 and negative == 0 and minimum == 1
        assert fixed_q8_values == [row["q8"] for row in alpha8]
        assert all(value < 0 for value in fixed_q8_values)
        expected_terms = 886350 * 253 if mode == "high" else 1293352 * 253
        assert terms == expected_terms
        modes[mode] = {
            "reports": reports,
            "cases": cases,
            "terms": terms,
            "negative_coefficients": negative,
            "minimum_coefficient": minimum,
            "maximum_coefficient": maximum,
            "fixed_Q8_negative_cases": len(fixed_q8_values),
            "fixed_Q8_minimum": min(fixed_q8_values),
            "fixed_Q8_maximum": max(fixed_q8_values),
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        }

    payload = {
        "schema": "rank8-exceptional-fixed-alpha8-independent-assembly-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA8_BOTH_FULL_CONES_ASSEMBLED",
        "theorem": "Adjoining any exceptional connected-tree jet with alpha=8 to an abstract rank-eight high or low full factor preserves Q8, despite every fixed jet having negative Q8.",
        "no_gap": {
            "classification_alpha8_count": 253,
            "covered_database_indices": [948, 1200],
            "shards": [list(shard) for shard in SHARDS],
            "preceding_index_alpha": 7,
            "following_index_alpha": 9,
        },
        "cones": modes,
        "totals": {
            "fixed_cone_cases": modes["high"]["cases"] + modes["low"]["cases"],
            "symbolic_terms": modes["high"]["terms"] + modes["low"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "fixed_Q8_negative_jets": 253,
            "elapsed_seconds_sequential": modes["high"]["elapsed_seconds"] + modes["low"]["elapsed_seconds"],
            "maximum_peak_private_bytes": max(modes["high"]["peak_private_bytes"], modes["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This closes exactly the alpha=8 exceptional fixed/full class. Alpha=9 was not run. It does not close full/full cones, first crossing, connected Q8, the complete forest lift, PGC, or Delta4.",
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
