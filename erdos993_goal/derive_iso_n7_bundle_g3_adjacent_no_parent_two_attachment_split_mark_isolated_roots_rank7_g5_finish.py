#!/usr/bin/env python3
"""Exact split-mark two-attachment reductions by isolated-root pattern."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_isolated_roots_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_ISOLATED_ROOTS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    split = json.loads(INPUT.read_text(encoding="utf-8"))["split_mark"]
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({j: sp.Symbol(f"W{j}", nonnegative=True) for j in range(2, 9)})
    Rx = {0: sp.Integer(0), 1: sp.Integer(1)}
    Ry = {0: sp.Integer(0), 1: sp.Integer(1)}
    Rx.update({j: sp.Symbol(f"Rx{j}", nonnegative=True) for j in range(2, 8)})
    Ry.update({j: sp.Symbol(f"Ry{j}", nonnegative=True) for j in range(2, 8)})
    exact = sp.expand(sp.sympify(split["identity"], locals={"m": m, **{f"W{j}": W[j] for j in range(2, 9)}, **{f"Rx{j}": Rx[j] for j in range(2, 8)}, **{f"Ry{j}": Ry[j] for j in range(2, 8)}}))

    q = sp.Symbol("q", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: q}
    I.update({j: sp.Symbol(f"I{j}", nonnegative=True) for j in range(2, 9)})
    both_sub = {m: q+2}
    both_sub.update({W[j]: I.get(j, 0)+2*I.get(j-1, 0)+I.get(j-2, 0) for j in range(2, 9)})
    both_sub.update({Rx[j]: I.get(j-1, 0)+I.get(j-2, 0) for j in range(2, 8)})
    both_sub.update({Ry[j]: I.get(j-1, 0)+I.get(j-2, 0) for j in range(2, 8)})
    both = sp.expand(exact.subs(both_sub, simultaneous=True))

    h = sp.Symbol("h", positive=True, integer=True)
    A = {0: sp.Integer(1), 1: h}
    A.update({j: sp.Symbol(f"A{j}", nonnegative=True) for j in range(2, 9)})
    R = {0: sp.Integer(0), 1: sp.Integer(1)}
    R.update({j: sp.Symbol(f"R{j}", nonnegative=True) for j in range(2, 8)})
    one_sub = {m: h+1}
    one_sub.update({W[j]: A.get(j, 0)+A.get(j-1, 0) for j in range(2, 9)})
    one_sub.update({Rx[j]: A.get(j-1, 0) for j in range(2, 8)})
    one_sub.update({Ry[j]: R.get(j, 0)+R.get(j-1, 0) for j in range(2, 8)})
    one = sp.expand(exact.subs(one_sub, simultaneous=True))
    base = sp.expand(one.subs({R[j]: 0 for j in range(2, 8)}))
    coefficients = {j: sp.factor(sp.diff(one, R[j])) for j in range(2, 8)}
    assert sp.expand(one-base-sum(coefficients[j]*R[j] for j in range(2, 8))) == 0

    report = {
        "marker": MARKER,
        "status": "exact algebra; no sign theorem asserted",
        "both_roots_isolated": {"identity_in_K_rows": str(both), "semantics": "K=W-{x,y}; W_j=I_j+2I_(j-1)+I_(j-2), Rx_j=Ry_j=I_(j-1)+I_(j-2)."},
        "exactly_one_root_isolated": {"identity_in_H_rooted_rows": str(one), "R_zero_base": str(base), "R_coefficients": {str(j): str(coefficients[j]) for j in coefficients}, "linear_in_R_rows": True, "semantics": "H=W-x contains nonisolated y; W_j=A_j+A_(j-1), Rx_j=A_(j-1), Ry_j=R_j+R_(j-1)."},
        "scope": "Adjacent no-parent split-mark exactly-two-attachment G3, isolated-root subcases only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "both_isolated_terms": len(sp.Poly(both, *sorted(both.free_symbols, key=str)).terms()), "one_isolated_terms": len(sp.Poly(one, *sorted(one.free_symbols, key=str)).terms()), "one_isolated_root_coefficients": report["exactly_one_root_isolated"]["R_coefficients"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
