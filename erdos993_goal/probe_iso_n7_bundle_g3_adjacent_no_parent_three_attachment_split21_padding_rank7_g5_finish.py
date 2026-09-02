#!/usr/bin/env python3
"""Safe monomial-cap isolate-padding probe for split 2+1 three attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
DERIVE_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA256 = "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_PADDING_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    assert sha256(DERIVE_REPORT) == DERIVE_REPORT_SHA256
    split = json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))["split_mark_2plus1"]
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m, **{k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}}
    P = {0: sp.Integer(0), 1: sp.Integer(1), **{k: sp.Symbol(f"P{k}", nonnegative=True) for k in range(2, 8)}}
    Q = {0: sp.Integer(0), 1: sp.Integer(2), **{k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}}
    exact = sp.expand(sp.sympify(split["identity"], locals={
        "m": m,
        **{f"W{k}": W[k] for k in range(2, 9)},
        **{f"P{k}": P[k] for k in range(2, 8)},
        **{f"Q{k}": Q[k] for k in range(2, 8)},
    }))
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)}}
    JP = {0: sp.Integer(0), 1: sp.Integer(1), **{k: sp.Symbol(f"JP{k}", nonnegative=True) for k in range(2, 8)}}
    JQ = {0: sp.Integer(0), 1: sp.Integer(2), **{k: sp.Symbol(f"JQ{k}", nonnegative=True) for k in range(2, 8)}}
    padded_w = {k: sp.expand(sum(choose_poly(isolates, k-j) * I[j] for j in range(k+1))) for k in range(2, 9)}
    padded_p = {k: sp.expand(sum(choose_poly(isolates, k-j) * JP[j] for j in range(k+1))) for k in range(2, 8)}
    padded_q = {k: sp.expand(sum(choose_poly(isolates, k-j) * JQ[j] for j in range(k+1))) for k in range(2, 8)}
    padded = sp.expand(exact.subs({
        m: h + isolates,
        **{W[k]: padded_w[k] for k in range(2, 9)},
        **{P[k]: padded_p[k] for k in range(2, 8)},
        **{Q[k]: padded_q[k] for k in range(2, 8)},
    }, simultaneous=True))
    coefficients = {
        index: sp.expand(sum((-1)**(index-j) * sp.binomial(index, j) * padded.subs(isolates, j) for j in range(index+1)))
        for index in range(9)
    }
    assert sp.expand(padded - sum(coefficients[index] * choose_poly(isolates, index) for index in range(9))) == 0
    return h, I, JP, JQ, coefficients


def monomial_safe_lower(h, I, JP, JQ, coefficient):
    base_variables = (h, *(I[k] for k in range(2, 9)))
    root_variables = tuple(JP[k] for k in range(2, 8)) + tuple(JQ[k] for k in range(2, 8))
    variables = base_variables + root_variables
    caps = {
        **{JP[k]: choose_poly(h-1, k-1) for k in range(2, 8)},
        **{JQ[k]: choose_poly(h, k) - choose_poly(h-2, k) for k in range(2, 8)},
    }
    lower = sp.Integer(0)
    kept_root_negative = dropped_root_positive = base_terms = 0
    for powers, scalar in sp.Poly(coefficient, *variables).terms():
        monomial = scalar
        has_root = any(powers[len(base_variables):])
        if not has_root:
            for variable, power in zip(base_variables, powers[:len(base_variables)]):
                monomial *= variable**power
            lower += monomial
            base_terms += 1
        elif scalar < 0:
            for variable, power in zip(base_variables, powers[:len(base_variables)]):
                monomial *= variable**power
            for variable, power in zip(root_variables, powers[len(base_variables):]):
                monomial *= caps[variable]**power
            lower += monomial
            kept_root_negative += 1
        else:
            dropped_root_positive += 1
    return sp.expand(lower), {
        "base_terms_kept_exact": base_terms,
        "negative_root_monomials_paid_at_caps": kept_root_negative,
        "nonnegative_root_monomials_dropped": dropped_root_positive,
        "root_caps": {str(variable): str(caps[variable]) for variable in root_variables},
        "cap_proofs": {
            "P": "JP_k<=C(h-1,k-1), since every counted set contains the single P root.",
            "Q": "JQ_k<=C(h,k)-C(h-2,k), since every counted set contains at least one of the two mutually nonadjacent Q roots.",
        },
    }


def extension_value(index: int):
    h, I, JP, JQ, coefficients = padding_coefficients()
    lower, audit = monomial_safe_lower(h, I, JP, JQ, coefficients[index])
    edge_parameter, omega_parameter = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = (h-1) * edge_parameter
    omega_low, omega_high = 2*edge**2/h - edge, edge**2/2
    omega = omega_low + omega_parameter * (omega_high - omega_low)
    rows = {2: choose_poly(h, 2) - edge, 3: choose_poly(h, 3) - edge*(h-2) + omega}
    for rank in range(4, 9):
        previous = rank - 1
        low = ((h-previous)*rows[previous] - 2*edge*choose_poly(h-2, previous-1)) / rank
        high = (h-previous)*rows[previous] / rank
        rows[rank] = sp.expand(low + extensions[rank] * (high-low))
    value = sp.cancel(lower.subs({I[k]: rows[k] for k in range(2, 9)}))
    return h, (edge_parameter, omega_parameter, *(extensions[k] for k in range(4, 9))), value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    parser.add_argument("--threshold-h", type=int, required=True)
    args = parser.parse_args()
    h, variables, value, exact, lower, audit = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail + args.threshold_h)), variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_H{args.index}_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact),
        "safe_lower": str(lower),
        "root_monomial_cap_audit": audit,
        "summary": summary,
        "scope": "Adjacent no-parent split 2+1 exactly-three-attachment isolate padding.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "bernstein_controls": summary["bernstein_controls"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
