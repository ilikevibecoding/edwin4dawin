#!/usr/bin/env python3
"""Rank-reusing exact batch for the pure-cubic B2=5 Bernstein proof.

For a fixed (n,k,r,t,endpoint), the active-branch constraints do not depend on
the Newton rank.  This runner normalizes and Bernstein-converts those
constraints once, then reuses the immutable starting tensors for ranks 0..6.
"""
from __future__ import annotations

import argparse
import json
import time
from math import comb
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from prove_rank7_pure_cubic_b2_5_joint_bernstein import (
    BVAR,
    VARS,
    balanced_values,
    base_cell,
    normalized_numerator,
)


def write_json_atomic(path, payload):
    target = Path(path)
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n")
    temporary.replace(target)


def endpoint_data(n, p, q, r, edge_e, side, index):
    # Rank zero is used only to recover the rank-independent endpoint lists.
    _, lower, upper, feasibility = base_cell(n, p, q, r, 0, edge_e)
    if side == "lower":
        b = lower[index]
        constraints = [b - value for j, value in enumerate(lower) if j != index]
        constraints += [value - b for value in upper]
    else:
        b = upper[index]
        constraints = [value - b for j, value in enumerate(upper) if j != index]
        constraints += [b - value for value in lower]
    constraints += list(feasibility)
    normalized = [
        normalized_numerator(value)
        for value in constraints
        if sp.simplify(value) != 0
    ]
    tensors = tuple(tensor_bernstein_fast(value, VARS)[1] for value in normalized)
    return b, tensors, len(lower), len(upper)


def objective_tensor(n, p, q, r, edge_e, rank, b):
    template, _, _, _ = base_cell(n, p, q, r, rank, edge_e)
    objective = normalized_numerator(template.subs(BVAR, b))
    return tensor_bernstein_fast(objective, VARS)[1]


