#!/usr/bin/env python3
"""Fail-closed assembly of the disjoint j=3 and j>=4 m=2 theorems."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m2_all_order_independent_20260829.json"
PINS = {
    "prove_terminal_q3_low_newton_m2_j3_independent_agent.py":
        "6BE654DE92AD60C71BD3C1462EE215C32D31BF3E9C03B3A6F222BA25AF036864",
    "terminal_q3_low_newton_m2_j3_exact_independent_20260829.json":
        "823677240E7B656958C34886E351F4B40A976A4AB5261E2FF5A50A9F8AA10FA2",
    "TERMINAL_Q3_LOW_NEWTON_M2_J3_THEOREM_INDEPENDENT_2026-08-29.md":
        "63B04830E2C622706A0CBC063F304C319EFF39D407F4F89F81960FFCDA60BEB5",
    "prove_terminal_q3_low_newton_m2_j4plus_agent.py":
        "15D2DDA0571B27B752774C2C55807DE54E146C676DFE2BB0BB3660C258CF7E65",
    "terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json":
        "7DF40F60CAD088D731B7D30E6246E0FF542359A128578AE328D3EBC25C3152A4",
    "audit_terminal_q3_low_newton_m2_j4plus_independent_agent.py":
        "DC0977DF1093D8E3D8AC5184711F2DC2005732E99AA491D3DCE9801094E54947",
    "terminal_q3_low_newton_m2_j4plus_independent_audit_20260829.json":
        "B86F27D62203FCE62A4213B0D1AEF9BF30B35955C91FBC6A35A49A0A00BDF8ED",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS

    j3 = load("terminal_q3_low_newton_m2_j3_exact_independent_20260829.json")
    j4 = load("terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json")
    j4_audit = load("terminal_q3_low_newton_m2_j4plus_independent_audit_20260829.json")
    assert j3["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_J3"
    assert j4["status"] == "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS"
    assert j4_audit["status"] == "PASS_INDEPENDENT_EXACT_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS_AUDIT"

    # The supported target ranks partition exactly as {3} union {j>=4}.
    report = {
        "schema": "terminal-q3-low-newton-m2-all-order-independent-assembly-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_ASSEMBLY",
        "claim": (
            "For every tree base G of order n>=15, every marked vertex, and "
            "every supported terminal target rank j>=3, the Newton coefficient "
            "of degree m=2 of the normalized untruncated terminal included-"
            "payment margin is nonnegative."
        ),
        "rank_partition": {
            "j=3": {
                "method": "exact rooted-motif reduction and positive Bernstein corner certificate",
                "status": j3["status"],
            },
            "j>=4": {
                "method": "correlated incidence/extension floor and positive bilinear cone corners",
                "producer_status": j4["status"],
                "independent_audit_status": j4_audit["status"],
            },
        },
        "order_partition": {
            "n=15": "exact all-unlabeled-tree, all-root finite audit",
            "n>=16": "symbolic all-order arguments with N=n-1>=15",
        },
        "pins": observed,
        "scope": (
            "This assembles only Newton degree m=2 on the normalized "
            "untruncated terminal included-payment margin. It does not prove "
            "m=0,1, the complete payment, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
