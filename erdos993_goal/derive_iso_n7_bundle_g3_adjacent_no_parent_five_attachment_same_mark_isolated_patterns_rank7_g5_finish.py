#!/usr/bin/env python3
"""Exact isolated-root reductions for the same-mark 5+0 attachment cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_ISOLATED_PATTERNS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row(rows, index):
    return rows.get(index, sp.Integer(0))


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {0: sp.Integer(1), 1: m, **{j: sp.Symbol(f"W{j}", nonnegative=True) for j in range(2, 9)}}
    P = {0: sp.Integer(0), 1: b, **{j: sp.Symbol(f"P{j}", nonnegative=True) for j in range(2, 8)}}
    Q = {0: sp.Integer(0), 1: a, **{j: sp.Symbol(f"Q{j}", nonnegative=True) for j in range(2, 8)}}
    exact = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{j}": W[j] for j in range(2, 9)},
        **{f"P{j}": P[j] for j in range(2, 8)},
        **{f"Q{j}": Q[j] for j in range(2, 8)},
    }).subs({a: 5, b: 0, **{P[j]: 0 for j in range(2, 8)}}))

    h = sp.Symbol("h", nonnegative=True, integer=True)
    A = {0: sp.Integer(1), 1: h, **{j: sp.Symbol(f"A{j}", nonnegative=True) for j in range(2, 9)}}
    U = {0: sp.Integer(0), **{j: sp.Symbol(f"U{j}", nonnegative=True) for j in range(1, 8)}}
    patterns = {}
    for isolated in range(1, 6):
        remaining = 5-isolated
        substitutions = {m: h+isolated}
        substitutions.update({
            W[j]: sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(isolated+1))
            for j in range(2, 9)
        })
        substitutions.update({
            Q[j]: row(U, j)+sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(1, isolated+1))
            for j in range(2, 8)
        })
        expression = sp.expand(exact.subs(substitutions, simultaneous=True))
        if remaining == 0:
            expression = sp.expand(expression.subs({U[j]: 0 for j in range(1, 8)}))
        else:
            expression = sp.expand(expression.subs(U[1], remaining))
        patterns[str(isolated)] = {
            "isolated_roots": isolated,
            "remaining_nonisolated_roots": remaining,
            "identity_in_H_rows": str(expression),
            "free_symbols": [str(symbol) for symbol in sorted(expression.free_symbols, key=str)],
            "semantics": "H is obtained by deleting the isolated attachment roots; U_j counts H-independent j-sets meeting the remaining same-mark roots.",
        }
    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "same_mark_5plus0": patterns,
        "exhaustive_isolated_pattern_classifier": {
            "same_mark_patterns": 5,
            "all_nonisolated_pattern_separate": True,
        },
        "scope": "Adjacent no-parent G3 with exactly five same-mark attachments and at least one isolated attachment root.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "patterns": len(patterns),
        "terms": {
            key: len(sp.Poly(sp.sympify(value["identity_in_H_rows"]), *sorted(sp.sympify(value["identity_in_H_rows"]).free_symbols, key=str)).terms())
            for key, value in patterns.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