def certify_tensor(objective_tensor_value, constraint_tensors, max_depth):
    bounds = tuple((sp.Rational(0), sp.Rational(1)) for _ in VARS)
    stack = [(objective_tensor_value, constraint_tensors, (0,) * len(VARS), bounds)]
    nodes = passed = discarded = 0
    worst = None
    while stack:
        objective, constraints, depth, current_bounds = stack.pop()
        nodes += 1
        if any(max(tensor.flat) < 0 for tensor in constraints):
            discarded += 1
            continue
        minimum = min(objective.flat)
        if minimum >= 0:
            passed += 1
            continue
        if sum(depth) >= max_depth:
            worst = (minimum, depth, current_bounds)
            break
        axis = min(range(len(VARS)), key=lambda i: depth[i])
        objective_left, objective_right = split_bernstein_midpoint(objective, axis)
        constraints_left, constraints_right = [], []
        for tensor in constraints:
            left, right = split_bernstein_midpoint(tensor, axis)
            constraints_left.append(left)
            constraints_right.append(right)
        next_depth = list(depth)
        next_depth[axis] += 1
        next_depth = tuple(next_depth)
        lo, hi = current_bounds[axis]
        midpoint = (lo + hi) / 2
        left_bounds, right_bounds = list(current_bounds), list(current_bounds)
        left_bounds[axis] = (lo, midpoint)
        right_bounds[axis] = (midpoint, hi)
        stack.append((objective_right, tuple(constraints_right), next_depth, tuple(right_bounds)))
        stack.append((objective_left, tuple(constraints_left), next_depth, tuple(left_bounds)))
    return {
        "status": "PASS" if worst is None else "UNRESOLVED",
        "nodes": nodes,
        "passed": passed,
        "discarded": discarded,
        "worst": str(worst),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-first", type=int, required=True)
    parser.add_argument("--n-last", type=int, required=True)
    parser.add_argument("--rank-first", type=int, default=0)
    parser.add_argument("--rank-last", type=int, default=6)
    parser.add_argument("--k-first", type=int, default=-7)
    parser.add_argument("--k-last", type=int, default=4)
    parser.add_argument("--depth", type=int, default=48)
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--resume",
        action="store_true",
        help="resume from completed (n,k) blocks in the atomic output JSON",
    )
    args = parser.parse_args()
    started = time.time()
    output_path = Path(args.output)
    if args.resume and output_path.exists():
        summary = json.loads(output_path.read_text())
        expected = vars(args).copy()
        expected.pop("resume")
        recorded = dict(summary.get("parameters", {}))
        recorded.pop("resume", None)
        if recorded != expected:
            raise ValueError(
                f"resume parameter mismatch: recorded={recorded!r}, expected={expected!r}"
            )
        if summary.get("fail") is not None:
            raise ValueError("refusing to resume a checkpoint containing a failure")
        if summary.get("status") == "PASS_EXACT":
            print(json.dumps(summary, indent=2))
            return 0
        completed = {
            (int(block["n"]), int(block["k"]))
            for block in summary.get("completed_blocks", [])
        }
        summary["status"] = "RUNNING"
        summary["parameters"] = vars(args)
        summary["resume_count"] = int(summary.get("resume_count", 0)) + 1
        summary.setdefault("prior_elapsed_seconds", 0.0)
        summary["prior_elapsed_seconds"] += float(summary.get("elapsed_seconds", 0.0))
    else:
        completed = set()
        summary = {
            "status": "RUNNING",
            "parameters": vars(args),
            "profiles": 0,
            "endpoints": 0,
            "branches": 0,
            "root_empty_branches": 0,
            "nodes": 0,
            "fail": None,
            "completed_blocks": [],
        }
    for n in range(args.n_first, args.n_last + 1):
        for k in range(args.k_first, args.k_last + 1):
            if (n, k) in completed:
                continue
            p, q = max(k, 0), max(-k, 0)
            for r in (1, 2, 3):
                m = n - r - 1
                for t in range(1, 2 * r + 1):
                    xs = balanced_values(t, r)
                    if comb(r - 1, 2) + sum(comb(x, 2) for x in xs) > 5:
                        continue
                    edge_e = m - t
                    if not 0 <= edge_e <= m - 1:
                        continue
                    _, lower, upper, _ = base_cell(n, p, q, r, 0, edge_e)
                    endpoints = [("lower", i) for i in range(len(lower))]
                    endpoints += [("upper", i) for i in range(len(upper))]
                    summary["profiles"] += 1
                    for side, index in endpoints:
                        summary["endpoints"] += 1
                        b, constraints, _, _ = endpoint_data(n, p, q, r, edge_e, side, index)
                        # If an active-candidate constraint is strictly negative
                        # on the whole initial box, this endpoint branch is empty
                        # for every rank.  Avoid constructing seven objectives.
                        if any(max(tensor.flat) < 0 for tensor in constraints):
                            rank_count = args.rank_last - args.rank_first + 1
                            summary["branches"] += rank_count
                            summary["root_empty_branches"] += rank_count
                            summary["nodes"] += rank_count
                            print("DISCARD_ENDPOINT_ALL_RANKS", n, k, r, t, side, index, flush=True)
                            continue
                        for rank in range(args.rank_first, args.rank_last + 1):
                            objective = objective_tensor(n, p, q, r, edge_e, rank, b)
                            result = certify_tensor(objective, constraints, args.depth)
                            summary["branches"] += 1
                            summary["nodes"] += result["nodes"]
                            if result["status"] != "PASS":
                                summary["status"] = "UNRESOLVED"
                                summary["fail"] = {
                                    "n": n,
                                    "k": k,
                                    "p": p,
                                    "q": q,
                                    "r": r,
                                    "t": t,
                                    "e": edge_e,
                                    "rank": rank,
                                    "side": side,
                                    "index": index,
                                    "result": result,
                                }
                                summary["elapsed_seconds"] = time.time() - started
                                write_json_atomic(args.output, summary)
                                print(json.dumps(summary, indent=2))
                                return 1
                        print("PASS_ENDPOINT_ALL_RANKS", n, k, r, t, side, index, flush=True)
            summary["completed_blocks"].append({"n": n, "k": k})
            summary["elapsed_seconds"] = time.time() - started
            write_json_atomic(args.output, summary)
    summary["status"] = "PASS_EXACT"
    summary["elapsed_seconds"] = time.time() - started
    write_json_atomic(args.output, summary)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
