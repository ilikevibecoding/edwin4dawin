#!/usr/bin/env python3
"""Moment probe for adjacent no-parent G3 when marks have no W-neighbours."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "01DA8DA65E252C5BFA46D17021775EE0A168526A6CF164A325D2B84C01005F74"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value():
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)})
    S = {k: sp.Symbol(f"S{k}", nonnegative=True) for k in range(1, 8)}
    T = {k: sp.Symbol(f"T{k}", nonnegative=True) for k in range(1, 8)}
    locals_ = {"m": m, **{f"W{k}": W[k] for k in range(2, 9)}, **{f"S{k}": S[k] for k in S}, **{f"T{k}": T[k] for k in T}}
    exact = sp.expand(sp.sympify(report["theorem_input_identity"], locals=locals_))
    reduced = sp.expand(exact.subs({**{S[k]: W[k] for k in S}, **{T[k]: W[k] for k in T}}, simultaneous=True))
    ep, op = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = m/2+(m/2-1)*ep
    omega_low, omega_high = 2*edge**2/m-edge, edge**2/2
    omega = omega_low+op*(omega_high-omega_low)
    rows = {2: choose_poly(m, 2)-edge, 3: choose_poly(m, 3)-edge*(m-2)+omega}
    for rank in range(4, 9):
        previous = rank-1
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(reduced.subs({W[k]: rows[k] for k in range(2, 9)}))
    return m, (ep, op, *(extensions[k] for k in range(4, 9))), value, reduced


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    m, variables, value, reduced = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(m, tail+args.threshold_n-2)), variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_moment_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_n": args.threshold_n, "reduced_expression": str(reduced), "summary": summary,
        "scope": "Adjacent no-parent G3 with X=Y=empty and isolate-free W.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "threshold_n": args.threshold_n,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "bernstein_controls": summary["bernstein_controls"], "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
