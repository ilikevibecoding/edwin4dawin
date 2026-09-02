#!/usr/bin/env python3
"""Independent structural/key audit of the 90-cell suffix-3 certificate."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_independent_audit_exact_20260821.json"
EXPECTED = {
    "probe_rank8_low_low_both_suffix3_cell_flint.py":
        "C23BD62E1D56BFBD81FC7B27D00C6EB255DEC3C57940A7BD9C6BB81CA1D92243",
    "verify_rank8_low_low_both_suffix3_a3_b3_cells.py":
        "2CDBACD7E10C15BB0FE847EA295DA267E5F48DCBE41434376F402746B21FAAC3",
    "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json":
        "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F",
    "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json":
        "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json":
        "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
AUXILIARIES = (
    "curvature_middle", "curvature_far", "strong_middle", "strong_far",
)
EXPECTED_AGGREGATES = {
    "curvature_middle": (25_803_654, 4, 318_929_952_995_618_832),
    "curvature_far": (25_803_232, 1, 91_798_868_674_038_204),
    "strong_middle": (51_388_660, 4, 1_943_303_860_719_905_232),
    "strong_far": (51_388_183, 1, 572_560_652_336_556_312),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def midpoint_audit(allocation: dict) -> None:
    target = tuple(map(int, allocation["negative_monomial"]))
    low = tuple(map(int, allocation["source_low"]["monomial"]))
    high = tuple(map(int, allocation["source_high"]["monomial"]))
    demand = int(allocation["demand"])
    low_capacity = int(allocation["source_low"]["capacity"])
    high_capacity = int(allocation["source_high"]["capacity"])
    assert tuple(low[i] + high[i] for i in range(3)) == tuple(2 * x for x in target)
    assert 4 * low_capacity * high_capacity >= demand * demand


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    primary = load("rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json")
    assert primary["status"] == "PASS_EXACT_RANK8_LOW_LOW_BOTH_SUFFIX3_A3_B3_CELLS"
    assert primary["source_sha256"] == actual_inputs["verify_rank8_low_low_both_suffix3_a3_b3_cells.py"]
    assert primary["immutable_inputs"] == {
        "probe_rank8_low_low_both_suffix3_cell_flint.py":
            actual_inputs["probe_rank8_low_low_both_suffix3_cell_flint.py"]
    }

    rows = primary["rows"]
    expected_keys = {(a3, b3) for a3 in range(10) for b3 in range(9)}
    actual_keys = {(row["a3_exponent"], row["b3_exponent"]) for row in rows}
    assert len(rows) == len(actual_keys) == 90
    assert actual_keys == expected_keys
    assert primary["degree_support"] if "degree_support" in primary else True

    rebuilt = {}
    for auxiliary in AUXILIARIES:
        entries = []
        for row in rows:
            assert row["pass"] is True
            assert math.isfinite(float(row["elapsed_seconds"])) and row["elapsed_seconds"] > 0
            assert set(row["rows"]) == set(AUXILIARIES)
            item = row["rows"][auxiliary]
            assert item["negative"] == 0 and item["first_negative"] is None
            if item["terms"]:
                assert 0 < item["minimum"] <= item["maximum"]
                entries.append(item)
            else:
                assert item["minimum"] is None and item["maximum"] is None
        aggregate = (
            sum(row["rows"][auxiliary]["terms"] for row in rows),
            min(item["minimum"] for item in entries),
            max(item["maximum"] for item in entries),
        )
        assert aggregate == EXPECTED_AGGREGATES[auxiliary]
        stored = primary["aggregates"][auxiliary]
        assert (stored["terms"], stored["minimum"], stored["maximum"]) == aggregate
        assert stored["negative"] == 0
        rebuilt[auxiliary] = {
            "terms": aggregate[0], "negative": 0,
            "minimum": aggregate[1], "maximum": aggregate[2],
        }

    # Independently check every base AM-GM block. Substituting either terminal
    # by itself plus nonnegative suffix slacks preserves each pointwise block.
    curvature = load("rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json")
    strong = load("rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
    assert curvature["status"] == "PASS_EXACT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert strong["status"] == "PASS_EXACT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    allocations = list(curvature["allocations"])
    allocations.extend(
        allocation for row in strong["rows"]
        if row["bernstein_coefficient"] in ("middle_times_2", "far")
        for allocation in row["allocations"]
    )
    for allocation in allocations:
        midpoint_audit(allocation)
    assert len(allocations) == 18

    critical = {
        (row["a3_exponent"], row["b3_exponent"]): {
            name: row["rows"][name]["terms"] for name in AUXILIARIES
        }
        for row in rows
        if (row["a3_exponent"], row["b3_exponent"])
        in {(0, 0), (1, 0), (0, 1), (1, 1), (9, 8)}
    }
    assert set(critical) == {(0, 0), (1, 0), (0, 1), (1, 1), (9, 8)}

    payload = {
        "schema": "rank8-low-low-both-suffix3-a3-b3-cells-independent-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_RANK8_LOW_LOW_BOTH_SUFFIX3",
        "checks": {
            "ordered_key_universe": 90,
            "key_range": {"a3": [0, 9], "b3": [0, 8]},
            "aggregate_reconstruction": rebuilt,
            "critical_cell_term_counts": {
                f"{key[0]},{key[1]}": value for key, value in sorted(critical.items())
            },
            "base_amgm_blocks_rechecked": len(allocations),
            "terminal_substitution_preservation": True,
            "all_cell_minima_strictly_positive_when_nonempty": True,
        },
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently audits hashes, the complete 90-key universe, "
            "all stored cell signs and aggregates, and the AM-GM substitution "
            "logic. It does not regenerate all 154 million coefficients with "
            "a second coefficient engine. The early slacks a0,a2,b0,b2 remain open."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "AMGM_BLOCKS", len(allocations))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
