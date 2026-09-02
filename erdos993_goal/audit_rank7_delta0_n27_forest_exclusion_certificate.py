#!/usr/bin/env python3
"""Independent low-memory audit of the n=27 forest-exclusion package.

No Bernstein job is replayed.  This reconstructs the forest edge-pair lift,
the integer split, the exact 32-job key set, and every embedded result.
"""

from __future__ import annotations

import ast
import hashlib
import json
import re
from itertools import combinations
from math import comb
from pathlib import Path

import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


ROOT = Path(__file__).resolve().parent
FOREST_NOTE = ROOT / "FOREST_N25_I45_EDGE_PAIR_LIFT_2026-08-20.md"
FOREST_VERIFIER = ROOT / "verify_forest_n25_i45_edge_pair_lift.py"
FOREST_REPORT = ROOT / "forest_n25_i45_edge_pair_lift_exact_20260820.json"
GENERIC_PROVER = ROOT / "prove_rank7_delta0_joint_capacity_faces_finite.py"
HARD_PROVER = ROOT / "prove_rank7_delta0_n27_hard_face_with_forest_exclusion.py"
BATCH = ROOT / "run_rank7_delta0_joint_capacity_faces_n27_batch.py"
N27_REPORT = ROOT / "rank7_delta0_joint_capacity_faces_n27_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_n27_forest_exclusion_independent_audit_exact_20260820.json"

