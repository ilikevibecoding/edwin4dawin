#!/usr/bin/env python3
"""Check AM-GM candidates that preserve every early-slack exponent."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_full_early_core_flint_stats import NAMES, build_at


ROOT = Path(__file__).resolve().parent
BUILDER = ROOT / "probe_rank8_low_low_full_early_core_flint_stats.py"
EXPECTED_BUILDER = "6C665EC89864FB369D55A7FEC6DCFFF351D002E68C6C4524CA2C53C904DC8C0C"
REPORT = ROOT / "rank8_low_low_full_early_core_factored_candidates_exact_20260822.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(BUILDER) == EXPECTED_BUILDER
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
    rows = []
    for label, polynomial in polynomials.items():
        terms = {
            tuple(map(int, monomial)): int(coefficient)
            for monomial, coefficient in polynomial.terms()
        }
        positive = {key: value for key, value in terms.items() if value > 0}
        negative = {key: -value for key, value in terms.items() if value < 0}
        candidate_counts = {}
        examples = {}
        for target, demand in negative.items():
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
            options.sort(key=lambda item: (item[2], item[0], item[1]))
            candidate_counts[target] = len(options)
            if options:
                low, high, slack = options[0]
                examples[target] = {
                    "low": list(low), "high": list(high), "slack": slack,
                }
        missing = [list(target) for target, count in candidate_counts.items() if count == 0]
        rows.append({
            "label": label,
            "negative_terms": len(negative),
            "all_have_factored_candidate": not missing,
            "candidate_count_minimum": min(candidate_counts.values()) if candidate_counts else 0,
            "candidate_count_maximum": max(candidate_counts.values()) if candidate_counts else 0,
            "missing_targets": missing,
            "first_candidate_examples": [
                {"negative": list(target), **examples[target]}
                for target in sorted(examples)[:5]
            ],
        })
    payload = {
        "schema": "rank8-low-low-full-early-core-factored-candidates-v1",
        "status": "PASS_ALL_NEGATIVES_HAVE_FACTORED_AMGM_CANDIDATE"
            if all(row["all_have_factored_candidate"] for row in rows)
            else "FAIL_SOME_NEGATIVES_LACK_FACTORED_AMGM_CANDIDATE",
        "early_coordinates": list(NAMES[3:]),
        "constraint": (
            "Both positive source monomials must have exactly the same "
            "a0,a2,b0,b2 exponents as the negative midpoint monomial."
        ),
        "rows": rows,
        "immutable_inputs": {BUILDER.name: EXPECTED_BUILDER},
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for row in rows:
        print(row["label"], row["negative_terms"], row["candidate_count_minimum"],
              row["candidate_count_maximum"], len(row["missing_targets"]))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
