#!/usr/bin/env python3
"""Exact n>=28 tightening of the coupled rank-eight y and r coordinates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    t, T = sp.symbols("t T", nonnegative=True)
    y_high = 3 * (1 - t) / ((1 - 3 * t) * (1 - 4 * t))
    y_chord = 3 + sp.Rational(546, 25) * t
    w_high = 3 * t * (1 - t) / ((1 - 3 * t) * (1 - 4 * t))
    r_high = sp.factor(4 / (3 * (1 - w_high)))
    r_chord = sp.Rational(4, 3) + sp.Rational(1008, 173) * t

    y_margin = sp.factor(y_chord - y_high)
    r_margin = sp.factor(r_chord - r_high)
    expected_y_margin = (
        6 * t * (28 * t - 1) * (39 * t - 16)
        / (25 * (3 * t - 1) * (4 * t - 1))
    )
    expected_r_margin = (
        4 * t * (28 * t - 1) * (135 * t - 79)
        / (173 * (15 * t**2 - 10 * t + 1))
    )
    assert sp.factor(y_margin - expected_y_margin) == 0
    assert sp.factor(r_margin - expected_r_margin) == 0
    assert sp.factor(y_chord.subs(t, sp.Rational(1, 28)) - y_high.subs(t, sp.Rational(1, 28))) == 0
    assert sp.factor(r_chord.subs(t, sp.Rational(1, 28)) - r_high.subs(t, sp.Rational(1, 28))) == 0

    # On 0<=T<=1 after t=T/28, the two numerators have an explicit product
    # of one nonnegative and two nonpositive factors. Denominators are positive.
    y_T = sp.factor(y_margin.subs(t, T / 28))
    r_T = sp.factor(r_margin.subs(t, T / 28))
    expected_y_T = (
        3 * T * (T - 1) * (39 * T - 448)
        / (50 * (T - 7) * (3 * T - 28))
    )
    expected_r_T = (
        4 * T * (T - 1) * (135 * T - 2212)
        / (173 * (15 * T**2 - 280 * T + 784))
    )
    assert sp.factor(y_T - expected_y_T) == 0
    assert sp.factor(r_T - expected_r_T) == 0
    # Endpoint/monotonicity sign audit on 0<=T<=1.
    assert (T - 7).subs(T, 1) < 0 and (3 * T - 28).subs(T, 1) < 0
    assert (39 * T - 448).subs(T, 1) < 0
    assert (135 * T - 2212).subs(T, 1) < 0
    r_den_core = 15 * T**2 - 280 * T + 784
    assert sp.diff(r_den_core, T).subs(T, 1) < 0
    assert r_den_core.subs(T, 1) > 0

    payload = {
        "schema": "rank8-n28-tight-coordinate-chords-root-v1",
        "status": "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS",
        "domain": "t=1/n, 0<=t<=1/28",
        "bounds": {
            "y": "y<=3+(546/25)t",
            "r": "r<=4/3+(1008/173)t",
        },
        "exact_upper_functions": {
            "y_high": str(sp.factor(y_high)),
            "r_high": str(r_high),
        },
        "factored_margins": {
            "y_chord_minus_high": str(y_margin),
            "r_chord_minus_high": str(r_margin),
            "after_t_equals_T_over_28": {"y": str(y_T), "r": str(r_T)},
        },
        "comparison_to_n23_box": {
            "old_y_slope": "4347/190",
            "new_y_slope": "546/25",
            "old_r_slope": "1012/157",
            "new_r_slope": "1008/173",
        },
        "scope_warning": (
            "These are coordinate containments only. They do not prove a Delta "
            "tensor, Q8, PGC, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
