#!/usr/bin/env python3
"""Fail-closed assembly of the all-rank rooted-forest q3 reserve theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json"

PINS = {
    "verify_rooted_forest_q3_reserve_reduction_independent_agent.py": (
        "4FF559B971D5C62ECBF82FD822F53AFABF5F770AA3B8A69BB6261167D886FF5A"
    ),
    "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json": (
        "22127852392861F649556669959C9E2EC2365146DB6BA20788A27887D34817B4"
    ),
    "verify_rooted_forest_q3_reserve_rank3_independent_agent.py": (
        "C2847EFDF940BA0FB2124147EBBD9F8C506FAE50FE2C93AC026070892C2319BB"
    ),
    "rooted_forest_q3_reserve_rank3_exact_independent_20260828.json": (
        "67544893404E231AAD9F8E4912D1075189412EF9AB75B1A7527485FA39D242DF"
    ),
    "verify_rooted_forest_q3_reserve_rank4_analytic_independent_agent.py": (
        "27C06020031C1EF57448A7D86505ECFB2A6567307F655570268CA036C9BC4817"
    ),
    "rooted_forest_q3_reserve_rank4_analytic_exact_independent_20260828.json": (
        "8627DD49F673BB11FC66A97C7484FAB16F53F42E19BF4C028F3AD78313A14713"
    ),
    "verify_rooted_forest_q3_reserve_rank5_independent_agent.py": (
        "10E64B3520085665A778D005C39AF8262B2EC0A008B6EBE27DF738B4D0835AC6"
    ),
    "rooted_forest_q3_reserve_rank5_exact_independent_20260828.json": (
        "510E1532D0A2AF01605FAE4A55DC19C6EABC41F48CA42A9FB4788CB5F45014A9"
    ),
}

REPORTS = {
    "reduction": (
        "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json",
        "verify_rooted_forest_q3_reserve_reduction_independent_agent.py",
        "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5",
    ),
    "rank3": (
        "rooted_forest_q3_reserve_rank3_exact_independent_20260828.json",
        "verify_rooted_forest_q3_reserve_rank3_independent_agent.py",
        "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK3",
    ),
    "rank4": (
        "rooted_forest_q3_reserve_rank4_analytic_exact_independent_20260828.json",
        "verify_rooted_forest_q3_reserve_rank4_analytic_independent_agent.py",
        "PASS_EXACT_ALL_ORDER_ANALYTIC_ROOTED_FOREST_Q3_RESERVE_RANK4",
    ),
    "rank5": (
        "rooted_forest_q3_reserve_rank5_exact_independent_20260828.json",
        "verify_rooted_forest_q3_reserve_rank5_independent_agent.py",
        "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK5",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    observed = {}
    for name, expected in PINS.items():
        observed[name] = sha256(HERE / name)
        assert observed[name] == expected, f"frozen dependency mismatch: {name}"

    reports = {}
    for label, (report_name, source_name, expected_status) in REPORTS.items():
        report = json.loads((HERE / report_name).read_text(encoding="utf-8"))
        assert report["status"] == expected_status
        assert report["source"] == source_name
        assert report["source_sha256"] == PINS[source_name]
        reports[label] = report

    # Fail closed on the formula/rank routing, without importing any producer.
    assert "(8h2+K2)f3>=6h3f2" in reports["rank3"]["theorem"]
    assert "(10h2+2K2)f4>=6h4f2" in reports["rank4"]["theorem"]
    assert "(12h2+3K2)f5>=6h5f2" in reports["rank5"]["theorem"]
    assert "every j>=6" in reports["reduction"]["theorem"]["high_ranks"]
    assert "every j>=3" in reports["reduction"]["theorem"]["isolated_roots"]

    report = {
        "status": "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_ASSEMBLY",
        "theorem": (
            "For every finite forest F with one distinguished root in each "
            "component, H=F-roots, and every integer j>=3, if f_t=i_t(F), "
            "h_t=i_t(H), and K2=2f2-s2(F), then "
            "[2(j+1)h2+(j-2)K2]f_j>=6h_jf2."
        ),
        "coverage": {
            "j=3": reports["rank3"]["status"],
            "j=4": reports["rank4"]["status"],
            "j=5": reports["rank5"]["status"],
            "j>=6_no_isolated_root_component": reports["reduction"]["status"],
            "isolated_distinguished_root_components_all_j>=3": reports["reduction"]["status"],
        },
        "corrected_bound": (
            "Every dependency uses h2>=C(M-1,2)+c-1; the superseded +c "
            "off-by-one draft is not pinned."
        ),
        "frozen_dependencies": {
            name: {"expected_sha256": PINS[name], "observed_sha256": value}
            for name, value in observed.items()
        },
        "scope": {
            "proved": "the abstract all-rank rooted-forest reserve inequality",
            "not_proved": (
                "terminal-support preservation by itself, the complete "
                "two-block payment, the all-tree q_r<=q3 envelope, the forest "
                "independence-polynomial conjecture, or Erdos Problem 993"
            ),
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
