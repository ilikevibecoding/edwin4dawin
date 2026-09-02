#!/usr/bin/env python3
"""Test the cross-state polarization behind path-terminal P4.

For one distinguished isolate, the strong P4 difference cancels the
unselected/unselected and selected/selected states.  Only

    selected in the left copy, unselected in the right copy

and its reverse remain.  The other isolates contribute through the
positive subset-union product.  This script tests whether every
ordered input-layer cross polarization is itself nonnegative.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def named(state):
    _, A, M, P = state
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    return {
        "N": N,
        "S": S,
        "H": H,
        "C": C,
        "X": X,
        "Y": Y,
        "HX": HX,
        "m": m,
        "T": T,
        "J2": J2,
        "D": D,
        "p": p,
        "U": U,
        "K2": K2,
        "E": E,
    }


def unselected(state):
    q, A, M, P = state
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    return (
        q,
        (
            N,
            direct.add(S, N),
            direct.add(H, direct.scale(S, 2), N),
            direct.add(C, N),
            X,
            Y,
            direct.add(HX, X),
        ),
        (
            m,
            direct.add(T, m),
            direct.add(J2, direct.scale(T, 2), m),
            direct.add(D, m),
        ),
        (
            p,
            direct.add(U, p),
            direct.add(K2, direct.scale(U, 2), p),
            direct.add(E, p),
        ),
    )


def term_specs(q):
    return (
        (-4, "X", "N"),
        (4, "X", "X"),
        (8, "m", "S"),
        (-8, "m", "HX"),
        (-8, "N", "T"),
        (8, "X", "T"),
        (4, "m", "X"),
        (4, "m", "Y"),
        (8, "m", "m"),
        (4 * (q - 3), "N", "p"),
        (2, "p", "C"),
        (4, "p", "Y"),
        (2, "N", "E"),
        (-2, "p", "H"),
        (-8, "p", "HX"),
        (-8, "p", "X"),
        (-2, "N", "K2"),
        (4, "S", "U"),
        (8, "X", "U"),
        (4 * q - 12, "m", "p"),
        (2, "p", "D"),
        (2, "m", "E"),
        (-2, "p", "J2"),
        (-2, "m", "K2"),
        (-4, "p", "T"),
        (4, "T", "U"),
        (4, "m", "U"),
    )


def ordered_cross(left_state, right_state, q, a, b):
    left = named(left_state)
    right = named(right_state)
    return sum(
        scalar * left[left_name][a] * right[right_name][b]
        for scalar, left_name, right_name in term_specs(q)
    )


def cross_polarization(
    states_q,
    states_lower,
    phase_name,
    a,
    b,
):
    original = states_q[phase_name]
    q_scalar = original[0]
    selected = states_lower[phase_name]
    absent = unselected(original)
    return (
        ordered_cross(absent, absent, q_scalar, a, b)
        - ordered_cross(
            original, original, q_scalar, a, b
        )
        +
        ordered_cross(selected, absent, q_scalar, a, b)
        + ordered_cross(absent, selected, q_scalar, a, b)
        + ordered_cross(selected, selected, q_scalar, a, b)
        - ordered_cross(
            selected, selected, selected[0], a, b
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=24)
    parser.add_argument("--layer-max", type=int, default=16)
    parser.add_argument("--x-max", type=int, default=12)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    failures = []
    checks = 0
    minimum = None
    try:
        for q in range(5, args.q_max + 1):
            maximum = min(args.layer_max, 2 * q - 3)
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                states_q = direct.terminal_series(
                    q, length, maximum, return_states=True
                )
                states_lower = direct.terminal_series(
                    q - 1, length, maximum, return_states=True
                )
                for a in range(maximum + 1):
                    for b in range(maximum + 1):
                        value = 0
                        for phase_name, sign in (
                            ("new", 1),
                            ("old", -1),
                            ("lower", -1),
                        ):
                            value += sign * cross_polarization(
                                states_q,
                                states_lower,
                                phase_name,
                                a,
                                b,
                            )
                        value = int(value)
                        checks += 1
                        record = {
                            "q": q,
                            "x": x,
                            "layers": [a, b],
                            "value": value,
                        }
                        if minimum is None or value < minimum[0]:
                            minimum = (value, record)
                        if value < 0:
                            failures.append(record)
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_CROSS_POLARIZATION_STRESS"
            if not failures
            else "FAIL_PATH_ISOLATE_P4_CROSS_POLARIZATION_STRESS"
        ),
        "q_range": f"5..{args.q_max}",
        "layer_cap": args.layer_max,
        "stable_x_range": f"0..{args.x_max}",
        "checks": checks,
        "failure_count": len(failures),
        "minimum": minimum[1] if minimum else None,
        "first_failures": failures[:50],
        "warning": (
            "Finite exact evidence only.  A uniform sign proof would "
            "make the positive subset-union expansion prove all P4 "
            "layers simultaneously."
        ),
    }
    Path(
        "path_isolate_p4_cross_polarization_stress_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
