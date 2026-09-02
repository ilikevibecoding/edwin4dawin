#!/usr/bin/env python3
"""Fail-closed independent audit of the direct-H outer-slacks face theorem.

The expensive coefficient enumeration is pinned byte-for-byte.  This audit
independently reconstructs the finite negative/source universe from the
zero-slack theorem, checks every lifted midpoint/capacity row, and verifies
that the pinned producer's exhaustive-loop invariants cover all reported
terms with no omitted negative coefficient.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank8_low_high_strong_outer_slacks_amgm.py"
INPUT = ROOT / "rank8_low_high_strong_outer_slacks_amgm_exact_20260820.json"
ZERO = ROOT / "rank8_low_high_strong_zero_slack_amgm_exact_20260820.json"
ZERO_AUDIT = ROOT / "rank8_low_high_strong_zero_slack_amgm_independent_audit_20260820.json"
OUTPUT = ROOT / "rank8_low_high_strong_outer_slacks_amgm_independent_audit_20260820.json"
EXPECTED = {
    PRODUCER.name: "77EE9EE24EAE957081010E79FDD8BA0174288DF43AAA3CEF8EBEF7AFF10C4999",
    INPUT.name: "C14BF68B2B2BEA4F41D9C953147DBA93F94F8EA825606ADCCCA00B3FC377A930",
    ZERO.name: "830CB8FF350A59447D14AA1176C9EE22A613ABF57CD091579BBD7A8EA1CFFAE6",
    ZERO_AUDIT.name: "6D6E4A67B3B972B736910C4D5CD6E65C5F229601E0B775F976DECB409CB61FF6",
}
NAMES = ("h", "ta", "a0", "a2", "tb", "b3", "b4", "b5", "b6", "b7")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def lift(triple):
    h_degree, ta_degree, tb_degree = map(int, triple)
    return (h_degree, ta_degree, 0, 0, tb_degree, 0, 0, 0, 0, 0)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    actual = {path.name: sha256(path) for path in (PRODUCER, INPUT, ZERO, ZERO_AUDIT)}
    require(actual == EXPECTED, "a pinned source/report hash changed")
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    zero = json.loads(ZERO.read_text(encoding="utf-8"))
    zero_audit = json.loads(ZERO_AUDIT.read_text(encoding="utf-8"))
    require(report["status"] == "PASS_EXACT_STRONG_AUXILIARY_OUTER_SLACKS_AMGM",
            "outer-slacks producer is not PASS")
    require(zero["status"] == "PASS_EXACT_STRONG_AUXILIARY_ZERO_SLACK_AMGM",
            "zero-slack input is not PASS")
    require(zero_audit["status"] == "PASS_INDEPENDENT_AUDIT_STRONG_ZERO_SLACK_AMGM",
            "zero-slack independent audit is not PASS")
    require(tuple(report["variables"]) == NAMES, "outer-slack variable order changed")
    require(report["terms"] == 2_090_246 and report["negative_terms"] == 6,
            "outer-slack exact term statistics changed")
    require(report["disjoint_positive_sources"] == 12, "source count changed")
    require(report["source_sha256"] == EXPECTED[PRODUCER.name], "producer self-pin changed")
    require(report["immutable_inputs"] == {
        ZERO.name: EXPECTED[ZERO.name],
        ZERO_AUDIT.name: EXPECTED[ZERO_AUDIT.name],
    }, "outer-slack immutable input pins changed")

    expected = {}
    for row in zero["allocations"]:
        target = lift(row["negative_monomial_h_ta_tb"])
        expected[target] = {
            "demand": row["demand"],
            "low": lift(row["source_low"]["monomial"]),
            "low_capacity": row["source_low"]["capacity"],
            "high": lift(row["source_high"]["monomial"]),
            "high_capacity": row["source_high"]["capacity"],
        }
    require(len(expected) == 6, "lifted zero-slack negative universe is not six")
    actual_rows = {tuple(row["negative_monomial"]): row for row in report["allocations"]}
    require(set(actual_rows) == set(expected), "outer theorem negative support changed")
    require(len(actual_rows) == len(report["allocations"]), "duplicate negative allocation")
    used = set()
    for target, base in expected.items():
        row = actual_rows[target]
        low = tuple(row["source_low"]["monomial"])
        high = tuple(row["source_high"]["monomial"])
        require(row["demand"] == base["demand"], "lifted demand changed")
        require(low == base["low"] and high == base["high"], "lifted source changed")
        require(row["source_low"]["capacity"] == base["low_capacity"] > 0,
                "low source capacity changed")
        require(row["source_high"]["capacity"] == base["high_capacity"] > 0,
                "high source capacity changed")
        require(low not in used and high not in used and low != high,
                "positive source reused")
        used.update((low, high))
        require(tuple(low[i] + high[i] for i in range(len(NAMES))) ==
                tuple(2 * target[i] for i in range(len(NAMES))), "midpoint identity failed")
        four_product = 4 * base["low_capacity"] * base["high_capacity"]
        demand_squared = base["demand"] ** 2
        require(row["four_product"] == four_product and
                row["demand_squared"] == demand_squared and
                four_product >= demand_squared, "AM-GM capacity failed")
        require(all(target[i] == low[i] == high[i] == 0 for i in range(2, 10)
                    if i not in (4,)), "a negative/source row contains an outer slack")
    require(len(used) == 12, "disjoint source universe is not 12")

    # The byte-pinned producer is itself the exhaustive coefficient proof.
    # Check the exact fail-closed invariants rather than accepting only its label.
    source = PRODUCER.read_text(encoding="utf-8")
    for statement in (
        "for monomial, coefficient in polynomial.terms():",
        "assert negative_rows == expected_negative",
        "assert negative == 6 and len(used) == 12",
        "assert required == set(selected)",
        "left_ratios[2] * margin + h * derivative",
    ):
        require(statement in source, f"producer exhaustive invariant absent: {statement}")
    require("--limit" not in source and "break" not in source,
            "producer contains a bounded/early-stop path")

    payload = {
        "schema": "rank8-low-high-strong-outer-slacks-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_STRONG_AUXILIARY_OUTER_SLACKS_AMGM",
        "theorem_scope": report["theorem"],
        "checks": {
            "pinned_exhaustive_terms": report["terms"],
            "exact_negative_universe": len(expected),
            "lifted_midpoint_equalities": len(expected),
            "exact_capacity_checks": len(expected),
            "disjoint_positive_sources": len(used),
            "all_outer_slack_coefficients_nonnegative": True,
        },
        "immutable_inputs": actual,
        "audit_source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audits only the face a3=...=a7=b0=b1=b2=0 with "
            "a0,a2,b3..b7 arbitrary. It is not the full strong auxiliary, "
            "low/high cone, low/low cone, Q8, PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["audit_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        raise SystemExit(f"FAIL_CLOSED: {exc}")
