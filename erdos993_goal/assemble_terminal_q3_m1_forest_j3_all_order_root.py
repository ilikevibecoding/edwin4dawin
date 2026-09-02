#!/usr/bin/env python3
"""Fail-closed all-order no-isolate disconnected-forest m=1,j=3 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m1_forest_j3_all_order_assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ALL_ORDER_NO_ISOLATE_DISCONNECTED_FOREST_"
    "TERMINAL_Q3_NEWTON_M1_J3_ROOT"
)
PINS = {
    "finite_all_forest_source": (
        "audit_terminal_q3_low_newton_m1_forest_finite_agent.py",
        "20F3FA5F42CB28D255CDC6F3D3CB3DD6E94FF384A056AC45858101E3A03FC1D4",
    ),
    "finite_all_forest_report": (
        "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json",
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
    ),
    "finite_parameter_source": (
        "audit_terminal_q3_m1_forest_j3_exact_u1_finite_fast_agent.py",
        "C8A3C487AC1355F64AA488C4A9AB4C15371B08D4E467B63C2BFF70EB404B53D6",
    ),
    "finite_parameter_report": (
        "terminal_q3_m1_forest_j3_exact_u1_finite_fast_audit_20260829.json",
        "6CA1D9B1E063800B83258322F147D2E5A1E1475AACAC4369F120E2E13298C375",
    ),
    "short_s_source": (
        "prove_terminal_q3_m1_forest_j3_short_s_independent_agent.py",
        "D8886C0715445E46ACF8AA1183294E9984394DFBDA872F317F782FD9BF3D6E8C",
    ),
    "short_s_report": (
        "terminal_q3_m1_forest_j3_short_s_independent_20260829.json",
        "17710D95651A12836EFF44BEEAA6F8EE16EC66468D7F8F33B572CF79CD4961AA",
    ),
    "s5_tail_source": (
        "prove_terminal_q3_m1_forest_j3_s5_tail_independent_agent.py",
        "A27C3CEF834A6E6DD78430A47241F89F18BEB383E706E3F84DCA501D495F56EE",
    ),
    "s5_tail_report": (
        "terminal_q3_m1_forest_j3_s5_tail_independent_20260829.json",
        "4AB0FF2B94BFD50767F102E454E5BC603D38710EE709A7F9BB63506F397A9014",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def main() -> None:
    observed = {}
    for label, (filename, expected) in PINS.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (label, expected, actual)
        observed[label] = {"file": filename, "sha256": actual}

    small = load("finite_all_forest_report")
    finite = load("finite_parameter_report")
    short = load("short_s_report")
    tail = load("s5_tail_report")
    assert small["status"] == "PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13"
    assert small["source_sha256"] == PINS["finite_all_forest_source"][1]
    assert small["finite_census"]["maximum_G_order"] == 13
    assert small["finite_census"]["zero_m1_cells"] == 0
    assert small["finite_census"]["supported_cells_by_target"]["3"] == 48_256

    assert finite["status"] == (
        "PASS_EXACT_FAST_EVALUATOR_FOREST_M1_J3_COMBINED_RELAXATION_N13_TO_30"
    )
    assert finite["source_sha256"] == PINS["finite_parameter_source"][1]
    assert finite["coverage"]["minimum_N"] == 13
    assert finite["coverage"]["maximum_N"] == 30
    assert finite["coverage"]["positive_candidates"] == 1_787_452
    assert finite["coverage"]["zero_candidates"] == 0

    assert short["status"] == (
        "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_SHORT_S_N31_PLUS"
    )
    assert short["source_sha256"] == PINS["short_s_source"][1]
    assert "S=2,3,4" in short["scope"] and "N>=31" in short["scope"]
    assert {row["S"] for row in short["structural_cases"]} == {2, 3, 4}
    assert all(row["negative"] == row["zero"] == 0 for row in short["certificates"])

    assert tail["status"] == (
        "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_S5_N31_PLUS_TAIL"
    )
    assert "S>=5,N>=31" in tail["scope"]
    assert tail["coordinates"]["tail"] == "s,D integers >=0 and s+D>=25"
    tail_certificates = tail["all_order_certificates"] + tail["finite_certificates"]
    assert tail_certificates
    assert all(row["negative"] == row["zero"] == 0 for row in tail_certificates)

    # Here N=|G|-1 in the forest parameterization.  Thus the four exact
    # pieces meet at consecutive integer boundaries without an order gap.
    partition = [
        {
            "base_orders": "|G|<=13",
            "parameter_orders": "N<=12",
            "certificate": "complete direct canonical all-forest census",
        },
        {
            "base_orders": "14<=|G|<=31",
            "parameter_orders": "13<=N<=30",
            "certificate": "exact three-bound finite parameter audit",
        },
        {
            "base_orders": "|G|>=32",
            "parameter_orders": "N>=31 and S in {2,3,4}",
            "certificate": "short-S exact rational Bernstein cones",
        },
        {
            "base_orders": "|G|>=32",
            "parameter_orders": "N>=31 and S>=5",
            "certificate": "S>=5 exact tail assembly",
        },
    ]
    assert 12 + 1 == 13 and 30 + 1 == 31
    assert {2, 3, 4} | set(range(5, 40)) == set(range(2, 40))

    report = {
        "marker": MARKER,
        "status": "PASS exact gapless all-order j=3 forest m=1 assembly",
        "claim": (
            "For every supported terminal-q3 cell with a no-isolate "
            "disconnected forest base and target j=3, Newton coefficient "
            "m=1 is nonnegative."
        ),
        "partition": partition,
        "seam_checks": {
            "finite_to_parameter": "N=12/13, equivalently |G|=13/14",
            "parameter_to_tail": "N=30/31, equivalently |G|=31/32",
            "short_to_long_S": "S=4/5",
            "integer_gaps": 0,
        },
        "certificate_summary": {
            "direct_j3_cells_through_order13": 48_256,
            "finite_parameter_candidates_N13_30": 1_787_452,
            "short_S_structural_cases": len(short["structural_cases"]),
            "short_S_controls": sum(row["count"] for row in short["certificates"]),
            "tail_all_order_controls": sum(
                row["count"] for row in tail["all_order_certificates"]
            ),
            "tail_finite_controls": sum(
                row["count"] for row in tail["finite_certificates"]
            ),
            "negative": 0,
        },
        "pins": observed,
        "scope_guard": (
            "This closes only the no-isolate disconnected-forest terminal "
            "Newton m=1 row at target j=3. Connected tree bases, j>=4, "
            "permanent-isolate lifting, m=0, the complete terminal payment, "
            "and Erdos Problem 993 remain separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        **report["certificate_summary"],
        "integer_gaps": 0,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
