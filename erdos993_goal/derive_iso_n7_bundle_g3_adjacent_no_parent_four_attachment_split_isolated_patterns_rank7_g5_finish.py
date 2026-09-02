#!/usr/bin/env python3
"""Exact isolated-root reductions for split 3+1 and 2+2 four attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_ISOLATED_PATTERNS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row(rows, index):
    return rows.get(index, sp.Integer(0))


def isolated_patterns(upstream, a_value: int, b_value: int):
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {0: sp.Integer(1), 1: m, **{j: sp.Symbol(f"W{j}", nonnegative=True) for j in range(2, 9)}}
    P = {0: sp.Integer(0), 1: b, **{j: sp.Symbol(f"P{j}", nonnegative=True) for j in range(2, 8)}}
    Q = {0: sp.Integer(0), 1: a, **{j: sp.Symbol(f"Q{j}", nonnegative=True) for j in range(2, 8)}}
    exact = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{j}": W[j] for j in range(2, 9)},
        **{f"P{j}": P[j] for j in range(2, 8)},
        **{f"Q{j}": Q[j] for j in range(2, 8)},
    }).subs({a: a_value, b: b_value}))

    h = sp.Symbol("h", nonnegative=True, integer=True)
    A = {0: sp.Integer(1), 1: h, **{j: sp.Symbol(f"A{j}", nonnegative=True) for j in range(2, 9)}}
    R = {0: sp.Integer(0), **{j: sp.Symbol(f"R{j}", nonnegative=True) for j in range(1, 8)}}
    U = {0: sp.Integer(0), **{j: sp.Symbol(f"U{j}", nonnegative=True) for j in range(1, 8)}}
    patterns = {}
    expressions = {}
    for p_isolated in range(b_value+1):
        for q_isolated in range(a_value+1):
            if p_isolated == 0 and q_isolated == 0:
                continue
            isolated = p_isolated+q_isolated
            substitutions = {m: h+isolated}
            substitutions.update({
                W[j]: sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(isolated+1))
                for j in range(2, 9)
            })
            # P meets the b-side root union.  Avoiding that union forbids all
            # p_isolated isolated P roots and the remaining P roots in H, but
            # permits every isolated Q root.
            substitutions.update({
                P[j]:
                    sum(sp.binomial(q_isolated, t)*row(R, j-t) for t in range(q_isolated+1))
                    + sum(
                        sp.binomial(q_isolated, t)*sp.binomial(p_isolated, s)*row(A, j-t-s)
                        for t in range(q_isolated+1) for s in range(1, p_isolated+1)
                    )
                for j in range(2, 8)
            })
            # The symmetric formula for Q meeting the a-side root union.
            substitutions.update({
                Q[j]:
                    sum(sp.binomial(p_isolated, t)*row(U, j-t) for t in range(p_isolated+1))
                    + sum(
                        sp.binomial(p_isolated, t)*sp.binomial(q_isolated, s)*row(A, j-t-s)
                        for t in range(p_isolated+1) for s in range(1, q_isolated+1)
                    )
                for j in range(2, 8)
            })
            expression = sp.expand(exact.subs(substitutions, simultaneous=True))
            remaining_p, remaining_q = b_value-p_isolated, a_value-q_isolated
            if remaining_p == 0:
                expression = sp.expand(expression.subs({R[j]: 0 for j in range(1, 8)}))
            else:
                expression = sp.expand(expression.subs(R[1], remaining_p))
            if remaining_q == 0:
                expression = sp.expand(expression.subs({U[j]: 0 for j in range(1, 8)}))
            else:
                expression = sp.expand(expression.subs(U[1], remaining_q))
            key = f"p{p_isolated}_q{q_isolated}"
            expressions[key] = expression
            patterns[key] = {
                "P_roots_isolated": p_isolated,
                "Q_roots_isolated": q_isolated,
                "remaining_P_roots": remaining_p,
                "remaining_Q_roots": remaining_q,
                "identity_in_H_rows": str(expression),
                "free_symbols": [str(symbol) for symbol in sorted(expression.free_symbols, key=str)],
                "semantics": "H deletes every isolated attachment root; R meets the remaining P-side root union and U meets the remaining Q-side root union.",
            }
    return patterns, expressions, R, U


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    split31, _expr31, _R31, _U31 = isolated_patterns(upstream, 3, 1)
    split22, expr22, R22, U22 = isolated_patterns(upstream, 2, 2)

    # For 2+2, swapping the marked sides exchanges p and q.  Verify the three
    # nontrivial paired identities exactly, leaving five symmetry classes.
    symmetry_pairs = (("p0_q1", "p1_q0"), ("p0_q2", "p2_q0"), ("p1_q2", "p2_q1"))
    swap = {**{R22[j]: U22[j] for j in range(1, 8)}, **{U22[j]: R22[j] for j in range(1, 8)}}
    for left, right in symmetry_pairs:
        assert sp.expand(expr22[left].subs(swap, simultaneous=True)-expr22[right]) == 0

    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "split_mark_3plus1": split31,
        "split_mark_2plus2": split22,
        "exhaustive_isolated_pattern_classifier": {
            "split31_patterns": 7,
            "split22_raw_patterns": 8,
            "split22_symmetry_classes": 5,
            "split22_symmetry_pairs": [list(pair) for pair in symmetry_pairs],
            "all_nonisolated_patterns_separate": True,
        },
        "scope": "Adjacent no-parent G3 with exactly four split attachments and at least one isolated attachment root.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "split31_patterns": len(split31),
        "split22_raw_patterns": len(split22),
        "split22_symmetry_classes": 5,
        "split31_terms": {key: len(sp.Poly(sp.sympify(value["identity_in_H_rows"]), *sorted(sp.sympify(value["identity_in_H_rows"]).free_symbols, key=str)).terms()) for key, value in split31.items()},
        "split22_terms": {key: len(sp.Poly(sp.sympify(value["identity_in_H_rows"]), *sorted(sp.sympify(value["identity_in_H_rows"]).free_symbols, key=str)).terms()) for key, value in split22.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
