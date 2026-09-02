#!/usr/bin/env python3
"""Verify exact report status, branch counts, and no-gap sweep coverage."""
from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
REPORTS = (
    "pure_cubic_batch_n23_km7_rank0.json",
    "pure_cubic_batch_v2_n23_km7_ranks1_6.json",
    "pure_cubic_batch_v2_n23_km6_allranks_factored.json",
    "pure_cubic_batch_v2_n23_km5_k4_allranks.json",
    "pure_cubic_batch_v2_n24_n30_all.json",
    "pure_cubic_batch_v2_n31_n38_all.json",
)
PROFILES_PER_N_K = 12
ENDPOINTS_PER_PROFILE = 6


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    coverage: Counter[tuple[int, int, int]] = Counter()
    report_rows = []
    total_branches = total_nodes = 0
    for name in REPORTS:
        path = HERE / name
        if not path.exists():
            raise AssertionError(f"missing report: {name}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload["status"] == "PASS_EXACT", (name, payload["status"])
        assert payload.get("fail") is None, (name, payload.get("fail"))
        parameters = payload["parameters"]
        n_values = range(parameters["n_first"], parameters["n_last"] + 1)
        k_values = range(parameters["k_first"], parameters["k_last"] + 1)
        rank_values = range(parameters["rank_first"], parameters["rank_last"] + 1)
        triples = [(n, k, rank) for n in n_values for k in k_values for rank in rank_values]
        expected_branches = len(triples) * PROFILES_PER_N_K * ENDPOINTS_PER_PROFILE
        assert payload["branches"] == expected_branches, (
            name,
            payload["branches"],
            expected_branches,
        )
        coverage.update(triples)
        total_branches += payload["branches"]
        total_nodes += payload["nodes"]
        report_rows.append(
            {
                "report": name,
                "sha256": sha256(path),
                "branches": payload["branches"],
                "nodes": payload["nodes"],
                "elapsed_seconds": payload["elapsed_seconds"],
            }
        )

    expected = {
        (n, k, rank)
        for n in range(23, 39)
        for k in range(-7, 5)
        for rank in range(7)
    }
    actual = set(coverage)
    duplicates = sorted(item for item, multiplicity in coverage.items() if multiplicity != 1)
    assert actual == expected, {
        "missing": sorted(expected - actual),
        "extra": sorted(actual - expected),
    }
    assert not duplicates, {"nonunit_multiplicity": duplicates}
    assert total_branches == 16 * 12 * 7 * PROFILES_PER_N_K * ENDPOINTS_PER_PROFILE

    summary = {
        "status": "PASS_EXACT_NO_GAP",
        "domain": {
            "n": [23, 38],
            "k": [-7, 4],
            "ranks": [0, 6],
            "root_profiles_per_n_k": PROFILES_PER_N_K,
            "active_endpoints_per_profile": ENDPOINTS_PER_PROFILE,
        },
        "coverage_triples": len(expected),
        "branches": total_branches,
        "nodes": total_nodes,
        "reports": report_rows,
        "builder_sha256": sha256(HERE / "prove_rank7_pure_cubic_b2_5_joint_bernstein.py"),
        "runner_v2_sha256": sha256(HERE / "run_rank7_pure_cubic_b2_5_bernstein_batch_v2.py"),
        "factorization_replay_sha256": sha256(
            HERE / "verify_rank7_pure_cubic_b2_5_polynomial_factorization.py"
        ),
    }
    output = HERE / "rank7_pure_cubic_b2_5_sweep_coverage_exact_20260817.json"
    output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
