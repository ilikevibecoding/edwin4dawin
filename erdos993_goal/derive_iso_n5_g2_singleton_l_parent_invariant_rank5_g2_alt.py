#!/usr/bin/env python3
"""Exact exploratory parent/motif invariant for singleton mixed g2 term L."""

import argparse

import sympy as sp

from derive_iso_n4_bundle_g1_deepest_configuration_agent import i3, i4, i5
from derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein import forest_configuration
from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def derive_parent(target_name="l"):
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    qrows = tuple(tuple(sp.symbols(f"q{name}0:7")) for name in "EUVW")
    zero = tuple((sp.Integer(0),) * 7 for _ in range(4))
    drows = tuple(tuple(crow[k] - at(qrow, k - 1) for k in range(7))
                  for crow, qrow in zip(crows, qrows))
    shifted_q = tuple(tuple(at(qrow, k - 1) for k in range(7)) for qrow in qrows)
    singleton = raw_g2(crows, drows)
    pc = raw_g2(crows, crows)
    pd = raw_g2(drows, drows)
    if target_name == "l":
        target = sp.expand(singleton - pd - raw_g2(shifted_q, zero))
    elif target_name == "delta":
        target = sp.expand(singleton - pd)
    elif target_name == "singleton":
        target = sp.expand(singleton)
    elif target_name == "monotone":
        target = sp.expand(pc - pd)
    else:
        target = sp.expand(2 * singleton - pc - pd)
    expected_q_degree = 1 if target_name == "singleton" else 2
    assert sp.Poly(target, *(symbol for row in qrows for symbol in row)).total_degree() == expected_q_degree
    invariant, symbols = forest_configuration(target, crows, qrows)
    q35, qr4 = sp.symbols("Q_three_edge_five Q_connected4_E", integer=True, nonnegative=True)
    q_i5 = i5(symbols["Q_order"], symbols["Q_edges"], symbols["Q_wedges_E"],
               symbols["Q_connected3_E"], q35, qr4)
    invariant = sp.expand(invariant.subs(qrows[0][5], q_i5))

    # Complete the marked-row IE substitutions that the rank-five g1 helper
    # did not need: C_U5,C_V5,C_W4 and Q_U4,Q_V4,Q_W3.
    n0 = symbols["n"]; e0 = symbols["edge_count"]
    du0 = symbols["degree_u"]; dv0 = symbols["degree_v"]
    adj0 = symbols["adjacent"]
    wedges0 = symbols["C_wedges_E"]
    xu0 = symbols["C_neighbor_excess_u"]; xv0 = symbols["C_neighbor_excess_v"]
    common0 = symbols["C_common_neighbor"]
    cuw = wedges0 - du0 * (du0 - 1) / 2 - xu0
    cvw = wedges0 - dv0 * (dv0 - 1) / 2 - xv0
    cww = (wedges0 - du0 * (du0 - 1) / 2 - dv0 * (dv0 - 1) / 2
           - xu0 - xv0 + adj0 * (du0 + dv0 - 2) + common0)
    crw, c35u, c4u, c35v, c4v = sp.symbols(
        "C_connected3_W C_three_edge_five_U C_connected4_U "
        "C_three_edge_five_V C_connected4_V", integer=True, nonnegative=True
    )
    m0 = symbols["Q_order"]; qe0 = symbols["Q_edges"]
    qzu0 = symbols["Q_mark_u_survives"]; qzv0 = symbols["Q_mark_v_survives"]
    qdu0 = symbols["Q_degree_u"]; qdv0 = symbols["Q_degree_v"]
    qadj0 = symbols["Q_adjacent"]; qw0 = symbols["Q_wedges_E"]
    qxu0 = symbols["Q_neighbor_excess_u"]; qxv0 = symbols["Q_neighbor_excess_v"]
    quw = qw0 - qdu0 * (qdu0 - 1) / 2 - qxu0
    qvw = qw0 - qdv0 * (qdv0 - 1) / 2 - qxv0
    qcommon, qrw, qru, qrv = sp.symbols(
        "Q_common_neighbor Q_connected3_W Q_connected3_U Q_connected3_V",
        integer=True, nonnegative=True,
    )
    qww = (qw0 - qdu0 * (qdu0 - 1) / 2 - qdv0 * (qdv0 - 1) / 2
           - qxu0 - qxv0 + qadj0 * (qdu0 + qdv0 - 2) + qcommon)
    invariant = sp.expand(invariant.subs({
        crows[1][5]: i5(n0 - 1, e0 - du0, cuw, symbols["C_connected3_U"], c35u, c4u),
        crows[2][5]: i5(n0 - 1, e0 - dv0, cvw, symbols["C_connected3_V"], c35v, c4v),
        crows[3][4]: i4(n0 - 2, e0 - du0 - dv0 + adj0, cww, crw),
        qrows[1][4]: i4(m0 - qzu0, qe0 - qdu0, quw, qru),
        qrows[2][4]: i4(m0 - qzv0, qe0 - qdv0, qvw, qrv),
        qrows[3][3]: i3(
            m0 - qzu0 - qzv0,
            qe0 - qdu0 - qdv0 + qadj0,
            qww,
        ),
    }))

    n = symbols["n"]; e = symbols["edge_count"]
    du = symbols["degree_u"]; dv = symbols["degree_v"]
    adjacent = symbols["adjacent"]
    dp, xp = sp.symbols("degree_p neighbor_excess_p", integer=True, nonnegative=True)
    apu, apv = sp.symbols("adjacent_pu adjacent_pv", integer=True, nonnegative=True)
    cpu, cpv = sp.symbols("common_neighbor_pu common_neighbor_pv", integer=True, nonnegative=True)
    qdu = (1 - apu) * du - cpu
    qdv = (1 - apv) * dv - cpv
    rules = {
        symbols["Q_order"]: n - 1 - dp,
        symbols["Q_edges"]: e - dp - xp,
        symbols["Q_mark_u_survives"]: 1 - apu,
        symbols["Q_mark_v_survives"]: 1 - apv,
        symbols["Q_degree_u"]: qdu,
        symbols["Q_degree_v"]: qdv,
        symbols["Q_adjacent"]: adjacent * (1 - apu) * (1 - apv),
    }
    parent = sp.expand(invariant.subs(rules))
    for boolean in (adjacent, apu, apv):
        parent = sp.rem(sp.Poly(parent, boolean), sp.Poly(boolean**2 - boolean, boolean)).as_expr()
        parent = sp.expand(parent)

    extras = {
        "Q_three_edge_five": q35,
        "Q_connected4_E": qr4,
        "C_connected3_W": crw,
        "C_three_edge_five_U": c35u,
        "C_connected4_U": c4u,
        "C_three_edge_five_V": c35v,
        "C_connected4_V": c4v,
        "Q_common_neighbor": qcommon,
        "Q_connected3_W": qrw,
        "Q_connected3_U": qru,
        "Q_connected3_V": qrv,
        "degree_p": dp,
        "neighbor_excess_p": xp,
        "adjacent_pu": apu,
        "adjacent_pv": apv,
        "common_neighbor_pu": cpu,
        "common_neighbor_pv": cpv,
    }
    return parent, symbols, extras


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=("l", "delta", "singleton", "monotone", "midpoint"), default="l")
    args = parser.parse_args()
    parent, symbols, extras = derive_parent(args.target)
    motif_names = (
        "C_connected3_E", "C_connected3_U", "C_connected3_V",
        "C_three_edge_five", "C_connected4_E", "Q_connected3_E",
    )
    for name in motif_names:
        print("DERIV", name, sp.factor(sp.diff(parent, symbols[name])))
    for name in (
        "Q_three_edge_five", "Q_connected4_E", "C_connected3_W",
        "C_three_edge_five_U", "C_connected4_U", "C_three_edge_five_V",
        "C_connected4_V", "Q_common_neighbor", "Q_connected3_W",
        "Q_connected3_U", "Q_connected3_V",
    ):
        variable = extras[name]
        print("DERIV", variable, sp.factor(sp.diff(parent, variable)))
    print("TARGET", args.target)
    print("TERMS", len(sp.Poly(parent, *sorted(parent.free_symbols, key=str)).terms()))
    print("SYMBOLS", " ".join(map(str, sorted(parent.free_symbols, key=str))))
    print("EXPRESSION", sp.factor(parent))


if __name__ == "__main__":
    main()
