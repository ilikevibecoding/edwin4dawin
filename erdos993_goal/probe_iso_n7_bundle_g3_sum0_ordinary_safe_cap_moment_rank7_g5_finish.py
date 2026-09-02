#!/usr/bin/env python3
"""Exact ordinary-parent G3 sum0 safe-cap moment probe.

For an ordinary parent p in the unmarked forest W, let R_k count independent
k-sets of W containing p.  The exact row is affine in R3,...,R7.  Positive
coordinates are dropped, while the two potentially negative coordinates are
paid using R4<=C(m-2,3) and R5<=C(m-2,4): the isolate-free core forces the
ordinary parent to have a neighbour.  The resulting lower is tested on
the exact W4 moment plus W5,...,W8 extension cone.  Diagnostic only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    build_value as no_parent_build,
    choose_poly,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_n11_probe_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_SAFE_CAP_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordinary_reduced():
    assert sha256(INPUT) == INPUT_SHA256
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols.update({
        f"P{family}{rank}": sp.Symbol(
            f"P{family}{rank}", nonnegative=True
        )
        for family in "WABZ" for rank in range(2, 8)
    })
    symbols["n"] = sp.Symbol("n", positive=True)
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    R = {0: sp.Integer(1)}
    R.update({rank: sp.Symbol(f"R{rank}", nonnegative=True) for rank in range(1, 8)})
    shifts = {symbols["n"]: m+2}
    shifts.update({symbols[f"A{rank}"]: W[rank-1] for rank in range(2, 9)})
    shifts.update({symbols[f"B{rank}"]: W[rank-1] for rank in range(2, 9)})
    shifts.update({symbols[f"Z{rank}"]: W[rank-2] for rank in range(3, 9)})
    for rank in range(2, 8):
        shifts[symbols[f"PW{rank}"]] = R[rank]
        shifts[symbols[f"PA{rank}"]] = R[rank-1]
        shifts[symbols[f"PB{rank}"]] = R[rank-1]
        shifts[symbols[f"PZ{rank}"]] = R[rank-2]
    exact = sp.expand(sp.sympify(
        upstream["modes"]["ordinary_parent"]["expression"], locals=symbols
    ).subs(shifts, simultaneous=True))
    no_parent = no_parent_build()[3]
    coefficients = {
        rank: sp.factor(sp.diff(exact, R[rank])) for rank in range(3, 8)
    }
    assert sp.expand(exact-no_parent-sum(
        coefficients[rank]*R[rank] for rank in range(3, 8)
    )) == 0
    expected_coefficients = {
        3: -8*W[2]+34*W[3]+34*W[4]+8*W[5]-8*m,
        4: -68*W[2]-26*W[3]+2*W[4]-8*m,
        5: -26*W[2]-12*W[3]+34*m,
        6: 2*W[2]+34*m,
        7: 8*m,
    }
    assert all(
        sp.expand(coefficients[rank]-expected_coefficients[rank]) == 0
        for rank in range(3, 8)
    )
    # For m>=9, c3>0 follows from W3>=C(m,3)-(m-1)(m-2)
    # and W2<=C(m,2).  c6,c7 are manifestly positive.  Also c5<0 follows
    # from W2>=C(m,2)-(m-1), the same W3 floor, and an exact shifted cubic.
    tail = sp.Symbol("sign_tail", nonnegative=True)
    lower_w3 = choose_poly(m, 3)-(m-1)*(m-2)
    c3_floor = sp.expand(34*lower_w3-8*choose_poly(m, 2)-8*m)
    c5_ceiling = sp.expand(
        -26*(choose_poly(m, 2)-(m-1))-12*lower_w3+34*m
    )
    assert all(value > 0 for value in sp.Poly(
        c3_floor.subs(m, tail+9), tail
    ).all_coeffs())
    assert all(value < 0 for value in sp.Poly(
        c5_ceiling.subs(m, tail+9), tail
    ).all_coeffs())
    lower = sp.expand(
        no_parent
        -(68*W[2]+26*W[3]+8*m)*choose_poly(m-2, 3)
        +coefficients[5]*choose_poly(m-2, 4)
    )
    return m, W, R, exact, coefficients, lower, c3_floor, c5_ceiling


def build_value(pay_c4: bool = True, use_r3_shadow: bool = False):
    m, W, R, exact, coefficients, lower, c3_floor, c5_ceiling = ordinary_reduced()
    if not pay_c4:
        # On m>=73, c4>=0 from the elementary W4 union-bound floor below,
        # so its entire R4 coordinate may be dropped instead of paid.
        lower = sp.expand(
            lower+(68*W[2]+26*W[3]+8*m)*choose_poly(m-2, 3)
        )
    if use_r3_shadow:
        # R3=T2 and R5=T4 inside U=W-N[p].  Every independent four-set
        # contains six pairs, while a pair extends to at most C(m-4,2)
        # four-sets because |U|<=m-2.  Thus R3>=6R5/C(m-4,2).
        alpha = sp.cancel(6/choose_poly(m-4, 2))
        lower = sp.cancel(
            lower+alpha*coefficients[3]*choose_poly(m-2, 4)
        )
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
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        low = (
            (m-previous)*rows[previous]
            - 2*edge*choose_poly(m-2, previous-1)
        )/rank
        high = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            low+extension_parameters[rank]*(high-low)
        )
    value = sp.cancel(lower.subs({W[rank]: rows[rank] for rank in range(2, 9)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, exact, coefficients, lower, c3_floor, c5_ceiling


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    parser.add_argument("--c4-mode", choices=("pay", "drop"), default="pay")
    parser.add_argument("--r3-shadow", action="store_true")
    args = parser.parse_args()
    assert args.threshold_n >= 11
    if args.c4_mode == "drop":
        assert args.threshold_n >= 75
    if args.r3_shadow:
        assert args.threshold_n >= 27
    m, variables, value, exact, coefficients, lower, c3_floor, c5_ceiling = build_value(
        pay_c4=args.c4_mode == "pay", use_r3_shadow=args.r3_shadow
    )
    tail = sp.Symbol("tail", nonnegative=True)
    c4_floor = sp.expand(
        2*(choose_poly(m, 4)-(m-1)*choose_poly(m-2, 2))
        -26*choose_poly(m, 3)-68*choose_poly(m, 2)-8*m
    )
    if args.c4_mode == "drop":
        assert all(value > 0 for value in sp.Poly(
            c4_floor.subs(m, tail+args.threshold_n-2), tail
        ).all_coeffs())
    shadow_coefficient = sp.cancel(
        coefficients[5]
        +6*coefficients[3]/choose_poly(m-4, 2)
    )
    if args.r3_shadow:
        # A coefficientwise upper bound is negative from m>=25.
        lower_w2 = choose_poly(m, 2)-(m-1)
        lower_w3 = choose_poly(m, 3)-(m-1)*(m-2)
        c3_upper = (
            -8*lower_w2+34*choose_poly(m, 3)+34*choose_poly(m, 4)
            +8*choose_poly(m, 5)-8*m
        )
        c5_upper = -26*lower_w2-12*lower_w3+34*m
        shadow_upper = sp.cancel(
            c5_upper+6*c3_upper/choose_poly(m-4, 2)
        )
        shadow_numerator, shadow_denominator = sp.fraction(shadow_upper)
        assert all(value > 0 for value in sp.Poly(
            shadow_denominator.subs(m, tail+args.threshold_n-2), tail
        ).all_coeffs())
        assert all(value < 0 for value in sp.Poly(
            shadow_numerator.subs(m, tail+args.threshold_n-2), tail
        ).all_coeffs())
    summary = fast_summary(
        sp.cancel(value.subs(m, tail+args.threshold_n-2)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_"
        f"{args.c4_mode}_{'shadow' if args.r3_shadow else 'noshadow'}_"
        f"n{args.threshold_n}_probe_"
        "rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "mode": "ordinary_parent_p_u0_v0",
        "threshold_n": args.threshold_n,
        "c4_mode": args.c4_mode,
        "r3_shadow": args.r3_shadow,
        "exact_expression": str(exact),
        "R_coefficients": {str(key): str(value) for key, value in coefficients.items()},
        "safe_lower": str(lower),
        "c3_positive_floor": str(c3_floor),
        "c5_negative_ceiling": str(c5_ceiling),
        "c4_positive_large_order_floor": str(c4_floor),
        "R3_R5_shadow_coefficient": str(shadow_coefficient),
        "summary": summary,
        "scope": "Ordinary-parent nonadjacent/common0/sum0 rank-seven G3 only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold_n": args.threshold_n,
        "c4_mode": args.c4_mode,
        "r3_shadow": args.r3_shadow,
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
