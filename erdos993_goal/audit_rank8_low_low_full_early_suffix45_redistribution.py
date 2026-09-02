#!/usr/bin/env python3
"""Independent structural and aggregate audit of the suffix-4/5 join."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_checkpoint_20260822.json"
AUDIT_REPORT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json"
EXPECTED = {
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json":
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
    "probe_rank8_low_low_full_early_suffix45_redistribution_bernstein_cell.py":
        "54631D4D2721F9208DC42C5BB1024FA7E6D199DEC5CF0FD52D173837BFC23159",
    "verify_rank8_low_low_full_early_suffix45_redistribution_cells.py":
        "16C323A355CDA03BF5466694897FF6036DDE1D1AD2DF5DC2913A873C9A53FE45",
    "verify_rank8_low_low_suffix45_redistribution_identity.py":
        "FC954DCB651571B845274DFEE67FBF9B5D787B73652A6017FC23B07487C1F3A5",
    "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json":
        "DC5AC4905E04E14B4D628F90AD238809D4B58943A40404183FCCCD8366D4ECDD",
    "audit_rank8_low_low_suffix45_redistribution_support.py":
        "61E663284E68AC03493A8586F6CA9B4DCB2D54F25B45DC25EB727DB2D9825D50",
    "rank8_low_low_suffix45_redistribution_support_audit_20260822.json":
        "21A8442A699F9A5CAC95F95D64DB330A09B6CE7BD31F4E3FE865D2AF7222B38E",
    "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json":
        "7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E",
    "rank8_low_low_full_early_suffix4_audit_20260822.json":
        "BA51DD8EDDA7A7D0D6425A6C795BA18C1542F350AB4F1376A7EA38419BA73F78",
    "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json":
        "8993846F0A260DBEF8091D3617AF8EAAACED67AD274ADA8EA9C181B45D102F7F",
    "rank8_low_low_full_early_suffix5_audit_20260821.json":
        "A4BCF6A78B23F84E7B07FAAED3C67C400111BC21F9B03D5C33ACEC92A7586AD4",
}
AUXILIARIES = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
POSITIONS = (
    (0, 1), (0, 2),
    (1, 0), (1, 1), (1, 2),
    (2, 0), (2, 1),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cell_key(row):
    return row["u_exponent"], row["w_exponent"]


def position_key(row):
    return row["left_bernstein_index"], row["right_bernstein_index"]


def main():
    for name, digest in EXPECTED.items():
        assert sha256(ROOT / name) == digest, name
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    identity = json.loads(
        (ROOT / "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json")
        .read_text(encoding="utf-8")
    )
    support = json.loads(
        (ROOT / "rank8_low_low_suffix45_redistribution_support_audit_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == (
        "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID"
    )
    assert identity["status"] == "PASS_EXACT_SUFFIX45_REDISTRIBUTION_IDENTITY"
    assert support["status"] == (
        "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_SUPPORT_AUDIT"
    )
    assert report["source_sha256"] == EXPECTED[
        "verify_rank8_low_low_full_early_suffix45_redistribution_cells.py"
    ]
    assert checkpoint["probe_sha256"] == EXPECTED[
        "probe_rank8_low_low_full_early_suffix45_redistribution_bernstein_cell.py"
    ]
    assert checkpoint["verifier_sha256"] == report["source_sha256"]
    assert checkpoint["rows"] == report["rows"]

    expected_cells = [(u, w) for u in range(14) for w in range(13)]
    rows = report["rows"]
    assert report["outer_cells"] == 182 == len(rows)
    assert list(map(cell_key, rows)) == expected_cells
    assert report["new_bernstein_positions"] == [list(item) for item in POSITIONS]
    assert support["complete_grid_support"] == {"U": [0, 13], "W": [0, 12]}

    recomputed = {}
    total_terms = 0
    for left, right in POSITIONS:
        position_name = f"left_{left}_right_{right}"
        recomputed[position_name] = {}
        for label in AUXILIARIES:
            items = []
            for cell in rows:
                assert cell["redistribution_degree"] == [2, 2]
                assert cell["bernstein_scaling"] == 4
                assert cell["known_corner_rows_omitted"] is True
                assert cell["pass"]
                assert len(cell["rows"]) == 7
                assert {position_key(item) for item in cell["rows"]} == set(POSITIONS)
                position = next(
                    item for item in cell["rows"]
                    if position_key(item) == (left, right)
                )
                assert position["pass"] and set(position["rows"]) == set(AUXILIARIES)
                statistics = position["rows"][label]
                assert statistics["negative"] == 0
                assert statistics["first_negative"] is None
                if cell_key(cell) == (0, 0):
                    assert statistics["reference_only"] is True
                    assert statistics["terms"] == 0
                    continue
                if statistics["terms"]:
                    assert statistics["minimum"] > 0
                    assert statistics["maximum"] >= statistics["minimum"]
                    items.append(statistics)
                else:
                    assert statistics["minimum"] is None
                    assert statistics["maximum"] is None
            aggregate = {
                "terms": sum(item["terms"] for item in items),
                "negative": 0,
                "minimum": min(item["minimum"] for item in items),
                "maximum": max(item["maximum"] for item in items),
            }
            assert aggregate == report["aggregates"][position_name][label]
            recomputed[position_name][label] = aggregate
            total_terms += aggregate["terms"]
    assert total_terms == 592_762_759

    origin = rows[0]
    assert cell_key(origin) == (0, 0)
    assert set(origin["origin_reference"]) == {
        "explanation", "suffix4_report", "suffix4_sha256",
        "suffix5_report", "suffix5_sha256",
    }
    corners = report["known_corner_references"]
    assert corners["left_0_right_0"]["sha256"] == EXPECTED[
        "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json"
    ]
    assert corners["left_2_right_2"]["sha256"] == EXPECTED[
        "rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json"
    ]
    assert identity["bernstein_degree"] == [2, 2]
    assert identity["integer_probe_scaling"] == 4

    payload = {
        "schema": "rank8-low-low-full-early-suffix45-redistribution-audit-v1",
        "status": "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT",
        "complete_cell_keys": len(rows),
        "new_bernstein_positions": len(POSITIONS),
        "new_exact_coefficients": total_terms,
        "negative_coefficients": 0,
        "strict_minimum_over_nonempty_rows": min(
            aggregate["minimum"]
            for position in recomputed.values()
            for aggregate in position.values()
        ),
        "checkpoint_rows_match_final_report": True,
        "corner_face_hashes_match": True,
        "identity_and_support_audits_match": True,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    AUDIT_REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(AUDIT_REPORT))


if __name__ == "__main__":
    main()
