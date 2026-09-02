#!/usr/bin/env python3
"""Numerically continue the cubic-core saddle family to enormous heights.

This uses hard-core messages rather than coefficient polynomials.  For each
height it solves E_lambda |I| = 2 alpha / 3 and reports the corresponding
saddle fugacity.  All recurrences are explicit; floating point is used only
for asymptotic reconnaissance, not as a proof certificate.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class State:
    ratio: float
    expected_if_excluded: float
    expected_if_included: float
    alpha_if_excluded: int
    alpha_if_included: int
    order: int

    @property
    def expected(self) -> float:
        return (
            self.expected_if_excluded
            + self.ratio * self.expected_if_included
        ) / (1 + self.ratio)

    @property
    def alpha(self) -> int:
        return max(self.alpha_if_excluded, self.alpha_if_included)


def node(fugacity: float, children: list[State]) -> State:
    ratio = fugacity
    expected_if_excluded = 0.0
    expected_if_included = 1.0
    alpha_if_excluded = 0
    alpha_if_included = 1
    order = 1
    for child in children:
        ratio /= 1 + child.ratio
        expected_if_excluded += child.expected
        expected_if_included += child.expected_if_excluded
        alpha_if_excluded += child.alpha
        alpha_if_included += child.alpha_if_excluded
        order += child.order
    return State(
        ratio,
        expected_if_excluded,
        expected_if_included,
        alpha_if_excluded,
        alpha_if_included,
        order,
    )


def path(fugacity: float, length: int, child: State | None = None) -> State:
    state = child
    for _ in range(length):
        state = node(fugacity, [] if state is None else [state])
    assert state is not None
    return state


def whole_state(
    fugacity: float,
    height: int,
    internal_length: int,
    terminal_length: int,
    root_tail_length: int,
) -> State:
    terminal = path(fugacity, terminal_length)
    root_tail = path(fugacity, root_tail_length)
    if height == 0:
        return node(fugacity, [terminal, terminal, root_tail])
    child_hub = _hub_at_height(
        fugacity,
        height - 1,
        internal_length,
        terminal_length,
    )
    branch = path(fugacity, internal_length - 1, child_hub)
    return node(fugacity, [branch, branch, root_tail])


def _hub_at_height(
    fugacity: float,
    height: int,
    internal_length: int,
    terminal_length: int,
) -> State:
    terminal = path(fugacity, terminal_length)
    hub = node(fugacity, [terminal, terminal])
    for _ in range(height):
        branch = path(fugacity, internal_length - 1, hub)
        hub = node(fugacity, [branch, branch])
    return hub


def saddle(
    height: int,
    internal_length: int,
    terminal_length: int,
    root_tail_length: int,
) -> tuple[float, State]:
    low = -20.0
    high = 20.0
    for _ in range(100):
        middle = (low + high) / 2
        fugacity = math.exp(middle)
        state = whole_state(
            fugacity,
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
    state = whole_state(
        rho,
        height,
        internal_length,
        terminal_length,
        root_tail_length,
    )
    return rho, state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--height-max", type=int, default=40)
    parser.add_argument("--internal-length", type=int, default=1)
    parser.add_argument("--terminal-length", type=int, default=3)
    parser.add_argument("--root-tail-length", type=int, default=3)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    rows = []
    for height in range(args.height_max + 1):
        rho, state = saddle(
            height,
            args.internal_length,
            args.terminal_length,
            args.root_tail_length,
        )
        row = {
            "height": height,
            "order": state.order,
            "alpha": state.alpha,
            "rho": rho,
            "rho_over_one_plus_rho": rho / (1 + rho),
            "expected_over_alpha": state.expected / state.alpha,
        }
        rows.append(row)
        print(
            f"h={height}: n={state.order:,}, alpha={state.alpha:,}, "
            f"rho={rho:.15g}, limit={rho/(1+rho):.15g}",
            flush=True,
        )

    report = {
        "status": "NUMERICAL_ASYMPTOTIC_RECONNAISSANCE",
        "parameters": vars(args) | {"output": str(args.output)},
        "rows": rows,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
