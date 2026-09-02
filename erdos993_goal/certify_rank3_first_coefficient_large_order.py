#!/usr/bin/env python3
"""Symbolic large-order certificate for the rank-three bundle c1.

This file isolates the corrected large-order reduction used by
``prove_rank3_deepest_bundle_first_coefficient.py``.

For the tree L=C-t, write W(F) and T(F) for the numbers of connected
three- and four-vertex sets.  For x in L, let M_x be the rooted wedge
set from the identity

    B_x + 2 P_x = 2 M_x + 3 A_x + d_x.

The exact c1 formula reduces to a local polynomial plus

    G = 12 T(L) + 18 W(L) - 8 M_v - 22 M_s
        - 6 W(L-N[s]) + 12 W(L-N[v]).

The two rooted wedge injections give

    G >= 12(T(L)-W(L))
         + 20 W(L-N[v]) + 16 W(L-N[s]).

For a tree of order at least six, T-W >= -1.  Also, if
A_x is the number of vertices at distance two from x, then the forest
L-N[x] has

    r=n-d_x-2 vertices and e=n-d_x-A_x-2 edges,

so W(L-N[x]) >= max(0,2e-r)
                 = max(0,n-d_x-2A_x-2).

The remaining expressions below depend only on n, three degrees, and
six truncated distance indicators.  They are the exact relaxation
that must be certified nonnegative for n>=18.
"""

from __future__ import annotations

from itertools import product
from math import ceil, floor
import json
from pathlib import Path

import sympy as sp


n, dv, ds, dp = sp.symbols(
    "n dv ds dp", integer=True, positive=True
)
a, g, b, h, c, k = sp.symbols(
    "a g b h c k", integer=True, nonnegative=True
)
Av, As, Ap = sp.symbols("Av As Ap", integer=True, nonnegative=True)

INDICATORS = (a, g, b, h, c, k)
VARIABLES = (n, dv, ds, dp, *INDICATORS)


def realized_indicator_patterns():
    """All truncated distance patterns of three vertices in a tree."""
    patterns = set()
    for rv, rs, rp in product(range(4), repeat=3):
        if sum(value == 0 for value in (rv, rs, rp)) > 1:
            continue
        dvs = rv + rs
        dvp = rv + rp
        dsp = rs + rp
        if min(dvs, dvp, dsp) == 0:
            continue
        patterns.add(
            (
                int(dvs == 1),
                int(dvs == 2),
                int(dvp == 1),
                int(dvp == 2),
                int(dsp == 1),
                int(dsp == 2),
            )
        )
    return sorted(patterns)


def local_after_tree_defect_bound():
    """Local lower polynomial after 12(T-W)>=-12.

    Av,As,Ap refer to distance-two counts in L=C-t.  This expression
    was obtained by expanding the exact c1 formula, the rooted
    four-subtree identities, and the two rooted wedge identities.
    """
    return sp.expand(
        (
            -12 * Ap
            - 48 * As * ds
            + 36 * As * n
            + 42 * As
            - 60 * Av * dv
            + 96 * Av * n
            + 84 * Av
            + 18 * a**2 * n
            - 165 * a**2
            - 60 * a * ds * n
            - 18 * a * ds
            - 60 * a * dv * n
            - 126 * a * dv
            + 36 * a * g * n
            - 312 * a * g
            + 48 * a * n**2
            + 114 * a * n
            + 33 * a
            + 69 * b**2
            - 60 * b * dp
            - 60 * b * dv
            + 138 * b * h
            + 36 * b * n
            + 57 * b
            - 18 * c**2
            - 48 * c * dp
            - 48 * c * ds
            - 18 * c * k
            - 12 * c * n
            + 60 * c
            - 6 * dp**2
            + 36 * dp * n
            + 36 * dp
            - 8 * ds**3
            + 18 * ds**2 * n
            - 45 * ds**2
            + 162 * ds * dv
            + 54 * ds * n
            + 101 * ds
            - 10 * dv**3
            + 48 * dv**2 * n
            + 108 * dv**2
            - 312 * dv * n
            + 484 * dv
            - 60 * g * n
            - 18 * g
            - 60 * h
            - 48 * k
            + 24 * n**2
            - 288 * n
            + 114
        )
        / 3
    )


