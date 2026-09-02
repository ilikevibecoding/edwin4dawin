#!/usr/bin/env python3
"""Coupled forest-moment probe for rank-seven G1, sum-zero no-parent mode.

This retains exact W3/W4 edge-wedge-subtree coupling, uses two rigorous
bad-five floors, and eliminates W6-W8 with signed edge-incidence endpoints.
It is diagnostic only; a positive probe must be replayed by a fail-closed
producer before promotion.
"""

from __future__ import annotations

import hashlib
import json
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
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_coupled_moment_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_COUPLED_MOMENT_RANK7_G4_PIECEWISE"
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
    assert reduced.free_symbols <= set(W.values())

    # Split the mixed W6 coefficient into its nonnegative positive and
    # negative pieces before taking interval endpoints.  W7/W8 coefficients
    # are already nonpositive.
    coefficient6 = sp.factor(sp.diff(reduced, W[6]))
    assert sp.expand(coefficient6-(10*W[5]-106*W[3]-12*W[4])) == 0
    coefficient7 = sp.factor(sp.diff(reduced, W[7]))
    coefficient8 = sp.factor(sp.diff(reduced, W[8]))
    assert sp.expand(coefficient7-(-51*W[3]-10*W[4])) == 0
    assert sp.expand(coefficient8-(-8*W[3])) == 0

    m, tail = sp.symbols("m tail", nonnegative=True)
    edge_parameter, omega_parameter, tau_parameter, w5_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter w5_parameter",
        nonnegative=True,
    )
    edge = (m-1)*edge_parameter
    omega, tau, rows, bad4 = forest_moment_rows(
        m, edge, omega_parameter, tau_parameter
    )
    incidence = {
        k: edge*choose_poly(m-2, k-2) for k in range(5, 9)
    }
    lower = {k: choose_poly(m, k)-incidence[k] for k in range(5, 9)}
    upper = {
        k: choose_poly(m, k)-incidence[k]/(k-1) for k in range(5, 9)
    }
    incidence1 = incidence[5]
    incidence2 = (
        omega*choose_poly(m-3, 2)
        + (choose_poly(edge, 2)-omega)*(m-4)
    )
    incidence3_lower = tau*(m-7)+omega*(edge-2)
    floors = {
        "shadow": (m-4)*bad4/5,
        "triple134": incidence1-incidence2+sp.Rational(3, 4)*incidence3_lower,
    }

    without_high = sp.expand(
        reduced-coefficient6*W[6]-coefficient7*W[7]-coefficient8*W[8]
    )
    signed_lower = sp.expand(
        without_high
        + 10*W[5]*lower[6]
        - (106*W[3]+12*W[4])*upper[6]
        + coefficient7*upper[7]
        + coefficient8*upper[8]
    )
    assert not ({W[6], W[7], W[8]} & signed_lower.free_symbols)

    variables = (edge_parameter, omega_parameter, tau_parameter, w5_parameter)
    summaries = {}
    normalized = {}
    for label, floor in floors.items():
        w5_upper = choose_poly(m, 5)-floor
        w5 = lower[5]+w5_parameter*(w5_upper-lower[5])
        value = sp.cancel(signed_lower.subs({
            W[3]: rows[3], W[4]: rows[4], W[5]: w5,
        }, simultaneous=True))
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        print("FLOOR_START", label, flush=True)
        summaries[label] = fast_summary(shifted, variables, tail)
        normalized[label] = str(sp.factor(value))

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "threshold_n": THRESHOLD_M+2,
        "exact_reduced_expression": str(sp.factor(reduced)),
        "signed_W6_W8_lower_expression": str(sp.factor(signed_lower)),
        "coefficient_audit": {
            "W6": str(coefficient6), "W7": str(coefficient7), "W8": str(coefficient8),
        },
        "moment_rows": {
            "edge": str(edge), "Omega": str(omega), "tau": str(tau),
            "W3": str(rows[3]), "W4": str(rows[4]),
        },
        "bad5_floors": {key: str(sp.factor(value)) for key, value in floors.items()},
        "summaries": summaries,
        "negative_counts": {
            key: value["negative_tail_scalar_coefficients"]
            for key, value in summaries.items()
        },
        "normalized_lower_expressions": normalized,
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
