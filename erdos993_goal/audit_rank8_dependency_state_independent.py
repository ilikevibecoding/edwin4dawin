#!/usr/bin/env python3
"""Independent algebra/hash/key audit of the current rank-eight dependency state.

This script does not invoke or rewrite any existing certificate.  It rebuilds
the terminal identity and the Delta5 c8 derivative from their definitions,
checks every hash/key named by the stored Delta5 manifest, runs a tiny exact
tree probe, and records the live logical dependencies without promoting failed
enlarged-box relaxations to graph counterexamples.
"""

from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
from math import comb
import json
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_dependency_state_independent_audit_exact_20260820.json"


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def manifest_pairs(manifest: dict) -> dict[str, str]:
    pairs: dict[str, str] = {}

    def add(name: str, expected: str) -> None:
        previous = pairs.setdefault(name, expected.lower())
        assert previous == expected.lower(), (name, previous, expected)

    for name, expected in manifest["package_artifacts"].items():
        add(name, expected)
    for item in manifest["structural_certificates"]:
        add(item["file"], item["sha256"])
        add(item["report"], item["report_sha256"])
    analytic = manifest["analytic_certificate"]
    add(analytic["probe"], analytic["probe_sha256"])
    for name, expected in analytic["dependencies"].items():
        add(name, expected)
    for item in analytic["branches"]:
        add(item["report"], item["sha256"])
    for item in analytic.get("redundant_exact_stress_certificates", []):
        add(item["report"], item["sha256"])
    finite = manifest["finite_certificate"]
    add(finite["source"], finite["source_sha256"])
    for item in finite["reports"]:
        add(item["report"], item["sha256"])
    for item in finite["replays"]:
        add(item["file"], item["sha256"])
    for name, expected in manifest["preserved_relaxation_no_gos"]["files"].items():
        add(name, expected)
    return pairs


def symbolic_audit() -> dict:
    t = sp.symbols("t", integer=True, nonnegative=True)
    c = sp.symbols("c0:10", nonnegative=True)
    h = sp.symbols("h0:9", nonnegative=True)

    def p(j: int):
        return sum(sp.binomial(t, ell) * c[j - ell] for ell in range(j + 1)) + h[j - 1]

    p7, p8, p9 = p(7), p(8), p(9)
    p9o = sum(sp.binomial(t, ell) * c[9 - ell] for ell in range(1, 10))
    q8_gt = 16 * p8**2 - p7 * p8 - 18 * p7 * p9
    q8_a = 16 * c[8] ** 2 - c[7] * c[8] - 18 * c[7] * c[9]
    q7_h = 14 * h[7] ** 2 - h[6] * h[7] - 16 * h[6] * h[8]
    residual = (
        8 * c[7] * h[6] * (16 * p8**2 - p7 * p8 - 18 * p7 * p9o)
        - 8 * h[6] * p7 * (16 * c[8] ** 2 - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7] ** 2 - h[6] * h[7])
    )
    identity_gap = sp.expand(
        8 * c[7] * h[6] * q8_gt
        - residual
        - 8 * h[6] * p7 * q8_a
        - 9 * c[7] * p7 * q7_h
    )
    assert identity_gap == 0

    delta5 = sum(
        (-1) ** (5 - i) * comb(5, i) * residual.subs(t, 1 + i)
        for i in range(6)
    )
    derivative = sp.factor(sp.diff(delta5, c[8]))
    expected = -16 * h[6] * (
        54 * c[1] * c[7]
        + 16 * c[1] * c[8]
        + 83 * c[2] * c[7]
        + 16 * c[2] * c[8]
        + 29 * c[3] * c[7]
    )
    assert sp.expand(derivative - expected) == 0

    q7_a = 14 * c[7] ** 2 - c[6] * c[7] - 16 * c[6] * c[8]
    endpoint = sp.factor(c[7] * (14 * c[7] - c[6]) / (16 * c[6]))
    assert sp.factor(q7_a.subs(c[8], endpoint)) == 0

    n, q = sp.symbols("n q", positive=True)
    extension = (n - 7) * c[7] / 8
    difference = sp.factor(
        (extension - endpoint).subs(c[7], (n - 7) * q * c[6] / 6)
    )
    switch = sp.Rational(6, 7) + 3 / (7 * (n - 7))
    assert sp.factor(difference.subs(q, switch)) == 0

    return {
        "terminal_identity": "PASS_EXACT_SYMBOLIC_REBUILD",
        "newton_delta5_definition": "sum_i=(-1)^(5-i) binom(5,i) R_(1+i)",
        "Delta5_dc8": str(derivative),
        "monotonicity_on_tree_jets": "nonpositive",
        "Q7_endpoint": str(endpoint),
        "Q7_endpoint_identity": "Q7(A)=0 at the displayed c8 endpoint",
        "extension_minus_Q7_endpoint_after_q": str(difference),
        "endpoint_switch": str(switch),
        "alpha_guard": "n>=23 implies alpha(A)>=ceil(n/2)>=12",
    }


