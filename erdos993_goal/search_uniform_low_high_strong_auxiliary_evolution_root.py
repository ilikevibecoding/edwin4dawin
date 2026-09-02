#!/usr/bin/env python3
"""Sparse evolutionary falsification of the first uniform tail auxiliary.

The complete rank-eight cone theorem proves the auxiliary there.  This search
targets rank nine and above, where the same abstract statement is currently
unproved.  Candidate ranking is floating point, but every survivor and any
negative candidate are replayed with exact integer arithmetic.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
from pathlib import Path

from probe_uniform_low_high_strong_auxiliary_random_root import (
    exact_candidate,
    numeric_candidate,
    ratios_from_gaps,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_strong_auxiliary_evolution_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def decode(vector: tuple[int, ...], rank: int) -> tuple[list[int], list[int]]:
    left_slacks = vector[:rank]
    left_terminal = vector[rank]
    right_slacks = vector[rank + 1:2 * rank + 1]
    right_terminal = vector[-1]
    left_gaps = [2 + left_slacks[0], 1] + [
        1 + left_slacks[index] for index in range(2, rank)
    ]
    right_gaps = [2 + right_slacks[0]] + [
        1 + right_slacks[index] for index in range(1, rank)
    ]
    return (
        ratios_from_gaps(left_gaps, left_terminal),
        ratios_from_gaps(right_gaps, right_terminal),
    )


def score_vector(vector: tuple[int, ...], rank: int):
    left, right = decode(vector, rank)
    _, _, margin, derivative, tail_margin = numeric_candidate(left, right, rank)
    capacity = left[2]
    main = capacity * margin
    if derivative < 0 and main - derivative > 0:
        score = (main + derivative) / (main - derivative)
    else:
        score = 1.0 + max(0.0, derivative) / (abs(main) + abs(derivative) + 1e-300)
    return score, left, right, margin, derivative, tail_margin


def sparse_value(rng: random.Random, maximum: int) -> int:
    if rng.random() < 0.72:
        return 0
    if rng.random() < 0.70:
        return rng.randrange(1, min(maximum, 32) + 1)
    return rng.randrange(1, maximum + 1)


def initial_vector(rng: random.Random, rank: int, maximum: int) -> tuple[int, ...]:
    values = [sparse_value(rng, maximum) for _ in range(2 * rank + 2)]
    values[1] = 0  # delta_1 is the required equality h, not a free slack.
    # Seed the empirically difficult scale: a nearly minimal left row and a
    # moderately translated high partner.
    if rng.random() < 0.45:
        for index in range(rank + 1):
            values[index] = 0
        values[-1] = rng.randrange(0, min(maximum, 8 * rank * rank) + 1)
    return tuple(values)


def mutate(
    rng: random.Random,
    parent: tuple[int, ...],
    rank: int,
    maximum: int,
) -> tuple[int, ...]:
    child = list(parent)
    changes = 1 if rng.random() < 0.78 else rng.randrange(2, 5)
    mutable = [index for index in range(len(child)) if index != 1]
    for _ in range(changes):
        index = rng.choice(mutable)
        operation = rng.randrange(5)
        if operation == 0:
            child[index] = 0
        elif operation == 1:
            child[index] = rng.randrange(0, min(maximum, 32) + 1)
        elif operation == 2:
            child[index] = rng.randrange(0, maximum + 1)
        elif operation == 3:
            child[index] = min(maximum, child[index] + rng.randrange(1, 65))
        else:
            child[index] = max(0, child[index] - rng.randrange(1, 65))
    return tuple(child)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, default=9)
    parser.add_argument("--population", type=int, default=96)
    parser.add_argument("--generations", type=int, default=1500)
    parser.add_argument("--offspring", type=int, default=192)
    parser.add_argument("--maximum-slack", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=993_9_20260826)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert args.rank >= 5
    assert args.population >= 4 and args.offspring >= args.population

    rng = random.Random(args.seed)
    population = {
        initial_vector(rng, args.rank, args.maximum_slack)
        for _ in range(args.population * 3)
    }
    evaluations = 0
    exact_replays = 0
    best_history = []
    obstruction = None

    def ranked(vectors):
        nonlocal evaluations, exact_replays, obstruction
        rows = []
        for vector in vectors:
            result = score_vector(vector, args.rank)
            evaluations += 1
            rows.append((result[0], vector, result))
        rows.sort(key=lambda item: item[0])
        for score, _, result in rows[:3]:
            exact = exact_candidate(result[1], result[2], args.rank)
            exact_replays += 1
            assert exact["base_margin"] >= 0
            assert exact["tail_margin"] >= 0
            if exact["strong_auxiliary"] < 0:
                obstruction = exact
                break
        return rows

    leaders = ranked(population)[:args.population]
    for generation in range(args.generations):
        candidates = {item[1] for item in leaders}
        while len(candidates) < args.population + args.offspring:
            parent = rng.choice(leaders)[1]
            candidates.add(mutate(
                rng, parent, args.rank, args.maximum_slack
            ))
        leaders = ranked(candidates)[:args.population]
        if generation % 25 == 0 or generation + 1 == args.generations:
            best = leaders[0]
            best_history.append({
                "generation": generation,
                "numeric_score": best[0],
                "vector": list(best[1]),
            })
            print(
                "GEN", generation, "BEST", f"{best[0]:.17g}",
                "EVAL", evaluations, flush=True,
            )
        if obstruction is not None:
            break

    exact_leaders = []
    for score, vector, result in leaders[:10]:
        exact = exact_candidate(result[1], result[2], args.rank)
        exact_replays += 1
        main = exact["capacity_A2"] * exact["base_margin"]
        derivative = exact["tail_derivative"]
        exact_leaders.append({
            "numeric_score": score,
            "vector": list(vector),
            "exact": exact,
            "exact_normalized_numerator": exact["strong_auxiliary"],
            "exact_normalized_denominator": (
                main + abs(derivative) if derivative < 0 else main + derivative
            ),
        })
        if exact["strong_auxiliary"] < 0:
            obstruction = exact

    payload = {
        "schema": "uniform-low-high-strong-auxiliary-evolution-root-v1",
        "status": (
            "EXACT_COUNTEREXAMPLE_TO_UNIFORM_ABSTRACT_STRONG_AUXILIARY"
            if obstruction is not None
            else "NO_COUNTEREXAMPLE_IN_SPARSE_EVOLUTION_EVIDENCE_ONLY"
        ),
        "rank": args.rank,
        "parameters": {
            "population": args.population,
            "generations_requested": args.generations,
            "offspring": args.offspring,
            "maximum_slack": args.maximum_slack,
            "seed": args.seed,
        },
        "numeric_evaluations": evaluations,
        "exact_replays": exact_replays,
        "best_history": best_history,
        "exact_leaders": exact_leaders,
        "exact_obstruction": obstruction,
        "scope_warning": (
            "A negative exact row refutes only the abstract strong auxiliary, "
            "not Erdos Problem 993. A surviving search is finite evidence only."
        ),
        "dependencies": {
            "probe_uniform_low_high_strong_auxiliary_random_root.py": sha256(
                HERE / "probe_uniform_low_high_strong_auxiliary_random_root.py"
            )
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 2 if obstruction is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