def verify_exact_local_reduction():
    """Re-derive the local polynomial from the corrected exact formula."""
    Bv, Bs, Pv, Ps = sp.symbols("Bv Bs Pv Ps")
    W, T, Wb, Wu = sp.symbols("W T Wb Wu")
    Rv, Rs, R3v, R3s = sp.symbols("Rv Rs R3v R3s")
    Mv, Ms = sp.symbols("Mv Ms")

    # All A/B/P variables initially refer to C.  The displayed
    # non-motif portion is the exact formula replayed independently
    # against the original recurrence.
    exact = (
        32 * Ap
        + 24 * As * ds
        + 12 * As * n
        - 133 * As
        - 12 * Av * dv
        + 32 * Av * n
        + 4 * Av
        + 9 * Bs
        + 18 * Ps
        + 6 * a**2 * n
        - 55 * a**2
        - 20 * a * ds * n
        - 6 * a * ds
        - 20 * a * dv * n
        - 42 * a * dv
        + 12 * a * g * n
        - 104 * a * g
        + 16 * a * n**2
        + 38 * a * n
        + 11 * a
        + 23 * b**2
        - 20 * b * dp
        - 8 * b * dv
        + 46 * b * h
        - 20 * b * n
        + 15 * b
        - 6 * c**2
        - 34 * c * dp
        - 40 * c * ds
        - 6 * c * k
        - 16 * c * n
        + 162 * c
        + 16 * dp**2
        + 12 * dp * n
        - 108 * dp
        + 4 * ds**3
        + 6 * ds**2 * n
        - 55 * ds**2
        + 54 * ds * dv
        + 18 * ds * n
        + 58 * ds
        - 2 * dv**3
        + 16 * dv**2 * n
        + 28 * dv**2
        - 104 * dv * n
        + 168 * dv
        - 20 * g * n
        - 6 * g
        - 20 * h
        - 16 * k
        + 8 * n**2
        - 96 * n
        + 152
    )

    # Pass from C to L=C-t:
    # Av(C)=Av(L)+b, As(C)=As(L)+c,
    # Bs(C)=Bs(L)+c(2dp-1).
    exact = exact.subs(
        {
            Av: Av + b,
            As: As + c,
            Bs: Bs + c * (2 * dp - 1),
        },
        simultaneous=True,
    )

    # T(C)=T(L)+C(dp-1,2)+Ap and W(C)=W(L)+dp-1.
    # The corrected minor states are T(L-x)-W(L-x).
    exact += (
        -36 * (T + (dp - 1) * (dp - 2) / 2 + Ap)
        + 8 * ((T - Rv) - (W - R3v))
        + 40 * ((T - Rs) - (W - R3s))
        + 66 * (W + dp - 1)
        - 6 * Wb
        + 12 * Wu
    )

    rooted_three_v = dv * (dv - 1) / 2 + Av
    rooted_three_s = ds * (ds - 1) / 2 + As
    rooted_four_v = (
        dv * (dv - 1) * (dv - 2) / 6
        + Bv / 2
        + Pv
        + (dv - sp.Rational(7, 2)) * Av
        - dv / 2
    )
    rooted_four_s = (
        ds * (ds - 1) * (ds - 2) / 6
        + Bs / 2
        + Ps
        + (ds - sp.Rational(7, 2)) * As
        - ds / 2
    )
    expanded = sp.expand(
        exact.subs(
            {
                R3v: rooted_three_v,
                R3s: rooted_three_s,
                Rv: rooted_four_v,
                Rs: rooted_four_s,
            }
        )
    )
    assert expanded.coeff(Bv) == -4
    assert expanded.coeff(Pv) == -8
    assert expanded.coeff(Bs) == -11
    assert expanded.coeff(Ps) == -22

    # Bx+2Px=2Mx+3Ax+dx.
    expanded = sp.expand(
        expanded
        - (-4 * Bv - 8 * Pv)
        + (-8 * Mv - 12 * Av - 4 * dv)
        - (-11 * Bs - 22 * Ps)
        + (-22 * Ms - 33 * As - 11 * ds)
    )
    global_term = (
        12 * T
        + 18 * W
        - 8 * Mv
        - 22 * Ms
        - 6 * Wb
        + 12 * Wu
    )
    local = sp.expand(expanded - global_term)
    assert sp.expand(
        local - 12 - local_after_tree_defect_bound()
    ) == 0
    return {
        "rooted_three_identity": True,
        "rooted_four_identity": True,
        "rooted_wedge_identity": True,
        "exact_split": (
            "c1 = local + 12*T + 18*W - 8*Mv - 22*Ms "
            "- 6*Wb + 12*Wu"
        ),
    }


