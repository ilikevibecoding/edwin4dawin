#!/usr/bin/env python3
"""Exact endpoint-parent G3 isolate-padding Newton probe.

Expands the common endpoint_u/endpoint_v sum0 row on H+sK1 and tests each
positive-order Newton coefficient on the edge/wedge/extension forest box.
Diagnostic only.
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
from probe_iso_n7_bundle_g3_sum0_endpoint_dense_moment_rank7_g5_finish import (
    endpoint_reduced,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_ISOLATE_PADDING_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    m, W, reduced = endpoint_reduced()
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
    assert sp.degree(padded, isolates) == 8
    coefficients = {
        rank: sp.expand(sum(
            (-1)**(rank-j)*sp.binomial(rank, j)*padded.subs(isolates, j)
            for j in range(rank+1)
        ))
        for rank in range(9)
    }
    assert coefficients[8] == 2208
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
        edge_parameter, omega_parameter,
        *(extension_parameters[rank] for rank in range(4, 9)),
    )
    return h, variables, value, coefficients[index]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    args = parser.parse_args()
    h, variables, value, exact_coefficient = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+2)), variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum0_endpoint_isolate_padding_H"
        f"{args.index}_h2_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "newton_index": args.index,
        "threshold_h": 2,
        "modes": ["endpoint_u", "endpoint_v"],
        "exact_newton_coefficient": str(exact_coefficient),
        "summary": summary,
        "scope": "Endpoint-parent common0/sum0 rank-seven G3 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newton_index": args.index,
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
