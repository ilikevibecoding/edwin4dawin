#!/usr/bin/env python3
"""Independent FLINT replay of the direct-H terminal/prefix AM-GM theorem."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_rank8_low_high_strong_terminal_prefix_amgm.py"
INPUT = ROOT / "rank8_low_high_strong_terminal_prefix_amgm_exact_20260820.json"
OUTPUT = ROOT / "rank8_low_high_strong_terminal_prefix_amgm_independent_audit_20260820.json"
PRODUCER_SHA = "E18BF68BF78F4D2F8D69049EE539BA8D9AEC23D06390F7C3C3E4D9DF2B2AB68F"
INPUT_SHA = "EA6C6EC7B6E894A0A86565D355A0D51670EA370C12030767189359F374A61421"
NAMES = ("h", "ta", "tb", "b0", "b1", "b2")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    return sum((math.comb(rank, index) * left[index] * right[rank - index]
                for index in range(rank + 1)), zero)


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h = variables["h"]
    left_ratios, left = factor(variables["ta"], [2 * h] + [h] * 7, one)
    _, right = factor(variables["tb"], [
        2 * h + variables["b0"],
        h + variables["b1"],
        h + variables["b2"],
        h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    return left_ratios[2] * margin + h * derivative


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    require(sha256(PRODUCER) == PRODUCER_SHA, "producer hash changed")
    require(sha256(INPUT) == INPUT_SHA, "input report hash changed")
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    require(report["status"] == "PASS_EXACT_STRONG_AUXILIARY_TERMINAL_PREFIX_AMGM",
            "producer status is not PASS")
    require(tuple(report["variables"]) == NAMES, "variable order changed")
    require(report["source_sha256"] == PRODUCER_SHA, "producer self-pin changed")

    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    negative = {key: -value for key, value in terms.items() if value < 0}
    require(len(terms) == report["terms"] == 5227, "term count changed")
    require(len(negative) == report["negative_terms"] == 279, "negative count changed")
    rows = {tuple(row["negative_monomial"]): row for row in report["allocations"]}
    require(set(rows) == set(negative), "negative support has a gap")
    require(len(rows) == len(report["allocations"]), "duplicate negative row")
    used = set()
    minimum_slack = None
    for target in sorted(negative):
        row = rows[target]
        low = tuple(row["source_low"]["monomial"])
        high = tuple(row["source_high"]["monomial"])
        require(row["demand"] == negative[target], "negative demand changed")
        require(low not in used and high not in used and low != high, "source reused")
        used.update((low, high))
        require(tuple(low[i] + high[i] for i in range(len(NAMES))) ==
                tuple(2 * target[i] for i in range(len(NAMES))), "midpoint failed")
        low_capacity, high_capacity = terms[low], terms[high]
        require(low_capacity == row["source_low"]["capacity"] > 0,
                "low capacity mismatch")
        require(high_capacity == row["source_high"]["capacity"] > 0,
                "high capacity mismatch")
        four_product = 4 * low_capacity * high_capacity
        demand_squared = negative[target] ** 2
        require(row["four_product"] == four_product and
                row["demand_squared"] == demand_squared, "capacity arithmetic mismatch")
        slack = four_product - demand_squared
        require(slack >= 0, "AM-GM capacity failed")
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
    require(len(used) == report["disjoint_positive_sources"] == 558,
            "disjoint source count changed")

    payload = {
        "schema": "rank8-low-high-strong-terminal-prefix-amgm-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_STRONG_AUXILIARY_TERMINAL_PREFIX_AMGM",
        "producer_sha256": PRODUCER_SHA,
        "input_sha256": INPUT_SHA,
        "audit_source_sha256": sha256(Path(__file__)),
        "independent_flint_reconstruction": {
            "terms": len(terms),
            "negative_terms": len(negative),
            "midpoint_capacity_checks": len(rows),
            "disjoint_positive_sources": len(used),
            "minimum_capacity_slack": minimum_slack,
        },
        "scope_warning": (
            "This audits only h,ta,tb,b0,b1,b2 with all a0,a2,a3..a7,b3..b7 "
            "zero. It is not the full strong auxiliary, low/high cone, low/low "
            "cone, Q8, PGC, or Problem 993."
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
