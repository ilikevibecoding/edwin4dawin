#!/usr/bin/env python3
"""Scan asymptotic regular tree cores for large 2/3-alpha fugacity."""

from __future__ import annotations

import argparse
import heapq
import json
import math
import time
from pathlib import Path

from analyze_cubic_core_saddle_limit import State, node, path


def core_state(
    fugacity: float,
    branching: int,
    height: int,
    internal_length: int,
    terminal_length: int,
    root_tail_length: int,
) -> State:
    terminal = path(fugacity, terminal_length)
    hub = node(fugacity, [terminal] * branching)
    if height == 0:
        return node(
            fugacity,
            [terminal] * branching
            + [path(fugacity, root_tail_length)],
        )
    for _ in range(height - 1):
        branch = path(fugacity, internal_length - 1, hub)
        hub = node(fugacity, [branch] * branching)
    branch = path(fugacity, internal_length - 1, hub)
    return node(
        fugacity,
        [branch] * branching + [path(fugacity, root_tail_length)],
    )


def saddle(parameters: tuple[int, int, int, int, int]):
    branching, height, internal_length, terminal_length, root_tail_length = (
        parameters
    )
    low = -30.0
    high = 30.0
    for _ in range(100):
        middle = (low + high) / 2
        fugacity = math.exp(middle)
        state = core_state(
            fugacity,
            branching,
            height,
            internal_length,
            terminal_length,
            root_tail_length,
        )
        if state.expected < 2 * state.alpha / 3:
            low = middle
        else:
            high = middle
    rho = math.exp((low + high) / 2)
    state = core_state(
        rho,
        branching,
        height,
        internal_length,
        terminal_length,
        root_tail_length,
    )
    return rho, state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branching-max", type=int, default=10)
    parser.add_argument("--height", type=int, default=24)
    parser.add_argument("--internal-length-max", type=int, default=8)
    parser.add_argument("--terminal-length-max", type=int, default=12)
    parser.add_argument("--root-tail-length-max", type=int, default=4)
    parser.add_argument("--top", type=int, default=100)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    heap = []
    serial = 0
    cases = 0
    for branching in range(1, args.branching_max + 1):
        branching_best = None
        for internal_length in range(1, args.internal_length_max + 1):
            for terminal_length in range(1, args.terminal_length_max + 1):
                for root_tail_length in range(
                    1, args.root_tail_length_max + 1
                ):
                    parameters = (
                        branching,
                        args.height,
                        internal_length,
                        terminal_length,
                        root_tail_length,
                    )
                    rho, state = saddle(parameters)
                    limit = rho / (1 + rho)
                    item = {
                        "branching": branching,
                        "height": args.height,
                        "internal_length": internal_length,
                        "terminal_length": terminal_length,
                        "root_tail_length": root_tail_length,
                        "order": state.order,
                        "alpha": state.alpha,
                        "rho": rho,
                        "rho_over_one_plus_rho": limit,
                    }
                    cases += 1
                    serial += 1
                    if branching_best is None or limit > branching_best:
                        branching_best = limit
                    if len(heap) < args.top:
                        heapq.heappush(heap, (limit, serial, item))
                    elif limit > heap[0][0]:
                        heapq.heapreplace(heap, (limit, serial, item))
        print(
            f"branching={branching}: cases={cases:,}, "
            f"branching_best={branching_best:.12g}, "
            f"global_best={max(entry[0] for entry in heap):.12g}",
            flush=True,
        )

    report = {
        "status": "NUMERICAL_ASYMPTOTIC_RECONNAISSANCE",
        "parameters": vars(args) | {"output": str(args.output)},
        "cases": cases,
        "top": [entry[2] for entry in sorted(heap, reverse=True)],
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
