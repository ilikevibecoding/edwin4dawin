#!/usr/bin/env python3
"""Beam search for irregular hierarchical cores with large saddle fugacity.

A specification starts with a bottom hub having ``b0`` terminal paths of
length ``t``.  Each subsequent level is a pair ``(b,s)``: a new hub has
``b`` identical copies of the previous state, each attached through a path
of length ``s``.  The construction is always a tree, but branching and
subdivision lengths may vary from level to level.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

from analyze_cubic_core_saddle_limit import State, node, path


def state_at(fugacity: float, specification: dict) -> State:
    terminal = path(fugacity, specification["terminal_length"])
    state = node(
        fugacity,
        [terminal] * specification["bottom_branching"],
    )
    for branching, internal_length in specification["levels"]:
        branch = path(fugacity, internal_length - 1, state)
        state = node(fugacity, [branch] * branching)
    return state


def saddle(specification: dict) -> tuple[float, State]:
    low = -30.0
    high = 30.0
    for _ in range(70):
        middle = (low + high) / 2
        fugacity = math.exp(middle)
        state = state_at(fugacity, specification)
        if state.expected < 2 * state.alpha / 3:
            low = middle
        else:
            high = middle
    rho = math.exp((low + high) / 2)
    return rho, state_at(rho, specification)


def scored(specification: dict) -> dict:
    rho, state = saddle(specification)
    return specification | {
        "order": state.order,
        "alpha": state.alpha,
        "rho": rho,
        "rho_over_one_plus_rho": rho / (1 + rho),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--depth-max", type=int, default=14)
    parser.add_argument("--branching-min", type=int, default=2)
    parser.add_argument("--branching-max", type=int, default=5)
    parser.add_argument("--internal-length-max", type=int, default=8)
    parser.add_argument("--terminal-length-max", type=int, default=10)
    parser.add_argument("--beam-width", type=int, default=500)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    beam = []
    evaluations = 0
    for bottom_branching in range(
        args.branching_min, args.branching_max + 1
    ):
        for terminal_length in range(1, args.terminal_length_max + 1):
            beam.append(
                scored(
                    {
                        "bottom_branching": bottom_branching,
                        "terminal_length": terminal_length,
                        "levels": [],
                    }
                )
            )
            evaluations += 1
    beam.sort(key=lambda item: item["rho"], reverse=True)
    beam = beam[: args.beam_width]
    history = [
        {
            "depth": 0,
            "evaluations": evaluations,
            "best": beam[0],
        }
    ]
    print(
        f"depth=0: beam={len(beam):,}, "
        f"best={beam[0]['rho_over_one_plus_rho']:.12g}",
        flush=True,
    )

    for depth in range(1, args.depth_max + 1):
        candidates = []
        for old in beam:
            base = {
                "bottom_branching": old["bottom_branching"],
                "terminal_length": old["terminal_length"],
            }
            for branching in range(
                args.branching_min, args.branching_max + 1
            ):
                for internal_length in range(
                    1, args.internal_length_max + 1
                ):
                    candidates.append(
                        scored(
                            base
                            | {
                                "levels": old["levels"]
                                + [[branching, internal_length]]
                            }
                        )
                    )
                    evaluations += 1
        candidates.sort(key=lambda item: item["rho"], reverse=True)
        beam = candidates[: args.beam_width]
        history.append(
            {
                "depth": depth,
                "evaluations": evaluations,
                "best": beam[0],
            }
        )
        print(
            f"depth={depth}: beam={len(beam):,}, "
            f"best={beam[0]['rho_over_one_plus_rho']:.12g}, "
            f"rho={beam[0]['rho']:.12g}",
            flush=True,
        )

    report = {
        "status": "NUMERICAL_BEAM_SEARCH_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "evaluations": evaluations,
        "history": history,
        "final_beam": beam,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            report
            | {
                "final_beam": beam[:10],
                "final_beam_truncated_on_stdout": True,
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
