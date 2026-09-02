#!/usr/bin/env python3
"""Beam search for nonperiodic hard-core phase gadgets in rooted trees.

A branching word ``(d_1, ..., d_h)`` denotes the spherically symmetric
rooted tree obtained by giving the current rooted tree ``d_i`` identical
copies below a new root at step ``i``.  Unlike the earlier complete-tree
search, the branching number may change at every level.

The search uses exact probability identities at activity one for the two
root-conditioned size distributions.  It does not claim coefficient
unimodality or nonunimodality; its purpose is to locate words whose root-off
and root-on phases have comparable mass and unusually separated means.
Promising words can then be replayed with exact coefficient polynomials.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class State:
    word: tuple[int, ...]
    order: int
    root_on_probability: float
    off_mean: float
    on_mean: float
    off_variance: float
    on_variance: float
    total_mean: float
    total_variance: float


LEAF = State(
    word=(),
    order=1,
    root_on_probability=0.5,
    off_mean=0.0,
    on_mean=1.0,
    off_variance=0.0,
    on_variance=0.0,
    total_mean=0.5,
    total_variance=0.25,
)


def extend(child: State, branching: int) -> State:
    """Add a new root with ``branching`` identical child copies."""
    child_off_probability = 1.0 - child.root_on_probability
    odds = child_off_probability**branching
    root_on_probability = odds / (1.0 + odds)

    off_mean = branching * child.total_mean
    on_mean = 1.0 + branching * child.off_mean
    off_variance = branching * child.total_variance
    on_variance = branching * child.off_variance

    total_mean = (
        (1.0 - root_on_probability) * off_mean
        + root_on_probability * on_mean
    )
    total_variance = (
        (1.0 - root_on_probability)
        * (off_variance + (off_mean - total_mean) ** 2)
        + root_on_probability
        * (on_variance + (on_mean - total_mean) ** 2)
    )
    return State(
        word=child.word + (branching,),
        order=1 + branching * child.order,
        root_on_probability=root_on_probability,
        off_mean=off_mean,
        on_mean=on_mean,
        off_variance=off_variance,
        on_variance=on_variance,
        total_mean=total_mean,
        total_variance=total_variance,
    )


def scores(state: State) -> dict[str, float]:
    """Return separation scores for the two conditional phases."""
    delta = abs(state.off_mean - state.on_mean)
    pooled_sd = math.sqrt(
        max(state.off_variance + state.on_variance, 1e-300)
    )
    max_sd = math.sqrt(
        max(state.off_variance, state.on_variance, 1e-300)
    )
    p = state.root_on_probability
    log_weight_penalty = abs(math.log(p / (1.0 - p)))
    return {
        "mean_separation": delta,
        "pooled_standardized_separation": delta / pooled_sd,
        "max_standardized_separation": delta / max_sd,
        # A heuristic for a two-normal mixture: separation helps, while a
        # highly unequal branch weight requires a larger separation.
        "phase_score": delta / max_sd - math.sqrt(
            2.0 * log_weight_penalty
        ),
        "log_weight_penalty": log_weight_penalty,
    }


def signed_coordinates(state: State) -> tuple[float, float, float, float]:
    """Coordinates that determine whether a later level can revive a state.

    A high score at the current root is not the right dynamic-programming
    objective: the signed conditional-mean gap changes by

        delta_new = 1 - d * p * delta,

    and a state with an uninteresting present score can become extreme after
    one more level.  These normalized coordinates are used to keep a diverse
    beam rather than only today's champions.
    """
    delta = state.on_mean - state.off_mean
    scale = math.sqrt(max(state.total_variance, 1e-12))
    conditional_scale = math.sqrt(
        max(state.off_variance, state.on_variance, 1e-12)
    )
    logit = math.log(
        state.root_on_probability / (1.0 - state.root_on_probability)
    )
    variance_skew = math.log(
        (state.on_variance + 1e-9) / (state.off_variance + 1e-9)
    )
    return (
        logit,
        delta / scale,
        delta / conditional_scale,
        variance_skew,
    )


def diverse_beam(candidates: list[State], beam_size: int) -> list[State]:
    """Retain phase champions and future-relevant states across coarse bins."""
    if len(candidates) <= beam_size:
        return candidates

    selected: dict[tuple[int, ...], State] = {}

    def add_ranked(key, quota: int) -> None:
        for state in sorted(candidates, key=key, reverse=True)[:quota]:
            selected[state.word] = state

    quota = max(1, beam_size // 10)
    add_ranked(lambda s: scores(s)["phase_score"], 2 * quota)
    add_ranked(
        lambda s: scores(s)["max_standardized_separation"], quota
    )
    add_ranked(lambda s: signed_coordinates(s)[1], quota)
    add_ranked(lambda s: -signed_coordinates(s)[1], quota)
    add_ranked(lambda s: signed_coordinates(s)[2], quota)
    add_ranked(lambda s: -signed_coordinates(s)[2], quota)
    add_ranked(lambda s: signed_coordinates(s)[3], quota)
    add_ranked(lambda s: -signed_coordinates(s)[3], quota)

    # One representative per dynamical cell.  The bins deliberately include
    # order: multiplying a small state and a large state by the same next
    # branching number has very different feasibility consequences.
    cells: dict[tuple[int, int, int, int], State] = {}
    for state in candidates:
        logit, signed_total, signed_conditional, variance_skew = (
            signed_coordinates(state)
        )
        cell = (
            max(-80, min(0, int(math.floor(8.0 * logit)))),
            max(-80, min(80, int(math.floor(8.0 * signed_total)))),
            max(
                -80,
                min(80, int(math.floor(6.0 * signed_conditional))),
            ),
            max(
                0,
                min(80, int(math.floor(5.0 * math.log10(state.order)))),
            ),
        )
        incumbent = cells.get(cell)
        if incumbent is None or (
            scores(state)["phase_score"],
            abs(variance_skew),
        ) > (
            scores(incumbent)["phase_score"],
            abs(signed_coordinates(incumbent)[3]),
        ):
            cells[cell] = state
    for state in sorted(
        cells.values(),
        key=lambda s: (
            scores(s)["phase_score"],
            scores(s)["max_standardized_separation"],
        ),
        reverse=True,
    ):
        if len(selected) >= beam_size:
            break
        selected[state.word] = state

    # Fill any remaining slots by the present objective.  Sorting the final
    # beam makes the layer report deterministic.
    if len(selected) < beam_size:
        add_ranked(
            lambda s: (
                scores(s)["phase_score"],
                scores(s)["max_standardized_separation"],
            ),
            beam_size,
        )
    result = list(selected.values())
    result.sort(
        key=lambda s: (
            scores(s)["phase_score"],
            scores(s)["max_standardized_separation"],
        ),
        reverse=True,
    )
    return result[:beam_size]


def record(state: State) -> dict:
    return {
        "word_leaf_to_root": list(state.word),
        "order": state.order,
        "root_on_probability": state.root_on_probability,
        "off_mean": state.off_mean,
        "on_mean": state.on_mean,
        "off_variance": state.off_variance,
        "on_variance": state.on_variance,
        "total_mean": state.total_mean,
        "total_variance": state.total_variance,
        "scores": scores(state),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--branching-min", type=int, default=1)
    parser.add_argument("--branching-max", type=int, default=30)
    parser.add_argument("--depth", type=int, default=14)
    parser.add_argument("--beam", type=int, default=5000)
    parser.add_argument("--max-order", type=int, default=10**12)
    parser.add_argument("--top", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("irregular_phase_moment_search.json"),
    )
    args = parser.parse_args()

    beam = [LEAF]
    champions: list[State] = []
    layer_summaries = []
    for depth in range(1, args.depth + 1):
        candidates: list[State] = []
        for child in beam:
            for branching in range(
                args.branching_min, args.branching_max + 1
            ):
                order = 1 + branching * child.order
                if order <= args.max_order:
                    candidates.append(extend(child, branching))
        if not candidates:
            break

        beam = diverse_beam(candidates, args.beam)
        champions.extend(beam[: min(args.top, len(beam))])
        champions.sort(
            key=lambda state: (
                scores(state)["phase_score"],
                scores(state)["max_standardized_separation"],
            ),
            reverse=True,
        )
        champions = champions[: args.top]
        best = beam[0]
        layer_summaries.append(
            {
                "depth": depth,
                "candidates": len(candidates),
                "best": record(best),
            }
        )
        print(
            f"depth={depth} candidates={len(candidates)} "
            f"best_score={scores(best)['phase_score']:.9f} "
            f"standardized="
            f"{scores(best)['max_standardized_separation']:.9f} "
            f"p={best.root_on_probability:.9g} "
            f"n={best.order} word={best.word}",
            flush=True,
        )

    payload = {
        "status": "complete",
        "parameters": {
            "branching_min": args.branching_min,
            "branching_max": args.branching_max,
            "depth": args.depth,
            "beam": args.beam,
            "max_order": args.max_order,
            "top": args.top,
        },
        "layer_summaries": layer_summaries,
        "champions": [record(state) for state in champions],
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
