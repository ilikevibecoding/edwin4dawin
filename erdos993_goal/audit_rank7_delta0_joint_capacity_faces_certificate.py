#!/usr/bin/env python3
"""Independent low-memory audit of the rank-7 Delta0 joint-capacity batch.

This does not replay the expensive Bernstein jobs.  It validates the immutable
prover/report hash chain, every recorded job/result, the exact no-gap index
set, and the algebraic endpoint/constraint reductions used by the prover.
"""

from __future__ import annotations

import ast
import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_capacity_faces_finite.py"
BATCH = ROOT / "run_rank7_delta0_joint_capacity_faces_finite_batch.py"
SOURCE_REPORT = ROOT / "rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_joint_capacity_faces_independent_audit_exact_20260820.json"

EXPECTED_PROVER_SHA256 = "47B56B215EB3B7EA881537ED17DD21EACAF9139EDBFE584C6A013E41338545C1"
EXPECTED_BATCH_SHA256 = "A03AE76E4862778BB8F501A2E48085B2A175498571898D1BEBADC1DB418C3229"
EXPECTED_REPORT_SHA256 = "D73730C11984AC29A7AF2B3ADE27002396A8B31C21091F176465FEA014F9C832"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def exact_algebra_audit() -> dict:
    expression, (x, y, z, q, s, d) = normalized_low(0)
    q_curvature = sp.factor(sp.diff(expression, q, 2))
    d_curvature = sp.factor(sp.diff(expression, d, 2))
    assert sp.simplify(q_curvature + 196 * s * (s + 1)) == 0
    assert sp.simplify(d_curvature - 4 * (s * z - 48 * z - 48)) == 0
    assert x not in expression.free_symbols and y not in expression.free_symbols

    # q_upper-q_lower=3z/7, so these really are the ordered interval endpoints.
    q_lower = (2 + z) / 14
    q_upper = sp.Rational(1, 7) + z / 2
    assert sp.simplify(q_upper - q_lower - sp.Rational(3, 7) * z) == 0

    z_rows = []
    for n in range(28, 39):
        tn = sp.Rational((n - 7) * (n - 8), n - 3)
        mu6_lower = sp.factor((tn - 3 + 2 / tn) / 6)
        z_low = sp.Rational(6, n - 6)
        z_high = sp.factor(1 / mu6_lower)
        assert mu6_lower > 2
        assert 0 < z_low < z_high < sp.Rational(1, 2)
        z_rows.append(
            {
                "n": n,
                "mu6_lower": str(mu6_lower),
                "z_low": str(z_low),
                "z_high": str(z_high),
            }
        )

    # The literal i5(J) ceiling cannot create another active upper-b face:
    # extension_upper at a=C(m,4) equals C(m,5).  Half retention cannot either,
    # because z<1/2 makes c6/2=c5/(2z)>c5, while containment_upper<=c5.
    for m in range(18, 37):
        assert sp.Rational(m - 4, 5) * comb(m, 4) == comb(m, 5)

    c5, c6, b = sp.symbols("c5 c6 b", positive=True)
    ceiling = sp.symbols("C6", positive=True)
    # With z=c5/c6, these are exactly the signed residuals asserted in code.
    assert sp.simplify((c5 - 2 * b * z).subs(z, c5 / c6) - c5 * (1 - 2 * b / c6)) == 0
    assert sp.simplify((ceiling * z - c5).subs(z, c5 / c6) - c5 * (ceiling / c6 - 1)) == 0

    return {
        "normalized_low_free_symbols": sorted(str(item) for item in expression.free_symbols),
        "x_y_absent": True,
        "q_second_derivative": str(q_curvature),
        "q_concavity_reason": "-196*s*(s+1)<=0 for 0<=s<=1",
        "q_endpoint_gap": str(sp.factor(q_upper - q_lower)),
        "d_second_derivative": str(d_curvature),
        "d_concavity_reason": "4*((s-48)*z-48)<0 for 0<=s<=1 and z>0",
        "z_band_checks": z_rows,
        "half_retention_face_redundancy": "z_high<1/2 implies c6/2>c5>=c5-a",
        "literal_i5_ceiling_face_redundancy": "((m-4)/5)*C(m,4)=C(m,5)",
        "constraint_signs": {
            "lower_bounds": "b-lower>=0",
            "upper_bounds": "upper-b>=0",
            "half_retention": "c5-2*b*z=(c5/c6)*(c6-2*b)>=0",
            "c6_ceiling": "C(n,6)*z-c5=(c5/c6)*(C(n,6)-c6)>=0",
        },
    }


