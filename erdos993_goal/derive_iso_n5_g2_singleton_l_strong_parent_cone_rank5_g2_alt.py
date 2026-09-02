#!/usr/bin/env python3
"""Exact strong motif lower cone for the singleton mixed g2 term L.

This is a reduction: it proves an explicit rational lower bound for L on
the n>=6,e>=2 parent geometry.  Positivity of the final cone is not asserted.
"""

import sympy as sp

from derive_iso_n5_g2_singleton_l_parent_invariant_rank5_g2_alt import derive_parent


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def derive_strong(qcommon_upper=1):
    parent, s, x = derive_parent("l")
    n=s["n"]; e=s["edge_count"]; du=s["degree_u"]; dv=s["degree_v"]
    adj=s["adjacent"]; W=s["C_wedges_E"]; xu=s["C_neighbor_excess_u"]
    xv=s["C_neighbor_excess_v"]; common=s["C_common_neighbor"]
    dp=x["degree_p"]; xp=x["neighbor_excess_p"]
    apu=x["adjacent_pu"]; apv=x["adjacent_pv"]
    cpu=x["common_neighbor_pu"]; cpv=x["common_neighbor_pv"]
    qW=s["Q_wedges_E"]; qxu=s["Q_neighbor_excess_u"]; qxv=s["Q_neighbor_excess_v"]

    a = sp.factor(sp.diff(parent, s["C_connected3_E"]))
    b = sp.factor(sp.diff(parent, s["C_connected3_U"]))
    c = sp.factor(sp.diff(parent, s["C_connected3_V"]))
    t_mark = sp.Rational(3, 2) * (n - 5)
    bprime = sp.factor(b - t_mark)
    cprime = sp.factor(c - t_mark)
    kstar = sp.factor(a + bprime + cprime - sp.Rational(1, 2) * (n - 4))
    assert sp.expand(bprime - (sp.Rational(13, 2)*n-sp.Rational(27, 2)-2*dp+2*apv)) == 0
    assert sp.expand(cprime - (sp.Rational(13, 2)*n-sp.Rational(27, 2)-2*dp+2*apu)) == 0
    assert sp.expand(kstar - (sp.Rational(13, 2)*n-24+4*dp-6*apu-6*apv)) == 0

    star_floor = sp.factor(2 * W * (W - e + 1) / (3 * (e - 1)))
    deletion_u = choose(du, 3) + choose(xu, 2)
    deletion_v = choose(dv, 3) + choose(xv, 2)
    star_reserve = sp.factor(kstar * star_floor - bprime * deletion_u - cprime * deletion_v)

    high_names = (
        "C_connected3_E", "C_connected3_U", "C_connected3_V",
        "C_connected3_W", "C_three_edge_five_U", "C_connected4_U",
        "C_three_edge_five_V", "C_connected4_V", "Q_connected3_U",
        "Q_connected3_V", "Q_connected3_W",
    )
    high_variables = [s[name] if name in s else x[name] for name in high_names]
    high_variables += [
        s["C_three_edge_five"], s["C_connected4_E"], s["Q_connected3_E"],
        x["Q_three_edge_five"], x["Q_connected4_E"],
    ]
    low = sp.expand(parent.subs({variable: 0 for variable in high_variables}))

    qcommon_coefficient = sp.factor(sp.diff(low, x["Q_common_neighbor"]))
    qcommon_expected = -12*dp + 6*e - 3*n**2 + 13*n - 6
    assert sp.expand(qcommon_coefficient - qcommon_expected) == 0
    # n>=6,e<=n-1 makes this at most -6-12dp, so Q_common<=1.
    strong = sp.cancel(low.subs(x["Q_common_neighbor"], qcommon_upper) + star_reserve)

    return strong, {
        "n": n, "edge_count": e, "degree_u": du, "degree_v": dv,
        "adjacent": adj, "C_wedges_E": W,
        "C_neighbor_excess_u": xu, "C_neighbor_excess_v": xv,
        "C_common_neighbor": common, "degree_p": dp,
        "neighbor_excess_p": xp, "adjacent_pu": apu,
        "adjacent_pv": apv, "common_neighbor_pu": cpu,
        "common_neighbor_pv": cpv, "Q_wedges_E": qW,
        "Q_neighbor_excess_u": qxu, "Q_neighbor_excess_v": qxv,
        "a": a, "bprime": bprime, "cprime": cprime,
        "kstar": kstar, "qcommon_coefficient": qcommon_coefficient,
    }


def main():
    strong, names = derive_strong()
    qW = names["Q_wedges_E"]; qxu = names["Q_neighbor_excess_u"]
    qxv = names["Q_neighbor_excess_v"]; W = names["C_wedges_E"]
    xu = names["C_neighbor_excess_u"]; xv = names["C_neighbor_excess_v"]
    common = names["C_common_neighbor"]
    print("a", names["a"])
    print("bprime", names["bprime"])
    print("cprime", names["cprime"])
    print("kstar", names["kstar"])
    print("qcommon_coefficient", names["qcommon_coefficient"])
    for variable in (qW, qxu, qxv, W, xu, xv, common):
        print("DERIV", variable, sp.factor(sp.diff(strong, variable)))
        print("CURV", variable, sp.factor(sp.diff(strong, variable, 2)))
    numerator, denominator = map(sp.factor, sp.fraction(strong))
    print("DENOMINATOR", denominator)
    print("TERMS", len(sp.Poly(numerator, *sorted(numerator.free_symbols, key=str)).terms()))
    print("SYMBOLS", " ".join(map(str, sorted(numerator.free_symbols, key=str))))


if __name__ == "__main__":
    main()
