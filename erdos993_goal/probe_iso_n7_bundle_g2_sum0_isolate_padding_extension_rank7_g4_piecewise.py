#!/usr/bin/env python3
"""Exact probes of isolate-padding Newton coefficients for rank-seven G2."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g2_sum0_dense_moment_extension_rank7_g4_piecewise import (
    reduced_value,
)
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G2_SUM0_ISOLATE_PADDING_EXTENSION_"
    "RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    m, W, reduced = reduced_value()
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    core = {0: sp.Integer(1), 1: h}
    core.update({
        rank: sp.Symbol(f"I{rank}", nonnegative=True)
        for rank in range(2, 9)
    })
    rows = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j)*core[j]
            for j in range(rank+1)
        ))
        for rank in range(2, 9)
    }
    padded = sp.expand(reduced.subs({
        m: h+isolates,
        **{W[rank]: rows[rank] for rank in range(2, 9)},
    }, simultaneous=True))
    assert sp.degree(padded, isolates) == 9
    coefficients = {
        rank: sp.expand(sum(
            (-1)**(rank-j)*sp.binomial(rank, j)*padded.subs(isolates, j)
            for j in range(rank+1)
        ))
        for rank in range(10)
    }
    recomposed = sp.expand(sum(
        coefficients[rank]*choose_poly(isolates, rank)
        for rank in range(10)
    ))
    assert sp.expand(padded-recomposed) == 0
    return h, core, coefficients


def extension_value(index: int):
    h, core, coefficients = padding_coefficients()
    edge_parameter, omega_parameter = sp.symbols(
        "edge_parameter omega_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(4, 9)
    }
    edge = (h-1)*edge_parameter
    omega_lower = 2*edge**2/h-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
    }
    for rank in range(4, 9):
        previous = rank-1
        lower = (
            (h-previous)*rows[previous]
            - 2*edge*choose_poly(h-2, previous-1)
        )/rank
        upper = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower+extension_parameters[rank]*(upper-lower)
        )
    value = sp.cancel(coefficients[index].subs({
        core[rank]: rows[rank] for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter,
        omega_parameter,
        *(extension_parameters[rank] for rank in range(4, 9)),
    )
    return h, variables, value, coefficients[index]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 10))
    parser.add_argument("--threshold-h", type=int, default=2)
    args = parser.parse_args()
    assert args.threshold_h >= 2
    h, variables, value, exact_coefficient = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(
        sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g2_sum0_isolate_padding_H"
        f"{args.index}_h{args.threshold_h}_extension_probe_"
        "rank7_g4_piecewise_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact_coefficient),
        "summary": summary,
        "parameterization": {
            "edge": "e=(h-1)*edge_parameter",
            "omega": "2e^2/h-e<=Omega<=e^2/2",
            "extensions": "blocked-extension intervals for I4,...,I8",
        },
        "scope_guard": (
            "One positive-order isolate-padding coefficient for rank-seven "
            "G2 no-parent common0/sum0 only; no theorem asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
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
