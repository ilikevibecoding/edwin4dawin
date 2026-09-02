#!/usr/bin/env python3
"""Exact all-order theorem for the one-sided adjacent rank-five g1 face.

For adjacent marks put A=G-u-v, B=G-N[v], C=G-N[u].  This source proves

    S(A,B,A)=M5+3*C5 >= 0

when one deletion deficit is zero (C=A) and B is obtained by deleting at
most one vertex from each component of A.  The opposite orientation follows
by symmetry.

The key exact deficit identity is S(A,B,A)=S(A,A,A)-T(A,A-B).  For orders at
least thirteen, only coefficientwise containment 0<=a_k-b_k<=a_k is needed:
an explicit upper bound for T leaves a forest-ratio polynomial whose high and
low factorial-drop cones have strictly positive exact coefficients.  Two
independent complete finite censuses cover orders through twelve.

This does not cover two positive deletion deficits or full adjacent g1.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_one_sided_face_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_ADJACENT_ONE_SIDED_FACE_G1_BERNSTEIN"
ROOT_FINITE = HERE / "iso_n5_g1_adjacent_one_sided_deficit_probe_root_20260830.json"
INDEPENDENT_FINITE = HERE / "iso_n5_g1_adjacent_one_sided_deficit_finite_probe_g1_bernstein_20260830.json"
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "RANK8_ROOT_DELETION_RATIO_FLOOR_THEOREM_2026-08-25.md":
        "07B04ED37C1C1FC4DBBCCF834B2D8BB32BDEF0827BD72A4A926342E2998FE998",
    "derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py":
        "B45D369DB8A5FF26FC1D43C22198D693581A23C8D283F79757BEBC949688AD48",
    "probe_iso_n5_g1_adjacent_one_sided_deficit_root.py":
        "909BA8B679FCF03CD5F31262D97653A152259B95C9490108E81AB83847A6FC98",
    "iso_n5_g1_adjacent_one_sided_deficit_probe_root_20260830.json":
        "D37C1B072A87A820B0A34539DC0AE94652C69E38505BCF896DC4623D7621C2E5",
    "probe_iso_n5_g1_adjacent_one_sided_deficit_finite_g1_bernstein.py":
        "DCC8CFDFD63C334AD4C19BA46F06A5B372EBA008F0F4332B63B193BBD3AE00ED",
    "iso_n5_g1_adjacent_one_sided_deficit_finite_probe_g1_bernstein_20260830.json":
        "F211E8FFF808FB0FEAE7018A535C24899E1BA261A880B9E589D9F7F812FB70D2",
}
EXPECTED_PATTERNS = {
    "0": 1, "1": 2, "2": 7, "3": 18, "4": 55, "5": 140,
    "6": 395, "7": 1008, "8": 2715, "9": 6966, "10": 18343,
    "11": 47166, "12": 123439,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_finite() -> dict:
    root = json.loads(ROOT_FINITE.read_text(encoding="utf-8"))
    independent = json.loads(INDEPENDENT_FINITE.read_text(encoding="utf-8"))
    assert root["marker"] == "PROBE_EXACT_FINITE_ISO_N5_G1_ADJACENT_ONE_SIDED_DEFICIT_ROOT"
    assert independent["marker"] == "PROBE_EXACT_ISO_N5_G1_ADJACENT_ONE_SIDED_DEFICIT_FINITE_G1_BERNSTEIN"
    assert root["forests"] == independent["forests"] == 2949
    assert root["componentwise_deletion_patterns"] == independent["deletion_cells"] == 200255
    assert root["minimum_S_one_sided"] == independent["S_one_sided"]["minimum"]["value"] == 0
    assert root["maximum_T_A_X"] == independent["T_correction"]["maximum"]["value"] == 320172
    assert {order: row["patterns"] for order, row in root["rows"].items()} == EXPECTED_PATTERNS
    assert {
        order: row["deletion_cells"] for order, row in independent["rows"].items()
    } == EXPECTED_PATTERNS
    assert {
        order: row["minimum"] for order, row in root["rows"].items()
    } == {
        order: row["minimum_S"] for order, row in independent["rows"].items()
    }
    return {
        "orders_of_A": [0, 12],
        "unlabeled_forests": 2949,
        "componentwise_deletion_patterns": 200255,
        "minimum_S": 0,
        "maximum_T": 320172,
        "per_order_patterns": EXPECTED_PATTERNS,
        "root_ordered_stream_sha256": root["ordered_stream_sha256"],
        "independent_ordered_stream_sha256": independent["ordered_stream_sha256"],
        "independent_complete_censuses": 2,
    }


def algebra_and_cone_certificate() -> dict:
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:7")
    x = sp.symbols("x0:7")
    h = (
        2*a[1]*a[4]-5*a[1]*a[5]-6*a[1]*a[6]+6*a[2]*a[3]
        -8*a[2]*a[5]+5*a[3]**2+6*a[3]*a[4]
    )

    def ell(left, right):
        return 2*(
            left[1]*right[3]-2*left[1]*right[4]-3*left[1]*right[5]
            +2*left[2]*right[2]+2*left[2]*right[3]-left[2]*right[4]
            +left[3]*right[1]+2*left[3]*right[2]+4*left[3]*right[3]
            -2*left[4]*right[1]-left[4]*right[2]-3*left[5]*right[1]
        )

    def k_form(left, right):
        return (
            2*left[1]*right[2]-3*left[1]*right[3]-6*left[1]*right[4]
            +2*left[2]*right[1]+6*left[2]*right[2]+4*left[2]*right[3]
            -3*left[3]*right[1]+4*left[3]*right[2]-6*left[4]*right[1]
        )

    target = sp.expand(h + ell(a, b) + ell(a, a) + k_form(b, a))
    face = sp.expand(h + 2*ell(a, a) + k_form(a, a))
    t_form = (
        (2*a[2]-a[3]-10*a[4]-6*a[5])*x[1]
        +2*(a[1]+5*a[2]+4*a[3]-a[4])*x[2]
        +(-a[1]+8*a[2]+8*a[3])*x[3]
        -2*(5*a[1]+a[2])*x[4]-6*a[1]*x[5]
    )
    assert sp.expand(target.subs(dict(zip(b, (a[index]-x[index] for index in range(7))))) - face + t_form) == 0

    n, shift = sp.symbols("n shift", nonnegative=True)
    c1_upper = sp.expand_func(2*sp.binomial(n, 2)-sp.binomial(n-2, 3))
    shifted_c1_upper = sp.expand(c1_upper.subs(n, shift+13))
    assert shifted_c1_upper == -shift**3/6-4*shift**2-sp.Rational(149,6)*shift-9
    c3_lower = sp.expand_func(-n+8*sp.binomial(n-1, 2))
    shifted_c3_lower = sp.Poly(sp.expand(c3_lower.subs(n, shift+13)), shift)
    assert all(value > 0 for value in shifted_c3_lower.coeffs())

    # With X=A-B coefficientwise, 0<=x_k<=a_k.  The signs above give
    # T<=2(n+5a2+4a3)a2+(-n+8a2+8a3)a3.
    paid = sp.expand(
        2*(a[1]+5*a[2]+4*a[3])*a[2]
        +(-a[1]+8*a[2]+8*a[3])*a[3]
    )
    residual = sp.expand(face-paid)
    expected_residual = (
        2*a[1]*a[2]+3*a[1]*a[3]-26*a[1]*a[4]-29*a[1]*a[5]
        -6*a[1]*a[6]+4*a[2]**2+14*a[2]*a[3]-8*a[2]*a[4]
        -8*a[2]*a[5]+13*a[3]**2+6*a[3]*a[4]
    )
    assert sp.expand(residual-expected_residual) == 0

    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), 2*n]
    for value in rho:
        q.append(sp.expand(q[-1]*value))
    ratio_a = [q[index]/(sp.Integer(2)**index*sp.factorial(index)) for index in range(7)]
    ratio_residual = sp.expand(residual.subs(dict(zip(a, ratio_a))))
    bracket = (
        15*rho[0]*rho[1]**2*rho[2]+260*rho[0]*rho[1]**2
        -12*rho[0]*rho[1]*rho[2]*rho[3]-120*rho[0]*rho[1]*rho[2]
        +1680*rho[0]*rho[1]+2880*rho[0]
        -3*rho[1]*rho[2]*rho[3]*rho[4]-174*rho[1]*rho[2]*rho[3]
        -1560*rho[1]*rho[2]+1440*rho[1]+5760
    )
    assert sp.expand(11520*ratio_residual/n**2-rho[0]*bracket) == 0

    terminal, d1, d2, d3, d4 = sp.symbols("terminal d1 d2 d3 d4", nonnegative=True)
    high = sp.Poly(sp.expand(bracket.subs({
        rho[4]: terminal,
        rho[3]: terminal+1+d4,
        rho[2]: terminal+2+d4+d3,
        rho[1]: terminal+3+d4+d3+d2,
        rho[0]: terminal+4+d4+d3+d2+d1,
    })), terminal, d1, d2, d3, d4)
    assert len(high.terms()) == 102
    assert all(value > 0 for value in high.coeffs())
    assert min(high.coeffs()) == 3

    bounded = sp.Symbol("r", nonnegative=True)
    low = sp.expand(bracket.subs({
        rho[4]: terminal,
        rho[3]: terminal+1+d4,
        rho[2]: terminal+2+d4+d3,
        rho[1]: terminal+4-bounded+d4+d3+d2,
        rho[0]: terminal+4+d4+d3+d2,
    }))
    assert sp.degree(low, bounded) == 2
    power = [low.coeff(bounded, index) for index in range(3)]
    bernstein = [sp.expand(sum(
        sp.Rational(sp.binomial(k_index, index), sp.binomial(2, index))*power[index]
        for index in range(k_index+1)
    )) for k_index in range(3)]
    low_stats = []
    for coefficient in bernstein:
        polynomial = sp.Poly(coefficient, terminal, d2, d3, d4)
        assert len(polynomial.terms()) == 68
        assert all(value > 0 for value in polynomial.coeffs())
        assert min(polynomial.coeffs()) == 3
        low_stats.append({"terms": 68, "minimum_scalar_coefficient": 3})

    return {
        "exact_deficit_identity": "S(A,B,A)=S(A,A,A)-T(A,A-B)",
        "T": str(t_form),
        "containment": "0<=x_k=a_k-b_k<=a_k",
        "coefficient_signs_for_n_at_least_13": {
            "x1": "nonpositive via 2*C(n,2)-C(n-2,3)<=-9",
            "x2": "bounded above by 2*(n+5*a2+4*a3)",
            "x3": "positive and bounded using x3<=a3",
            "x4_x5": "strictly negative",
        },
        "T_upper": "2*(n+5*a2+4*a3)*a2+(-n+8*a2+8*a3)*a3",
        "residual_after_payment": str(expected_residual),
        "ratio_identity": "11520*residual/n^2=rho1*B(rho1,...,rho5)",
        "ratio_bracket": str(bracket),
        "high_delta1_cone": {"terms": 102, "minimum_scalar_coefficient": 3},
        "low_delta1_cone": {"degree_in_r": 2, "bernstein_coefficients": low_stats},
        "all_cone_coefficients_strictly_positive": True,
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE/name) == expected, name
    finite = validate_finite()
    analytic = algebra_and_cone_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For adjacent marks, if C=A and B is the componentwise-neighbor "
            "deletion subforest, then S(A,B,A)=M5+3*C5 is nonnegative. "
            "By symmetry the same holds when B=A."
        ),
        "finite_certificate": finite,
        "all_order_certificate": analytic,
        "all_order_scope": "|A|>=13; the proof actually needs only coefficientwise B<=A",
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "One-sided adjacent face only. The case dB>0 and dC>0, full adjacent "
            "S, g1, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_deletion_patterns": finite["componentwise_deletion_patterns"],
        "finite_minimum": finite["minimum_S"],
        "high_terms": analytic["high_delta1_cone"]["terms"],
        "low_bernstein_terms": [
            row["terms"] for row in analytic["low_delta1_cone"]["bernstein_coefficients"]
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
