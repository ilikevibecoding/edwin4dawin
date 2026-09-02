#!/usr/bin/env python3
"""Exact one-attachment rooted reduction for adjacent no-parent rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "01DA8DA65E252C5BFA46D17021775EE0A168526A6CF164A325D2B84C01005F74"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_ROOT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reduced():
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)})
    S = {k: sp.Symbol(f"S{k}", nonnegative=True) for k in range(1, 8)}
    T = {k: sp.Symbol(f"T{k}", nonnegative=True) for k in range(1, 8)}
    R = {0: sp.Integer(0), 1: sp.Integer(1)}
    R.update({k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)})
    locals_ = {"m": m, **{f"W{k}": W[k] for k in range(2, 9)}, **{f"S{k}": S[k] for k in S}, **{f"T{k}": T[k] for k in T}}
    exact0 = sp.expand(sp.sympify(report["theorem_input_identity"], locals=locals_))
    exact = sp.expand(exact0.subs({
        **{S[k]: W[k] for k in S},
        **{T[k]: W[k]-R[k] for k in T},
    }, simultaneous=True))
    base = sp.expand(exact.subs({R[k]: 0 for k in range(2, 8)}))
    coefficients = {k: sp.factor(sp.diff(exact, R[k])) for k in range(2, 8)}
    assert sp.expand(exact-base-sum(coefficients[k]*R[k] for k in range(2, 8))) == 0
    return m, W, R, exact, base, coefficients


def main() -> None:
    m, W, R, exact, base, coefficients = reduced()
    report = {
        "marker": MARKER, "status": "exact algebra; no sign theorem asserted",
        "theorem_input_identity": str(exact), "R_zero_base": str(base),
        "R_coefficients": {str(k): str(coefficients[k]) for k in coefficients},
        "row_semantics": (
            "By mark symmetry take X={x},Y=empty. Then S_j=W_j, "
            "T_j=W_j-R_j, and R_j counts independent j-sets of W containing x."
        ),
        "linearity_in_root_rows": True,
        "scope": "Adjacent no-parent G3 with exactly one mark-to-W attachment.",
        "input_sha256": INPUT_SHA256, "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "terms": len(sp.Poly(exact, *sorted(exact.free_symbols, key=str)).terms()),
        "R_coefficients": report["R_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