def elementary_distance_two_bounds():
    """Disjoint lower bounds for Av and As in L=C-t."""
    Av0 = (
        a * (ds - 1)
        + b * (dp - 2)
        + g * (1 - b * c)
        + h * (1 - a * c)
    )
    As0 = (
        a * (dv - 1)
        + c * (dp - 2)
        + g * (1 - b * c)
        + k * (1 - a * b)
    )
    return sp.expand(Av0), sp.expand(As0)


def relaxed_branches():
    """Return the three polynomial branches of the final relaxation.

    The coefficient of Av is at least 40 throughout n>=18, hence the
    Av contribution plus 20 max(0,n-dv-2Av-2) is minimized at Av0.

    Put Cs=12n-16ds+14 and R=n-ds-2.  The minimum of

        Cs*As + 16 max(0,R-2As),  As0<=As<=R,

    is bounded by:

      A. Cs>=32: Cs*As0 + 16(R-2As0);
      B. 0<=Cs<=32: Cs*R/2;
      C. Cs<=0: Cs*R.

    We also use Ap<=n-dp-1 and max(0,x)>=x in the Av residual.
    """
    local = local_after_tree_defect_bound()
    Av0, As0 = elementary_distance_two_bounds()
    coefficient_v = sp.expand(local).coeff(Av)
    coefficient_s = sp.expand(local).coeff(As)
    assert coefficient_v == 32 * n - 20 * dv + 28
    assert coefficient_s == 12 * n - 16 * ds + 14
    base = sp.expand(local - coefficient_v * Av - coefficient_s * As)
    base_v = sp.expand(
        base.subs(Ap, n - dp - 1)
        + coefficient_v * Av0
        + 20 * (n - dv - 2 * Av0 - 2)
    )
    residual_order = n - ds - 2
    branch_a = sp.expand(
        base_v
        + coefficient_s * As0
        + 16 * (residual_order - 2 * As0)
    )
    branch_b = sp.expand(
        base_v + coefficient_s * residual_order / 2
    )
    branch_c = sp.expand(
        base_v + coefficient_s * residual_order
    )
    return {
        "A_Cs_at_least_32": branch_a,
        "B_Cs_between_0_and_32": branch_b,
        "C_Cs_at_most_0": branch_c,
        "Cv": coefficient_v,
        "Cs": coefficient_s,
        "Av0": Av0,
        "As0": As0,
    }


def feasible_degrees(order: int, pattern: tuple[int, ...]):
    """Finite degree iterator used only to replay endpoint minima."""
    aa, _, bb, _, cc, _ = pattern
    for root_degree in range(max(1, aa + bb), order - 1):
        for support_degree in range(max(1, aa + cc), order - 1):
            for parent_degree in range(
                max(2, 1 + bb + cc), order
            ):
                if cc and parent_degree == 2 and support_degree < 2:
                    continue
                if bb and parent_degree == 2 and root_degree < 2:
                    continue
                if aa and root_degree + support_degree > order:
                    continue
                if bb and root_degree + parent_degree > order:
                    continue
                if cc and support_degree + parent_degree > order:
                    continue
                yield root_degree, support_degree, parent_degree


def finite_relaxation_replay(orders=range(18, 31)):
    branches = relaxed_branches()
    functions = {
        name: sp.lambdify(VARIABLES, expression, "math")
        for name, expression in branches.items()
        if name.startswith(("A_", "B_", "C_"))
    }
    result = {}
    for order in orders:
        minimum = None
        for pattern in realized_indicator_patterns():
            for root_degree, support_degree, parent_degree in (
                feasible_degrees(order, pattern)
            ):
                Cs_value = 12 * order - 16 * support_degree + 14
                if Cs_value >= 32:
                    branch = "A_Cs_at_least_32"
                elif Cs_value >= 0:
                    branch = "B_Cs_between_0_and_32"
                else:
                    branch = "C_Cs_at_most_0"
                value = functions[branch](
                    order,
                    root_degree,
                    support_degree,
                    parent_degree,
                    *pattern,
                )
                record = {
                    "value": int(value),
                    "pattern": "".join(map(str, pattern)),
                    "n": order,
                    "dv": root_degree,
                    "ds": support_degree,
                    "dp": parent_degree,
                    "branch": branch,
                }
                if minimum is None or value < minimum["value"]:
                    minimum = record
        result[str(order)] = minimum
    return result


