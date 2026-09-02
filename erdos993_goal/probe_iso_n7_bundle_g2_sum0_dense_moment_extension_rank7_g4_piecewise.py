#!/usr/bin/env python3
"""Exact diagnostic dense-core cone for rank-seven G2 common0/sum0.

The two marked vertices are isolated from an isolate-free unmarked forest W,
and no parent is deleted.  The cone uses the exact W2/W3/W4 edge, wedge, and
three-edge-subtree identities, followed by coupled blocked-extension intervals
for W5,...,W8.  A passing run is reconnaissance only until independently
replayed and promoted by a fail-closed producer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "B5638922DC71C493ECB5A64EA174441CA696A8C0B243A0B8D671C730855D9ED4"
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_DENSE_MOMENT_EXTENSION_"
    "RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reduced_value():
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert report["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"
    )
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
        report["modes"]["no_parent"]["expression"], locals=symbols
    ))
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    shifts = {}
    for rank in range(3, 9):
        shifts[symbols[f"A{rank}"]] = W[rank - 1]
        shifts[symbols[f"B{rank}"]] = W[rank - 1]
    for rank in range(4, 9):
        shifts[symbols[f"Z{rank}"]] = W[rank - 2]
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    expected = sp.expand(
        16*W[2]*W[3] + 20*W[2]*W[4] - 68*W[2]*W[5]
        - 107*W[2]*W[6] - 51*W[2]*W[7] - 8*W[2]*W[8]
        + 28*W[3]**2 + 100*W[3]*W[4] - 16*W[3]*W[5]
        - 63*W[3]*W[6] - 18*W[3]*W[7] + 91*W[4]**2
        + 66*W[4]*W[5] + 10*W[5]**2
    )
    assert sp.expand(reduced - expected) == 0
    return m, W, reduced


def build_value():
    m, W, reduced = reduced_value()
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = m/2 + (m/2 - 1)*edge_parameter
    omega_lower = 2*edge**2/m - edge
    omega_upper = edge**2/2
    omega = omega_lower + omega_parameter*(omega_upper - omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower + tau_parameter*(tau_upper - tau_lower))
    bad4 = (
        edge*choose_poly(m-2, 2)
        - omega*(m-4) - edge*(edge-1)/2 + tau
    )
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        lower = (
            (m-previous)*rows[previous]
            - 2*edge*choose_poly(m-2, previous-1)
        )/rank
        upper = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower + extension_parameters[rank]*(upper-lower)
        )
    value = sp.cancel(reduced.subs({
        W[rank]: rows[rank] for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, reduced


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    m, variables, value, reduced = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(
        sp.cancel(value.subs(m, tail+args.threshold_n-2)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g2_sum0_dense_moment_extension_n"
        f"{args.threshold_n}_probe_rank7_g4_piecewise_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_n": args.threshold_n,
        "coefficient": "G2",
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "summary": summary,
        "reduced_expression": str(reduced),
        "parameterization": {
            "edge": "m/2<=e<=m-1",
            "omega": "2e^2/m-e<=Omega<=e^2/2",
            "tau": "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2",
            "W4": "C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau",
            "extensions": "blocked-extension intervals for W5,...,W8",
        },
        "scope_guard": (
            "Dense isolate-free no-parent common0/sum0 G2 only.  A pass is "
            "not a theorem until a fail-closed exact producer is replayed."
        ),
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold_n": args.threshold_n,
        "degree_profile": summary["degree_profile"],
        "bernstein_controls": summary["bernstein_controls"],
        "negative_tail_scalar_coefficients": summary[
            "negative_tail_scalar_coefficients"
        ],
        "minimum_tail_scalar_coefficient": summary[
            "minimum_tail_scalar_coefficient"
        ],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
