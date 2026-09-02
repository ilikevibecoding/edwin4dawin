#!/usr/bin/env python3
"""Exact falsification search for the rank-six g2 category box on double-stars.

For the double-star with adjacent centers L,R and a,b pendant leaves, the four
marked-set category rows are evaluated directly from the center states and
binomial leaf choices.  This avoids graph enumeration and permits a broad
all-integer search.  The independent D-category box remains a relaxation, so
even a positive search is diagnostic only; a negative row would disprove that
relaxation route but would not be a genuine induced-D counterexample.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_double_star_box_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_DOUBLE_STAR_BOX_ROOT"

# A role is L/R for a center and l/r for a leaf on that side.
ROLE_PAIRS = (
    ("L", "R", "centers"),
    ("L", "l", "center_own_leaf"),
    ("L", "r", "center_opposite_leaf"),
    ("l", "l", "two_leaves_same_side"),
    ("l", "r", "two_leaves_opposite_sides"),
)


def category_counts(a: int, b: int, role_u: str, role_v: str) -> dict[str, int]:
    """Return exact W/A/B/Z ranks 2..7 for a marked double-star."""
    assert a >= (role_u == "l") + (role_v == "l")
    assert b >= (role_u == "r") + (role_v == "r")
    assert role_u != role_v or role_u in "lr"
    marked_left_leaves = (role_u == "l") + (role_v == "l")
    marked_right_leaves = (role_u == "r") + (role_v == "r")
    rows = {(0, 0): [0] * 8, (0, 1): [0] * 8,
            (1, 0): [0] * 8, (1, 1): [0] * 8}
    for left_center in (0, 1):
        for right_center in (0, 1):
            if left_center and right_center:
                continue
            for u_leaf in ((0, 1) if role_u in "lr" else (None,)):
                for v_leaf in ((0, 1) if role_v in "lr" else (None,)):
                    if role_u == "l" and left_center and u_leaf:
                        continue
                    if role_u == "r" and right_center and u_leaf:
                        continue
                    if role_v == "l" and left_center and v_leaf:
                        continue
                    if role_v == "r" and right_center and v_leaf:
                        continue
                    include_u = (left_center if role_u == "L" else
                                 right_center if role_u == "R" else u_leaf)
                    include_v = (left_center if role_v == "L" else
                                 right_center if role_v == "R" else v_leaf)
                    selected = left_center + right_center
                    selected += int(u_leaf or 0) + int(v_leaf or 0)
                    free = 0
                    if not left_center:
                        free += a - marked_left_leaves
                    if not right_center:
                        free += b - marked_right_leaves
                    row = rows[(int(include_u), int(include_v))]
                    for rank in range(selected, 8):
                        row[rank] += comb(free, rank - selected)
    result = {"n": a + b + 2}
    families = {(0, 0): "CW", (0, 1): "CA",
                (1, 0): "CB", (1, 1): "CZ"}
    for state, family in families.items():
        for rank in range(2, 8):
            result[f"{family}{rank}"] = rows[state][rank]
    return result


def evaluator():
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(
        reconstruct().subs(structural).subs(cpartition).subs(dpartition)
    )
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    base = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    derivatives = tuple(sp.expand(sp.diff(expression, symbol)) for symbol in dvars)
    cvars = tuple(sorted(expression.free_symbols - set(dvars), key=str))
    names = tuple(map(str, cvars))
    base_fn = sp.lambdify(cvars, base, "math")
    derivative_fns = tuple(sp.lambdify(cvars, value, "math") for value in derivatives)

    def evaluate(values: dict[str, int]):
        arguments = tuple(values[name] for name in names)
        value = int(base_fn(*arguments))
        negative_labels = []
        for dvar, fn in zip(dvars, derivative_fns):
            coefficient = int(fn(*arguments))
            if coefficient < 0:
                value += coefficient * values["C" + str(dvar)[1:]]
                negative_labels.append(str(dvar))
        return value, tuple(negative_labels)

    return evaluate


def main() -> None:
    evaluate = evaluator()
    # Exhaust every arm pair in a large triangular region, including extremely
    # unbalanced brooms where independent row relaxations commonly fail.
    maximum_order = 600
    cells = negatives = 0
    minimum = None
    witness = None
    patterns: dict[tuple[str, tuple[str, ...]], int] = {}
    stream = hashlib.sha256()
    for order in range(4, maximum_order + 1):
        for a in range(order - 1):
            b = order - 2 - a
            if b < 0:
                continue
            for role_u, role_v, orbit in ROLE_PAIRS:
                if a < (role_u == "l") + (role_v == "l"):
                    continue
                if b < (role_u == "r") + (role_v == "r"):
                    continue
                values = category_counts(a, b, role_u, role_v)
                value, pattern = evaluate(values)
                cells += 1
                negatives += int(value < 0)
                patterns[(orbit, pattern)] = patterns.get((orbit, pattern), 0) + 1
                stream.update(f"{order}|{a}|{b}|{orbit}|{value}|{','.join(pattern)};".encode())
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "value": value, "order": order, "left_arms": a,
                        "right_arms": b, "mark_orbit": orbit,
                        "roles": [role_u, role_v],
                        "negative_D_derivatives": list(pattern),
                    }
                if value < 0:
                    break
            if negatives:
                break
        if negatives:
            break
    report = {
        "marker": MARKER,
        "orders": [4, maximum_order],
        "planned_scope": "all integer arm pairs and five marked orbits",
        "completed_cells": cells,
        "negative_count": negatives,
        "minimum": minimum,
        "witness": witness,
        "sign_patterns": [
            {"mark_orbit": orbit, "negative_D_derivatives": list(pattern), "count": count}
            for (orbit, pattern), count in sorted(patterns.items())
        ],
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic independent containment-box search; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "completed_cells": cells,
        "negative_count": negatives, "minimum": minimum, "witness": witness,
        "sign_pattern_count": len(patterns),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
