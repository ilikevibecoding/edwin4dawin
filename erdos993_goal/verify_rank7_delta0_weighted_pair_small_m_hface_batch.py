#!/usr/bin/env python3
"""Integrity audit for the frozen 2520-cell small/mid-m three-face batch."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py"
RUNNER = ROOT / "run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py"
REPORT = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_weighted_pair_small_m_hface_integrity_audit_exact_20260820.json"

EXPECTED_PROVER_SHA = "9367209095EDBFF981D81C504C0CEFBC88B8613CBD7F5C43DB596F35C8CA5D66"
EXPECTED_RUNNER_SHA = "5A54F1674DF8E45BAC0579F4C5DD8C042F0FFEC98E21BB477CE6A7E9AA09BED7"
EXPECTED_REPORT_SHA = "6003869DDC83FF71151693CE774E878A08E12564BE61438CD5C8F3244F96D25A"
EXPECTED_STATUS = "PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expected_keys():
    return {
        (n, m, regime, face, q)
        for n in range(27, 39)
        for m in range(5, 18)
        for regime in ((0, 1) if m <= 8 else (0, 1, 2))
        for face in ("zero", "lifted", "h_extension")
        for q in (0, 1)
    }


def main() -> int:
    data = json.loads(REPORT.read_text(encoding="utf-8"))
    rows = data.get("results", [])
    keys = [(r["n"], r["m"], r["regime"], r["face"], r["q"]) for r in rows]
    expected = expected_keys()
    actual = set(keys)

    checks = {
        "prover_sha_frozen": sha256(PROVER) == EXPECTED_PROVER_SHA,
        "runner_sha_frozen": sha256(RUNNER) == EXPECTED_RUNNER_SHA,
        "report_sha_frozen": sha256(REPORT) == EXPECTED_REPORT_SHA,
        "report_embeds_prover_sha": data.get("prover_sha256") == EXPECTED_PROVER_SHA,
        "report_embeds_runner_sha": data.get("runner_sha256") == EXPECTED_RUNNER_SHA,
        "status_marker": data.get("status") == EXPECTED_STATUS,
        "expected_jobs_field": data.get("expected_jobs") == 2520,
        "completed_jobs_field": data.get("completed_jobs") == 2520,
        "passing_jobs_field": data.get("passing_jobs") == 2520,
        "row_count": len(rows) == 2520,
        "unique_keys": len(keys) == len(actual) == 2520,
        "exact_parameter_grid": actual == expected,
        "all_returncode_zero": all(r.get("returncode") == 0 for r in rows),
        "all_stderr_empty": all(r.get("stderr") == "" for r in rows),
        "all_pass_flags": all(r.get("pass") is True for r in rows),
        "all_parsed_pass": all(r.get("parsed", {}).get("status") == "PASS" for r in rows),
        "twelve_equal_order_slices": Counter(r["n"] for r in rows)
        == Counter({n: 210 for n in range(27, 39)}),
        "three_equal_active_faces": Counter(r["face"] for r in rows)
        == Counter({"zero": 840, "lifted": 840, "h_extension": 840}),
        "regime_counts": Counter(r["regime"] for r in rows)
        == Counter({0: 936, 1: 936, 2: 648}),
    }
    passed = all(checks.values())
    payload = {
        "schema": "rank7-delta0-small-m-three-face-integrity-audit-v1",
        "status": "PASS_EXACT_MANIFEST_INTEGRITY" if passed else "FAIL_MANIFEST_INTEGRITY",
        "scope_warning": (
            "This audits the finite certificate package only. It is not an independent "
            "mathematical audit and does not by itself prove full rank-7."
        ),
        "frozen_hashes": {
            "prover_sha256": EXPECTED_PROVER_SHA,
            "runner_sha256": EXPECTED_RUNNER_SHA,
            "report_sha256": EXPECTED_REPORT_SHA,
        },
        "checks": checks,
        "missing_keys": sorted(expected - actual),
        "unexpected_keys": sorted(actual - expected),
        "counts": {
            "rows": len(rows),
            "by_n": dict(sorted(Counter(r["n"] for r in rows).items())),
            "by_face": dict(sorted(Counter(r["face"] for r in rows).items())),
            "by_regime": dict(sorted(Counter(r["regime"] for r in rows).items())),
            "by_q": dict(sorted(Counter(r["q"] for r in rows).items())),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(OUTPUT.name, sha256(OUTPUT))
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