def forward_difference(expression, variable):
    return sp.expand(
        expression.subs(variable, variable + 1) - expression
    )


def nonnegative_after(expression, variable, minimum: int) -> bool:
    """Coefficient certificate on every integer variable>=minimum."""
    slack = sp.symbols(
        f"{variable}_slack", integer=True, nonnegative=True
    )
    polynomial = sp.Poly(
        sp.expand(expression.subs(variable, minimum + slack)), slack
    )
    return all(
        coefficient >= 0
        for coefficient in polynomial.all_coeffs()
    )


def degree_minima(pattern):
    aa, _, bb, _, cc, _ = pattern
    parent_minimum = max(2, 1 + bb + cc)
    root_minimum = max(
        1,
        aa + bb,
        2 if bb and parent_minimum == 2 else 1,
    )
    support_minimum = max(
        1,
        aa + cc,
        2 if cc and parent_minimum == 2 else 1,
    )
    return root_minimum, support_minimum, parent_minimum


def residue_parameter(residue: int):
    """Return n=8q+r and the first q giving n>=18."""
    q = sp.symbols("q", integer=True, nonnegative=True)
    q_minimum = ceil((18 - residue) / 8)
    return q, q_minimum, 8 * q + residue


def integer_supports_in_middle_branch(residue: int):
    """Offsets j with ds=6q+j and 0<=Cs<=32."""
    values = []
    # Bounds after n=8q+r cancel q:
    # (6r-9)/8 <= j <= (6r+7)/8.
    lower = ceil((6 * residue - 9) / 8)
    upper = floor((6 * residue + 7) / 8)
    for offset in range(lower, upper + 1):
        values.append(offset)
    return values


def first_support_in_upper_branch(residue: int):
    """Offset j for ds=6q+j=min{ds:Cs<=0}."""
    return ceil((6 * residue + 7) / 8)


def last_support_in_lower_branch(residue: int):
    """Offset j for max{ds:Cs>=32}, with ds=6q+j."""
    return floor((6 * residue - 9) / 8)


