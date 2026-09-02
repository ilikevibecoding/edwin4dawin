#!/usr/bin/env python3
"""Explore whether the rank-4 C4 proof transfers to the Q4 reserve."""

from __future__ import annotations

import argparse
from itertools import product

import sympy as sp

from verify_rank4_global_leaf_curvature import (
    tensor_bernstein_coefficients,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=20)
    parser.add_argument("--nonleaf", action="store_true")
    args = parser.parse_args()
    u = sp.symbols("u", nonnegative=True)
    A2, A3, A4, t = sp.symbols("A2 A3 A4 t", nonnegative=True)
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)
    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", real=True
    )

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    e = n - 1
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    disconnected_pair_plus_edge = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - disconnected_pair_plus_edge
        + W
    )
    q4 = sp.expand(8 * i4**2 - i3 * i4 - 10 * i3 * i5)
    delta = sp.expand(
        q4.xreplace(
            {
                n: n + 1,
                S: S + d,
                R: R + Z,
                H: H + choose(d, 2),
                W: W + Y,
            }
        )
        - q4
    )

    N = 1 / u
    substitutions = {
        n: N,
        S: (N**2 * A2 + N - 2) / 2,
        H: (N**3 * A3 - (N - 2)) / 6,
        R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
        W: (
            N**4 * A4
            - 2 * N**3 * A3
            - N**2 * A2
            + 2 * (N - 2)
        )
        / 24
        + N**3 * Tc
        + N**2 * P5,
        d: N * t + 1,
        Z: (N**2 * t**2 + N * t) / 2 + N * q1,
        Y: (
            (N**3 * t**3 - N * t) / 6
            + (N**2 * q2 - N * q1) / 2
            + N**2 * t * q1
            + N * qd
        ),
    }
    F = sp.cancel(delta.subs(substitutions) * u**6)
    print("denominator:", sp.factor(sp.denom(F)))

    M = 1 - 2 * u
    m = M - t
    for variable in (A4, P5, q2, qd, Tc):
        print("derivative", variable, "=", sp.factor(sp.diff(F, variable)))

    effective_a3 = sp.factor(sp.diff(F, A3) + m * sp.diff(F, A4))
    print("effective A3 derivative =", effective_a3)

    effective_b = sp.factor(
        sp.diff(F, B) + (1 - 4 * u) * sp.diff(F, Tc) / 2
    )
    print("effective B derivative =", effective_b)
    correlated = sp.expand(
        F.subs(
            {
                B: t * q1 + u * qd,
                Tc: (1 - 4 * u) * (t * q1 + u * qd) / 2,
            }
        )
    )
    print(
        "correlation-adjusted qd derivative =",
        sp.factor(sp.diff(correlated, qd)),
    )
    correlated_q_reduced = sp.expand(
        correlated.subs({q2: q1**2, qd: m - q1})
    )
    print(
        "correlated q1 second derivative =",
        sp.factor(sp.diff(correlated_q_reduced, q1, 2)),
    )

    q_reduced = sp.expand(F.subs({q2: q1**2, qd: m - q1}))
    print("q1 second derivative =", sp.factor(sp.diff(q_reduced, q1, 2)))

    # Try the same extremal substitutions as the C4 proof.  The output is
    # a diagnostic only unless all preceding monotonicity signs are proved.
    v, s, z, w = sp.symbols("v s z w", nonnegative=True)
    t_box = u + (M - u) * s if args.nonleaf else M * s
    m_box = M * (1 - s)
    A2_box = t_box**2 + m_box**2 * z
    common = {
        A2: A2_box,
        A3: t_box**3 + m_box**3 * z**2,
        A4: t_box**4 + m_box**4 * z**2,
        t: t_box,
        P5: (M**2 - A2_box) / 2,
    }
    for endpoint_name, endpoint in (("q=u", u), ("q=m", m_box)):
        b_lower = t_box * endpoint + u * (m_box - endpoint)
        q2_upper = (
            endpoint**2
            if endpoint_name == "q=u"
            else m_box**2 * z
        )
        branch = sp.expand(
            F.subs(
                common
                | {
                    q1: endpoint,
                    q2: q2_upper,
                    qd: m_box - endpoint,
                    B: b_lower,
                    Tc: (1 - 4 * u) * b_lower / 2,
                }
            ).subs(u, v / args.scale)
        )
        for half in (0, 1):
            subbox = sp.expand(branch.subs(z, (half + w) / 2))
            degrees, coefficients = tensor_bernstein_coefficients(
                subbox, (v, s, w)
            )
            minimum = min(coefficients, key=lambda item: item[0])
            print(
                endpoint_name,
                "half",
                half,
                "degrees",
                degrees,
                "minimum",
                minimum,
            )

    # On the q1=u endpoint, integrality forces q2=u^2 and the unique
    # distance-two vertex gives A2 >= t^2+u^2+qd^2.  A weaker linear
    # consequence, qd <= (A2-t^2-u^2)/u, follows because qd is an
    # integer multiple of u and qd^2 >= u*qd.  Test this polynomial
    # upper bound as a diagnostic.
    qd_linear = sp.cancel((A2_box - t_box**2 - u**2) / u)
    b_linear = t_box * u + u * qd_linear
    branch_linear = sp.cancel(
        F.subs(
            common
            | {
                q1: u,
                q2: u**2,
                qd: qd_linear,
                B: b_linear,
                Tc: (1 - 4 * u) * b_linear / 2,
            }
        ).subs(u, v / args.scale)
    )
    print("q=u linear-resource denominator:", sp.factor(sp.denom(branch_linear)))
    if sp.denom(branch_linear) == 1:
        for half in (0, 1):
            subbox = sp.expand(branch_linear.subs(z, (half + w) / 2))
            degrees, coefficients = tensor_bernstein_coefficients(
                subbox, (v, s, w)
            )
            minimum = min(coefficients, key=lambda item: item[0])
            print(
                "q=u linear-resource",
                "half",
                half,
                "degrees",
                degrees,
                "minimum",
                minimum,
            )

    # A sharper q1=u model keeps the forced combinatorial groups
    # separate.  There is exactly one unit of excess among neighbors
    # and exactly one distance-two vertex.  Put its excess mass at qd,
    # and let r be all remaining excess.  Conditional moment bounds give
    #
    #   A2=t^2+u^2+qd^2+r^2 z,
    #   A3>=t^3+u^3+qd^3+r^3 z^2,
    #   A4<=t^4+u^4+qd^4+r(A3-t^3-u^3-qd^3).
    #
    # Thus after the monotone A4/A3 reductions the displayed lower
    # moments are polynomial.  This is still diagnostic here; a final
    # verifier must prove every derivative sign.
    t_group = (1 - 3 * u) * s
    h_group = (1 - 3 * u) * (1 - s)
    qd_group = h_group * w
    r_group = h_group * (1 - w)
    A2_group = (
        t_group**2 + u**2 + qd_group**2 + r_group**2 * z
    )
    A3_group = (
        t_group**3 + u**3 + qd_group**3 + r_group**3 * z**2
    )
    A4_group = (
        t_group**4 + u**4 + qd_group**4 + r_group**4 * z**2
    )
    b_group = t_group * u + u * qd_group
    group_branch = sp.expand(
        F.subs(
            {
                A2: A2_group,
                A3: A3_group,
                A4: A4_group,
                t: t_group,
                P5: ((1 - 2 * u) ** 2 - A2_group) / 2,
                q1: u,
                q2: u**2,
                qd: qd_group,
                B: b_group,
                Tc: (1 - 4 * u) * b_group / 2,
            }
        ).subs(u, v / args.scale)
    )
    print("q=u grouped denominator:", sp.factor(sp.denom(group_branch)))
    print(
        "q=u grouped boundary v=1,s=0,w=0:",
        sp.factor(group_branch.subs({v: 1, s: 0, w: 0})),
    )
    for zhalf in (0, 1):
        for whalf in (0, 1):
            subbox = sp.expand(
                group_branch.subs(
                    {
                        z: (zhalf + z) / 2,
                        w: (whalf + w) / 2,
                    },
                    simultaneous=True,
                )
            )
            degrees, coefficients = tensor_bernstein_coefficients(
                subbox, (v, s, w, z)
            )
            minimum = min(coefficients, key=lambda item: item[0])
            print(
                "q=u grouped",
                "zhalf",
                zhalf,
                "whalf",
                whalf,
                "degrees",
                degrees,
                "minimum",
                minimum,
            )
    for zpart in range(4):
        for wpart in range(2):
            subbox = sp.expand(
                group_branch.subs(
                    {
                        z: (zpart + z) / 4,
                        w: (wpart + w) / 2,
                    },
                    simultaneous=True,
                )
            )
            degrees, coefficients = tensor_bernstein_coefficients(
                subbox, (v, s, w, z)
            )
            minimum = min(coefficients, key=lambda item: item[0])
            print(
                "q=u grouped fine",
                "zpart",
                zpart,
                "wpart",
                wpart,
                "minimum",
                minimum,
            )


if __name__ == "__main__":
    main()
