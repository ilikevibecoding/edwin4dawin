#!/usr/bin/env python3
"""Exact relaxed-cone probe of pendant-path endpoint domination.

For an arbitrary rooted attachment component, write E for the contribution
with the attachment vertex excluded and J=x*K for the contribution with it
included.  This script substitutes the exact path-transfer formulas into the
rank-eight residual Delta_0..Delta_3 and checks whether each internal root is
coefficientwise dominated by either endpoint on the nonnegative E,J cone.

Mixed coefficients are an obstruction only to this strong relaxed-cone
shortcut; they are not a negative tree witness and receive no theorem credit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_pendant_path_endpoint_symbolic_probe_agent_20260825.json"
E = sp.symbols("e0:9", nonnegative=True)
J = sp.symbols("j0:9", nonnegative=True)
GENERATORS = (*E[1:], *J[2:])
STRUCTURAL = {E[0]: sp.Integer(1), J[0]: sp.Integer(0), J[1]: sp.Integer(1)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[sp.Expr], right: list[sp.Expr]) -> list[sp.Expr]:
    return [a + b for a, b in zip(left, right)]


def multiply(left: list[sp.Expr], right: list[sp.Expr]) -> list[sp.Expr]:
    out = [sp.Integer(0)] * 9
    for i, a in enumerate(left):
        for j, b in enumerate(right[: 9 - i]):
            out[i + j] += a * b
    return out


def path(order: int) -> list[sp.Integer]:
    assert order >= 0
    return [
        sp.Integer(math.comb(order - rank + 1, rank))
        if order - rank + 1 >= rank >= 0
        else sp.Integer(0)
        for rank in range(9)
    ]


def attached_prefix(edge_vertices: int) -> list[sp.Expr]:
    """I(component plus edge_vertices path vertices at its root)."""
    assert edge_vertices >= 0
    excluded = multiply(list(E), path(edge_vertices))
    included = multiply(list(J), path(max(edge_vertices - 1, 0)))
    return add(excluded, included)


def smooth(core: list[sp.Expr], rank: int, siblings: int) -> sp.Expr:
    return sum(
        math.comb(siblings, shift) * core[rank - shift]
        for shift in range(min(rank, siblings) + 1)
    )


def residual(core: list[sp.Expr], deleted: list[sp.Expr], siblings: int) -> sp.Expr:
    p7 = smooth(core, 7, siblings) + deleted[6]
    p8 = smooth(core, 8, siblings) + deleted[7]
    p9_open = sum(
        math.comb(siblings, shift) * core[9 - shift]
        for shift in range(1, min(9, siblings) + 1)
    )
    return (
        8 * core[7] * deleted[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * deleted[6] * p7 * (16 * core[8] * core[8] - core[7] * core[8])
        - 9 * core[7] * p7 * (14 * deleted[7] * deleted[7] - deleted[6] * deleted[7])
    )


def deltas(core: list[sp.Expr], deleted: list[sp.Expr]) -> list[sp.Expr]:
    values = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    out = [values[0]]
    for _ in range(3):
        values = [right - left for left, right in zip(values, values[1:])]
        out.append(values[0])
    return out


def record(expression: sp.Expr) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression.subs(STRUCTURAL)), *GENERATORS)
    terms = polynomial.terms()
    serial = json.dumps(
        [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
        separators=(",", ":"),
    ).encode()
    negatives = [(monomial, coefficient) for monomial, coefficient in terms if coefficient < 0]
    return {
        "terms": len(terms),
        "negative": len(negatives),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "zero": sum(1 for _, coefficient in terms if coefficient == 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
        "first_negative": (
            {"monomial": list(negatives[0][0]), "coefficient": str(negatives[0][1])}
            if negatives
            else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-length", type=int, default=12)
    args = parser.parse_args()
    assert 2 <= args.max_length <= 40

    rows = []
    pass_counts = {"branch_endpoint": [0] * 4, "leaf_endpoint": [0] * 4, "either_endpoint": [0] * 4}
    total_cells = [0] * 4
    for length in range(2, args.max_length + 1):
        core = attached_prefix(length)
        branch_deleted = multiply(list(E), path(length))
        leaf_deleted = attached_prefix(length - 1)
        branch_delta = deltas(core, branch_deleted)
        leaf_delta = deltas(core, leaf_deleted)
        for position in range(1, length):
            internal_deleted = multiply(
                attached_prefix(position - 1), path(length - position)
            )
            internal_delta = deltas(core, internal_deleted)
            comparisons = []
            for rank in range(4):
                branch = record(internal_delta[rank] - branch_delta[rank])
                leaf = record(internal_delta[rank] - leaf_delta[rank])
                branch_pass = branch["negative"] == 0
                leaf_pass = leaf["negative"] == 0
                pass_counts["branch_endpoint"][rank] += int(branch_pass)
                pass_counts["leaf_endpoint"][rank] += int(leaf_pass)
                pass_counts["either_endpoint"][rank] += int(branch_pass or leaf_pass)
                total_cells[rank] += 1
                comparisons.append({
                    "rank": rank,
                    "branch_endpoint_difference": branch,
                    "leaf_endpoint_difference": leaf,
                    "coefficientwise_dominated_by_either_endpoint": branch_pass or leaf_pass,
                })
            rows.append({"length": length, "internal_position": position, "comparisons": comparisons})

    payload = {
        "schema": "rank8-delta03-pendant-path-endpoint-symbolic-probe-agent-v1",
        "status": "PROBE_ONLY",
        "path_lengths": [2, args.max_length],
        "internal_root_cells": len(rows),
        "generators": [str(value) for value in GENERATORS],
        "structural_substitutions": {"e0": 1, "j0": 0, "j1": 1},
        "pass_counts_by_delta": pass_counts,
        "total_cells_by_delta": total_cells,
        "all_cells_coefficientwise_dominated_by_either_endpoint": [
            pass_counts["either_endpoint"][rank] == total_cells[rank]
            for rank in range(4)
        ],
        "rows": rows,
        "scope_guard": (
            "Exact relaxed nonnegative E,J cone for the listed finite path lengths only. "
            "A coefficientwise PASS is a valid strong-cone identity on those lengths; "
            "mixed coefficients are only a method obstruction. No all-length, five-cubic-"
            "path, orbit, connected-Q8, or Problem-993 credit is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("PASS_COUNTS", json.dumps(pass_counts, sort_keys=True))
    print("TOTAL", total_cells)
    print("ALL", payload["all_cells_coefficientwise_dominated_by_either_endpoint"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
