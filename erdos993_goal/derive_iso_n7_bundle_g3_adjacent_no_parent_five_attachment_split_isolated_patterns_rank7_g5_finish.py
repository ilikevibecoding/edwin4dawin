#!/usr/bin/env python3
"""Exact isolated-root reductions for split exactly-five attachment cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_PATTERNS_RANK7_G5_FINISH"
DISTRIBUTIONS = {"4+1": (4, 1), "3+2": (3, 2)}


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
    general = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{j}": W[j] for j in range(2, 9)},
        **{f"P{j}": P[j] for j in range(2, 8)},
        **{f"Q{j}": Q[j] for j in range(2, 8)},
    }))
    h = sp.Symbol("h", nonnegative=True, integer=True)
    A = {0: sp.Integer(1), 1: h, **{j: sp.Symbol(f"A{j}", nonnegative=True) for j in range(2, 9)}}
    U = {0: sp.Integer(0), **{j: sp.Symbol(f"U{j}", nonnegative=True) for j in range(1, 8)}}
    V = {0: sp.Integer(0), **{j: sp.Symbol(f"V{j}", nonnegative=True) for j in range(1, 8)}}
    all_patterns = {}
    pattern_count = 0
    for label, (x_count, y_count) in DISTRIBUTIONS.items():
        exact = sp.expand(general.subs({a: x_count, b: y_count}))
        patterns = {}
        for isolated_x in range(x_count+1):
            for isolated_y in range(y_count+1):
                if isolated_x == isolated_y == 0:
                    continue
                isolated_total = isolated_x+isolated_y
                remaining_x = x_count-isolated_x
                remaining_y = y_count-isolated_y
                padded_w = {
                    j: sum(sp.binomial(isolated_total, t)*row(A, j-t) for t in range(isolated_total+1))
                    for j in range(2, 9)
                }
                padded_p = {
                    j: sp.expand(
                        padded_w[j]
                        - sum(sp.binomial(isolated_x, t)*(row(A, j-t)-row(U, j-t)) for t in range(isolated_x+1))
                    )
                    for j in range(2, 8)
                }
                padded_q = {
                    j: sp.expand(
                        padded_w[j]
                        - sum(sp.binomial(isolated_y, t)*(row(A, j-t)-row(V, j-t)) for t in range(isolated_y+1))
                    )
                    for j in range(2, 8)
                }
                substitutions = {
                    m: h+isolated_total,
                    **{W[j]: padded_w[j] for j in range(2, 9)},
                    **{P[j]: padded_p[j] for j in range(2, 8)},
                    **{Q[j]: padded_q[j] for j in range(2, 8)},
                }
                expression = sp.expand(exact.subs(substitutions, simultaneous=True))
                expression = sp.expand(expression.subs({U[1]: remaining_y, V[1]: remaining_x}))
                if remaining_y == 0:
                    expression = sp.expand(expression.subs({U[j]: 0 for j in range(1, 8)}))
                if remaining_x == 0:
                    expression = sp.expand(expression.subs({V[j]: 0 for j in range(1, 8)}))
                key = f"ix{isolated_x}_iy{isolated_y}"
                patterns[key] = {
                    "isolated_X_roots": isolated_x,
                    "isolated_Y_roots": isolated_y,
                    "remaining_nonisolated_X_roots": remaining_x,
                    "remaining_nonisolated_Y_roots": remaining_y,
                    "identity_in_H_rows": str(expression),
                    "free_symbols": [str(symbol) for symbol in sorted(expression.free_symbols, key=str)],
                    "semantics": "H deletes every isolated attachment root; U_j meets surviving Y roots (P side) and V_j meets surviving X roots (Q side).",
                }
                pattern_count += 1
        all_patterns[label] = patterns
    assert pattern_count == 20
    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "patterns": all_patterns,
        "exhaustive_classifier": {
            "4+1_mixed_or_all_isolated_patterns": 9,
            "3+2_mixed_or_all_isolated_patterns": 11,
            "all_nonisolated_patterns_separate": 2,
            "total_patterns_in_report": pattern_count,
        },
        "generating_identity": {
            "W": "W(x)=(1+x)^(ix+iy) A(x)",
            "P": "P(x)=W(x)-(1+x)^ix(A(x)-U(x))",
            "Q": "Q(x)=W(x)-(1+x)^iy(A(x)-V(x))",
        },
        "scope": "Adjacent no-parent G3 with exactly five split attachments and at least one isolated attachment root.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "patterns": pattern_count,
        "by_distribution": {label: len(patterns) for label, patterns in all_patterns.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