def infinite_symbolic_certificate():
    """Prove all three relaxed branches nonnegative for n>=18."""
    objects = relaxed_branches()
    branch_a = objects["A_Cs_at_least_32"]
    branch_b = objects["B_Cs_between_0_and_32"]
    branch_c = objects["C_Cs_at_most_0"]
    patterns = realized_indicator_patterns()
    assert len(patterns) == 20

    da_n = forward_difference(branch_a, n)
    differences_dp = {
        "A": forward_difference(branch_a, dp),
        "B": forward_difference(branch_b, dp),
        "C": forward_difference(branch_c, dp),
    }
    differences_dv = {
        "A": forward_difference(branch_a, dv),
        "B": forward_difference(branch_b, dv),
        "C": forward_difference(branch_c, dv),
    }
    differences_ds = {
        "A": forward_difference(branch_a, ds),
        "C": forward_difference(branch_c, ds),
    }
    assert sp.Poly(differences_ds["A"], ds).degree() == 2
    assert sp.Poly(differences_ds["A"], ds).LC() < 0
    assert sp.Poly(differences_ds["C"], ds).degree() == 2
    assert sp.Poly(differences_ds["C"], ds).LC() < 0

    checks = {
        "parent_monotonicity": 0,
        "root_difference_growth": 0,
        "root_monotonicity_after_three": 0,
        "lower_branch_support_endpoints": 0,
        "lower_branch_order_monotonicity": 0,
        "lower_branch_terminal_values": 0,
        "middle_branch_residue_values": 0,
        "upper_branch_support_endpoints": 0,
        "upper_branch_residue_values": 0,
    }
    minima = {"A": None, "B": None, "C": None}

    # Parent-degree monotonicity.  In branch A use
    # dp<=n-1, dv<=n-2, and 8ds<=6n-9.  In B,C only the first two
    # upper bounds are needed.
    for pattern in patterns:
        fixed = dict(zip(INDICATORS, pattern))
        bb, cc = pattern[2], pattern[4]
        lower_a = sp.expand(
            differences_dp["A"].subs(fixed).subs(
                {
                    dp: n - 1,
                    dv: n - 2 if bb else 1,
                    ds: (6 * n - 9) / 8 if cc else 1,
                }
            )
        )
        assert nonnegative_after(lower_a, n, 18), (
            pattern,
            lower_a,
        )
        checks["parent_monotonicity"] += 1
        for label in ("B", "C"):
            lower = sp.expand(
                differences_dp[label].subs(fixed).subs(
                    {
                        dp: n - 1,
                        dv: n - 2 if bb else 1,
                    }
                )
            )
            assert nonnegative_after(lower, n, 18), (
                label,
                pattern,
                lower,
            )
            checks["parent_monotonicity"] += 1

    # Every root forward difference is increasing in dv on
    # dv<=n-2.  Its own forward difference has the same positive
    # lower bound in all three branches.
    for label, expression in differences_dv.items():
        growth = forward_difference(expression, dv)
        assert sp.factor(growth - 2 * (16 * n + 26 - 10 * dv)) == 0
        lower_growth = sp.expand(
            growth.subs(dv, n - 2)
        )
        assert nonnegative_after(lower_growth, n, 18)
        checks["root_difference_growth"] += 1

    # Reduce dp first.  Then prove the root forward difference at
    # dv=3 positive, using the smallest support degree in each branch.
    for pattern in patterns:
        fixed = dict(zip(INDICATORS, pattern))
        dv0, ds0, dp0 = degree_minima(pattern)
        candidate_roots = range(dv0, 4)
        lower_a = sp.expand(
            differences_dv["A"].subs(fixed).subs(
                {dv: 3, ds: ds0, dp: dp0}
            )
        )
        assert nonnegative_after(lower_a, n, 18), (
            "A",
            pattern,
            lower_a,
        )
        checks["root_monotonicity_after_three"] += 1
        for label, support_lower in (
            ("B", (6 * n - 9) / 8),
            ("C", (6 * n + 7) / 8),
        ):
            lower = sp.expand(
                differences_dv[label].subs(fixed).subs(
                    {
                        dv: 3,
                        ds: support_lower,
                        dp: dp0,
                    }
                )
            )
            assert nonnegative_after(lower, n, 18), (
                label,
                pattern,
                lower,
            )
            checks["root_monotonicity_after_three"] += 1

        # Branch A: Delta_ds is concave.  Check its lower endpoint
        # symbolically and its residue-dependent upper endpoint.
        for root_degree in candidate_roots:
            lower_endpoint = sp.expand(
                differences_ds["A"].subs(fixed).subs(
                    {dv: root_degree, ds: ds0, dp: dp0}
                )
            )
            assert nonnegative_after(lower_endpoint, n, 18), (
                "A lower ds",
                pattern,
                root_degree,
                lower_endpoint,
            )
            checks["lower_branch_support_endpoints"] += 1
            for residue in range(8):
                q, q_minimum, order_expression = residue_parameter(
                    residue
                )
                support_maximum = (
                    6 * q
                    + last_support_in_lower_branch(residue)
                )
                # The last transition starts at ds_max-1.
                upper_endpoint = sp.expand(
                    differences_ds["A"].subs(fixed).subs(
                        {
                            n: order_expression,
                            dv: root_degree,
                            ds: support_maximum - 1,
                            dp: dp0,
                        }
                    )
                )
                assert nonnegative_after(
                    upper_endpoint, q, q_minimum
                ), (
                    "A upper ds",
                    pattern,
                    residue,
                    root_degree,
                    upper_endpoint,
                )
                checks["lower_branch_support_endpoints"] += 1

            # At fixed endpoint degrees, branch A increases with n.
            order_difference = sp.expand(
                da_n.subs(fixed).subs(
                    {dv: root_degree, ds: ds0, dp: dp0}
                )
            )
            assert nonnegative_after(order_difference, n, 18), (
                "A delta n",
                pattern,
                root_degree,
                order_difference,
            )
            checks["lower_branch_order_monotonicity"] += 1
            terminal = sp.expand(
                branch_a.subs(fixed).subs(
                    {
                        n: 18,
                        dv: root_degree,
                        ds: ds0,
                        dp: dp0,
                    }
                )
            )
            assert terminal >= 0, (
                "A terminal",
                pattern,
                root_degree,
                terminal,
            )
            record = {
                "value": int(terminal),
                "pattern": "".join(map(str, pattern)),
                "n": 18,
                "dv": root_degree,
                "ds": ds0,
                "dp": dp0,
            }
            if minima["A"] is None or terminal < minima["A"]["value"]:
                minima["A"] = record
            checks["lower_branch_terminal_values"] += 1

        # Branch B has at most three residue-dependent support values.
        for residue in range(8):
            q, q_minimum, order_expression = residue_parameter(residue)
            for offset in integer_supports_in_middle_branch(residue):
                support_degree = 6 * q + offset
                for root_degree in candidate_roots:
                    value = sp.expand(
                        branch_b.subs(fixed).subs(
                            {
                                n: order_expression,
                                dv: root_degree,
                                ds: support_degree,
                                dp: dp0,
                            }
                        )
                    )
                    assert nonnegative_after(
                        value, q, q_minimum
                    ), (
                        "B value",
                        pattern,
                        residue,
                        root_degree,
                        offset,
                        value,
                    )
                    initial = int(value.subs(q, q_minimum))
                    record = {
                        "value": initial,
                        "pattern": "".join(map(str, pattern)),
                        "residue": residue,
                        "q": q_minimum,
                        "dv": root_degree,
                        "ds_offset": offset,
                        "dp": dp0,
                    }
                    if (
                        minima["B"] is None
                        or initial < minima["B"]["value"]
                    ):
                        minima["B"] = record
                    checks["middle_branch_residue_values"] += 1

        # Branch C: Delta_ds is concave.  Check the first transition
        # and ds=n-3; hence branch C increases from its first degree.
        for root_degree in candidate_roots:
            for residue in range(8):
                q, q_minimum, order_expression = residue_parameter(
                    residue
                )
                first_support = (
                    6 * q
                    + first_support_in_upper_branch(residue)
                )
                for endpoint in (first_support, order_expression - 3):
                    delta_value = sp.expand(
                        differences_ds["C"].subs(fixed).subs(
                            {
                                n: order_expression,
                                dv: root_degree,
                                ds: endpoint,
                                dp: dp0,
                            }
                        )
                    )
                    assert nonnegative_after(
                        delta_value, q, q_minimum
                    ), (
                        "C delta ds",
                        pattern,
                        residue,
                        root_degree,
                        endpoint,
                        delta_value,
                    )
                    checks["upper_branch_support_endpoints"] += 1

                value = sp.expand(
                    branch_c.subs(fixed).subs(
                        {
                            n: order_expression,
                            dv: root_degree,
                            ds: first_support,
                            dp: dp0,
                        }
                    )
                )
                assert nonnegative_after(value, q, q_minimum), (
                    "C value",
                    pattern,
                    residue,
                    root_degree,
                    value,
                )
                initial = int(value.subs(q, q_minimum))
                record = {
                    "value": initial,
                    "pattern": "".join(map(str, pattern)),
                    "residue": residue,
                    "q": q_minimum,
                    "dv": root_degree,
                    "ds_offset": first_support_in_upper_branch(
                        residue
                    ),
                    "dp": dp0,
                }
                if (
                    minima["C"] is None
                    or initial < minima["C"]["value"]
                ):
                    minima["C"] = record
                checks["upper_branch_residue_values"] += 1

    return {
        "status": "PASS_INFINITE_SYMBOLIC_CERTIFICATE",
        "range": "all integers n>=18",
        "patterns": len(patterns),
        "checks": checks,
        "branch_minima": minima,
    }


def main():
    identity = verify_exact_local_reduction()
    branches = relaxed_branches()
    assert len(realized_indicator_patterns()) == 20
    replay = finite_relaxation_replay()
    assert all(item["value"] >= 0 for item in replay.values())
    infinite = infinite_symbolic_certificate()
    report = {
        "status": "PASS_RANK3_C1_LARGE_ORDER_CERTIFICATE",
        "range": "all integers n>=18",
        "exact_local_reduction": identity,
        "structural_inequalities": {
            "rooted_wedge_injections": (
                "Mv+Wu<=W and Ms+Wb<=W"
            ),
            "tree_defect": (
                "T(L)-W(L)>=-1 for every tree |L|>=6"
            ),
            "residual_wedges": (
                "W(L-N[x])>=max(0,n-dx-2Ax-2)"
            ),
        },
        "infinite_symbolic_certificate": infinite,
        "finite_relaxation_replay": replay,
    }
    Path(
        "rank3_first_coefficient_large_order_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
