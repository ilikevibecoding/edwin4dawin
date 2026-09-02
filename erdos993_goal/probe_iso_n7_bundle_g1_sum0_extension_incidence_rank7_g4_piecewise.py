#!/usr/bin/env python3
"""Extension-incidence probe for rank-seven G1 sum-zero no-parent mode.

The positive W5*W6 term needs a W6 lower bound that preserves the correct
leading density.  A blocked extension pair is charged to an oriented forest
edge, giving

  6 W6 >= (m-5) W5 - 2e C(m-2,4).

W6-W8 upper endpoints use consecutive shadows.  W3/W4 and the two W5 floors
remain coupled through exact forest moments.  Diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise import (
    choose_poly,
    forest_moment_rows,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_extension_incidence_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_EXTENSION_INCIDENCE_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
        source["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {symbols[f"A{k}"]: symbols[f"W{k-1}"] for k in range(4, 9)}
    shifts.update({symbols[f"B{k}"]: symbols[f"W{k-1}"] for k in range(4, 9)})
    shifts.update({symbols[f"Z{k}"]: symbols[f"W{k-2}"] for k in range(5, 9)})
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    W = {k: symbols[f"W{k}"] for k in range(3, 9)}
    c6 = sp.factor(sp.diff(reduced, W[6]))
    c7 = sp.factor(sp.diff(reduced, W[7]))
    c8 = sp.factor(sp.diff(reduced, W[8]))
    assert sp.expand(c6-(10*W[5]-106*W[3]-12*W[4])) == 0
    assert sp.expand(c7-(-51*W[3]-10*W[4])) == 0
    assert sp.expand(c8+8*W[3]) == 0
    base_low = sp.expand(reduced-c6*W[6]-c7*W[7]-c8*W[8])

    m, tail = sp.symbols("m tail", nonnegative=True)
    edge_parameter, omega_parameter, tau_parameter, w5_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter w5_parameter",
        nonnegative=True,
    )
    edge = (m-1)*edge_parameter
    omega, tau, rows, bad4 = forest_moment_rows(
        m, edge, omega_parameter, tau_parameter
    )
    incidence5 = edge*choose_poly(m-2, 3)
    w5_lower = choose_poly(m, 5)-incidence5
    incidence2 = (
        omega*choose_poly(m-3, 2)
        + (choose_poly(edge, 2)-omega)*(m-4)
    )
    incidence3_lower = tau*(m-7)+omega*(edge-2)
    floors = {
        "shadow": (m-4)*bad4/5,
        "triple134": incidence5-incidence2+sp.Rational(3, 4)*incidence3_lower,
    }
    lower6 = ((m-5)*W[5]-2*edge*choose_poly(m-2, 4))/6
    upper6 = (m-5)*W[5]/6
    upper7 = (m-6)*(m-5)*W[5]/42
    upper8 = (m-7)*(m-6)*(m-5)*W[5]/336
    signed = sp.expand(
        base_low
        + 10*W[5]*lower6
        - (106*W[3]+12*W[4])*upper6
        + c7*upper7+c8*upper8
    )

    variables = (edge_parameter, omega_parameter, tau_parameter, w5_parameter)
    summaries = {}
    for label, floor in floors.items():
        w5_upper = choose_poly(m, 5)-floor
        w5 = w5_lower+w5_parameter*(w5_upper-w5_lower)
        value = sp.cancel(signed.subs({
            W[3]: rows[3], W[4]: rows[4], W[5]: w5,
        }, simultaneous=True))
        if os.environ.get("G1_LEADING_ONLY") == "1":
            print("LEADING", label, sp.factor(sp.limit(value/m**10, m, sp.oo)))
            continue
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        probe_variables = variables
        if os.environ.get("G1_TREE_ONLY") == "1":
            shifted = sp.cancel(shifted.subs(edge_parameter, 1))
            probe_variables = (omega_parameter, tau_parameter, w5_parameter)
        print("FLOOR_START", label, flush=True)
        summaries[label] = fast_summary(shifted, probe_variables, tail)

    if os.environ.get("G1_LEADING_ONLY") == "1":
        return

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "threshold_n": THRESHOLD_M+2,
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "inequality_facts": {
            "W6_lower": (
                "6W6>=(m-5)W5-2e*C(m-2,4): every blocked extension pair "
                "is charged to an oriented edge with its other endpoint in "
                "the independent five-set."
            ),
            "upper_shadows": (
                "6W6<=(m-5)W5, 7W7<=(m-6)W6, 8W8<=(m-7)W7."
            ),
        },
        "status": "diagnostic exact relaxation; no theorem asserted",
        "scope": "Rank-seven G1, no-parent, common0/sum0, n>=11 only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_counts": report["negative_counts"],
        "minima": {
            key: value["minimum_tail_scalar_coefficient"]
            for key, value in summaries.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
