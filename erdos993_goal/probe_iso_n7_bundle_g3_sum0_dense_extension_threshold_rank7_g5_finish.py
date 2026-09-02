#!/usr/bin/env python3
"""Exact reconnaissance for a dense-core rank-seven G3 stopping theorem.

This probe treats the nonadjacent/common0/sum0 no-parent row.  After stripping
all isolated vertices from the unmarked forest, its minimum degree is at least
one, hence m/2 <= e <= m-1.  W2 and W3 are coupled exactly through the edge and
wedge moments.  Every later independent-set row is coupled to the preceding
one by the universal blocked-extension interval

    (m-k) Wk - 2 e C(m-2,k-1) <= (k+1) W(k+1) <= (m-k) Wk.

The script is deliberately a probe: a zero-negative run identifies a viable
threshold, but a separate fail-closed producer must replay and invert the exact
Bernstein tensor before the result is promoted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_EXTENSION_THRESHOLD_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def build_value():
    # Pin the upstream parent-mode algebra, then independently recover the
    # literal sum-zero specialization rather than trusting a copied formula.
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    assert upstream["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G3_PARENT_MODES_RANK7_G4_PIECEWISE"
    )
    # A complete explicit locals table prevents accidental symbol assumptions.
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols["n"] = sp.Symbol("n", positive=True)
    expression = sp.expand(sp.sympify(
        upstream["modes"]["no_parent"]["expression"], locals=symbols
    ))
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    shifts = {
        symbols[f"A{rank}"]: W[rank-1] for rank in range(2, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: W[rank-1] for rank in range(2, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: W[rank-2] for rank in range(3, 9)
    })
    shifts[symbols["n"]] = m+2
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    expected = sp.expand(
        8*W[1]*W[2]+28*W[1]*W[3]-14*W[1]*W[4]
        -141*W[1]*W[5]-150*W[1]*W[6]-59*W[1]*W[7]-8*W[1]*W[8]
        +28*W[2]**2+126*W[2]*W[3]+92*W[2]*W[4]
        -108*W[2]*W[5]-116*W[2]*W[6]-26*W[2]*W[7]
        +97*W[3]**2+170*W[3]*W[4]+7*W[3]*W[5]-18*W[3]*W[6]
        +64*W[4]**2+20*W[4]*W[5]
    )
    assert sp.expand(reduced-expected) == 0

    edge_parameter, omega_parameter = sp.symbols(
        "edge_parameter omega_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(4, 9)
    }
    edge = m/2+(m/2-1)*edge_parameter
    omega_lower = 2*edge**2/m-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
    }
    intervals = {}
    for rank in range(4, 9):
        previous = rank-1
        lower = (
            (m-previous)*rows[previous]
            - 2*edge*choose_poly(m-2, previous-1)
        )/rank
        upper = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower+extension_parameters[rank]*(upper-lower)
        )
        intervals[rank] = (sp.factor(lower), sp.factor(upper))
    value = sp.cancel(reduced.subs({W[k]: rows[k] for k in range(2, 9)}))
    variables = (
        edge_parameter,
        omega_parameter,
        *(extension_parameters[k] for k in range(4, 9)),
    )
    return m, variables, value, reduced, intervals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    m, variables, value, reduced, intervals = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    threshold_m = args.threshold_n-2
    shifted = sp.cancel(value.subs(m, tail+threshold_m))
    summary = fast_summary(shifted, variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum0_dense_extension_threshold_n"
        f"{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "coefficient": "G3",
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "threshold_n": args.threshold_n,
        "dense_core_condition": "minimum degree at least one, so m/2<=e<=m-1",
        "reduced_expression": str(reduced),
        "parameterization": {
            "edge": "e=m/2+(m/2-1)*edge_parameter",
            "omega": "2e^2/m-e <= Omega <= e^2/2",
            "extensions": (
                "((m-k)Wk-2e*C(m-2,k-1))/(k+1) <= W(k+1) "
                "<= (m-k)Wk/(k+1), k=3,...,7"
            ),
        },
        "summary": summary,
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
        "scope": (
            "Dense isolate-free core, G3, no-parent common0/sum0 only. "
            "A passing probe requires an independent exact replay/inversion."
        ),
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
