#!/usr/bin/env python3
"""Exact one-new-attachment increment for adjacent no-parent rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_attachment_increment_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ATTACHMENT_INCREMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}", nonnegative=True) for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}
    R = {k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    increment = sp.expand(exact.subs({a: a+1, **{Q[k]: Q[k]+R[k] for k in Q}}, simultaneous=True)-exact)
    assert a not in increment.free_symbols
    assert not any(symbol in increment.free_symbols for symbol in Q.values())
    zero_opposite = sp.expand(increment.subs({b: 0, **{P[k]: 0 for k in P}}))
    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "increment_identity": str(increment),
        "same_mark_increment_b0": str(zero_opposite),
        "term_count": len(sp.Poly(increment, *sorted(increment.free_symbols, key=str)).terms()),
        "independent_of_prior_same_side_attachment_count": True,
        "semantics": {
            "operation": "Add a new attachment root x to X, so a increases by one.",
            "Pj": "Independent j-sets meeting the unchanged opposite-side root set Y.",
            "Rj": "Q_new_j-Q_old_j: independent j-sets containing x and avoiding every prior X root.",
            "b": "Number of unchanged opposite-side attachment roots.",
            "structural": "The new root x lies in a W-component distinct from every prior attachment root component.",
        },
        "scope": "Exact adjacent no-parent G3 attachment increment only; no sign asserted.",
        "input_sha256": INPUT_SHA,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "terms": report["term_count"], "independent_of_prior_same_side_attachment_count": True}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
