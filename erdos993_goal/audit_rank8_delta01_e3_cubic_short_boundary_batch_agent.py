#!/usr/bin/env python3
"""Independent literal-tree audit of a cubic boundary batch checkpoint.

The primary scanner uses conditioned-path algebra and exact univariate
polynomials.  This audit rebuilds sampled literal subdivided trees, computes
their independence coefficients by a separate vertex-level tree DP, forms
Delta0/Delta1 with the independently transcribed formulas, and independently
takes forward differences.  It also checks the degree-29 Newton reconstruction
at the unseen point S=30.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    deltas,
    forest_polynomial,
)

import verify_rank8_delta01_e3_cubic_short_boundary_batches_agent as primary


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_short_boundary_batches_agent.py":
        "94942334232FFA39B9D9BDBAE75CDBB80D6ACE293EE8CCCB30BF5BCCA3AA6363",
    "probe_rank8_delta01_e3_cubic_mixed_univariate_cells_agent.py":
        "92C0D885106F7668FACC844CF4112659F1172E2C205DA76F2D4B9E69EE1DC156",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def materialize(states: dict, offset: int) -> dict[str, int]:
    result = {}
    first_long = True
    for name, value in states.items():
        if isinstance(value, str):
            result[name] = primary.algebra.LONG_BASE[value] + (offset if first_long else 0)
            first_long = False
        else:
            result[name] = value
    return result


def subdivision_with_paths(lengths: dict[str, int]):
    edges = [
        ("u", 0, 1), ("v", 1, 2),
        ("a1", 0, 3), ("a2", 0, 4), ("m", 1, 5),
        ("b1", 2, 6), ("b2", 2, 7),
    ]
    order = 1 + sum(lengths[name] for name, _, _ in edges)
    adjacency = [[] for _ in range(order)]
    paths = {}
    next_vertex = 8
    for name, left, right in edges:
        path = [left]
        previous = left
        for _ in range(1, lengths[name]):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            path.append(vertex)
        adjacency[previous].append(right)
        adjacency[right].append(previous)
        path.append(right)
        paths[name] = path
    assert next_vertex == order
    return adjacency, paths


def literal_tree(label: str, states: dict, offset: int):
    values = materialize(states, offset)
    if label == "outer_pendant_internal":
        lengths = {**values, "a1": values["near"] + values["tail"] + 1}
    elif label == "middle_pendant_internal":
        lengths = {**values, "m": values["near"] + values["tail"] + 1}
    elif label == "spine_internal":
        lengths = {**values, "u": values["near"] + values["tail"] + 2}
    else:
        lengths = values
    adjacency, paths = subdivision_with_paths(lengths)
    if label == "outer_branch":
        root = 0
    elif label == "middle_branch":
        root = 1
    elif label == "outer_leaf":
        root = 3
    elif label == "middle_leaf":
        root = 5
    elif label == "outer_pendant_internal":
        root = paths["a1"][values["near"] + 1]
    elif label == "middle_pendant_internal":
        root = paths["m"][values["near"] + 1]
    elif label == "spine_internal":
        root = paths["u"][values["near"] + 1]
    else:
        raise ValueError(label)
    assert 0 <= root < len(adjacency)
    return adjacency, root


def literal_deltas(label: str, states: dict, offset: int):
    adjacency, root = literal_tree(label, states, offset)
    core = forest_polynomial(adjacency)
    deleted = forest_polynomial(adjacency, root)
    return deltas(core, deleted), core, deleted, root


def forward_column(values: list[int]) -> list[int]:
    current = values[:]
    result = []
    while current:
        result.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return result


def sample_indices(completed: int, requested: int):
    assert completed > 0
    candidates = {0, completed - 1}
    for numerator in range(1, requested):
        candidates.add((completed - 1) * numerator // requested)
    return sorted(candidates)[:requested]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("mixed", "all_short"), required=True)
    parser.add_argument("--root", choices=primary.ROOTS, required=True)
    parser.add_argument("--samples", type=int, default=5)
    args = parser.parse_args()
    assert args.samples >= 1
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    checkpoint_path = primary.checkpoint_path(args.mode, args.root)
    checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    assert checkpoint["status"] == "IN_PROGRESS_EXACT_SERIAL_CHECKPOINT"
    assert checkpoint["mode"] == args.mode and checkpoint["root_location_orbit"] == args.root
    completed = checkpoint["completed_cells"]
    indices = sample_indices(completed, min(args.samples, completed))
    wanted = set(indices)
    sampled = {}
    for index, states in enumerate(primary.selected_patterns(args.root, args.mode)):
        if index in wanted:
            sampled[index] = states
        if index >= indices[-1]:
            break
    assert set(sampled) == wanted

    rows = []
    for index in indices:
        states = sampled[index]
        if args.mode == "mixed":
            primary_row = primary.mixed_row(args.root, states)
            literal_values = {"0": [], "1": []}
            first_witness = None
            for offset in range(primary.DEGREE_BOUND + 2):
                values, core, deleted, root = literal_deltas(args.root, states, offset)
                if offset == 0:
                    first_witness = {
                        "order": len(literal_tree(args.root, states, 0)[0]),
                        "root": root,
                        "core": core,
                        "deleted": deleted,
                    }
                for rank in (0, 1):
                    literal_values[str(rank)].append(int(values[rank]))
            rank_rows = {}
            for rank in (0, 1):
                first30 = literal_values[str(rank)][: primary.DEGREE_BOUND + 1]
                coefficients = forward_column(first30)
                scanner_values = primary_row["ranks"][str(rank)]["values"]
                scanner_coefficients = primary_row["ranks"][str(rank)]["newton_coefficients"]
                assert first30 == scanner_values
                assert coefficients == scanner_coefficients
                predicted30 = sum(
                    coefficients[degree] * math.comb(primary.DEGREE_BOUND + 1, degree)
                    for degree in range(primary.DEGREE_BOUND + 1)
                )
                assert predicted30 == literal_values[str(rank)][primary.DEGREE_BOUND + 1]
                rank_rows[str(rank)] = {
                    "literal_values_sha256": hashlib.sha256(json.dumps(literal_values[str(rank)]).encode("ascii")).hexdigest().upper(),
                    "newton_coefficients_sha256": hashlib.sha256(json.dumps(coefficients).encode("ascii")).hexdigest().upper(),
                    "base": coefficients[0],
                    "first_difference": coefficients[1],
                    "unseen_S30_match": True,
                }
            rows.append({
                "index": index,
                "key": primary.pattern_key(args.root, states),
                "ranks": rank_rows,
                "literal_witness_S0": first_witness,
            })
        else:
            primary_row = primary.literal_row(args.root, states)
            values, core, deleted, root = literal_deltas(args.root, states, 0)
            assert primary_row["ranks"] == {"0": int(values[0]), "1": int(values[1])}
            rows.append({
                "index": index,
                "key": primary.pattern_key(args.root, states),
                "order": len(literal_tree(args.root, states, 0)[0]),
                "root": root,
                "core": core,
                "deleted": deleted,
                "ranks": primary_row["ranks"],
            })

    payload = {
        "schema": "rank8-delta01-e3-cubic-short-boundary-batch-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_AND_NEWTON_BATCH_AUDIT",
        "mode": args.mode,
        "root_location_orbit": args.root,
        "checkpoint": checkpoint_path.name,
        "checkpoint_sha256": sha256(checkpoint_path),
        "completed_cells_at_audit": completed,
        "sample_indices": indices,
        "samples": rows,
        "methods": [
            "separate literal vertex-level tree construction and independence-polynomial DP",
            "independently transcribed Delta0/Delta1 formulas from the prior finite census audit",
            "independent forward-difference transform",
            "degree-29 Newton reconstruction checked at the unseen literal point S=30",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits deterministic samples from one checkpoint; exhaustive closure still requires the primary checkpoint to reach its pinned expected count.",
    }
    output = ROOT / f"rank8_delta01_e3_cubic_{args.mode}_{args.root}_batch_independent_audit_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()
