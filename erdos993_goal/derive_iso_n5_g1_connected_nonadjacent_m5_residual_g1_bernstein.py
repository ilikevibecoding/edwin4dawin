#!/usr/bin/env python3
"""Exact M5 residual for connected nonadjacent marks at rank five.

The already frozen compact identity writes

    S := M5 + 3*C5
      = H(A)+L(A,B)+L(A,C)+K(B,C)+epsilon*K(A,D).

This source reconstructs M5 and C5 from the bivariate nested/defect
operators, applies the occupation rows

    W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D,

and subtracts the C5 blocks exactly.  For connected nonadjacent marks
epsilon=1.  The result is the five-block residual

    M5=HM(A)+LM(A,B)+LM(A,C)+KM(B,C)+KM(A,D).

No sign of the residual is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import defect_form, nested
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)
from derive_iso_nested_compact_operator_root import w, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_residual_exact_g1_bernstein_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_RESIDUAL_G1_BERNSTEIN"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_row(coefficients):
    pz = sum(value * z**index for index, value in enumerate(coefficients))
    pw = sum(value * w**index for index, value in enumerate(coefficients))
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def coefficient(expression: sp.Expr, left: int, right: int) -> sp.Expr:
    return sp.expand(expression).coeff(z, left).coeff(w, right)


def blocks(expression, a, b, c, d, epsilon):
    zero_b = {value: 0 for value in b}
    zero_c = {value: 0 for value in c}
    zero_d = {value: 0 for value in d}
    h = sp.expand(expression.subs(zero_b | zero_c | zero_d))
    ell_b = sp.expand(expression.subs(zero_c | zero_d) - h)
    ell_c = sp.expand(expression.subs(zero_b | zero_d) - h)
    k_bc = sp.expand(expression.subs(zero_d) - h - ell_b - ell_c)
    k_ad = sp.expand((expression - expression.subs({epsilon: 0})) / epsilon)
    assert sp.expand(expression - h - ell_b - ell_c - k_bc - epsilon * k_ad) == 0
    assert sp.expand(ell_c - ell_b.xreplace(dict(zip(b, c)))) == 0
    assert sp.expand(k_ad - k_bc.xreplace({**dict(zip(b, a)), **dict(zip(c, d))})) == 0
    return h, ell_b, k_bc


def main() -> None:
    generic_c, _generic_d, _raw_g1, _raw_g2 = raw_coefficients()
    rows = tuple(polynomial_row(tuple(row)) for row in generic_c)
    n_form = nested(rows)
    r_form = defect_form(rows)
    m5 = sp.expand(2 * coefficient(n_form, 4, 5))
    c5 = sp.expand(coefficient(r_form, 4, 4) - coefficient(r_form, 3, 5))
    s5 = sp.expand(m5 + 3 * c5)

    a = sp.symbols("a0:7")
    b = sp.symbols("b0:6")
    c = sp.symbols("c0:6")
    d = sp.symbols("d0:5")
    epsilon = sp.symbols("epsilon")
    rules = {}
    for index in range(7):
        av = a[index]
        bv = b[index - 1] if 1 <= index <= 6 else 0
        cv = c[index - 1] if 1 <= index <= 6 else 0
        dv = epsilon * d[index - 2] if 2 <= index <= 6 else 0
        rules[sp.Symbol(f"cW{index}")] = av
        rules[sp.Symbol(f"cU{index}")] = av + bv
        rules[sp.Symbol(f"cV{index}")] = av + cv
        rules[sp.Symbol(f"cE{index}")] = av + bv + cv + dv

    m_partition = sp.expand(m5.subs(rules))
    c_partition = sp.expand(c5.subs(rules))
    s_partition = sp.expand(s5.subs(rules))
    assert sp.expand(s_partition - m_partition - 3 * c_partition) == 0

    hm, lm, km = blocks(m_partition, a, b, c, d, epsilon)
    hc, lc, kc = blocks(c_partition, a, b, c, d, epsilon)
    hs, ls, ks = blocks(s_partition, a, b, c, d, epsilon)
    assert sp.expand(hm - (hs - 3 * hc)) == 0
    assert sp.expand(lm - (ls - 3 * lc)) == 0
    assert sp.expand(km - (ks - 3 * kc)) == 0

    expected_hm = sp.expand(
        2*a[1]*a[4] - 2*a[1]*a[5] - 6*a[1]*a[6]
        + 6*a[2]*a[3] - 8*a[2]*a[5] + 2*a[3]**2 + 6*a[3]*a[4]
    )
    expected_lm = sp.expand(
        2*a[1]*b[3] - a[1]*b[4] - 6*a[1]*b[5]
        + 4*a[2]*b[2] + a[2]*b[3] - 2*a[2]*b[4]
        + 2*a[3]*b[1] + a[3]*b[2] + 8*a[3]*b[3]
        - a[4]*b[1] - 2*a[4]*b[2] - 6*a[5]*b[1]
    )
    expected_km = sp.expand(
        2*b[1]*c[2] - 6*b[1]*c[4]
        + 2*b[2]*c[1] + 4*b[2]*c[3]
        + 4*b[3]*c[2] - 6*b[4]*c[1]
    )
    assert sp.expand(hm - expected_hm) == 0
    assert sp.expand(lm - expected_lm) == 0
    assert sp.expand(km - expected_km) == 0

    connected = sp.expand(
        hm + lm + lm.xreplace(dict(zip(b, c))) + km
        + km.xreplace({**dict(zip(b, a)), **dict(zip(c, d))})
    )
    assert sp.expand(connected - m_partition.subs({epsilon: 1})) == 0

    partials = {
        f"B{rank}": sp.factor(sp.diff(connected, b[rank])) for rank in range(1, 6)
    } | {
        f"C{rank}": sp.factor(sp.diff(connected, c[rank])) for rank in range(1, 6)
    } | {
        f"D{rank}": sp.factor(sp.diff(connected, d[rank])) for rank in range(1, 5)
    }
    expected_partials = {
        "B1": 2*a[3] - a[4] - 6*a[5] + 2*c[2] - 6*c[4],
        "B2": 4*a[2] + a[3] - 2*a[4] + 2*c[1] + 4*c[3],
        "B3": 2*a[1] + a[2] + 8*a[3] + 4*c[2],
        "B4": -a[1] - 2*a[2] - 6*c[1],
        "B5": -6*a[1],
        "C1": 2*a[3] - a[4] - 6*a[5] + 2*b[2] - 6*b[4],
        "C2": 4*a[2] + a[3] - 2*a[4] + 2*b[1] + 4*b[3],
        "C3": 2*a[1] + a[2] + 8*a[3] + 4*b[2],
        "C4": -a[1] - 2*a[2] - 6*b[1],
        "C5": -6*a[1],
        "D1": 2*a[2] - 6*a[4],
        "D2": 2*a[1] + 4*a[3],
        "D3": 4*a[2],
        "D4": -6*a[1],
    }
    assert all(sp.expand(partials[key] - value) == 0 for key, value in expected_partials.items())

    report = {
        "marker": MARKER,
        "definitions": {
            "M5": "2*[z^4 w^5]N",
            "C5": "[z^4 w^4]R-[z^3 w^5]R",
            "S": "M5+3*C5",
            "occupation_rows": "W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
            "connected_nonadjacent_specialization": "epsilon=1",
        },
        "exact_connected_nonadjacent_residual": (
            "M5=HM(A)+LM(A,B)+LM(A,C)+KM(B,C)+KM(A,D)"
        ),
        "blocks": {
            "HM": str(sp.factor(hm)),
            "LM": str(sp.factor(lm)),
            "KM": str(sp.factor(km)),
            "term_counts": {
                "HM": len(sp.Add.make_args(hm)),
                "LM": len(sp.Add.make_args(lm)),
                "KM": len(sp.Add.make_args(km)),
                "connected_total": len(sp.Poly(connected, *sorted(connected.free_symbols, key=str)).terms()),
            },
        },
        "exact_checks": {
            "reconstructed_M5_from_nested_operator": True,
            "reconstructed_C5_from_defect_operator": True,
            "M5_equals_S_minus_3C5_blockwise": True,
            "epsilon_one_five_block_specialization": True,
            "B_C_exchange_symmetry": True,
        },
        "connected_row_partials": {key: str(value) for key, value in partials.items()},
        "immediate_fixed_sign_partials": {
            "positive": ["B3", "C3", "D2", "D3"],
            "negative": ["B4", "B5", "C4", "C5", "D4"],
            "requires_forest_geometry": ["B1", "B2", "C1", "C2", "D1"],
        },
        "next_exact_subgates": [
            "complete finite connected-nonedge census for M5 and S",
            "prove or corner-reduce the five geometry-dependent partials for |A|>=13",
            "combine the residual with the frozen connected-nonadjacent C5 cone only after exact row reduction",
        ],
        "dependencies_sha256": {
            "derive_iso_common_factor_product_rule_root.py": sha256(HERE / "derive_iso_common_factor_product_rule_root.py"),
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py": sha256(HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"),
            "derive_iso_nested_compact_operator_root.py": sha256(HERE / "derive_iso_nested_compact_operator_root.py"),
            "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py": sha256(HERE / "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py"),
        },
        "status": "exact algebraic reduction only; no residual sign is asserted",
        "scope": (
            "Connected-nonadjacent M5 residual only. This does not prove M5>=0, "
            "M5+3*C5>=0, g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "blocks": report["blocks"],
        "immediate_fixed_sign_partials": report["immediate_fixed_sign_partials"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