EXPECTED_HASHES = {
    "forest_note_sha256": "1BAF2AC41B75591F968D4AC213C5D761C1F77DCDB0A6244C439E3C2FD804B6D3",
    "forest_verifier_sha256": "5AB35757C52DCA97DA571617986B339758BBDF62CBB4EE35322A6B09DCE26D33",
    "forest_report_sha256": "184323919958BD9732BD34B88AD7B005B58247360D24966E4978381D0C082224",
    "generic_prover_sha256": "47B56B215EB3B7EA881537ED17DD21EACAF9139EDBFE584C6A013E41338545C1",
    "hard_prover_sha256": "6B642C6B358FAB53DF220FE28E4F8244A11253AE6734D9C8FD100E39FCAAA5C8",
    "batch_sha256": "F6079599F8A4CFA39B0CA9F26DD1635BBA52ACD1A710CB141E1C560984A5E36E",
    "n27_report_sha256": "7FE23FF9A004A6CD924A1D13B4F5166F05CECCC12CB51FECC137E849BCF48C3C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ceil_div(numerator: int, denominator: int) -> int:
    return -(-numerator // denominator)


def forest_test(order: int, edges: tuple[tuple[int, int], ...]) -> bool:
    parent = list(range(order))

    def find(v: int) -> int:
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru == rv:
            return False
        parent[ru] = rv
    return True


def independent_local_forest_audit() -> dict:
    possible = tuple(combinations(range(5), 2))
    forest_count = multi_count = 0
    max_pairs = 0
    min_bad4_multi = 5
    for mask in range(1 << len(possible)):
        edges = tuple(edge for index, edge in enumerate(possible) if mask & (1 << index))
        if not forest_test(5, edges):
            continue
        forest_count += 1
        edge_count = len(edges)
        max_pairs = max(max_pairs, comb(edge_count, 2))
        bad4 = 0
        for omitted in range(5):
            remaining = set(range(5)) - {omitted}
            bad4 += any(u in remaining and v in remaining for u, v in edges)
        if edge_count == 1:
            assert bad4 == 3
        if edge_count >= 2:
            multi_count += 1
            min_bad4_multi = min(min_bad4_multi, bad4)
    result = {
        "labelled_five_vertex_forests": forest_count,
        "labelled_multi_edge_five_vertex_forests": multi_count,
        "maximum_edge_pairs": max_pairs,
        "minimum_bad_four_subsets_when_at_least_two_edges": min_bad4_multi,
    }
    assert result == {
        "labelled_five_vertex_forests": 291,
        "labelled_multi_edge_five_vertex_forests": 280,
        "maximum_edge_pairs": 6,
        "minimum_bad_four_subsets_when_at_least_two_edges": 4,
    }
    return result


def lift_row(a: int) -> dict:
    bad4 = comb(25, 4) - a
    edge_floor = ceil_div(bad4, comb(23, 2))
    adjacent_floor = max(0, 2 * edge_floor - 25)
    incidence_floor = 21 * comb(edge_floor, 2) + 210 * adjacent_floor
    multi_five_floor = ceil_div(incidence_floor, 6)
    lift = ceil_div(multi_five_floor, 3)
    generic = comb(25, 5) - 7 * bad4
    return {
        "i4": a,
        "bad_four_sets": bad4,
        "edge_floor": edge_floor,
        "adjacent_edge_pair_floor": adjacent_floor,
        "edge_pair_to_five_set_incidences_floor": incidence_floor,
        "multiple_edge_five_sets_floor": multi_five_floor,
        "incidence_lift": lift,
        "generic_i5_lower": generic,
        "lifted_i5_lower": generic + lift,
    }


def compress_runs(rows: list[dict]) -> list[dict]:
    names = (
        "edge_floor",
        "adjacent_edge_pair_floor",
        "multiple_edge_five_sets_floor",
        "incidence_lift",
    )
    runs = []
    start = 0
    signature = tuple(rows[0][name] for name in names)
    for index in range(1, len(rows) + 1):
        next_signature = None if index == len(rows) else tuple(rows[index][name] for name in names)
        if next_signature != signature:
            runs.append(
                {
                    "i4_min": start,
                    "i4_max": index - 1,
                    "edge_floor": signature[0],
                    "adjacent_edge_pair_floor": signature[1],
                    "multiple_edge_five_sets_floor": signature[2],
                    "incidence_lift": signature[3],
                    "lifted_i5_formula": f"7*i4-35420+{signature[3]}",
                }
            )
            start = index
            signature = next_signature
    return runs


def audit_forest_report(report: dict) -> dict:
    local = independent_local_forest_audit()
    rows = [lift_row(a) for a in range(comb(25, 4) + 1)]
    runs = compress_runs(rows)
    assert report["status"] == "PASS_EXACT_FOREST_N25_I45_EDGE_PAIR_LIFT"
    assert report["local_five_vertex_audit"] == local
    assert report["piecewise_runs"] == runs
    assert len(runs) == 51
    assert runs[0]["i4_min"] == 0 and runs[-1]["i4_max"] == comb(25, 4)
    for left, right in zip(runs, runs[1:]):
        assert left["i4_max"] + 1 == right["i4_min"]

    threshold = rows[8854]
    outside = rows[8855]
    assert report["global_corollary"]["threshold_row"] == threshold
    assert report["global_corollary"]["first_row_outside_uniform_edge_16_scope"] == outside
    assert threshold == {
        "i4": 8854,
        "bad_four_sets": 3796,
        "edge_floor": 16,
        "adjacent_edge_pair_floor": 7,
        "edge_pair_to_five_set_incidences_floor": 3990,
        "multiple_edge_five_sets_floor": 665,
        "incidence_lift": 222,
        "generic_i5_lower": 26558,
        "lifted_i5_lower": 26780,
    }
    assert outside["bad_four_sets"] == 3795 and outside["edge_floor"] == 15
    assert 15 * 253 == 3795 and 16 * 253 == 4048
    assert 21 * comb(16, 2) + 210 * 7 == 3990
    assert ceil_div(3990, 6) == 665
    assert ceil_div(665, 3) == 222
    assert comb(25, 5) - 7 * comb(25, 4) == -35420
    assert -35420 + 222 == -35198
    for row in rows[:8855]:
        assert row["lifted_i5_lower"] >= 7 * row["i4"] - 35198

    return {
        "status": "PASS",
        "five_vertex_enumeration": local,
        "piecewise_runs": len(runs),
        "piecewise_integer_domain": [0, comb(25, 4)],
        "piecewise_no_gaps_or_overlaps": True,
        "threshold_row": threshold,
        "first_outside_row": outside,
        "derivation": {
            "bad4_edge_union_bound": "B4<=253e, hence e>=ceil(B4/253)",
            "adjacent_pair_bound": "sum C(deg(v),2)>=2e-25",
            "pair_five_incidence": "21*C(e,2)+210*adjacent_pairs",
            "multi_edge_five_sets": "at least ceil(pair incidences/6)",
            "defect_identity": "D=21B4-3B5=3*(i5-7*i4+35420)",
            "divisibility_step": "D>=665 and 3|D imply D>=666",
            "corollary": "i4<=8854 implies i5>=7*i4-35198",
        },
        "scope": "25-vertex forests; independent of ambient c5",
    }


def parse_generic_stdout(row: dict) -> dict:
    parts = row["stdout"].split(maxsplit=4)
    assert len(parts) == 5
    assert (int(parts[0]), int(parts[1]), parts[2], int(parts[3])) == (
        27,
        row["m"],
        row["face"],
        row["q"],
    )
    result = ast.literal_eval(parts[4])
    assert result["status"] == "PASS" and result["worst"] == "None"
    assert result["nodes"] == 2 * (result["passed"] + result["discarded"]) - 1
    return result


def parse_hard_stdout(stdout: str) -> list[dict]:
    pattern = re.compile(
        r"^cell (\d+) (\d+) forest_exclusion (True|False) (\{[^\n]+\})$",
        re.MULTILINE,
    )
    matches = pattern.findall(stdout)
    assert len(matches) == 2
    parsed = []
    for low, high, extra, result_text in matches:
        result = ast.literal_eval(result_text)
        assert result["status"] == "PASS" and result["worst"] == "None"
        assert result["nodes"] == 2 * (result["passed"] + result["discarded"]) - 1
        parsed.append(
            {
                "a_low": int(low),
                "a_high": int(high),
                "forest_exclusion": extra == "True",
                **result,
            }
        )
    assert [(r["a_low"], r["a_high"], r["forest_exclusion"]) for r in parsed] == [
        (0, 8854, True),
        (8855, comb(25, 4), False),
    ]
    assert stdout.rstrip().endswith(
        "PASS_EXACT_RANK7_DELTA0_N27_M25_CONTAINMENT_QLOW_WITH_FOREST_EXCLUSION"
    )
    return parsed


def audit_n27_report(report: dict) -> dict:
    expected = [
        (27, m, face, q)
        for m in range(18, 26)
        for face in ("containment", "extension")
        for q in (0, 1)
    ]
    assert len(expected) == 32
    assert report["schema"] == "rank7-delta0-joint-capacity-n27-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27"
    assert report["scope"] == {
        "n": 27,
        "m": [18, 25],
        "faces": ["containment", "extension"],
        "q": [0, 1],
    }
    assert report["expected_jobs"] == report["completed_jobs"] == report["passing_jobs"] == 32
    assert report["artifacts"] == {
        "generic_prover_sha256": EXPECTED_HASHES["generic_prover_sha256"],
        "hard_face_prover_sha256": EXPECTED_HASHES["hard_prover_sha256"],
    }

    observed = []
    total_nodes = total_passed = total_discarded = 0
    hard_cells = None
    for row in report["results"]:
        key = (row["n"], row["m"], row["face"], row["q"])
        observed.append(key)
        assert row["returncode"] == 0 and row["stderr"] == "" and row["pass"] is True
        expected_hard = key == (27, 25, "containment", 0)
        assert row["hard_face_repair"] is expected_hard
        results = parse_hard_stdout(row["stdout"]) if expected_hard else [parse_generic_stdout(row)]
        if expected_hard:
            hard_cells = results
        for result in results:
            total_nodes += result["nodes"]
            total_passed += result["passed"]
            total_discarded += result["discarded"]
    assert observed == expected and len(set(observed)) == 32
    assert hard_cells is not None
    return {
        "status": "PASS",
        "expected_and_observed_jobs": 32,
        "exact_ordered_keyset_match": True,
        "duplicates": 0,
        "omissions": 0,
        "off_scope_rows": 0,
        "hard_repair_jobs": 1,
        "hard_repair_integer_cells": hard_cells,
        "integer_split_no_gap": "[0,8854] union [8855,12650] contains every integer in [0,C(25,4)]",
        "all_returncodes_zero": True,
        "all_stderr_empty": True,
        "all_embedded_results_pass": True,
        "all_full_binary_tree_accounting_valid": True,
        "total_nodes_including_both_hard_subcells": total_nodes,
        "total_passed_leaves": total_passed,
        "total_discarded_leaves": total_discarded,
    }


def algebra_audit() -> dict:
    expression, (x, y, z, q, s, d) = normalized_low(0)
    q_curvature = sp.factor(sp.diff(expression, q, 2))
    d_curvature = sp.factor(sp.diff(expression, d, 2))
    assert x not in expression.free_symbols and y not in expression.free_symbols
    assert sp.simplify(q_curvature + 196 * s * (s + 1)) == 0
    assert sp.simplify(d_curvature - 4 * (s * z - 48 * z - 48)) == 0
    n = 27
    tn = sp.Rational((n - 7) * (n - 8), n - 3)
    mu6_lower = sp.factor((tn - 3 + 2 / tn) / 6)
    z_low = sp.Rational(6, n - 6)
    z_high = sp.factor(1 / mu6_lower)
    assert 0 < z_low < z_high < sp.Rational(1, 2)
    q_low = (2 + z) / 14
    q_high = sp.Rational(1, 7) + z / 2
    assert sp.factor(q_high - q_low) == sp.Rational(3, 7) * z
    for m in range(18, 26):
        assert sp.Rational(m - 4, 5) * comb(m, 4) == comb(m, 5)
    c5, c6, b, ceiling = sp.symbols("c5 c6 b ceiling", positive=True)
    assert sp.simplify((c5 - 2 * b * z).subs(z, c5 / c6) - c5 * (1 - 2 * b / c6)) == 0
    assert sp.simplify((ceiling * z - c5).subs(z, c5 / c6) - c5 * (ceiling / c6 - 1)) == 0
    return {
        "x_y_absent": True,
        "q_second_derivative": str(q_curvature),
        "d_second_derivative": str(d_curvature),
        "z_low": str(z_low),
        "z_high": str(z_high),
        "z_high_below_one_half": True,
        "q_endpoint_gap": str(sp.factor(q_high - q_low)),
        "upper_b_face_completeness": (
            "C(25,5) is redundant with extension capacity; z<1/2 makes half retention "
            "redundant with containment; the two retained opposing-capacity faces are complete"
        ),
        "hard_extra_constraint_direction": "b-(7*a-35198)>=0",
        "hard_a_map": "a=a_low+(a_high-a_low)*A on A in [0,1]",
        "constraint_signs": {
            "lower_bound": "b-lower>=0",
            "upper_bound": "upper-b>=0",
            "half_retention": "c5-2*b*z=(c5/c6)*(c6-2*b)>=0",
            "c6_ceiling": "C(27,6)*z-c5=(c5/c6)*(C(27,6)-c6)>=0",
        },
    }


def main() -> int:
    files = {
        "forest_note_sha256": FOREST_NOTE,
        "forest_verifier_sha256": FOREST_VERIFIER,
        "forest_report_sha256": FOREST_REPORT,
        "generic_prover_sha256": GENERIC_PROVER,
        "hard_prover_sha256": HARD_PROVER,
        "batch_sha256": BATCH,
        "n27_report_sha256": N27_REPORT,
    }
    hashes = {name: sha256(path) for name, path in files.items()}
    assert hashes == EXPECTED_HASHES
    forest_report = json.loads(FOREST_REPORT.read_text(encoding="utf-8"))
    n27_report = json.loads(N27_REPORT.read_text(encoding="utf-8"))
    result = {
        "schema": "rank7-delta0-n27-forest-exclusion-independent-audit-v1",
        "status": "PASS_CODE_REPORT_AUDIT_NO_REPLAY_LOW_RAM",
        "fresh_replay": {
            "performed": False,
            "reason": "Parent required low-memory code/report audit only while RAM is tight.",
        },
        "hash_integrity": hashes,
        "forest_edge_pair_lift": audit_forest_report(forest_report),
        "n27_report": audit_n27_report(n27_report),
        "rank7_algebra": algebra_audit(),
        "scope_guard": {
            "proved": "n=27, 18<=m<=25 upper-b/lower-d endpoint, both q endpoints",
            "not_proved": ["lower-b/upper-d endpoint", "m<=17", "other orders"],
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(result["status"])
    print("output", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