def polynomial_bruteforce(graph: nx.Graph) -> list[int]:
    nodes = list(graph.nodes())
    index = {node: i for i, node in enumerate(nodes)}
    edges = [(index[u], index[v]) for u, v in graph.edges()]
    counts = [0] * (len(nodes) + 1)
    for mask in range(1 << len(nodes)):
        if all(not ((mask >> u) & 1 and (mask >> v) & 1) for u, v in edges):
            counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def at(row: list[int], j: int) -> int:
    return row[j] if j < len(row) else 0


def residual_value(c: list[int], h: list[int], t: int) -> int:
    def p(j: int) -> int:
        return sum(comb(t, ell) * at(c, j - ell) for ell in range(j + 1)) + at(h, j - 1)

    p7, p8 = p(7), p(8)
    p9o = sum(comb(t, ell) * at(c, 9 - ell) for ell in range(1, 10))
    return (
        8 * at(c, 7) * at(h, 6) * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9o)
        - 8 * at(h, 6) * p7 * (16 * at(c, 8) ** 2 - at(c, 7) * at(c, 8))
        - 9 * at(c, 7) * p7 * (14 * at(h, 7) ** 2 - at(h, 6) * at(h, 7))
    )


def tiny_tree_probe() -> dict:
    free_trees = rooted_rows = active_rows = 0
    minimum: int | None = None
    minima_by_order: dict[int, int] = {}
    for n in range(2, 11):
        order_minimum: int | None = None
        for tree in nx.nonisomorphic_trees(n):
            free_trees += 1
            c = polynomial_bruteforce(tree)
            for root in tree.nodes():
                rooted_rows += 1
                reduced = tree.copy()
                reduced.remove_node(root)
                h = polynomial_bruteforce(reduced)
                values = [residual_value(c, h, t) for t in range(1, 7)]
                delta5 = sum((-1) ** (5 - i) * comb(5, i) * values[i] for i in range(6))
                if at(c, 7) * at(h, 6) > 0:
                    active_rows += 1
                    assert delta5 >= 0, (n, nx.to_graph6_bytes(tree), root, delta5)
                    minimum = delta5 if minimum is None else min(minimum, delta5)
                    order_minimum = delta5 if order_minimum is None else min(order_minimum, delta5)
        if order_minimum is not None:
            minima_by_order[n] = order_minimum
    return {
        "scope": "all nonisomorphic trees of orders 2 through 10 and every root",
        "free_trees": free_trees,
        "rooted_rows": rooted_rows,
        "active_rows": active_rows,
        "minimum_active_Delta5": minimum,
        "minima_by_order": minima_by_order,
        "status": "PASS_TINY_EXACT_PROBE",
        "role": "independent smoke check only; not the all-order proof",
    }


