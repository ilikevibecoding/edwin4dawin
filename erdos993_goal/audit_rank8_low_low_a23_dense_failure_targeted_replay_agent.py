#!/usr/bin/env python3
"""Cheap exact replay of the dense (1,1) negative coefficients.

Instead of expanding 6--12 million terms in thirteen inner variables, replay
the original three-endpoint construction on low-dimensional coordinate
projections.  A projected term is literally the full coefficient whose omitted
slack exponents are zero.  Taking the union over small slack supports recovers
the reported first/minimum witnesses and, when counts agree, every negative.
"""

from __future__ import annotations

import ast
import hashlib
import itertools
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_redistribution_bernstein_cell_agent as baseline


ROOT = Path(__file__).resolve().parent
BASELINE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
FAST_OUTPUT = ROOT / "rank8_a23_fast_agent_1_1_probe.tmp"
REPORT = ROOT / "rank8_low_low_a23_dense_failure_targeted_replay_agent_20260822.json"
EXPECTED = {
    BASELINE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    FAST_OUTPUT.name: "DC88F3803FD1776087DD28C44C755BF6100D584E3D595D99C017D23CE3D6492B",
}
FAILURE_KEYS = {
    (0, 2, "curvature_far"),
    (0, 2, "strong_far"),
    (2, 0, "strong_middle_times_4"),
    (2, 0, "strong_far"),
}
SLACK_NAMES = baseline.INNER_NAMES[3:]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def full_monomial(projected, projected_names):
    exponents = dict(zip(projected_names, map(int, projected)))
    return [exponents.get(name, 0) for name in baseline.INNER_NAMES]


def replay_projection(active_slacks):
    projected_names = ("h", "ta", "tb") + tuple(active_slacks)
    context = fmpz_mpoly_ctx.get(projected_names, "degrevlex")
    zero, one = context.constant(0), context.constant(1)
    variables = {name: zero for name in baseline.INNER_NAMES}
    variables.update(dict(zip(projected_names, context.gens())))
    outer_target = (1, 1, 2, 2)
    built = {
        multiplier: baseline.build_at(variables, multiplier, outer_target, one)
        for multiplier in (-1, 0, 1)
    }
    needed_targets = {
        (z_degree, w_degree)
        for left_index, right_index, _ in FAILURE_KEYS
        for z_degree, left_weight in enumerate(
            baseline.POWER_TO_BERNSTEIN_TIMES_2[left_index]
        )
        for w_degree, right_weight in enumerate(
            baseline.POWER_TO_BERNSTEIN_TIMES_2[right_index]
        )
        if left_weight and right_weight
    }
    power_cells = {
        target: baseline.raw_power_cell(
            built, (1, 1, target[0], target[1]), zero, variables["h"],
        )
        for target in needed_targets
    }
    result = {}
    for left_index, right_index, label in FAILURE_KEYS:
        polynomial = zero
        for z_degree, left_weight in enumerate(
            baseline.POWER_TO_BERNSTEIN_TIMES_2[left_index]
        ):
            for w_degree, right_weight in enumerate(
                baseline.POWER_TO_BERNSTEIN_TIMES_2[right_index]
            ):
                if left_weight and right_weight:
                    polynomial += (
                        left_weight * right_weight
                        * power_cells[z_degree, w_degree][label]
                    )
        result[left_index, right_index, label] = [
            (
                tuple(full_monomial(monomial, projected_names)),
                int(coefficient),
            )
            for monomial, coefficient in polynomial.terms()
            if coefficient < 0
        ]
    return result


def main():
    assert {path.name: sha256(path) for path in (BASELINE, FAST_OUTPUT)} == EXPECTED
    captured = ast.literal_eval(FAST_OUTPUT.read_text(encoding="utf-8-sig"))
    assert (captured["p_exponent"], captured["q_exponent"]) == (1, 1)
    assert captured["pass"] is False
    reported = {
        (
            position["left_bernstein_index"],
            position["right_bernstein_index"],
            label,
        ): statistics
        for position in captured["positions"]
        for label, statistics in position["rows"].items()
    }
    assert {
        key for key, statistics in reported.items() if statistics["negative"]
    } == FAILURE_KEYS

    collected = {key: {} for key in FAILURE_KEYS}
    projection_layers = []
    for support_size in range(4):
        projection_count = 0
        for active_slacks in itertools.combinations(SLACK_NAMES, support_size):
            projection = replay_projection(active_slacks)
            projection_count += 1
            for key, entries in projection.items():
                for monomial, coefficient in entries:
                    previous = collected[key].get(monomial)
                    assert previous is None or previous == coefficient
                    collected[key][monomial] = coefficient
        layer_counts = {
            ",".join(map(str, key[:2])) + ":" + key[2]: len(items)
            for key, items in sorted(collected.items())
        }
        projection_layers.append({
            "maximum_slack_support": support_size,
            "projections_in_layer": projection_count,
            "cumulative_negative_counts": layer_counts,
        })
        print("PROJECTION_LAYER", support_size, layer_counts, flush=True)
        if all(
            len(collected[key]) == reported[key]["negative"]
            for key in FAILURE_KEYS
        ):
            break

    replayed = []
    for left_index, right_index, label in sorted(FAILURE_KEYS):
        negatives = [
            {"monomial": list(monomial), "coefficient": coefficient}
            for monomial, coefficient in sorted(
                collected[left_index, right_index, label].items()
            )
        ]
        statistics = reported[left_index, right_index, label]
        coefficients = [item["coefficient"] for item in negatives]
        first = statistics["first_negative"]
        exact_first = [
            item for item in negatives if item["monomial"] == first["monomial"]
        ]
        assert exact_first == [first]
        assert min(coefficients) == statistics["minimum"]
        minimum_witnesses = [
            item for item in negatives
            if item["coefficient"] == statistics["minimum"]
        ]
        replayed.append({
            "position": [left_index, right_index],
            "label": label,
            "full_reported_negative_count": statistics["negative"],
            "replayed_negative_count": len(negatives),
            "all_reported_negatives_replayed": (
                len(negatives) == statistics["negative"]
            ),
            "first_witness_exactly_replayed": first,
            "minimum": statistics["minimum"],
            "minimum_witnesses": minimum_witnesses,
            "all_negative_coefficients": negatives,
        })

    payload = {
        "schema": "rank8-low-low-a23-dense-failure-targeted-replay-agent-v1",
        "status": "PASS_INDEPENDENT_TARGETED_REPLAY_OF_RAW_BERNSTEIN_FAILURE",
        "meaning": (
            "Low-dimensional projections of the original three-endpoint "
            "construction exactly reproduce the reported first and global-"
            "minimum witnesses; matching row counts additionally certifies "
            "complete replay whenever all negatives have small slack support."
        ),
        "cell": [1, 1],
        "failed_positions": [[0, 2], [2, 0]],
        "replayed_rows": replayed,
        "projection_layers": projection_layers,
        "total_negative_coefficients": sum(
            row["replayed_negative_count"] for row in replayed
        ),
        "all_reported_negatives_replayed": all(
            row["all_reported_negatives_replayed"] for row in replayed
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This disproves raw coefficientwise positivity of this degree-two "
            "Bernstein bridge only. It is not a counterexample to the target "
            "polynomial inequality or to Erdos Problem 993."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("NEGATIVE_COEFFICIENTS_REPLAYED", payload["total_negative_coefficients"])
    for row in replayed:
        print(
            "ROW", *row["position"], row["label"],
            "COUNT", row["full_reported_negative_count"],
            "MIN", row["minimum"],
            "MIN_WITNESSES", row["minimum_witnesses"],
        )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
