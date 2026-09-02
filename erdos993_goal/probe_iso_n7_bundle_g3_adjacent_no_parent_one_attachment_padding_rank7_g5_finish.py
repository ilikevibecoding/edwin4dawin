#!/usr/bin/env python3
"""Isolate-padding safe-cap probe for adjacent no-parent one attachment."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_safe_cap_rank7_g5_finish import safe_lower
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_PADDING_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    m, W, R, exact, _base, _coefficients = reduced()
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h}
    I.update({k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)})
    J = {0: sp.Integer(0)}
    J.update({k: sp.Symbol(f"J{k}", nonnegative=True) for k in range(1, 8)})
    padded_w = {k: sp.expand(sum(choose_poly(isolates, k-j)*I[j] for j in range(k+1))) for k in range(2, 9)}
    padded_r = {k: sp.expand(sum(choose_poly(isolates, k-j)*J[j] for j in range(k+1))) for k in range(2, 8)}
    padded = sp.expand(exact.subs({
        m: h+isolates, **{W[k]: padded_w[k] for k in range(2, 9)},
        **{R[k]: padded_r[k] for k in range(2, 8)},
    }, simultaneous=True))
    coefficients = {
        index: sp.expand(sum((-1)**(index-j)*sp.binomial(index, j)*padded.subs(isolates, j) for j in range(index+1)))
        for index in range(9)
    }
    assert sp.expand(padded-sum(coefficients[i]*choose_poly(isolates, i) for i in range(9))) == 0
    return h, I, J, coefficients


def extension_value(index):
    h, I, J, coefficients = padding_coefficients()
    lower, audit = safe_lower(index, h, I, J, coefficients[index])
    ep, op = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = (h-1)*ep
    omega_low, omega_high = 2*edge**2/h-edge, edge**2/2
    omega = omega_low+op*(omega_high-omega_low)
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega}
    for rank in range(4, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(lower.subs({I[k]: rows[k] for k in range(2, 9)}))
    return h, (ep, op, *(extensions[k] for k in range(4, 9))), value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    parser.add_argument("--threshold-h", type=int, default=2)
    args = parser.parse_args()
    h, variables, value, exact, lower, audit = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_H" + str(args.index)
        + f"_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER, "status": "exact diagnostic lower; no theorem asserted",
        "newton_index": args.index, "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact), "safe_lower": str(lower), "root_cap_audit": audit,
        "summary": summary, "scope": "Adjacent no-parent exactly-one-attachment isolate padding.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "newton_index": args.index, "threshold_h": args.threshold_h,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "bernstein_controls": summary["bernstein_controls"], "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
