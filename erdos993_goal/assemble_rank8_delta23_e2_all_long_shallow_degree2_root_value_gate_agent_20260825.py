#!/usr/bin/env python3
"""Fail-closed gate for every all-long e=2 shallow degree-two root value."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_REPORT = "rank8_delta23_e2_all_long_shallow_degree2_root_value_exact_agent_20260825.json"
AUDIT_REPORT = "rank8_delta23_e2_all_long_shallow_degree2_root_value_independent_audit_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_shallow_degree2_root_value_gate_exact_agent_20260825.json"
LONG = "L"
EXPECTED = {
    "prove_rank8_delta23_e2_all_long_shallow_degree2_root_value_agent_20260825.py":
        "C87690BB5FD14BF754A91C924B05FECF137C0EEA19DE7706A43CD082D24D904A",
    PRODUCER_REPORT:
        "E174AC1AC8A97F92CB3F8AFBF2E0B9CE4CF5A37E9613C88F5E1F7AC822A2D5BA",
    "audit_rank8_delta23_e2_all_long_shallow_degree2_root_value_agent_20260825.py":
        "BCE8513D9F9F567BDB1459A8D60E4A859BEEAF30E6AD0523070016E2AB56F10B",
    AUDIT_REPORT:
        "09908413E7C1E82C673EE0B22EE64D4FCAE93BB7C4200967D3B59DF82F3CE17D",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def base(state: int | str) -> int:
    return 7 if state == LONG else int(state)


def bridge_patterns() -> list[tuple[int | str, int | str]]:
    states: tuple[int | str, ...] = (*range(7), LONG)
    rows = []
    for left_index, left in enumerate(states):
        for right in states[left_index:]:
            if left == right == LONG:
                continue
            if base(left) + base(right) >= 6:
                rows.append((left, right))
    assert len(rows) == 23 and len(set(rows)) == 23
    return rows


def pendant_patterns() -> list[tuple[int | str, int | str]]:
    rows = []
    for near in (*range(7), LONG):
        for tail in (*range(1, 7), LONG):
            if near == tail == LONG:
                continue
            if base(near) + base(tail) >= 6:
                rows.append((near, tail))
    assert len(rows) == 40 and len(set(rows)) == 40
    return rows


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    producer = load(PRODUCER_REPORT)
    audit = load(AUDIT_REPORT)
    expected_patterns = [
        *(('bridge', pattern) for pattern in bridge_patterns()),
        *(('pendant', pattern) for pattern in pendant_patterns()),
    ]
    expected_cells = [
        (family, pattern, rank)
        for family, pattern in expected_patterns
        for rank in (2, 3)
    ]
    actual_cells = [
        (case["family"], tuple(case["pattern"]), case["rank"])
        for case in producer["cases"]
    ]
    assert actual_cells == expected_cells
    assert len(set(actual_cells)) == 126

    audit_rows = {
        (row["family"], tuple(row["pattern"])): row
        for row in audit["literal_orbit_and_digest_replay"]
    }
    assert list(audit_rows) == expected_patterns
    case_checks = []
    for case in producer["cases"]:
        rank = case["rank"]
        assert case["entries"] == {2: 28, 3: 27}[rank]
        assert case["actual_degree"] == {2: 26, 3: 25}[rank]
        assert len(case["profile_zero_identities"]) == 11
        assert case["sample_values"]["negative"] == case["sample_values"]["zero"] == 0
        assert case["sample_values"]["positive"] == case["entries"]
        assert case["newton_coefficients"]["negative"] == 0
        assert case["newton_coefficients"]["zero"] == 1
        assert case["newton_coefficients"]["positive"] == {2: 27, 3: 26}[rank]
        assert int(case["newton_coefficients"]["origin"]) > 0
        assert case["power_coefficients"]["negative"] == 0
        assert case["power_coefficients"]["zero"] == 1
        assert case["power_coefficients"]["positive"] == {2: 27, 3: 26}[rank]
        row = audit_rows[(case["family"], tuple(case["pattern"]))]
        replay = next(item for item in row["ordered_replay"] if item["rank"] == rank)
        assert replay["sample_sha256"] == case["sample_values"]["ordered_sha256"]
        assert replay["newton_sha256"] == case["newton_coefficients"]["ordered_sha256"]
        assert replay["power_sha256"] == case["power_coefficients"]["ordered_sha256"]
        assert replay["digest_match"] is True
        case_checks.append(
            {
                "family": case["family"],
                "pattern": case["pattern"],
                "rank": rank,
                "baseline_order": case["baseline_order"],
                "entries": case["entries"],
                "actual_degree": case["actual_degree"],
                "origin": case["newton_coefficients"]["origin"],
                "ordered_sample_sha256": case["sample_values"]["ordered_sha256"],
                "ordered_newton_sha256": case["newton_coefficients"]["ordered_sha256"],
                "ordered_power_sha256": case["power_coefficients"]["ordered_sha256"],
                "literal_replay_match": True,
            }
        )

    obligations = {
        "producer_status": producer["status"]
            == "PASS_EXACT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE",
        "audit_status": audit["status"]
            == "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE",
        "audit_pins_producer": audit["certificate_sha256"] == EXPECTED[PRODUCER_REPORT],
        "partition_pairwise_disjoint": producer["partition"]["pairwise_disjoint"] is True,
        "partition_exhausts_shallow": producer["partition"]["exhausts_shallow_degree2_roots"] is True,
        "bridge_patterns_exact": producer["coverage_totals"]["bridge_patterns"]
            == audit["coverage_totals"]["bridge_patterns"] == 23,
        "pendant_patterns_exact": producer["coverage_totals"]["pendant_patterns"]
            == audit["coverage_totals"]["pendant_patterns"] == 40,
        "root_patterns_exact": producer["coverage_totals"]["root_patterns"]
            == audit["coverage_totals"]["root_patterns"] == 63,
        "rank_cells_exact": producer["coverage_totals"]["rank_cells"]
            == audit["coverage_totals"]["rank_cells"] == 126,
        "profile_identities_exact": producer["coverage_totals"]["profile_translation_identities"]
            == audit["coverage_totals"]["exact_profile_translation_identities"] == 693,
        "literal_comparisons_exact": audit["coverage_totals"]["literal_profile_comparisons"] == 30688,
        "ordered_samples_replayed": audit["coverage_totals"]["ordered_samples_replayed"] == 3465,
        "ordered_newton_replayed": audit["coverage_totals"]["ordered_newton_coefficients_replayed"] == 3465,
        "ordered_power_replayed": audit["coverage_totals"]["ordered_power_coefficients_replayed"] == 3465,
        "zero_digest_mismatch": audit["coverage_totals"]["digest_mismatches"] == 0,
        "zero_negative_coefficients": producer["coverage_totals"]["negative_newton_coefficients"]
            == audit["coverage_totals"]["negative_coefficients"] == 0,
        "strictly_positive_origins": producer["coverage_totals"]["all_origins_strictly_positive"] is True,
        "every_case_replayed": len(case_checks) == 126,
    }
    assert all(obligations.values()), obligations

    payload = {
        "schema": "rank8-delta23-e2-all-long-shallow-degree2-root-value-gate-v1",
        "status": "SEALED_EXACT_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE_ONLY",
        "proof_obligations": obligations,
        "evidence_hashes": actual,
        "exact_scope": {
            "source_class": "e=2 double-claw trees with all four pendant arms >=7 and branch bridge >=8",
            "shallow_bridge": "degree-2 bridge root with edge-distance <=7 from at least one branch",
            "shallow_pendant": "degree-2 pendant root with branch distance <=7 or leaf distance <=6",
            "root_orbits": "one bridge path with reversal plus all four oriented pendant arms",
            "ranks": [2, 3],
            "orders": "every admissible order n>=37 in the 63 exact patterns",
            "conclusion": "strict positivity of the rooted rank-eight residual VALUE",
        },
        "partition": producer["partition"],
        "proof_chain": [
            "23 bridge and 40 oriented pendant patterns partition the finite shallow-position residue",
            "producer proves c0..c8,h6,h7 collapse to one shifted total-offset ray in every pattern",
            "all 126 Delta2/3 cells have nonnegative Newton coefficients and positive origins",
            "audit rederives all 693 identities from direct original path products",
            "literal adjacency-list DP checks bridge reversal and all four pendant arm orbits",
            "all 3,465 ordered sample, Newton, and power entries replay with matching digests",
        ],
        "cases": case_checks,
        "coverage": {
            "bridge_patterns": 23,
            "pendant_patterns": 40,
            "root_patterns": 63,
            "rank_cells": 126,
            "profile_translation_identities": 693,
            "literal_profile_comparisons": 30688,
            "ordered_samples": 3465,
            "ordered_newton_coefficients": 3465,
            "ordered_power_coefficients": 3465,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "fail_closed_exclusions": [
            "no deep degree-two, branch, or leaf root imported into this gate",
            "no leaf-extension increment or inserted-new-leaf value",
            "no short source arm or bridge outside the stated all-long class",
            "no complete e=2 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("root_patterns", payload["coverage"]["root_patterns"], flush=True)
    print("literal_comparisons", payload["coverage"]["literal_profile_comparisons"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
