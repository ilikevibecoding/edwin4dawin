#!/usr/bin/env python3
"""Checkpointed exact batches for the remaining cubic e=3 boundary.

Two disjoint modes are scanned.

* ``all_short`` checks the literal finite n=37..61 quotient patterns.
* ``mixed`` checks every pattern with at least one stable-long and at least
  one literal-short coordinate.  The sealed path-offset identity collapses
  all long offsets to S.  For each rank, 30 exact values determine the full
  Newton expansion because the Delta polynomial has degree at most 29.

For a mixed cell, d_k = forward_difference^k Delta(0).  Conditions d_0>0,
d_1>0 and d_k>=0 for k>=2 prove both Delta(S)>0 and the strict edge-extension
increment Delta(S+1)-Delta(S)>0 for every integer S>=0.

Writes are atomic and contain only parent-aggregated batch hashes.  A signed
coefficient/value stops immediately and gets a separate failure report.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
import time
from pathlib import Path

from flint import fmpq

import probe_rank8_delta01_e3_cubic_mixed_univariate_cells_agent as algebra


ROOT = Path(__file__).resolve().parent
PARTITION = ROOT / "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json"
EXPECTED = {
    "probe_rank8_delta01_e3_cubic_mixed_univariate_cells_agent.py":
        "92C0D885106F7668FACC844CF4112659F1172E2C205DA76F2D4B9E69EE1DC156",
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json":
        "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json":
        "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
}
EXPECTED_COUNTS = {
    "outer_branch": {"mixed": 592271, "all_short": 80652},
    "middle_branch": {"mixed": 296693, "all_short": 40553},
    "outer_leaf": {"mixed": 1184543, "all_short": 182356},
    "middle_leaf": {"mixed": 329795, "all_short": 53218},
    "outer_pendant_internal": {"mixed": 10365407, "all_short": 2349983},
    "middle_pendant_internal": {"mixed": 2893391, "all_short": 676950},
    "spine_internal": {"mixed": 5236991, "all_short": 1286834},
}
ROOTS = tuple(EXPECTED_COUNTS)
PENDANT = (*range(1, 8), "pendant")
SPINE = (*range(1, 10), "spine")
INCIDENT = (*range(1, 9), "incident")
NEAR = (*range(0, 8), "near")
TAIL = (*range(0, 7), "tail")
OUTER_PAIRS = tuple(itertools.combinations_with_replacement(PENDANT, 2))
MODULES = tuple((spine, pair) for spine in SPINE for pair in OUTER_PAIRS)
MODULE_PAIRS = tuple(itertools.combinations_with_replacement(MODULES, 2))
DEGREE_BOUND = 29


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def patterns(label: str):
    if label == "outer_branch":
        for attached in OUTER_PAIRS:
            for middle in PENDANT:
                for far in OUTER_PAIRS:
                    for near_spine in SPINE:
                        for far_spine in SPINE:
                            yield {
                                "a1": attached[0], "a2": attached[1], "m": middle,
                                "b1": far[0], "b2": far[1],
                                "u": near_spine, "v": far_spine,
                            }
    elif label == "middle_branch":
        for middle in PENDANT:
            for left, right in MODULE_PAIRS:
                yield {
                    "m": middle,
                    "a1": left[1][0], "a2": left[1][1],
                    "b1": right[1][0], "b2": right[1][1],
                    "u": left[0], "v": right[0],
                }
    elif label == "outer_leaf":
        for incident in INCIDENT:
            for sibling in PENDANT:
                for middle in PENDANT:
                    for far in OUTER_PAIRS:
                        for near_spine in SPINE:
                            for far_spine in SPINE:
                                yield {
                                    "a1": incident, "a2": sibling, "m": middle,
                                    "b1": far[0], "b2": far[1],
                                    "u": near_spine, "v": far_spine,
                                }
    elif label == "middle_leaf":
        for incident in INCIDENT:
            for left, right in MODULE_PAIRS:
                yield {
                    "m": incident,
                    "a1": left[1][0], "a2": left[1][1],
                    "b1": right[1][0], "b2": right[1][1],
                    "u": left[0], "v": right[0],
                }
    elif label == "outer_pendant_internal":
        for near in NEAR:
            for tail in TAIL:
                for sibling in PENDANT:
                    for middle in PENDANT:
                        for far in OUTER_PAIRS:
                            for near_spine in SPINE:
                                for far_spine in SPINE:
                                    yield {
                                        "near": near, "tail": tail,
                                        "a2": sibling, "m": middle,
                                        "b1": far[0], "b2": far[1],
                                        "u": near_spine, "v": far_spine,
                                    }
    elif label == "middle_pendant_internal":
        for near in NEAR:
            for tail in TAIL:
                for left, right in MODULE_PAIRS:
                    yield {
                        "near": near, "tail": tail,
                        "a1": left[1][0], "a2": left[1][1],
                        "b1": right[1][0], "b2": right[1][1],
                        "u": left[0], "v": right[0],
                    }
    elif label == "spine_internal":
        for near in NEAR:
            for tail in NEAR:
                for near_pair in OUTER_PAIRS:
                    for middle in PENDANT:
                        for other_spine, far_pair in MODULES:
                            yield {
                                "near": near, "tail": tail,
                                "a1": near_pair[0], "a2": near_pair[1],
                                "m": middle,
                                "b1": far_pair[0], "b2": far_pair[1],
                                "v": other_spine,
                            }
    else:
        raise ValueError(label)


def order_of(label: str, states: dict) -> int:
    baseline = sum(
        algebra.LONG_BASE[value] if isinstance(value, str) else value
        for value in states.values()
    )
    return baseline + (2 if "pendant_internal" in label else 3 if label == "spine_internal" else 1)


def selected_patterns(label: str, mode: str):
    for states in patterns(label):
        long_count = sum(isinstance(value, str) for value in states.values())
        if mode == "mixed":
            if 0 < long_count < len(states):
                yield states
        elif mode == "all_short":
            if long_count == 0 and order_of(label, states) >= 37:
                yield states
        else:
            raise ValueError(mode)


def pattern_key(label: str, states: dict) -> str:
    return label + ":" + ",".join(f"{name}={value}" for name, value in states.items())


def forward_column(values: list[int]) -> list[int]:
    current = values[:]
    result = []
    while current:
        result.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return result


def integer_value(value) -> int:
    rational = fmpq(value)
    assert rational.denom() == 1
    return int(rational.numer())


def mixed_row(label: str, states: dict) -> dict:
    polynomials, _, baseline_order, shift = algebra.cell(label, states, threshold=0)
    assert shift == 0
    ranks = {}
    for rank in (0, 1):
        values = [integer_value(polynomials[rank](offset)) for offset in range(DEGREE_BOUND + 1)]
        coefficients = forward_column(values)
        assert len(coefficients) == DEGREE_BOUND + 1
        ranks[str(rank)] = {
            "values": values,
            "newton_coefficients": coefficients,
            "negative_coefficients": sum(value < 0 for value in coefficients),
            "zero_coefficients": sum(value == 0 for value in coefficients),
            "base_value": coefficients[0],
            "first_difference": coefficients[1],
            "minimum_coefficient": min(coefficients),
        }
    passing = all(
        row["negative_coefficients"] == 0
        and row["base_value"] > 0
        and row["first_difference"] > 0
        for row in ranks.values()
    )
    return {
        "key": pattern_key(label, states),
        "states": states,
        "baseline_order": baseline_order,
        "ranks": ranks,
        "passing": passing,
    }


def literal_row(label: str, states: dict) -> dict:
    assert all(isinstance(value, int) for value in states.values())
    lengths = dict(states)
    if label == "outer_pendant_internal":
        core_lengths = {**lengths, "a1": lengths["near"] + lengths["tail"] + 1}
    elif label == "middle_pendant_internal":
        core_lengths = {**lengths, "m": lengths["near"] + lengths["tail"] + 1}
    elif label == "spine_internal":
        core_lengths = {**lengths, "u": lengths["near"] + lengths["tail"] + 2}
    else:
        core_lengths = lengths
    values = algebra.delta_values(algebra.core(core_lengths), algebra.DELETED[label](lengths))
    ranks = {str(rank): integer_value(values[rank][0]) for rank in (0, 1)}
    return {
        "key": pattern_key(label, states),
        "states": states,
        "order": order_of(label, states),
        "ranks": ranks,
        "passing": all(value > 0 for value in ranks.values()),
    }


def checkpoint_path(mode: str, label: str) -> Path:
    return ROOT / f"rank8_delta01_e3_cubic_{mode}_{label}_checkpoint_agent_20260823.json"


def report_path(mode: str, label: str) -> Path:
    return ROOT / f"rank8_delta01_e3_cubic_{mode}_{label}_exact_agent_20260823.json"


def failure_path(mode: str, label: str) -> Path:
    return ROOT / f"rank8_delta01_e3_cubic_{mode}_{label}_first_failure_agent_20260823.json"


def fresh_checkpoint(mode: str, label: str, dependencies: dict) -> dict:
    return {
        "schema": "rank8-delta01-e3-cubic-short-boundary-batch-checkpoint-agent-v1",
        "status": "IN_PROGRESS_EXACT_SERIAL_CHECKPOINT",
        "mode": mode,
        "root_location_orbit": label,
        "expected_cells": EXPECTED_COUNTS[label][mode],
        "completed_cells": 0,
        "batches": [],
        "totals": {
            "negative_values_or_coefficients": 0,
            "minimum_delta0_base": None,
            "minimum_delta1_base": None,
            "minimum_delta0_first_difference": None,
            "minimum_delta1_first_difference": None,
            "zero_higher_newton_coefficients": 0,
        },
        "cumulative_runtime_seconds": 0.0,
        "immutable_dependencies": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }


def load_checkpoint(mode: str, label: str, dependencies: dict) -> dict:
    path = checkpoint_path(mode, label)
    if not path.exists():
        return fresh_checkpoint(mode, label, dependencies)
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["schema"] == "rank8-delta01-e3-cubic-short-boundary-batch-checkpoint-agent-v1"
    assert payload["mode"] == mode and payload["root_location_orbit"] == label
    assert payload["expected_cells"] == EXPECTED_COUNTS[label][mode]
    assert payload["immutable_dependencies"] == dependencies
    assert payload["source_sha256"] == sha256(Path(__file__))
    cursor = 0
    for batch in payload["batches"]:
        assert batch["start"] == cursor and batch["stop"] > batch["start"]
        assert batch["cells"] == batch["stop"] - batch["start"]
        cursor = batch["stop"]
    assert cursor == payload["completed_cells"]
    assert payload["totals"]["negative_values_or_coefficients"] == 0
    return payload


def update_minimum(current, value: int):
    return value if current is None else min(current, value)


def final_payload(checkpoint: dict) -> dict:
    assert checkpoint["completed_cells"] == checkpoint["expected_cells"]
    mode = checkpoint["mode"]
    return {
        "schema": "rank8-delta01-e3-cubic-short-boundary-exact-agent-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_MIXED_CELL_NEWTON_CONE"
            if mode == "mixed"
            else "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND"
        ),
        "mode": mode,
        "root_location_orbit": checkpoint["root_location_orbit"],
        "claim": (
            "Every fixed mixed short/long pattern in this root orbit has Delta0(S)>0, Delta1(S)>0 and strict S-to-S+1 increments for all integer S>=0."
            if mode == "mixed"
            else "Every all-short rooted pattern in this root orbit of order n>=37 has Delta0>0 and Delta1>0."
        ),
        "degree_bound": DEGREE_BOUND if mode == "mixed" else None,
        "newton_criterion": (
            "P(S)=sum_{k=0}^{29} d_k binom(S,k), d_k=forward_difference^k P(0); d_0,d_1>0 and all d_k>=0."
            if mode == "mixed" else None
        ),
        "cells": checkpoint["completed_cells"],
        "batches": checkpoint["batches"],
        "totals": checkpoint["totals"],
        "cumulative_runtime_seconds": checkpoint["cumulative_runtime_seconds"],
        "immutable_dependencies": checkpoint["immutable_dependencies"],
        "source_sha256": checkpoint["source_sha256"],
        "scope_warning": (
            "This report covers one root-location orbit and one boundary mode only. "
            "It must be assembled with all other root/mode reports and sealed inputs; "
            "it is not by itself a cubic-skeleton, connected-Q8, forest-Q8, or Problem-993 theorem."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("mixed", "all_short"), required=True)
    parser.add_argument("--root", choices=ROOTS, required=True)
    parser.add_argument("--max-new-cells", type=int, default=1000)
    parser.add_argument("--checkpoint-every", type=int, default=100)
    args = parser.parse_args()
    assert args.max_new_cells >= 0 and args.checkpoint_every >= 1
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    partition = json.loads(PARTITION.read_text(encoding="utf-8"))
    assert partition["status"] == "PASS_EXACT_NO_GAP_PARTITION_REMAINING_OBLIGATIONS_EXPLICIT"
    expected_row = next(row for row in partition["root_location_partitions"] if row["root_location_orbit"] == args.root)
    assert expected_row["mixed_long_short_patterns"] == EXPECTED_COUNTS[args.root]["mixed"]
    assert expected_row["all_short_patterns_in_uncovered_n37_plus_band"] == EXPECTED_COUNTS[args.root]["all_short"]

    checkpoint = load_checkpoint(args.mode, args.root, dependencies)
    start_cursor = checkpoint["completed_cells"]
    batch_start = start_cursor
    batch_lines = []
    new_cells = 0
    started = time.perf_counter()
    evaluator = mixed_row if args.mode == "mixed" else literal_row
    for index, states in enumerate(selected_patterns(args.root, args.mode)):
        if index < start_cursor:
            continue
        if new_cells >= args.max_new_cells:
            break
        row = evaluator(args.root, states)
        if not row["passing"]:
            failure = {
                "schema": "rank8-delta01-e3-cubic-short-boundary-first-failure-agent-v1",
                "status": "OBSTRUCTION_SIGNED_EXACT_CELL",
                "mode": args.mode,
                "root_location_orbit": args.root,
                "cell_index": index,
                "cell": row,
                "immutable_dependencies": dependencies,
                "source_sha256": sha256(Path(__file__)),
            }
            atomic_json(failure_path(args.mode, args.root), failure)
            print("OBSTRUCTION", row["key"], sha256(failure_path(args.mode, args.root)), flush=True)
            return 2
        if args.mode == "mixed":
            for rank in (0, 1):
                rank_row = row["ranks"][str(rank)]
                checkpoint["totals"][f"minimum_delta{rank}_base"] = update_minimum(
                    checkpoint["totals"][f"minimum_delta{rank}_base"], rank_row["base_value"]
                )
                checkpoint["totals"][f"minimum_delta{rank}_first_difference"] = update_minimum(
                    checkpoint["totals"][f"minimum_delta{rank}_first_difference"], rank_row["first_difference"]
                )
                checkpoint["totals"]["zero_higher_newton_coefficients"] += sum(
                    value == 0 for value in rank_row["newton_coefficients"][2:]
                )
            digest_body = {
                "key": row["key"],
                "baseline_order": row["baseline_order"],
                "newton": {rank: row["ranks"][rank]["newton_coefficients"] for rank in ("0", "1")},
            }
        else:
            for rank in (0, 1):
                checkpoint["totals"][f"minimum_delta{rank}_base"] = update_minimum(
                    checkpoint["totals"][f"minimum_delta{rank}_base"], row["ranks"][str(rank)]
                )
            digest_body = {"key": row["key"], "order": row["order"], "ranks": row["ranks"]}
        batch_lines.append(json.dumps(digest_body, sort_keys=True, separators=(",", ":")))
        new_cells += 1
        checkpoint["completed_cells"] += 1

        if new_cells % args.checkpoint_every == 0:
            stop = checkpoint["completed_cells"]
            body = "\n".join(batch_lines) + "\n"
            checkpoint["batches"].append({
                "start": batch_start, "stop": stop, "cells": stop - batch_start,
                "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest().upper(),
            })
            batch_start = stop
            batch_lines = []
            checkpoint["cumulative_runtime_seconds"] += time.perf_counter() - started
            started = time.perf_counter()
            atomic_json(checkpoint_path(args.mode, args.root), checkpoint)
            print("CHECKPOINT", args.mode, args.root, stop, checkpoint["expected_cells"], flush=True)

    if batch_lines:
        stop = checkpoint["completed_cells"]
        body = "\n".join(batch_lines) + "\n"
        checkpoint["batches"].append({
            "start": batch_start, "stop": stop, "cells": stop - batch_start,
            "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest().upper(),
        })
        checkpoint["cumulative_runtime_seconds"] += time.perf_counter() - started
        atomic_json(checkpoint_path(args.mode, args.root), checkpoint)
    elif new_cells % args.checkpoint_every:
        checkpoint["cumulative_runtime_seconds"] += time.perf_counter() - started
        atomic_json(checkpoint_path(args.mode, args.root), checkpoint)

    if checkpoint["completed_cells"] == checkpoint["expected_cells"]:
        payload = final_payload(checkpoint)
        atomic_json(report_path(args.mode, args.root), payload)
        print(payload["status"], sha256(report_path(args.mode, args.root)), flush=True)
    else:
        print("BATCH_COMPLETE", args.mode, args.root, checkpoint["completed_cells"], checkpoint["expected_cells"], sha256(checkpoint_path(args.mode, args.root)), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
