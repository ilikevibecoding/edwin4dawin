#!/usr/bin/env python3
"""Exact global operator/convolution audit for swapped rank-six G2.

This is a reduction and obstruction report only.  It proves no sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_swapped_global_operator_obstruction_exact_agent_20260831.json"
MARKER = "PENDING_EXACT_ISO_N6_BUNDLE_G2_SWAPPED_GLOBAL_OPERATOR_OBSTRUCTION_AGENT"
PINS = {
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "iso_n6_bundle_g1_ordinary_leaf_residual_q_counterexample_exact_g1_nonadjacent_20260831.json":
        "C9ADC311C143B915D863DECBDC7F7E95392E76A6D353DDFCB43E9633AEA44242",
    "iso_n6_bundle_g2_swapped_superforest_vertex_recurrence_exact_agent_20260831.json":
        "610D0983EEE9CF9F7AD5B3326BF43ECD7A221AE934EC7781B1BAC6C5FF5A7CC3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def shift(row, amount: int):
    return tuple(sp.Integer(0) if k < amount else row[k - amount] for k in range(8))


def multiply(row, factor):
    return tuple(
        sp.expand(sum(factor[i] * row[k-i] for i in range(min(k, len(factor)-1)+1)))
        for k in range(8)
    )


def replace_rows(expression, oldrows, newrows):
    return sp.expand(expression.xreplace({
        old: new
        for oldrow, newrow in zip(oldrows, newrows)
        for old, new in zip(oldrow, newrow)
    }))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    q_witness = json.loads((HERE / next(name for name in PINS if "q_counterexample" in name)).read_text())
    assert q_witness["exact_values"]["Q_H_J"] == -113715696

    jrows, crows = rows("J"), rows("C")
    JE, JU, JV, JW = jrows
    CE, CU, CV, CW = crows
    zero = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    g2 = reconstruct(2)
    phi = sp.expand(substitute(g2, jrows, crows) - substitute(g2, jrows, zero))

    cores = {
        "E_W_rank_core": 12*JE[4]*CW[3] - 7*(JE[3]*CW[4] + JE[5]*CW[2]),
        "U_V_rank_core": 12*JU[3]*CV[4] - 7*(JU[2]*CV[5] + JU[4]*CV[3]),
        "V_U_rank_core": 12*JV[3]*CU[4] - 7*(JV[2]*CU[5] + JV[4]*CU[3]),
        "E_W_shifted_rank_core": 12*CE[5]*JW[2] - 7*(CE[4]*JW[3] + CE[6]*JW[1]),
    }
    reserves = {
        "E_W_low_reserve": 2*JE[3]*CW[2],
        "U_V_low_reserve": 2*JU[2]*CV[3],
        "V_U_low_reserve": 2*JV[2]*CU[3],
        "E_W_shifted_low_reserve": 2*CE[4]*JW[1],
        "U_W_cross_reserve": 2*JU[3]*CW[3] - JU[2]*CW[4] - JU[4]*CW[2],
        "V_W_cross_reserve": 2*JV[3]*CW[3] - JV[2]*CW[4] - JV[4]*CW[2],
        "W_U_cross_reserve": 2*JW[2]*CU[4] - JW[1]*CU[5] - JW[3]*CU[3],
        "W_V_cross_reserve": 2*JW[2]*CV[4] - JW[1]*CV[5] - JW[3]*CV[3],
    }
    decomposition = sp.expand(sum(cores.values()) + sum(reserves.values()))
    assert decomposition == phi

    # Exact component-product convolution check with generic quadratic truncations.
    f = sp.symbols("f0:3")
    h = sp.symbols("h0:3")
    product_j = tuple(multiply(row, h) for row in jrows)
    product_c = tuple(multiply(row, f) for row in crows)
    direct_product = replace_rows(replace_rows(phi, jrows, product_j), crows, product_c)
    kernel_sum = sp.Integer(0)
    for i in range(3):
        for k in range(3):
            kernel_sum += f[i] * h[k] * replace_rows(
                replace_rows(phi, jrows, tuple(shift(row, k) for row in jrows)),
                crows, tuple(shift(row, i) for row in crows),
            )
    assert sp.expand(direct_product - kernel_sum) == 0

    report = {
        "marker": MARKER,
        "status": "exact global representation and obstruction; swapped-superforest sign remains open",
        "theorem": None,
        "nested_operator_identity": {
            "identity": "Phi_J(C)=g2_6(J,C)-g2_6(J,0)=P6(C,xJ)=B6(x*C,x^2*J)",
            "meaning": (
                "B6 is the symmetric bilinear polarization of the quadratic marked nested Newton "
                "operator N6.  Thus the target already is one exact nested-N6 cross term."
            ),
        },
        "exact_block_decomposition": {
            "cores": {name: str(sp.expand(value)) for name, value in cores.items()},
            "reserves": {name: str(sp.expand(value)) for name, value in reserves.items()},
            "sum_equals_Phi": True,
            "interpretation": (
                "The four 12/-7 terms are rank-six Newton cross-polarization cores.  The remaining "
                "four +2 low reserves and four 2/-1 cross-log-concavity reserves are inseparable "
                "at the level of currently certified inequalities; individual reserve signs are not asserted."
            ),
        },
        "quadratic_positivity_vs_copositivity": {
            "polarization_formula": "B(X,Y)=N(X+Y)-N(X)-N(Y), up to the fixed convention for B.",
            "logical_gap": (
                "N>=0 on a cone, even a cone closed under addition, does not imply B>=0 there; "
                "one additionally needs superadditivity/copositivity of N."
            ),
            "elementary_exact_obstruction": (
                "N(a,b)=(a-b)^2 is nonnegative on all real vectors, but its cross term between "
                "X=(1,0) and Y=(0,1) is -2 under the displayed convention."
            ),
            "genuine_forest_cross_obstruction": {
                "identity": "Q(H,J)=P6(xH,xJ) is another shifted B6 cross term on genuine forest rows.",
                "exact_value": q_witness["exact_values"]["Q_H_J"],
                "effect": (
                    "Therefore blanket copositivity of the nested-N6 polarization on shifted genuine "
                    "forest directions is false.  This does not disprove the differently shifted target Phi."
                ),
            },
            "cross_orientation_payment_boundary": (
                "The frozen cross-orientation theorem proves a quadratic payment on one forest row. "
                "Polarizing that payment would require a new copositivity theorem on pairs of nested rows; "
                "its diagonal positivity alone supplies no sign for the cross term."
            ),
        },
        "component_product_convolution": {
            "identity": (
                "If every C row has a common ordinary-component factor F=sum_i f_i x^i and every J row "
                "has factor G=sum_j h_j x^j, then Phi_(GJ0)(FC0)="
                "sum_(i,j) f_i h_j Phi_(x^j J0)(x^i C0)."
            ),
            "exact_symbolic_replay": "verified for generic degree-two F,G; bilinearity proves the unrestricted finite convolution",
            "positive_weights_not_enough": (
                "The convolution weights f_i h_j are nonnegative for genuine components, but the kernels "
                "are unequally shifted cross terms.  They are not frozen G2 cells or diagonal N6 payments, "
                "and their signs are not certified."
            ),
            "forest_domain_issue": (
                "Disjoint union multiplies independence polynomials; it does not realize the additive row "
                "X+Y used by quadratic polarization.  Formal shifts x^i C0 have zero constant term for i>0 "
                "and are generally not independence rows of unweighted forests."
            ),
        },
        "precise_next_global_lemma": (
            "Prove nonnegativity of the complete twelve-block sum (four 12/-7 cores plus the eight "
            "listed reserves) on nested genuine forest rows, or prove a valence-independent convolution "
            "theorem signing every weighted sum of the unequally shifted kernels arising from component products."
        ),
        "scope_guard": (
            "No copositivity theorem, swapped-superforest theorem, retention lemma, retained-isolate theorem, "
            "universal leaf lemma, universal rank-six G1 theorem, or Erdos Problem 993 is asserted."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "status": report["status"],
        "source_sha256": report["source_sha256"],
        "next_lemma": report["precise_next_global_lemma"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
