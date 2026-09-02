#!/usr/bin/env python3
"""Independent low-memory audit of the completed small-J upper-b batch.

This does not replay Bernstein jobs.  It validates the immutable source/report
hash chain, parses every embedded result as a Python literal, checks all 744
keys across three reports, and independently audits endpoint completeness for
0<=m<=4 and the upper-b endpoint and constraint directions for 5<=m<=17.
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
PROVER = ROOT / "prove_rank7_delta0_joint_capacity_faces_small_j_finite.py"
BATCH = ROOT / "run_rank7_delta0_joint_capacity_faces_small_j_batch.py"
SOURCE_REPORT = ROOT / "rank7_delta0_joint_capacity_faces_small_j_n28_n38_exact_20260820.json"
N27_BATCH = ROOT / "run_rank7_delta0_joint_capacity_faces_small_j_n27_batch.py"
N27_SOURCE_REPORT = ROOT / "rank7_delta0_joint_capacity_faces_small_j_n27_exact_20260820.json"
VERY_SMALL_PROVER = ROOT / "prove_rank7_delta0_very_small_j_finite.py"
VERY_SMALL_BATCH = ROOT / "run_rank7_delta0_very_small_j_batch.py"
VERY_SMALL_SOURCE_REPORT = ROOT / "rank7_delta0_very_small_j_n27_n38_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_small_j_upper_b_independent_audit_exact_20260820.json"

EXPECTED_PROVER_SHA256 = "0A9B1304559FFADF1CBA51174A0E97BC4E051FBBCBC5C228D8C122A135EFB098"
EXPECTED_BATCH_SHA256 = "F4FAB5A10D2B6E0F8F5638D6981CD53C4C2C119992C060D089D52B9D6DD3359D"
EXPECTED_REPORT_SHA256 = "03589B656CB02BFE4B093931814E880BA2AC13FA0E25A8B9021FF504D5BAE083"
EXPECTED_N27_BATCH_SHA256 = "5F192D964446B36C309ED5EDD8BAE05425F083FF58ECBD0BFEC58683DC4FABD3"
EXPECTED_N27_REPORT_SHA256 = "DA6B3B78B364CC37B32C6A128B9B347A09B4B86313D955BDD9F527A2B51026FE"
EXPECTED_VERY_SMALL_PROVER_SHA256 = "79ADE232595082A9F5C0F9C1D52B3605562249769F4CA7A9860ED1792223FC19"
EXPECTED_VERY_SMALL_BATCH_SHA256 = "801B7F5B21DC65C25E43E71AFBC234DFEA8D9BAF2FFE17F34A79372856641E3F"
EXPECTED_VERY_SMALL_REPORT_SHA256 = "3D9D0BC70EDDB50B43C0A1CE7A27554833C32DE18340A3CF1AF67D17649138F4"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_embedded_result(stdout: str, key: tuple[int, int, str, int]) -> dict:
    # split(maxsplit=4) requires exactly the four structural key fields before
    # the result literal; ast.literal_eval then parses the result dictionary.
    assert "\n" not in stdout and "\r" not in stdout
    parts = stdout.split(maxsplit=4)
    assert len(parts) == 5
    parsed_key = (int(parts[0]), int(parts[1]), parts[2], int(parts[3]))
    assert parsed_key == key
    result = ast.literal_eval(parts[4])
    assert type(result) is dict
    assert set(result) == {"status", "nodes", "passed", "discarded", "worst"}
    assert result["status"] == "PASS"
    assert result["worst"] == "None"
    for name in ("nodes", "passed", "discarded"):
        assert type(result[name]) is int and result[name] >= 0
    leaves = result["passed"] + result["discarded"]
    assert leaves >= 1
    assert result["nodes"] == 2 * leaves - 1
    return result


def n27_report_audit(report: dict) -> dict:
    expected = [
        (27, m, face, q)
        for m in range(5, 18)
        for face in ("containment", "extension")
        for q in (0, 1)
    ]
    assert len(expected) == 52
    assert report["schema"] == "rank7-delta0-joint-capacity-small-j-n27-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N27"
    assert report["scope"] == {
        "n": [27, 27],
        "m": [5, 17],
        "faces": ["containment", "extension"],
        "q": [0, 1],
    }
    assert report["prover_sha256"] == EXPECTED_PROVER_SHA256
    assert report["expected_jobs"] == 52
    assert report["completed_jobs"] == 52
    assert report["passing_jobs"] == 52
    assert len(report["results"]) == 52

    observed = []
    aggregate = {"nodes": 0, "passed": 0, "discarded": 0}
    for row in report["results"]:
        assert set(row) == {
            "n", "m", "face", "q", "returncode", "stdout", "stderr", "pass"
        }
        key = (row["n"], row["m"], row["face"], row["q"])
        assert row["returncode"] == 0
        assert row["stderr"] == ""
        assert row["pass"] is True
        result = parse_embedded_result(row["stdout"], key)
        observed.append(key)
        for name in aggregate:
            aggregate[name] += result[name]
        if row["face"] == "containment":
            assert result == {
                "status": "PASS", "nodes": 1, "passed": 0,
                "discarded": 1, "worst": "None",
            }
        else:
            assert result == {
                "status": "PASS", "nodes": 1, "passed": 1,
                "discarded": 0, "worst": "None",
            }
    assert observed == expected
    assert len(set(observed)) == 52
    assert aggregate == {"nodes": 52, "passed": 26, "discarded": 26}
    return {
        "expected_and_observed_jobs": 52,
        "n_m_pairs": 13,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_rows": 0,
        "jobs_by_face": {"containment": 26, "extension": 26},
        "jobs_by_q": {"q0": 26, "q1": 26},
        "aggregate_bernstein_tree": aggregate,
        "all_containment_boxes_exactly_discarded_as_infeasible": True,
        "all_extension_boxes_passed_without_subdivision": True,
        "all_embedded_results_structurally_parsed_and_passed": True,
    }


def report_audit_complete(report: dict) -> dict:
    """Audit the 572-cell orders-28--38 report.

    Kept separate from the order-27 audit so every source report has an exact
    independently regenerated ordered key list.
    """
    expected = [
        (n, m, face, q)
        for n in range(28, 39)
        for m in range(5, 18)
        for face in ("containment", "extension")
        for q in (0, 1)
    ]
    assert len(expected) == 572
    assert report["schema"] == "rank7-delta0-joint-capacity-small-j-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_SMALL_J_N28_N38"
    assert report["scope"] == {
        "n": [28, 38],
        "m": [5, 17],
        "faces": ["containment", "extension"],
        "q": [0, 1],
    }
    assert report["prover_sha256"] == EXPECTED_PROVER_SHA256
    assert report["expected_jobs"] == len(expected)
    assert report["completed_jobs"] == len(expected)
    assert report["passing_jobs"] == len(expected)
    assert len(report["results"]) == len(expected)

    observed = []
    aggregate = {"nodes": 0, "passed": 0, "discarded": 0}
    by_face = {"containment": 0, "extension": 0}
    by_face_q = {
        "containment_q0": 0,
        "containment_q1": 0,
        "extension_q0": 0,
        "extension_q1": 0,
    }
    for row in report["results"]:
        assert set(row) == {
            "n", "m", "face", "q", "returncode", "stdout", "stderr", "pass"
        }
        key = (row["n"], row["m"], row["face"], row["q"])
        assert row["returncode"] == 0
        assert row["stderr"] == ""
        assert row["pass"] is True
        result = parse_embedded_result(row["stdout"], key)
        observed.append(key)
        for name in aggregate:
            aggregate[name] += result[name]
        by_face[row["face"]] += 1
        by_face_q[f"{row['face']}_q{row['q']}"] += 1
        if row["face"] == "containment":
            assert result == {
                "status": "PASS", "nodes": 1, "passed": 0,
                "discarded": 1, "worst": "None",
            }
        else:
            assert result == {
                "status": "PASS", "nodes": 1, "passed": 1,
                "discarded": 0, "worst": "None",
            }

    assert observed == expected
    assert len(set(observed)) == len(expected)
    assert by_face == {"containment": 286, "extension": 286}
    assert by_face_q == {
        "containment_q0": 143,
        "containment_q1": 143,
        "extension_q0": 143,
        "extension_q1": 143,
    }
    assert aggregate == {"nodes": 572, "passed": 286, "discarded": 286}
    return {
        "expected_and_observed_jobs": len(expected),
        "n_m_pairs": 11 * 13,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_rows": 0,
        "jobs_by_n": {str(n): 52 for n in range(28, 39)},
        "jobs_by_m": {str(m): 44 for m in range(5, 18)},
        "jobs_by_face": by_face,
        "jobs_by_face_and_q": by_face_q,
        "aggregate_bernstein_tree": aggregate,
        "all_containment_boxes_exactly_discarded_as_infeasible": True,
        "all_extension_boxes_passed_without_subdivision": True,
        "all_returncodes_zero": True,
        "all_stderr_empty": True,
        "all_embedded_results_structurally_parsed_and_passed": True,
        "all_full_binary_tree_accounting_valid": True,
    }


def parse_very_small_result(stdout: str, key: tuple[int, int, int]) -> dict:
    assert "\n" not in stdout and "\r" not in stdout
    parts = stdout.split(maxsplit=3)
    assert len(parts) == 4
    parsed_key = (int(parts[0]), int(parts[1]), int(parts[2]))
    assert parsed_key == key
    result = ast.literal_eval(parts[3])
    assert type(result) is dict
    assert result == {
        "status": "PASS", "nodes": 1, "passed": 1,
        "discarded": 0, "worst": "None",
    }
    return result


def very_small_report_audit(report: dict) -> dict:
    expected = [
        (n, m, q)
        for n in range(27, 39)
        for m in range(0, 5)
        for q in (0, 1)
    ]
    assert len(expected) == 120
    assert report["schema"] == "rank7-delta0-very-small-j-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_VERY_SMALL_J_N27_N38"
    assert report["scope"] == {"n": [27, 38], "m": [0, 4], "q": [0, 1]}
    assert report["prover_sha256"] == EXPECTED_VERY_SMALL_PROVER_SHA256
    assert report["expected_jobs"] == 120
    assert report["completed_jobs"] == 120
    assert report["passing_jobs"] == 120
    assert len(report["results"]) == 120

    observed = []
    aggregate = {"nodes": 0, "passed": 0, "discarded": 0}
    for row in report["results"]:
        assert set(row) == {
            "n", "m", "q", "returncode", "stdout", "stderr", "pass"
        }
        key = (row["n"], row["m"], row["q"])
        assert row["returncode"] == 0
        assert row["stderr"] == ""
        assert row["pass"] is True
        result = parse_very_small_result(row["stdout"], key)
        observed.append(key)
        for name in aggregate:
            aggregate[name] += result[name]
    assert observed == expected
    assert len(set(observed)) == 120
    assert aggregate == {"nodes": 120, "passed": 120, "discarded": 0}
    return {
        "expected_and_observed_jobs": 120,
        "n_m_pairs": 60,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_rows": 0,
        "jobs_by_n": {str(n): 10 for n in range(27, 39)},
        "jobs_by_m": {str(m): 24 for m in range(0, 5)},
        "jobs_by_q": {"q0": 60, "q1": 60},
        "aggregate_bernstein_tree": aggregate,
        "all_boxes_passed_without_subdivision": True,
        "all_embedded_results_structurally_parsed_and_passed": True,
    }
def exact_algebra_audit() -> dict:
    expression, (x, y, z, q, s, d) = normalized_low(0)
    q_curvature = sp.factor(sp.diff(expression, q, 2))
    d_curvature = sp.factor(sp.diff(expression, d, 2))
    assert sp.simplify(q_curvature + 196 * s * (s + 1)) == 0
    assert sp.simplify(d_curvature - 4 * (s * z - 48 * z - 48)) == 0
    assert x not in expression.free_symbols and y not in expression.free_symbols

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
        path_floor = comb(n - 4, 5)
        assert 0 < path_floor < comb(n, 5)
        z_rows.append({
            "n": n,
            "mu6_lower": str(mu6_lower),
            "z_low": str(z_low),
            "z_high": str(z_high),
        })

    face_rows = []
    for m in range(5, 18):
        c4 = comb(m, 4)
        c5 = comb(m, 5)
        extension_slope = sp.Rational(m - 4, 5)
        badset_slope = sp.Rational(m - 4, 3)
        assert extension_slope * c4 == c5
        a_symbol, c5_symbol = sp.symbols(f"a_{m} c5_{m}", nonnegative=True)
        badset_lower = c5 - badset_slope * (c4 - a_symbol)
        extension_upper = extension_slope * a_symbol
        containment_upper = c5_symbol - a_symbol

        # At the upper-b/lower-d endpoint, b is the minimum of the two upper
        # capacities.  The two face equations plus the opposing inequalities
        # are therefore an exact no-gap cover, including their tie.
        b_containment = containment_upper
        containment_constraints = {
            "badset_lower": sp.factor(b_containment - badset_lower),
            "opposing_extension_upper": sp.factor(extension_upper - b_containment),
        }
        b_extension = extension_upper
        extension_constraints = {
            "badset_lower": sp.factor(b_extension - badset_lower),
            "opposing_containment_upper": sp.factor(containment_upper - b_extension),
        }
        face_rows.append({
            "m": m,
            "badset_lower": str(badset_lower),
            "extension_upper": str(extension_upper),
            "containment_upper": str(containment_upper),
            "containment_face_constraints_ge_zero": {
                key: str(value) for key, value in containment_constraints.items()
            },
            "extension_face_constraints_ge_zero": {
                key: str(value) for key, value in extension_constraints.items()
            },
            "literal_i5_ceiling_redundant_at_extension_cap": True,
        })

    c5_symbol, c6_symbol, b_symbol, ceiling = sp.symbols(
        "c5 c6 b C6", positive=True
    )
    assert sp.simplify(
        (c5_symbol - 2 * b_symbol * z).subs(z, c5_symbol / c6_symbol)
        - c5_symbol * (1 - 2 * b_symbol / c6_symbol)
    ) == 0
    assert sp.simplify(
        (ceiling * z - c5_symbol).subs(z, c5_symbol / c6_symbol)
        - c5_symbol * (ceiling / c6_symbol - 1)
    ) == 0

    return {
        "normalized_low_free_symbols": sorted(str(item) for item in expression.free_symbols),
        "x_y_absent": True,
        "q_second_derivative": str(q_curvature),
        "q_endpoint_gap": str(sp.factor(q_upper - q_lower)),
        "q_endpoint_completeness": (
            "q curvature is nonpositive, so both recorded q endpoints cover the interval"
        ),
        "d_second_derivative": str(d_curvature),
        "d_endpoint_reason": (
            "d curvature is strictly negative on 0<=s<=1,z>0; this certificate "
            "covers the lower-d endpoint obtained by maximizing feasible b"
        ),
        "upper_b_face_completeness": (
            "max feasible b=min(c5-a,((m-4)/5)a); containment and extension "
            "faces with the opposing inequality give an exact no-gap cover"
        ),
        "z_band_checks": z_rows,
        "face_and_constraint_rows_m5_through_m17": face_rows,
        "constraint_signs": {
            "badset_lower": "b-badset_lower>=0",
            "opposing_upper_capacity": "other_upper-b>=0",
            "coefficient_floor": "b>=0",
            "literal_i5_ceiling": "C(m,5)-b>=0",
            "half_retention": "c5-2*b*z=(c5/c6)*(c6-2b)>=0",
            "c6_ceiling": "C(n,6)*z-c5=(c5/c6)*(C(n,6)-c6)>=0",
        },
        "additional_upper_face_redundancy": {
            "literal_i5_ceiling": "extension cap reaches C(m,5) at a=C(m,4)",
            "half_retention": "z<1/2 gives c6/2>c5>=c5-a",
        },
    }


def exact_very_small_algebra_audit() -> dict:
    """Audit endpoint completeness when a forest has fewer than five vertices."""
    rows = []
    for m in range(0, 5):
        literal_i4_ceiling = comb(m, 4)
        literal_i5_ceiling = comb(m, 5)
        assert literal_i5_ceiling == 0
        assert literal_i4_ceiling == (1 if m == 4 else 0)
        rows.append({
            "m": m,
            "i4_relaxation": (
                "a=0 exactly" if m < 4
                else "0<=a<=1 contains both possible forest values"
            ),
            "i5_exact": "b=0",
            "d_exact": "d=1-bz/c5=1",
        })

    # With b fixed to zero there is no omitted b/d face: the lower-b and
    # upper-b endpoints coincide.  Half retention and the literal i5 ceiling
    # also reduce to tautologies.
    b, z, c5, c6 = sp.symbols("b z c5 c6", positive=True)
    d = 1 - b * z / c5
    assert sp.simplify(d.subs(b, 0) - 1) == 0
    assert sp.simplify((c6 - 2 * b).subs(b, 0) - c6) == 0

    for n in range(27, 39):
        path_floor = comb(n - 4, 5)
        c5_ceiling = comb(n, 5)
        c6_ceiling = comb(n, 6)
        assert 0 < path_floor < c5_ceiling < c6_ceiling

    return {
        "m_rows": rows,
        "b_endpoint_completeness": (
            "m<=4 forces i5(J)=b=0, so lower-b and upper-b coincide"
        ),
        "d_endpoint_completeness": "d=1-bz/c5=1 exactly",
        "half_retention": "c6-2b=c6>0; no extra face",
        "literal_i5_ceiling": "C(m,5)-b=0 exactly",
        "a_relaxation": (
            "m<4 gives a=0; m=4 certifies the full interval 0<=a<=1, "
            "which contains both literal forest possibilities"
        ),
        "q_endpoint_completeness": (
            "the same nonpositive q curvature makes the two q endpoints complete"
        ),
        "only_retained_nontrivial_capacity": (
            "C(n,6)z-c5=(c5/c6)(C(n,6)-c6)>=0"
        ),
    }


def main() -> int:
    actual_hashes = {
        "prover_sha256": sha256(PROVER),
        "batch_sha256": sha256(BATCH),
        "source_report_sha256": sha256(SOURCE_REPORT),
        "n27_batch_sha256": sha256(N27_BATCH),
        "n27_source_report_sha256": sha256(N27_SOURCE_REPORT),
        "very_small_prover_sha256": sha256(VERY_SMALL_PROVER),
        "very_small_batch_sha256": sha256(VERY_SMALL_BATCH),
        "very_small_source_report_sha256": sha256(VERY_SMALL_SOURCE_REPORT),
    }
    assert actual_hashes == {
        "prover_sha256": EXPECTED_PROVER_SHA256,
        "batch_sha256": EXPECTED_BATCH_SHA256,
        "source_report_sha256": EXPECTED_REPORT_SHA256,
        "n27_batch_sha256": EXPECTED_N27_BATCH_SHA256,
        "n27_source_report_sha256": EXPECTED_N27_REPORT_SHA256,
        "very_small_prover_sha256": EXPECTED_VERY_SMALL_PROVER_SHA256,
        "very_small_batch_sha256": EXPECTED_VERY_SMALL_BATCH_SHA256,
        "very_small_source_report_sha256": EXPECTED_VERY_SMALL_REPORT_SHA256,
    }
    source_report = json.loads(SOURCE_REPORT.read_text(encoding="utf-8"))
    n27_source_report = json.loads(N27_SOURCE_REPORT.read_text(encoding="utf-8"))
    very_small_source_report = json.loads(
        VERY_SMALL_SOURCE_REPORT.read_text(encoding="utf-8")
    )
    output = {
        "schema": "rank7-delta0-small-j-upper-b-independent-audit-v1",
        "status": "PASS_CODE_REPORT_AUDIT_NO_FRESH_REPLAY_LOW_RAM",
        "fresh_replay": {
            "performed": False,
            "reason": (
                "Free RAM snapshot was 2.62 GiB, below the parent-specified "
                "5 GiB replay threshold."
            ),
        },
        "hash_integrity": actual_hashes,
        "coverage_and_report_integrity": report_audit_complete(source_report),
        "order27_coverage_and_report_integrity": n27_report_audit(n27_source_report),
        "very_small_coverage_and_report_integrity": very_small_report_audit(
            very_small_source_report
        ),
        "exact_algebra_and_endpoint_audit": exact_algebra_audit(),
        "exact_very_small_algebra_and_endpoint_audit": exact_very_small_algebra_audit(),
        "scope_guard": {
            "proved_by_source_report": (
                "upper-b/lower-d endpoint only; 27<=n<=38; 5<=m<=17; both "
                "active upper-capacity faces and both q endpoints"
            ),
            "proved_by_very_small_source_report": (
                "all b/d endpoints because b=0,d=1 exactly; 27<=n<=38; "
                "0<=m<=4; both q endpoints"
            ),
            "not_proved_by_source_report": [
                "lower-b/upper-d endpoint",
                "m>=18",
                "orders n>=39",
            ],
        },
    }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output["status"])
    print("jobs=744 exact ordered scope; parsed embedded PASS results=744")
    print("output", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
