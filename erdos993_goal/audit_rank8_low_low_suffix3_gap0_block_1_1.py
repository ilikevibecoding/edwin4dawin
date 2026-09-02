#!/usr/bin/env python3
"""Independent metadata audit of the split suffix-3/gap-zero pilot block."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_outer_cell_flint.py"
VERIFIER = ROOT / "verify_rank8_low_low_suffix3_gap0_block_1_1.py"
BASE = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_block_1_1_checkpoint_20260822.json"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_block_1_1_exact_20260822.json"

EXPECTED_HASHES = {
    PROBE.name: "A97A572170EC70470F009ADDFED9F47E7336E88E3EB7DDF5BE6F58BA9E4D4E4B",
    VERIFIER.name: "F426613C7074428E77EA702CE3C93626A7DBC31430BA8C2CDC40F80D18D138AA",
    BASE.name: "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F",
    CHECKPOINT.name: "23F060BEDED97C74764F0B2A32AA7FCE512FA8B0623A2D0F13B643B6256A24B4",
    REPORT.name: "2709CCBF0C8F3B7431F38A71D0A79148623E88A496C5722291E2AE58A87C7AE0",
}
EXPECTED_AGGREGATES = {
    "curvature_middle": (6_205_134, 24, 318_929_952_995_618_832),
    "curvature_far": (6_205_119, 6, 91_798_868_674_038_204),
    "strong_middle": (12_237_204, 24, 1_943_303_860_719_905_232),
    "strong_far": (12_237_189, 6, 572_560_652_336_556_312),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    observed_hashes = {
        path.name: sha256(path)
        for path in (PROBE, VERIFIER, BASE, CHECKPOINT, REPORT)
    }
    assert observed_hashes == EXPECTED_HASHES

    report = json.loads(REPORT.read_text(encoding="utf-8"))
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    base = json.loads(BASE.read_text(encoding="utf-8"))
    assert report["schema"] == "rank8-low-low-suffix3-gap0-block-1-1-v1"
    assert report["status"] == "PASS_EXACT_SUFFIX3_GAP0_BLOCK_1_1_SPLIT_VALIDATION"
    assert report["outer_suffix3_cell"] == [1, 1]
    assert report["gap0_cells"] == 9
    assert report["source_sha256"] == EXPECTED_HASHES[VERIFIER.name]
    assert report["monolithic_pilot_match"] is True
    assert report["suffix3_origin_match"] is True
    assert report["rows"] == checkpoint["rows"]

    rows = report["rows"]
    coordinates = [
        (row["a0_exponent"], row["b0_exponent"])
        for row in rows
    ]
    assert coordinates == [(a0, b0) for a0 in range(3) for b0 in range(3)]
    assert all(
        (row["a3_exponent"], row["b3_exponent"]) == (1, 1)
        and row["pass"] is True
        for row in rows
    )

    base_origin = next(
        row for row in base["rows"]
        if (row["a3_exponent"], row["b3_exponent"]) == (1, 1)
    )["rows"]
    split_origin = next(
        row for row in rows
        if (row["a0_exponent"], row["b0_exponent"]) == (0, 0)
    )["rows"]
    assert split_origin == base_origin

    total_terms = 0
    for label, (terms, minimum, maximum) in EXPECTED_AGGREGATES.items():
        cells = [row["rows"][label] for row in rows]
        assert all(cell["negative"] == 0 and cell["first_negative"] is None for cell in cells)
        observed = report["aggregates"][label]
        assert observed == {
            "terms": terms,
            "negative": 0,
            "minimum": minimum,
            "maximum": maximum,
        }
        assert sum(cell["terms"] for cell in cells) == terms
        assert min(cell["minimum"] for cell in cells if cell["terms"]) == minimum
        assert max(cell["maximum"] for cell in cells if cell["terms"]) == maximum
        total_terms += terms
    assert total_terms == 36_884_646

    print("PASS_INDEPENDENT_SUFFIX3_GAP0_BLOCK_1_1_AUDIT")
    print("TOTAL_EXACT_COEFFICIENTS", total_terms)
    print("REPORT", observed_hashes[REPORT.name])


if __name__ == "__main__":
    main()
