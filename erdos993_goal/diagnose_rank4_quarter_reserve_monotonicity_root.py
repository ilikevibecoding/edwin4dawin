#!/usr/bin/env python3
"""Print exact derivative changes for the quarter rank-4 reserve."""

import sympy as sp

from explore_rank4_quarter_reserve_grouped_root import (
    reconstruct_normalized_increment,
)
from verify_rank4_three_halves_leaf_certificate import (
    reconstruct_normalized_increment as reconstruct_old,
)


def main():
    F, x = reconstruct_normalized_increment()
    F0, x0 = reconstruct_old()
    # Both constructors deliberately use the same symbol names, but replace
    # explicitly so the comparison does not rely on SymPy's symbol cache.
    F0 = F0.xreplace({x0[name]: x[name] for name in x})
    u = x["u"]
    A2, A3, A4, t = x["A2"], x["A3"], x["A4"], x["t"]
    B, Tc, P5 = x["B"], x["Tc"], x["P5"]
    q1, q2, qd = x["q1"], x["q2"], x["qd"]
    m = 1 - 2 * u - t

    for variable in (A4, P5, q2, qd, Tc):
        assert sp.expand(sp.diff(F - F0, variable)) == 0

    old_a3 = sp.expand(sp.diff(F0, A3) + m * sp.diff(F0, A4))
    new_a3 = sp.expand(sp.diff(F, A3) + m * sp.diff(F, A4))
    old_b = sp.expand(sp.diff(F0, B) + (1 - 4 * u) * sp.diff(F0, Tc) / 2)
    new_b = sp.expand(sp.diff(F, B) + (1 - 4 * u) * sp.diff(F, Tc) / 2)

    substitutions = {B: t * q1 + u * qd, Tc: (1 - 4 * u) * (t * q1 + u * qd) / 2}
    old_corr = sp.expand(F0.subs(substitutions))
    new_corr = sp.expand(F.subs(substitutions))

    print("DELTA_RESERVE", sp.factor(F - F0))
    print("A3_OLD_TIMES24", sp.factor(24 * old_a3))
    print("A3_CHANGE_TIMES24", sp.factor(24 * (new_a3 - old_a3)))
    print("A3_NEW_TIMES24", sp.factor(24 * new_a3))
    print("B_OLD_TIMES2_OVER_U", sp.factor(2 * old_b / u))
    print("B_CHANGE_TIMES2_OVER_U", sp.factor(2 * (new_b - old_b) / u))
    print("B_NEW_TIMES2_OVER_U", sp.factor(2 * new_b / u))
    print("QD_CORRELATED_OLD_TIMES6_OVER_U2", sp.factor(6 * sp.diff(old_corr, qd) / u**2))
    print("QD_CORRELATED_CHANGE_TIMES6_OVER_U2", sp.factor(6 * sp.diff(new_corr - old_corr, qd) / u**2))
    print("QD_CORRELATED_NEW_TIMES6_OVER_U2", sp.factor(6 * sp.diff(new_corr, qd) / u**2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