def main() -> None:
    manifest = load("rank8_q8_terminal_delta5_all_order_manifest_20260817.json")
    assert manifest["status"] == "PASS_CONDITIONAL_ON_PROVED_RANK7_Q7_ALPHA12"
    pairs = manifest_pairs(manifest)
    actual_hashes = {name: digest(ROOT / name) for name in sorted(pairs)}
    mismatches = {
        name: {"expected": pairs[name].upper(), "actual": actual_hashes[name]}
        for name in actual_hashes
        if actual_hashes[name] != pairs[name].upper()
    }
    assert not mismatches, mismatches

    analytic = manifest["analytic_certificate"]
    branch_rows = []
    coefficient_total = 0
    for item in analytic["branches"]:
        report = load(item["report"])
        degrees = report["cleared_degrees"]
        expected_count = 1
        for degree in degrees:
            expected_count *= degree + 1
        assert expected_count == report["initial_coefficients"]
        assert report["status"] == "PASS"
        assert report["certificate"]["status"] == "PASS"
        assert report["certificate"]["leaves"] == 1
        assert report["initial_minimum"] == "0"
        coefficient_total += report["initial_coefficients"]
        branch_rows.append(
            {
                "D6_k": report["D6_k"],
                "piece": report["capacity_piece"],
                "degrees": degrees,
                "coefficients": report["initial_coefficients"],
                "numerator_minimum": report["initial_minimum"],
                "denominator_minimum": report["denominator_minimum"],
                "hash": actual_hashes[item["report"]],
            }
        )
    assert coefficient_total == analytic["total_coefficients"] == 28_621_872

    finite_rows = []
    for item in manifest["finite_certificate"]["reports"]:
        report = load(item["report"])
        assert report["status"] == item["status"]
        assert all(row["Delta5_minimum"] >= 0 for row in report["rows"])
        finite_rows.append(
            {
                "range": item["range"],
                "free_trees": item["free_trees"],
                "rooted_cores": item["rooted_cores"],
                "hash": actual_hashes[item["report"]],
            }
        )

    no_go = load(manifest["preserved_relaxation_no_gos"]["report"])
    assert no_go["status"] == "EXACT_RELAXED_CONE_NO_GOS_NOT_ROOTED_COUNTEREXAMPLES"
    assert all(not witness["checks"]["rank7_Q7"] for witness in no_go["witnesses"])
    assert all(not witness["checks"]["Delta5_nonnegative"] for witness in no_go["witnesses"])

    rank7_watch = load("rank7_integration_guard_watcher_20260820.json")
    rank7_assembly = load("rank7_integration_readonly_20260820.json")
    rank7_ready = str(rank7_assembly.get("status", "")).startswith("PASS")

    boundary = load("rank8_pgc_matching_quotient_boundary_exact_20260817.json")
    assert boundary["finite_scope"]["no_gap"]
    assert boundary["finite_scope"]["matrix_cell_count"] == 18
    assert all(row["q_negative"] == 0 for row in boundary["cells"])
    assert all(row["coupled_negative"] == 0 for row in boundary["cells"])

    v8 = load("rank8_v8_alpha14_finite_reduction_exact_20260816.json")
    assert v8["status"] == "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS"

    delta4_k7 = load("rank8_delta4_v_concavity_k7_full_exact_20260820.json")
    assert delta4_k7["status"] == "UNRESOLVED_NO_SPLIT"

    payload = {
        "schema": "rank8-dependency-state-independent-audit-v1",
        "status": "PASS_EXACT_CONDITIONAL_DEPENDENCY_AUDIT",
        "snapshot_warning": "Rank-seven and rank-eight Delta4 jobs are live; logical readiness is recorded at audit time.",
        "Delta5": {
            "stored_theorem_status": manifest["status"],
            "correct_current_classification": (
                "UNCONDITIONAL" if rank7_ready else "CONDITIONAL_ON_CONNECTED_Q7_ALPHA_AT_LEAST_12"
            ),
            "symbolic_rebuild": symbolic_audit(),
            "manifest_hash_files": len(actual_hashes),
            "manifest_hash_mismatches": mismatches,
            "analytic_branches": branch_rows,
            "analytic_coefficient_total": coefficient_total,
            "finite_certificates": finite_rows,
            "tiny_independent_probe": tiny_tree_probe(),
            "scope": "Delta5 alone; Delta0 through Delta4 and Q8 are not implied",
        },
        "Q7_endpoint_repair": {
            "dependency": "Q7(A)>=0 for every connected tree with alpha(A)>=12",
            "analytic_guard": "n>=23 -> alpha(A)>=ceil(n/2)>=12",
            "orientation": "Delta5 decreases in c8, so any valid upper overbound gives a lower value; the Q7 endpoint is safe even when above the extension ceiling.",
            "live_rank7_assembly_status": rank7_assembly.get("status"),
            "live_rank7_watcher_status": rank7_watch.get("status"),
            "live_rank7_progress": rank7_watch.get("progress"),
            "unconditional_now": rank7_ready,
        },
        "remaining_dependencies": {
            "connected_Q8_alpha_at_least_14": [
                "finish the connected rank-seven Q7 theorem used by the c8 endpoint",
                "prove residual Delta0 through Delta4 for rooted cores from the analytic cutoff; Delta4 currently has a reduction/live boxes, not a theorem",
                "finish the literal shifted terminal-family guard for exceptional cores of orders 21 through 26; the order<=20 guard is complete and the matching reduction only partially closes the remaining twelve cells",
                "assemble the terminal induction without discarding negative small-core reserve terms",
            ],
            "forest_Q8_alpha_at_least_14": [
                "prove connected Q8 in the target range",
                "prove the full/full rank-eight factorial-convolution cones",
                "classify finite exceptional connected jets through rank 9",
                "prove fixed-exceptional/full preservation for every full cone",
                "prove exceptional-only first-crossing products, including overshoots above alpha=14",
            ],
            "already_closed_forest_boundary": {
                "Q8_alpha_13_and_14": "matching-quotient rows have q_negative=0 in all 18 no-gap cells above the independent base",
                "coupled_PGC_alpha_13_and_14": "coupled_negative=0 in all 18 cells",
            },
            "rank8_PGC": [
                "all-forest V8 for alpha>=14 is already proved",
                "after all-forest Q8 for alpha>=14, the separated identity closes alpha(G)>=15",
                "the exact matching-quotient coupled theorem already closes alpha(G)=13,14",
            ],
        },
        "failed_relaxations": {
            "Delta5_extension_only_c8": {
                "classification": "enclosure failures only",
                "witness_orders": [row["order"] for row in no_go["witnesses"]],
                "all_violate_Q7": True,
                "rooted_tree_counterexample": False,
            },
            "Delta4_k7_full_V_concavity_enlarged_box": {
                "classification": "UNRESOLVED_NO_SPLIT enlarged-box enclosure failure",
                "minimum": delta4_k7["initial_minimum"],
                "Delta4_counterexample": False,
                "curvature_counterexample_on_actual_tree_cone": False,
            },
        },
        "key_artifact_hashes": {
            "Delta5_theorem": digest(ROOT / "RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_THEOREM_2026-08-17.md"),
            "Delta5_manifest": digest(ROOT / "rank8_q8_terminal_delta5_all_order_manifest_20260817.json"),
            "Delta5_replay": digest(ROOT / "replay_rank8_q8_terminal_delta5_all_order.py"),
            "Delta5_replay_report": digest(ROOT / "rank8_q8_terminal_delta5_all_order_replay_20260817.json"),
            "rank7_integration_snapshot": digest(ROOT / "rank7_integration_readonly_20260820.json"),
            "rank8_boundary": digest(ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"),
            "V8_theorem_report": digest(ROOT / "rank8_v8_alpha14_finite_reduction_exact_20260816.json"),
            "Delta4_k7_enclosure": digest(ROOT / "rank8_delta4_v_concavity_k7_full_exact_20260820.json"),
        },
        "all_manifest_hashes": actual_hashes,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DELTA5", payload["Delta5"]["correct_current_classification"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
