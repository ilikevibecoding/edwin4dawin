#!/usr/bin/env python3
"""Exact ordinary-parent isolate-padding safe-cap probe for rank-seven G3.

For W=H+sK1, both the W rows and the parent-containing R rows convolve with
(1+x)^s.  Each positive-order Newton coefficient is affine in the base parent
rows J_k.  This probe retains J1=1 exactly, drops provably positive pieces, and
pays only provably negative pieces using J_k<=C(h-1,k-1).  Diagnostic only.
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
from probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish import (
    ordinary_reduced,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_ISOLATE_PADDING_SAFE_CAP_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    m, W, R, exact, _coeffs, _lower, _c3, _c5 = ordinary_reduced()
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h}
    I.update({rank: sp.Symbol(f"I{rank}", nonnegative=True) for rank in range(2, 9)})
    # No zero-set contains the designated parent.  This zero is essential in
    # the convolution R_k(H+sK1)=sum_j C(s,k-j)R_j(H).
    J = {0: sp.Integer(0)}
    J.update({rank: sp.Symbol(f"J{rank}", nonnegative=True) for rank in range(1, 8)})
    padded_w = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j)*I[j] for j in range(rank+1)
        ))
        for rank in range(2, 9)
    }
    padded_r = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j)*J[j] for j in range(rank+1)
        ))
        for rank in range(3, 8)
    }
    padded = sp.expand(exact.subs({
        m: h+isolates,
        **{W[rank]: padded_w[rank] for rank in range(2, 9)},
        **{R[rank]: padded_r[rank] for rank in range(3, 8)},
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
    return h, I, J, coefficients


def safe_lower(index, h, I, J, coefficient):
    jvars = sorted(
        (symbol for symbol in coefficient.free_symbols if str(symbol).startswith("J")),
        key=str,
    )
    assert all(sp.diff(coefficient, symbol, 2) == 0 for symbol in jvars)
    base = sp.expand(coefficient.subs({symbol: 0 for symbol in jvars}))
    c = {int(str(symbol)[1:]): sp.factor(sp.diff(coefficient, symbol)) for symbol in jvars}
    negative_lower = {
        1: {
            2: -16*h-8,
            3: -60*I[2]-84*h-16,
            4: -64*I[2]-10*I[3]-60*h,
            5: -10*I[2],
            6: 0,
            7: 0,
        },
        2: {
            2: -118*h-116,
            3: -64*I[2]-184*h-118,
            4: -20*I[2]-64*h,
            5: 0,
            6: 0,
        },
        3: {
            2: -2*I[2]-230*h-420,
            3: -20*I[2]-148*h-230,
            4: -20*h-2,
            5: 0,
        },
        4: {
            2: -2*I[2]-170*h-608,
            3: -40*h-170,
            4: -2,
        },
        5: {
            2: -42*h-380,
            3: -42,
        },
        6: {2: -84},
        7: {},
        8: {},
    }[index]
    # J1 is exactly one for the designated ordinary parent.
    lower = sp.expand(base+(c.get(1, 0) if 1 in c else 0))
    audit = {}
    variables = tuple(I[rank] for rank in range(2, 9))
    tail = sp.Symbol("audit_tail", nonnegative=True)
    for rank, derivative in c.items():
        if rank == 1:
            continue
        paid = sp.expand(negative_lower[rank])
        difference = sp.Poly(
            sp.expand((derivative-paid).subs(h, tail+2)), tail, *variables
        )
        assert all(value >= 0 for value in difference.coeffs()), (
            index, rank, derivative, paid
        )
        paid_poly = sp.Poly(sp.expand(paid.subs(h, tail+2)), tail, *variables)
        assert all(value <= 0 for value in paid_poly.coeffs()), (
            index, rank, paid
        )
        cap = choose_poly(h-1, rank-1)
        lower += paid*cap
        audit[f"J{rank}"] = {
            "exact_derivative": str(derivative),
            "paid_lower_derivative": str(paid),
            "cap": str(cap),
        }
    return sp.expand(lower), audit


def extension_value(index):
    h, I, J, coefficients = padding_coefficients()
    lower, audit = safe_lower(index, h, I, J, coefficients[index])
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
        low = (
            (h-previous)*rows[previous]
            - 2*edge*choose_poly(h-2, previous-1)
        )/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            low+extension_parameters[rank]*(high-low)
        )
    value = sp.cancel(lower.subs({
        I[rank]: rows[rank] for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter,
        *(extension_parameters[rank] for rank in range(4, 9)),
    )
    return h, variables, value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    parser.add_argument("--threshold-h", type=int, default=2)
    args = parser.parse_args()
    assert args.threshold_h >= 2
    h, variables, value, exact_coefficient, lower, audit = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(
        sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g3_sum0_ordinary_isolate_padding_H"
        f"{args.index}_safe_cap_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact_coefficient),
        "safe_lower": str(lower),
        "parent_cap_audit": audit,
        "summary": summary,
        "scope": "Ordinary-parent common0/sum0 rank-seven G3 padding only.",
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
