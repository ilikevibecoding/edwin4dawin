#!/usr/bin/env python3
"""Exact same-mark and split-mark two-attachment reductions for adjacent no-parent G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "01DA8DA65E252C5BFA46D17021775EE0A168526A6CF164A325D2B84C01005F74"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_ROOTS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    assert upstream["forest_compatibility_classifier"]["exhaustive"] is True

    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({j: sp.Symbol(f"W{j}", nonnegative=True) for j in range(2, 9)})
    S = {j: sp.Symbol(f"S{j}", nonnegative=True) for j in range(1, 8)}
    T = {j: sp.Symbol(f"T{j}", nonnegative=True) for j in range(1, 8)}
    locals_ = {
        "m": m,
        **{f"W{j}": W[j] for j in range(2, 9)},
        **{f"S{j}": S[j] for j in S},
        **{f"T{j}": T[j] for j in T},
    }
    master = sp.expand(sp.sympify(upstream["theorem_input_identity"], locals=locals_))

    # Same-mark: X={x,y}, Y=empty.  Q_j counts independent j-sets
    # meeting {x,y}; inclusion-exclusion gives Q=Rx+Ry-Rxy and T=W-Q.
    Q = {1: sp.Integer(2)}
    Q.update({j: sp.Symbol(f"Q{j}", nonnegative=True) for j in range(2, 8)})
    same = sp.expand(master.subs({
        **{S[j]: W[j] for j in S},
        **{T[j]: W[j]-Q[j] for j in T},
    }, simultaneous=True))
    same_base = sp.expand(same.subs({Q[j]: 0 for j in range(2, 8)}))
    same_coefficients = {j: sp.factor(sp.diff(same, Q[j])) for j in range(2, 8)}
    assert sp.expand(same-same_base-sum(same_coefficients[j]*Q[j] for j in range(2, 8))) == 0

    # Split-mark: X={x}, Y={y}.  Rx/Ry count independent sets containing
    # the named root.  The roots lie in distinct W-components by the classifier.
    Rx = {1: sp.Integer(1)}
    Ry = {1: sp.Integer(1)}
    Rx.update({j: sp.Symbol(f"Rx{j}", nonnegative=True) for j in range(2, 8)})
    Ry.update({j: sp.Symbol(f"Ry{j}", nonnegative=True) for j in range(2, 8)})
    split = sp.expand(master.subs({
        **{S[j]: W[j]-Ry[j] for j in S},
        **{T[j]: W[j]-Rx[j] for j in T},
    }, simultaneous=True))
    zero_sub = {Rx[j]: 0 for j in range(2, 8)} | {Ry[j]: 0 for j in range(2, 8)}
    split_base = sp.expand(split.subs(zero_sub))
    split_bilinear = {
        f"Rx{i}_Ry{j}": str(sp.factor(sp.diff(split, Rx[i], Ry[j])))
        for i in range(2, 8) for j in range(2, 8)
        if sp.diff(split, Rx[i], Ry[j]) != 0
    }
    assert all(sp.diff(split, Rx[i], Rx[j]) == 0 for i in range(2, 8) for j in range(2, 8))
    assert all(sp.diff(split, Ry[i], Ry[j]) == 0 for i in range(2, 8) for j in range(2, 8))
    split_rx_linear = {
        j: sp.factor(sp.diff(split, Rx[j]).subs({Ry[k]: 0 for k in range(2, 8)}))
        for j in range(2, 8)
    }
    split_ry_linear = {
        j: sp.factor(sp.diff(split, Ry[j]).subs({Rx[k]: 0 for k in range(2, 8)}))
        for j in range(2, 8)
    }
    reconstructed = split_base
    reconstructed += sum(split_rx_linear[j]*Rx[j] + split_ry_linear[j]*Ry[j] for j in range(2, 8))
    reconstructed += sum(sp.Integer(value)*Rx[int(name.split("_")[0][2:])]*Ry[int(name.split("_")[1][2:])] for name, value in split_bilinear.items())
    assert sp.expand(split-reconstructed) == 0

    output = {
        "marker": MARKER,
        "status": "exact algebra and exhaustive two-case classifier; no sign theorem asserted",
        "structural_partition": {
            "premise": "Exactly two attachment vertices x,y, necessarily in distinct W-components.",
            "cases": [
                "same_mark: X={x,y},Y=empty (including mark-symmetric exchange)",
                "split_mark: X={x},Y={y}",
            ],
            "exhaustive_up_to_mark_symmetry": True,
        },
        "same_mark": {
            "identity": str(same),
            "Q_zero_base": str(same_base),
            "Q_coefficients": {str(j): str(same_coefficients[j]) for j in same_coefficients},
            "row_semantics": "Q_j=Rx_j+Ry_j-Rxy_j counts independent j-sets meeting {x,y}; S_j=W_j and T_j=W_j-Q_j.",
            "linear_in_Q_rows": True,
        },
        "split_mark": {
            "identity": str(split),
            "root_zero_base": str(split_base),
            "Rx_linear_coefficients": {str(j): str(split_rx_linear[j]) for j in split_rx_linear},
            "Ry_linear_coefficients": {str(j): str(split_ry_linear[j]) for j in split_ry_linear},
            "bilinear_coefficients": split_bilinear,
            "bilinear_term_count": len(split_bilinear),
            "pure_Rx_or_Ry_quadratics": 0,
            "row_semantics": "S_j=W_j-Ry_j and T_j=W_j-Rx_j; Rx/Ry count independent sets containing roots in distinct components.",
        },
        "scope": "Adjacent no-parent rank-seven G3 with exactly two mark-to-W attachments only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(output, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "same_mark_linear_in_Q_rows": True,
        "split_mark_bilinear_terms": len(split_bilinear),
        "structural_cases": 2,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", output["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
