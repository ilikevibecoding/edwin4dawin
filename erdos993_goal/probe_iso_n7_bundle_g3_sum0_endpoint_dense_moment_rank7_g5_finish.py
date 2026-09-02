#!/usr/bin/env python3
"""Exact dense-moment probe for endpoint-parent rank-seven G3 sum0.

Endpoint_u and endpoint_v reduce identically by marked symmetry in the sum0
geometry.  The same exact W4 moment and W5,...,W8 extension cone used for the
closed no-parent branch is tested here.  Diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_endpoint_dense_moment_n11_probe_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_DENSE_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def endpoint_reduced():
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols["n"] = sp.Symbol("n", positive=True)
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    shifts = {symbols["n"]: m+2}
    shifts.update({symbols[f"A{rank}"]: W[rank-1] for rank in range(2, 9)})
    shifts.update({symbols[f"B{rank}"]: W[rank-1] for rank in range(2, 9)})
    shifts.update({symbols[f"Z{rank}"]: W[rank-2] for rank in range(3, 9)})
    values = {
        mode: sp.expand(sp.sympify(
            upstream["modes"][mode]["expression"], locals=symbols
        ).subs(shifts, simultaneous=True))
        for mode in ("endpoint_u", "endpoint_v")
    }
    assert sp.expand(values["endpoint_u"]-values["endpoint_v"]) == 0
    expected = sp.expand(
        28*W[2]**2+124*W[2]*W[3]+62*W[2]*W[4]
        -114*W[2]*W[5]-116*W[2]*W[6]-26*W[2]*W[7]+8*m*W[2]
        +114*W[3]**2+172*W[3]*W[4]+7*W[3]*W[5]-18*W[3]*W[6]
        +24*m*W[3]+64*W[4]**2+20*W[4]*W[5]-16*m*W[4]
        -124*m*W[5]-142*m*W[6]-59*m*W[7]-8*m*W[8]
    )
    assert sp.expand(values["endpoint_u"]-expected) == 0
    return m, W, values["endpoint_u"]


def build_value():
    m, W, reduced = endpoint_reduced()
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
        edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
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
    value = sp.cancel(reduced.subs({W[rank]: rows[rank] for rank in range(2, 9)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, reduced


def main() -> None:
    m, variables, value, reduced = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(m, tail+9)), variables, tail)
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "modes": ["endpoint_u", "endpoint_v"],
        "endpoint_symmetry_checked": True,
        "threshold_n": 11,
        "exact_reduced_expression": str(reduced),
        "summary": summary,
        "scope": (
            "Endpoint-parent nonadjacent/common0/sum0 rank-seven G3 only."
        ),
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold_n": 11,
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
