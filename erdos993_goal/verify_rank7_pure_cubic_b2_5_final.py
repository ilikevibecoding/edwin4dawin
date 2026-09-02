#!/usr/bin/env python3
"""Fast no-gap audit for the completed pure-cubic B2=5 Bernstein sweep."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_pure_cubic_b2_5_final_exact_20260820.json"

REPORTS = {
    "n23_km7_rank0": HERE / "pure_cubic_batch_n23_km7_rank0.json",
    "n23_km7_ranks1_6": HERE / "pure_cubic_batch_v2_n23_km7_ranks1_6.json",
    "n23_km6_allranks": HERE / "pure_cubic_batch_v2_n23_km6_allranks_factored.json",
    "n23_km5_k4_allranks": HERE / "pure_cubic_batch_v2_n23_km5_k4_allranks.json",
    "n24_n30_all": HERE / "pure_cubic_batch_v2_n24_n30_all.json",
    "n31_n38_all": HERE / "pure_cubic_batch_v2_n31_n38_all.json",
}

DEPENDENCIES = {
    "batch_runner": HERE / "run_rank7_pure_cubic_b2_5_bernstein_batch_v2.py",
    "cell_builder": HERE / "prove_rank7_pure_cubic_b2_5_joint_bernstein.py",
    "parameter_reduction": HERE / "verify_rank7_pure_cubic_b2_5_parameter_reduction.py",
    "bernstein_backend": HERE / "explore_rank4_three_halves_grouped.py",
    "terminal_identity": HERE / "verify_rank7_terminal_broom_reduction.py",
    "c4_identity_note": HERE / "RANK7_B2_5_PURE_CUBIC_C4_IDENTITY_2026-08-17.md",
    "c4_identity_replay": HERE / "verify_rank7_b2_5_cubic_c4_identity.py",
    "c4_identity_report": HERE / "rank7_b2_5_cubic_c4_identity_exact_20260817.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    payload = json.loads(REPORTS[name].read_text(encoding="utf-8"))
    assert payload["status"] == "PASS_EXACT", name
    assert payload["fail"] is None, name
    return payload


def assert_range(payload: dict, n_first: int, n_last: int) -> None:
    parameters = payload["parameters"]
    assert parameters["n_first"] == n_first
    assert parameters["n_last"] == n_last
    assert parameters["rank_first"] == 0
    assert parameters["rank_last"] == 6
    assert parameters["k_first"] == -7
    assert parameters["k_last"] == 4
    assert parameters["depth"] == 48
    expected = {(n, k) for n in range(n_first, n_last + 1) for k in range(-7, 5)}
    actual = {(int(row["n"]), int(row["k"])) for row in payload["completed_blocks"]}
    assert len(actual) == len(payload["completed_blocks"])
    assert actual == expected
    blocks = (n_last - n_first + 1) * 12
    assert payload["profiles"] == blocks * 12
    assert payload["endpoints"] == blocks * 72
    assert payload["branches"] == blocks * 504


def main() -> int:
    # Exact finite bookkeeping behind the p-q compression and rooted profiles.
    assert {p - q for p in range(5) for q in range(8)} == set(range(-7, 5))
    profile_count = 0
    for root_degree in (1, 2, 3):
        for neighbor_mass in range(1, 2 * root_degree + 1):
            quotient, remainder = divmod(neighbor_mass, root_degree)
            xs = [quotient + 1] * remainder + [quotient] * (root_degree - remainder)
            assert all(value in (0, 1, 2) for value in xs)
            assert comb(root_degree - 1, 2) + sum(comb(value, 2) for value in xs) <= 5
            profile_count += 1
    assert profile_count == 12

    reports = {name: load(name) for name in REPORTS}
    r0 = reports["n23_km7_rank0"]
    assert (r0["parameters"]["n_first"], r0["parameters"]["n_last"]) == (23, 23)
    assert (r0["parameters"]["rank_first"], r0["parameters"]["rank_last"]) == (0, 0)
    assert (r0["parameters"]["k_first"], r0["parameters"]["k_last"]) == (-7, -7)
    assert r0["branches"] == 72

    r16 = reports["n23_km7_ranks1_6"]
    assert (r16["parameters"]["rank_first"], r16["parameters"]["rank_last"]) == (1, 6)
    assert (r16["parameters"]["k_first"], r16["parameters"]["k_last"]) == (-7, -7)
    assert r16["branches"] == 432

    rm6 = reports["n23_km6_allranks"]
    assert (rm6["parameters"]["rank_first"], rm6["parameters"]["rank_last"]) == (0, 6)
    assert (rm6["parameters"]["k_first"], rm6["parameters"]["k_last"]) == (-6, -6)
    assert rm6["branches"] == 504

    rest23 = reports["n23_km5_k4_allranks"]
    assert (rest23["parameters"]["rank_first"], rest23["parameters"]["rank_last"]) == (0, 6)
    assert (rest23["parameters"]["k_first"], rest23["parameters"]["k_last"]) == (-5, 4)
    assert rest23["branches"] == 5040

    assert_range(reports["n24_n30_all"], 24, 30)
    assert_range(reports["n31_n38_all"], 31, 38)

    total_branches = sum(payload["branches"] for payload in reports.values())
    total_nodes = sum(payload["nodes"] for payload in reports.values())
    assert total_branches == 16 * 12 * 12 * 6 * 7 == 96768
    assert total_nodes == 187814

    artifacts = {**REPORTS, **DEPENDENCIES}
    report = {
        "schema": "rank7-pure-cubic-b2-5-final-no-gap-v1",
        "status": "PASS_EXACT_RANK7_PURE_CUBIC_B2_5_ALL_ORDERS_23_38",
        "scope": {
            "orders": [23, 38],
            "B2": 5,
            "skeleton_class": "both pure-cubic five-branch skeletons",
            "root_degrees": [1, 2, 3],
            "newton_ranks": [0, 6],
            "k_values": [-7, 4],
        },
        "coverage": {
            "order_k_blocks": 192,
            "rooted_profiles_per_block": 12,
            "endpoint_rank_branches": total_branches,
            "adaptive_bernstein_nodes": total_nodes,
            "unresolved_or_negative": 0,
        },
        "logic": [
            "the exact c4 identity reduces p,q dependence to k=p-q in -7..4",
            "the 12 rooted profiles cover r=1,2,3 and every feasible balanced neighbor mass",
            "concavity in b reduces each cell to its active affine lower and upper endpoints",
            "every retained endpoint/rank branch has an exact rational Bernstein PASS",
        ],
        "artifacts_sha256": {path.name: sha256(path) for path in artifacts.values()},
        "failure": None,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_RANK7_PURE_CUBIC_B2_5_ALL_ORDERS_23_38")
    print("report_sha256", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
