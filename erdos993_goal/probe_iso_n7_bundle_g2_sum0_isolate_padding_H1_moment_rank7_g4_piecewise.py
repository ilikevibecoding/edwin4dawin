#!/usr/bin/env python3
"""Tight exact-moment probe for the first G2 isolate-padding coefficient."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g2_sum0_isolate_padding_extension_rank7_g4_piecewise import (
    padding_coefficients,
)
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_ISOLATE_PADDING_H1_MOMENT_"
    "RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value():
    h, core, coefficients = padding_coefficients()
    exact = coefficients[1]
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    # This transfer is needed only after stripping every isolate.  Therefore
    # the base forest has h/2<=e<=h-1.
    edge = h/2+(h/2-1)*edge_parameter
    omega_lower = 2*edge**2/h-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower+tau_parameter*(tau_upper-tau_lower))
    bad4 = (
        edge*choose_poly(h-2, 2)
        - omega*(h-4)-edge*(edge-1)/2+tau
    )
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
        4: choose_poly(h, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        lower = (
            (h-previous)*rows[previous]
            - 2*edge*choose_poly(h-2, previous-1)
        )/rank
        upper = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower+extension_parameters[rank]*(upper-lower)
        )
    value = sp.cancel(exact.subs({
        core[rank]: rows[rank] for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    edgeless = sp.factor(exact.subs({
        core[rank]: choose_poly(h, rank) for rank in range(2, 9)
    }))
    return h, variables, value, exact, edgeless


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-h", type=int, default=2)
    args = parser.parse_args()
    assert args.threshold_h >= 2
    h, variables, value, exact, edgeless = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(
        sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g2_sum0_isolate_padding_H1_moment_h"
        f"{args.threshold_h}_probe_rank7_g4_piecewise_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact),
        "edgeless_value": str(edgeless),
        "summary": summary,
        "parameterization": {
            "edge": "isolate-free forest: e=h/2+(h/2-1)*edge_parameter",
            "omega": "2e^2/h-e<=Omega<=e^2/2",
            "tau": "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2",
            "I4": "exact forest edge/wedge/three-edge-subtree identity",
            "extensions": "blocked-extension intervals for I5,...,I8",
        },
        "scope_guard": (
            "First isolate-padding coefficient H1 for rank-seven G2 "
            "common0/sum0 no-parent, restricted to isolate-free base H; "
            "diagnostic until replayed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold_h": args.threshold_h,
        "edgeless_value": str(edgeless),
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