def report_audit(report: dict) -> dict:
    expected = [
        (n, m, face, q)
        for n in range(28, 39)
        for m in range(18, n - 1)
        for face in ("containment", "extension")
        for q in (0, 1)
    ]
    assert len(expected) == 616
    assert sum(n - 19 for n in range(28, 39)) == 154
    assert report["schema"] == "rank7-delta0-joint-capacity-finite-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38"
    assert report["scope"] == {
        "n": [28, 38],
        "m_rule": "18<=m<=n-2",
        "faces": ["containment", "extension"],
        "q": [0, 1],
    }
    assert report["prover_sha256"] == EXPECTED_PROVER_SHA256
    assert report["expected_jobs"] == len(expected)
    assert report["completed_jobs"] == len(expected)
    assert report["passing_jobs"] == len(expected)
    assert len(report["results"]) == len(expected)

    observed = []
    total_nodes = total_passed = total_discarded = 0
    max_nodes = 0
    max_node_keys = []
    for row in report["results"]:
        key = (row["n"], row["m"], row["face"], row["q"])
        observed.append(key)
        assert set(row) == {"n", "m", "face", "q", "returncode", "stdout", "stderr", "pass"}
        assert row["returncode"] == 0
        assert row["stderr"] == ""
        assert row["pass"] is True

        prefix = row["stdout"].split(maxsplit=4)
        assert len(prefix) == 5
        assert (int(prefix[0]), int(prefix[1]), prefix[2], int(prefix[3])) == key
        result = ast.literal_eval(prefix[4])
        assert set(result) == {"status", "nodes", "passed", "discarded", "worst"}
        assert result["status"] == "PASS"
        assert result["worst"] == "None"
        assert all(isinstance(result[name], int) and result[name] >= 0 for name in ("nodes", "passed", "discarded"))
        assert result["nodes"] == 2 * (result["passed"] + result["discarded"]) - 1
        total_nodes += result["nodes"]
        total_passed += result["passed"]
        total_discarded += result["discarded"]
        if result["nodes"] > max_nodes:
            max_nodes = result["nodes"]
            max_node_keys = [key]
        elif result["nodes"] == max_nodes:
            max_node_keys.append(key)

    # Exact ordered equality gives no duplicates, omissions, or off-scope rows.
    assert observed == expected
    assert len(set(observed)) == len(expected)
    by_n = {str(n): sum(1 for key in observed if key[0] == n) for n in range(28, 39)}
    assert by_n == {str(n): 4 * (n - 19) for n in range(28, 39)}
    return {
        "expected_and_observed_jobs": len(expected),
        "n_m_pairs": 154,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_rows": 0,
        "jobs_by_n": by_n,
        "total_nodes": total_nodes,
        "total_passed_leaves": total_passed,
        "total_discarded_leaves": total_discarded,
        "max_nodes": max_nodes,
        "max_node_jobs": [list(key) for key in max_node_keys],
        "all_returncodes_zero": True,
        "all_stderr_empty": True,
        "all_embedded_results_pass": True,
        "all_full_binary_tree_accounting_valid": True,
    }


def main() -> int:
    actual_hashes = {
        "prover_sha256": sha256(PROVER),
        "batch_sha256": sha256(BATCH),
        "source_report_sha256": sha256(SOURCE_REPORT),
    }
    assert actual_hashes == {
        "prover_sha256": EXPECTED_PROVER_SHA256,
        "batch_sha256": EXPECTED_BATCH_SHA256,
        "source_report_sha256": EXPECTED_REPORT_SHA256,
    }
    source_report = json.loads(SOURCE_REPORT.read_text(encoding="utf-8"))
    output = {
        "schema": "rank7-delta0-joint-capacity-independent-audit-v1",
        "status": "PASS_CODE_REPORT_AUDIT_NO_FRESH_REPLAY_LOW_RAM",
        "fresh_replay": {
            "performed": False,
            "reason": "Free RAM snapshot was 4.87 GiB, below the parent-specified >5 GiB replay threshold.",
        },
        "hash_integrity": actual_hashes,
        "coverage_and_report_integrity": report_audit(source_report),
        "exact_algebra": exact_algebra_audit(),
        "scope_guard": {
            "proved_by_source_report": "upper-b/lower-d endpoint only; 28<=n<=38; 18<=m<=n-2; both q endpoints",
            "not_proved_by_source_report": [
                "lower-b/upper-d endpoint",
                "m<=17",
                "n=27",
                "orders n>=39",
            ],
        },
    }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output["status"])
    print("output", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
