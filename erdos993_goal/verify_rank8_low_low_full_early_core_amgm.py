#!/usr/bin/env python3
"""Exact disjoint AM-GM theorem for the simultaneous four-early-slack core."""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_core_flint_stats import NAMES, build_at


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
EXPECTED_BUILDER = "6C665EC89864FB369D55A7FEC6DCFFF351D002E68C6C4524CA2C53C904DC8C0C"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def candidate_rows(positive, negative):
    rows = {}
    for target, demand in negative.items():
        options = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            product = 4 * positive[low] * positive[high]
            if product >= demand * demand:
                options.append((low, high, product - demand * demand))
        rows[target] = sorted(options, key=lambda row: (row[2], row[0], row[1]))
    return rows


def matching(candidates, seed):
    targets = tuple(candidates)
    rng = random.Random(seed)
    for attempt in range(100_000):
        tie = {target: rng.random() for target in targets}
        order = sorted(targets, key=lambda target: (len(candidates[target]), tie[target]))
        used = set()
        selected = {}
        success = True
        for target in order:
            available = [row for row in candidates[target]
                         if row[0] not in used and row[1] not in used]
            if not available:
                success = False
                break
            window = min(len(available), 1 + attempt % 17)
            row = available[rng.randrange(window)]
            selected[target] = row
            used.update(row[:2])
        if success:
            return attempt, selected
    raise AssertionError("no disjoint matching found in deterministic bounded search")


def certify(polynomial, seed):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    if not negative:
        return {
            "terms": len(terms), "positive_terms": len(positive),
            "negative_terms": 0, "candidate_count_minimum": 0,
            "candidate_count_maximum": 0, "matching_attempt": 0,
            "disjoint_positive_sources": 0, "allocations": [],
        }
    candidates = candidate_rows(positive, negative)
    assert all(candidates.values())
    attempt, selected = matching(candidates, seed)
    used = set()
    allocations = []
    for target in sorted(negative):
        low, high, slack = selected[target]
        assert low not in used and high not in used and low != high
        used.update((low, high))
        assert tuple(low[i] + high[i] for i in range(len(NAMES))) == tuple(
            2 * target[i] for i in range(len(NAMES))
        )
        four_product = 4 * positive[low] * positive[high]
        demand_squared = negative[target] ** 2
        assert four_product - demand_squared == slack >= 0
        allocations.append({
            "negative_monomial": list(target),
            "demand": negative[target],
            "source_low": {"monomial": list(low), "capacity": positive[low]},
            "source_high": {"monomial": list(high), "capacity": positive[high]},
            "four_product": four_product,
            "demand_squared": demand_squared,
            "slack": slack,
        })
    assert len(used) == 2 * len(negative)
    return {
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "candidate_count_minimum": min(map(len, candidates.values())),
        "candidate_count_maximum": max(map(len, candidates.values())),
        "matching_attempt": attempt,
        "disjoint_positive_sources": len(used),
        "allocations": allocations,
    }


def main():
    builder = ROOT / "probe_rank8_low_low_full_early_core_flint_stats.py"
    assert sha256(builder) == EXPECTED_BUILDER
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    endpoint = {m: build_at(context, variables, m) for m in (-1, 0, 1)}
    polynomials = {
        "curvature_middle_times_4": (
            4 * endpoint[0]["curvature"] + endpoint[1]["curvature"]
            - endpoint[-1]["curvature"]
        ),
        "curvature_far": endpoint[1]["curvature"],
        "strong_middle_times_4": (
            4 * endpoint[0]["strong"] + endpoint[1]["strong"]
            - endpoint[-1]["strong"]
        ),
        "strong_far": endpoint[1]["strong"],
    }
    expected_negative = {
        "curvature_middle_times_4": 0,
        "curvature_far": 54,
        "strong_middle_times_4": 84,
        "strong_far": 159,
    }
    rows = []
    for index, (label, polynomial) in enumerate(polynomials.items()):
        row = {"bernstein_target": label, **certify(polynomial, 993_900 + index)}
        assert row["negative_terms"] == expected_negative[label]
        rows.append(row)
        print(label, "TERMS", row["terms"], "NEGATIVE", row["negative_terms"],
              "SOURCES", row["disjoint_positive_sources"],
              "ATTEMPT", row["matching_attempt"], flush=True)

    payload = {
        "schema": "rank8-low-low-full-early-core-amgm-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_AMGM",
        "theorem": (
            "All four pending low/low Bernstein targets are nonnegative for "
            "arbitrary h,ta,tb,a0,a2,b0,b2>=0 when a3=...=a7=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "rows": rows,
        "proof_rule": (
            "Within each target polynomial, disjoint midpoint source pairs "
            "obey 4*A*B>=d^2 and pay every negative monomial by AM-GM."
        ),
        "immutable_inputs": {builder.name: EXPECTED_BUILDER},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the full early core only when all suffix slacks "
            "a3..a7,b3..b7 are zero. The simultaneous early/suffix lift and "
            "the complete low/low cone remain open."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
