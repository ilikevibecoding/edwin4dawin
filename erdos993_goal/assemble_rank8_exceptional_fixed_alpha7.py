#!/usr/bin/env python3
"""Independent no-gap assembly of all alpha=7 fixed/full cone shards."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
VERIFIER = ROOT / "verify_rank8_exceptional_fixed_full.py"
OUTPUT = ROOT / "rank8_exceptional_fixed_alpha7_independent_assembly_exact_20260820.json"
SHARDS = [(start, start + 49) for start in range(248, 948, 50)]
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(mode: str, start: int, stop: int) -> Path:
    return ROOT / f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"


def main() -> None:
    assert len(SHARDS) == 14
    assert SHARDS[0] == (248, 297) and SHARDS[-1] == (898, 947)
    assert [index for start, stop in SHARDS for index in range(start, stop + 1)] == list(range(248, 948))

    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["distinct_by_alpha"]["7"] == 700
    assert classification["hashes"][JETS.name] == digest(JETS)

    jets = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for index, row in enumerate(csv.DictReader(handle, delimiter="\t"), 1):
            polynomial = [int(row[f"i{rank}"]) for rank in range(10)]
            alpha = int(row["alpha"])
            q8 = int(row["q8"])
            assert q8 == 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
            jets.append({"index": index, "alpha": alpha, "polynomial": polynomial, "q8": q8})

    alpha7 = [row for row in jets if row["alpha"] == 7]
    assert len(alpha7) == 700
    assert [row["index"] for row in alpha7] == list(range(248, 948))
    assert len({tuple(row["polynomial"]) for row in alpha7}) == 700
    assert all(row["polynomial"][0] == 1 and row["polynomial"][7] > 0 for row in alpha7)
    assert all(row["polynomial"][8:] == [0, 0] for row in alpha7)
    assert all(row["q8"] == 0 for row in alpha7)
    assert jets[246]["alpha"] == 6 and jets[947]["alpha"] == 8

    modes = {}
    report_hashes = {}
    for mode in ("high", "low"):
        covered = []
        cases = terms = negative = 0
        minimum = maximum = None
        elapsed = 0.0
        peak = 0
        reports = []
        for start, stop in SHARDS:
            path = report_path(mode, start, stop)
            report = json.loads(path.read_text(encoding="utf-8"))
            expected = f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE"
            assert report["status"] == expected
            assert report["mode"] == mode
            assert report["range_start"] == start and report["range_stop"] == stop
            assert report["exceptional_jet_total"] == 1215 and report["cases"] == 50
            assert [row["index"] for row in report["rows"]] == list(range(start, stop + 1))
            assert [row["alpha"] for row in report["rows"]] == [7] * 50
            assert [row["fixed_Q8"] for row in report["rows"]] == [0] * 50
            assert all(row["negative"] == 0 and row["minimum"] == 1 for row in report["rows"])
            assert report["statistics"]["terms"] == sum(row["terms"] for row in report["rows"])
            assert report["statistics"]["negative"] == 0
            assert report["statistics"]["minimum"] == 1
            assert report["peak_private_bytes"] < LIMIT
            assert report["hashes"][JETS.name] == digest(JETS)
            assert report["hashes"][CLASSIFICATION.name] == digest(CLASSIFICATION)
            assert report["hashes"][VERIFIER.name] == digest(VERIFIER)

            covered.extend(row["index"] for row in report["rows"])
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
                "elapsed_seconds": report["elapsed_seconds"],
                "peak_private_bytes": report["peak_private_bytes"],
            })

        assert covered == list(range(248, 948))
        assert len(covered) == len(set(covered)) == 700
        assert cases == 700 and negative == 0 and minimum == 1
        expected_terms = 886350 * 700 if mode == "high" else 1293352 * 700
        assert terms == expected_terms
        modes[mode] = {
            "reports": reports,
            "cases": cases,
            "terms": terms,
            "negative_coefficients": negative,
            "minimum_coefficient": minimum,
            "maximum_coefficient": maximum,
            "elapsed_seconds": elapsed,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        }

    payload = {
        "schema": "rank8-exceptional-fixed-alpha7-independent-assembly-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_ALPHA7_BOTH_FULL_CONES_ASSEMBLED",
        "theorem": "Adjoining any exceptional connected-tree jet with alpha=7 to an abstract rank-eight high or low full factor preserves Q8.",
        "no_gap": {
            "classification_alpha7_count": 700,
            "covered_database_indices": [248, 947],
            "shards": [list(shard) for shard in SHARDS],
            "preceding_index_alpha": 6,
            "following_index_alpha": 8,
        },
        "cones": modes,
        "totals": {
            "fixed_cone_cases": modes["high"]["cases"] + modes["low"]["cases"],
            "symbolic_terms": modes["high"]["terms"] + modes["low"]["terms"],
            "negative_coefficients": 0,
            "minimum_coefficient": 1,
            "elapsed_seconds_sequential": modes["high"]["elapsed_seconds"] + modes["low"]["elapsed_seconds"],
            "maximum_peak_private_bytes": max(modes["high"]["peak_private_bytes"], modes["low"]["peak_private_bytes"]),
        },
        "scope_warning": "This closes exactly the alpha=7 exceptional fixed/full class. Alpha=8 was not run by this assembly. It does not close alpha>=8 fixed/full, any full/full cone, connected Q8, the complete forest lift, or any Delta4 obligation.",
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
