#!/usr/bin/env python3
"""Derive the exact one-unrelated-isolate G3 increment for arbitrary a,b."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_unrelated_isolate_increment_general_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_UNRELATED_ISOLATE_INCREMENT_GENERAL_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    h, m, a, b = sp.symbols("h m a b", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)}}
    R = {0: sp.Integer(0), 1: b, **{k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}}
    S = {0: sp.Integer(0), 1: a, **{k: sp.Symbol(f"S{k}", nonnegative=True) for k in range(2, 8)}}
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    exact = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    base = sp.expand(exact.subs({
        m: h,
        **{W[k]: I[k] for k in W},
        **{P[k]: R[k] for k in P},
        **{Q[k]: S[k] for k in Q},
    }, simultaneous=True))
    padded = sp.expand(exact.subs({
        m: h + 1,
        **{W[k]: I[k] + I[k - 1] for k in W},
        **{P[k]: R[k] + R[k - 1] for k in P},
        **{Q[k]: S[k] + S[k - 1] for k in Q},
    }, simultaneous=True))
    increment = sp.expand(padded - base)
    variables = (h, a, b, *(I[k] for k in range(2, 9)), *(R[k] for k in range(2, 8)), *(S[k] for k in range(2, 8)))
    poly = sp.Poly(increment, *variables)
    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "operation": "Add one isolated vertex that is not an attachment root; a,b and all attachment-root sets remain fixed.",
        "increment": str(increment),
        "term_count": len(poly.terms()),
        "total_degree": poly.total_degree(),
        "independent_of_I8": I[8] not in increment.free_symbols,
        "input_sha256": INPUT_SHA,
        "semantics": {
            "Ik": "Independent k-sets in the unpadded forest H.",
            "Rk": "Independent k-sets in H meeting the b roots on the Y side (P-row).",
            "Sk": "Independent k-sets in H meeting the a roots on the X side (Q-row).",
        },
        "scope": "Exact adjacent no-parent G3 unrelated-isolate increment for arbitrary fixed attachment counts a,b; no sign asserted.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "term_count": report["term_count"],
        "total_degree": report["total_degree"],
        "independent_of_I8": report["independent_of_I8"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
