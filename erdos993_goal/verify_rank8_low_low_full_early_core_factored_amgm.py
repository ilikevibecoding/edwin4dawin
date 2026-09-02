#!/usr/bin/env python3
"""Construct a face-factored AM-GM certificate for the full early core."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_core_flint_stats import NAMES, build_at
from verify_rank8_low_low_full_early_core_amgm import matching


ROOT = Path(__file__).resolve().parent
BUILDER = ROOT / "probe_rank8_low_low_full_early_core_flint_stats.py"
CURVATURE = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
STRONG = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
REPORT = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
EXPECTED = {
    BUILDER.name: "6C665EC89864FB369D55A7FEC6DCFFF351D002E68C6C4524CA2C53C904DC8C0C",
    CURVATURE.name: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG.name: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
ZERO_GROUP = (0, 0, 0, 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def lift_zero_allocation(allocation, scale):
    def monomial(values):
        return tuple(map(int, values)) + ZERO_GROUP

    return {
        "negative_monomial": monomial(allocation["negative_monomial"]),
        "demand": scale * int(allocation["demand"]),
        "source_low": {
            "monomial": monomial(allocation["source_low"]["monomial"]),
            "capacity": scale * int(allocation["source_low"]["capacity"]),
        },
        "source_high": {
            "monomial": monomial(allocation["source_high"]["monomial"]),
            "capacity": scale * int(allocation["source_high"]["capacity"]),
        },
    }


def factored_candidates(positive, negative_group):
    rows = {}
    for target, demand in negative_group.items():
        options = []
        for low, low_capacity in positive.items():
            if low[3:] != target[3:]:
                continue
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            if high[3:] != target[3:]:
                continue
            product = 4 * low_capacity * positive[high]
            if product >= demand * demand:
                options.append((low, high, product - demand * demand))
        rows[target] = sorted(options, key=lambda item: (item[2], item[0], item[1]))
    return rows


def certify(polynomial, zero_allocations, seed):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    groups = defaultdict(dict)
    for target, demand in negative.items():
        groups[target[3:]][target] = demand

    selected = {}
    attempts = {}
    candidate_ranges = {}
    lifted_zero = {
        allocation["negative_monomial"]: allocation
        for allocation in zero_allocations
    }
    assert set(lifted_zero) == set(groups.get(ZERO_GROUP, {}))
    zero_used = set()
    for target, allocation in lifted_zero.items():
        assert allocation["demand"] == negative[target]
        low = allocation["source_low"]["monomial"]
        high = allocation["source_high"]["monomial"]
        assert positive[low] == allocation["source_low"]["capacity"]
        assert positive[high] == allocation["source_high"]["capacity"]
        assert low not in zero_used and high not in zero_used
        zero_used.update((low, high))
        slack = 4 * positive[low] * positive[high] - negative[target] ** 2
        assert slack >= 0
        selected[target] = (low, high, slack)
    attempts[ZERO_GROUP] = 0
    candidate_ranges[ZERO_GROUP] = (1, 1)

    for group_index, group in enumerate(sorted(groups)):
        if group == ZERO_GROUP:
            continue
        candidates = factored_candidates(positive, groups[group])
        assert all(candidates.values())
        attempt, group_selected = matching(candidates, seed + group_index)
        selected.update(group_selected)
        attempts[group] = attempt
        candidate_ranges[group] = (
            min(map(len, candidates.values())), max(map(len, candidates.values()))
        )

    assert set(selected) == set(negative)
    used = set()
    allocations = []
    for target in sorted(negative):
        low, high, slack = selected[target]
        assert low[3:] == target[3:] == high[3:]
        assert low not in used and high not in used and low != high
        used.update((low, high))
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
            "factored_early_exponents": list(target[3:]),
        })
    return {
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "early_exponent_groups": len(groups),
        "zero_group_allocations_inherited": len(lifted_zero),
        "matching_attempts": {
            ",".join(map(str, group)): value for group, value in attempts.items()
        },
        "candidate_count_ranges": {
            ",".join(map(str, group)): list(value)
            for group, value in candidate_ranges.items()
        },
        "disjoint_positive_sources": len(used),
        "all_blocks_factor_early_monomial": True,
        "allocations": allocations,
    }


def main() -> None:
    assert {path.name: sha256(path) for path in (BUILDER, CURVATURE, STRONG)} == EXPECTED
    curvature = json.loads(CURVATURE.read_text(encoding="utf-8"))
    strong = json.loads(STRONG.read_text(encoding="utf-8"))
    strong_rows = {row["bernstein_coefficient"]: row for row in strong["rows"]}
    zero_allocations = {
        "curvature_middle_times_4": [],
        "curvature_far": [lift_zero_allocation(row, 1) for row in curvature["allocations"]],
        "strong_middle_times_4": [
            lift_zero_allocation(row, 2)
            for row in strong_rows["middle_times_2"]["allocations"]
        ],
        "strong_far": [lift_zero_allocation(row, 1) for row in strong_rows["far"]["allocations"]],
    }

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
    for label_index, (label, polynomial) in enumerate(polynomials.items()):
        if expected_negative[label] == 0:
            term_count = sum(1 for _ in polynomial.terms())
            row = {
                "bernstein_target": label,
                "terms": term_count,
                "positive_terms": term_count,
                "negative_terms": 0,
                "early_exponent_groups": 0,
                "zero_group_allocations_inherited": 0,
                "matching_attempts": {},
                "candidate_count_ranges": {},
                "disjoint_positive_sources": 0,
                "all_blocks_factor_early_monomial": True,
                "allocations": [],
            }
        else:
            row = {
                "bernstein_target": label,
                **certify(polynomial, zero_allocations[label], 994_000 + 100 * label_index),
            }
        assert row["negative_terms"] == expected_negative[label]
        rows.append(row)
        print(
            label, "NEGATIVE", row["negative_terms"],
            "GROUPS", row["early_exponent_groups"],
            "SOURCES", row["disjoint_positive_sources"], flush=True,
        )

    payload = {
        "schema": "rank8-low-low-full-early-core-factored-amgm-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_FACTORED_AMGM",
        "theorem": (
            "Every negative early-core monomial is paid by a disjoint midpoint "
            "AM-GM block whose two positive sources have exactly the same "
            "a0,a2,b0,b2 exponents. The early-zero group is the immutable "
            "zero-slack payment, including its alternate final strong source pair."
        ),
        "variables": list(NAMES),
        "rows": rows,
        "proof_rule": (
            "Each block factors a common early-slack monomial and satisfies "
            "4*A*B>=d^2; positive sources are disjoint within and across the "
            "early-exponent groups."
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a full early-core theorem and a face-compatible payment "
            "candidate. Its suffix-3 lift still requires exact residual checks."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
