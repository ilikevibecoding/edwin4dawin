#!/usr/bin/env python3
"""Exact G3 dense-core probe with the full W4 forest moment identity.

This tightens the earlier blocked-extension cone by replacing its independent
W4 endpoint with the exact edge/wedge/three-edge-subtree formula.  W5,...,W8
remain recursively coupled by blocked-extension intervals.  Diagnostic only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    build_value,
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_MOMENT_EXTENSION_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    m, _old_variables, _old_value, reduced, _old_intervals = build_value()
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = m/2+(m/2-1)*edge_parameter
    omega_lower = 2*edge**2/m-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower+tau_parameter*(tau_upper-tau_lower))
    bad4 = (
        edge*choose_poly(m-2, 2)
        - omega*(m-4)-edge*(edge-1)/2+tau
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
            lower+extension_parameters[rank]*(upper-lower)
        )
    value = sp.cancel(reduced.subs({
        sp.Symbol(f"W{rank}", nonnegative=True): rows[rank]
        for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(
        sp.cancel(value.subs(m, tail+args.threshold_n-2)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g3_sum0_dense_moment_extension_n"
        f"{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_n": args.threshold_n,
        "summary": summary,
        "parameterization": {
            "edge": "m/2<=e<=m-1",
            "omega": "2e^2/m-e<=Omega<=e^2/2",
            "tau": "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2",
            "W4": (
                "C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau"
            ),
            "extensions": "blocked-extension intervals for W5,...,W8",
        },
        "scope": (
            "Dense isolate-free no-parent nonadjacent/common0/sum0 G3 only; "
            "a passing probe still requires a full exact inversion."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
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
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
