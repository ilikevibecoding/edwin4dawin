#!/usr/bin/env python3
"""Exact isolated-root reductions for the 3+0 and 2+1 attachment cells."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_ISOLATED_PATTERNS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row(rows, index):
    return rows.get(index, sp.Integer(0))


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m, **{j: sp.Symbol(f"W{j}", nonnegative=True) for j in range(2, 9)}}
    P = {0: sp.Integer(0), 1: sp.Integer(1), **{j: sp.Symbol(f"P{j}", nonnegative=True) for j in range(2, 8)}}
    Qsame = {0: sp.Integer(0), 1: sp.Integer(3), **{j: sp.Symbol(f"Q{j}", nonnegative=True) for j in range(2, 8)}}
    Qsplit = {0: sp.Integer(0), 1: sp.Integer(2), **{j: sp.Symbol(f"Q{j}", nonnegative=True) for j in range(2, 8)}}
    locals_same = {"m": m, **{f"W{j}": W[j] for j in range(2, 9)}, **{f"Q{j}": Qsame[j] for j in range(2, 8)}}
    locals_split = {"m": m, **{f"W{j}": W[j] for j in range(2, 9)}, **{f"P{j}": P[j] for j in range(2, 8)}, **{f"Q{j}": Qsplit[j] for j in range(2, 8)}}
    same_exact = sp.expand(sp.sympify(upstream["same_mark_3plus0"]["identity"], locals=locals_same))
    split_exact = sp.expand(sp.sympify(upstream["split_mark_2plus1"]["identity"], locals=locals_split))

    h = sp.Symbol("h", nonnegative=True, integer=True)
    A = {0: sp.Integer(1), 1: h, **{j: sp.Symbol(f"A{j}", nonnegative=True) for j in range(2, 9)}}
    U = {0: sp.Integer(0), **{j: sp.Symbol(f"U{j}", nonnegative=True) for j in range(1, 8)}}
    R = {0: sp.Integer(0), **{j: sp.Symbol(f"R{j}", nonnegative=True) for j in range(1, 8)}}

    same_patterns = {}
    for isolated in (1, 2, 3):
        remaining = 3-isolated
        substitutions = {m: h+isolated}
        substitutions.update({W[j]: sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(isolated+1)) for j in range(2, 9)})
        substitutions.update({Qsame[j]: row(U, j)+sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(1, isolated+1)) for j in range(2, 8)})
        expression = sp.expand(same_exact.subs(substitutions, simultaneous=True))
        if remaining == 0:
            expression = sp.expand(expression.subs({U[j]: 0 for j in range(1, 8)}))
        else:
            expression = sp.expand(expression.subs(U[1], remaining))
        same_patterns[str(isolated)] = {
            "isolated_roots": isolated,
            "remaining_nonisolated_roots": remaining,
            "identity_in_H_rows": str(expression),
            "free_symbols": [str(symbol) for symbol in sorted(expression.free_symbols, key=str)],
            "semantics": "H is obtained by deleting the isolated attachment roots; U_j counts H-independent j-sets meeting the remaining same-mark roots.",
        }

    split_patterns = {}
    for p_isolated in (0, 1):
        for q_isolated in (0, 1, 2):
            if p_isolated == 0 and q_isolated == 0:
                continue
            isolated = p_isolated+q_isolated
            substitutions = {m: h+isolated}
            substitutions.update({W[j]: sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(isolated+1)) for j in range(2, 9)})
            if p_isolated:
                substitutions.update({P[j]: sum(sp.binomial(q_isolated, t)*row(A, j-1-t) for t in range(q_isolated+1)) for j in range(2, 8)})
            else:
                substitutions.update({P[j]: sum(sp.binomial(q_isolated, t)*row(R, j-t) for t in range(q_isolated+1)) for j in range(2, 8)})
            # Avoiding both Q roots forbids every isolated Q root, but the
            # isolated P root may still be chosen.  The H-row avoiding the
            # remaining Q roots is A-U.
            substitutions.update({
                Qsplit[j]: sum(sp.binomial(isolated, t)*row(A, j-t) for t in range(isolated+1))
                - sum(sp.binomial(p_isolated, t)*(row(A, j-t)-row(U, j-t)) for t in range(p_isolated+1))
                for j in range(2, 8)
            })
            expression = sp.expand(split_exact.subs(substitutions, simultaneous=True))
            if p_isolated:
                expression = sp.expand(expression.subs({R[j]: 0 for j in range(1, 8)}))
            else:
                expression = sp.expand(expression.subs(R[1], 1))
            if q_isolated == 2:
                expression = sp.expand(expression.subs({U[j]: 0 for j in range(1, 8)}))
            else:
                expression = sp.expand(expression.subs(U[1], 2-q_isolated))
            key = f"p{p_isolated}_q{q_isolated}"
            split_patterns[key] = {
                "P_root_isolated": bool(p_isolated),
                "Q_roots_isolated": q_isolated,
                "identity_in_H_rows": str(expression),
                "free_symbols": [str(symbol) for symbol in sorted(expression.free_symbols, key=str)],
                "semantics": "H deletes every isolated attachment root; R meets the remaining P root and U meets the remaining Q-root union.",
            }

    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "same_mark_3plus0": same_patterns,
        "split_mark_2plus1": split_patterns,
        "exhaustive_isolated_pattern_classifier": {"same_mark_patterns": 3, "split_mark_patterns": 5, "all_nonisolated_pattern_separate": True},
        "scope": "Adjacent no-parent G3 with exactly three attachments and at least one isolated attachment root.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "same_mark_patterns": len(same_patterns), "split_mark_patterns": len(split_patterns), "same_terms": {key: len(sp.Poly(sp.sympify(value["identity_in_H_rows"]), *sorted(sp.sympify(value["identity_in_H_rows"]).free_symbols, key=str)).terms()) for key, value in same_patterns.items()}, "split_terms": {key: len(sp.Poly(sp.sympify(value["identity_in_H_rows"]), *sorted(sp.sympify(value["identity_in_H_rows"]).free_symbols, key=str)).terms()) for key, value in split_patterns.items()}}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
