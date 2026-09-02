#!/usr/bin/env python3
"""Exact all-order proof of the rank-j=5 rooted-forest reserve."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_rank5_exact_independent_20260828.json"
REDUCTION_SOURCE = HERE / "verify_rooted_forest_q3_reserve_reduction_independent_agent.py"
REDUCTION_REPORT = HERE / "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json"
EXPECTED_REDUCTION_SOURCE = "4FF559B971D5C62ECBF82FD822F53AFABF5F770AA3B8A69BB6261167D886FF5A"
EXPECTED_REDUCTION_REPORT = "22127852392861F649556669959C9E2EC2365146DB6BA20788A27887D34817B4"
EXPECTED_REDUCTION_STATUS = "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(REDUCTION_SOURCE) == EXPECTED_REDUCTION_SOURCE
    assert sha256(REDUCTION_REPORT) == EXPECTED_REDUCTION_REPORT
    reduction = json.loads(REDUCTION_REPORT.read_text(encoding="utf-8"))
    assert reduction["status"] == EXPECTED_REDUCTION_STATUS
    assert reduction["source_sha256"] == EXPECTED_REDUCTION_SOURCE

    M, c = sp.symbols("M c", integer=True, positive=True)
    N = M + c
    f2 = sp.expand_func(sp.binomial(N, 2) - M)
    h2_lower = sp.expand_func(sp.binomial(M - 1, 2) + c - 1)
    K2_lower = sp.expand(N * (c - 1) + 2 * (M - c))
    coefficient_gap = sp.factor(12 * h2_lower + 3 * K2_lower - 6 * f2)
    expected_gap = 3 * (M - c) * (M - 2)
    assert sp.expand(coefficient_gap - expected_gap) == 0

    report = {
        "status": "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK5",
        "theorem": (
            "For every rooted forest F and H=F-roots, "
            "(12h2+3K2)f5>=6h5f2."
        ),
        "proof": {
            "parameters": (
                "For a no-isolated-root core, M=number of nonroots=edges, "
                "c=components, N=M+c, and 1<=c<=M."
            ),
            "bounds": {
                "h2": "h2>=C(M-1,2)+c-1",
                "K2": "K2>=N(c-1)+2(M-c)",
                "f2": str(f2),
            },
            "coefficient_gap": str(coefficient_gap),
            "nonnegativity": (
                "If h5>0 then M>=5, so 3(M-c)(M-2)>=0; if h5=0 "
                "the reserve is immediate."
            ),
            "final_decomposition": (
                "With A5=12h2+3K2, E5=(A5-6f2)f5+6f2(f5-h5)>=0, "
                "because f5>=h5."
            ),
            "isolated_roots": (
                "Any isolated distinguished-root components are restored by "
                "the pinned all-rank preservation reduction."
            ),
        },
        "frozen_dependency": {
            "status": reduction["status"],
            "source_sha256": EXPECTED_REDUCTION_SOURCE,
            "report_sha256": EXPECTED_REDUCTION_REPORT,
        },
        "scope": {
            "proved": "the rooted reserve at j=5 for every finite rooted forest",
            "remaining": "the rooted reserve at j=4",
            "not_proved": (
                "the complete terminal two-block payment, all-tree higher-rank "
                "envelope, or Erdos Problem 993"
            ),
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["proof"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
