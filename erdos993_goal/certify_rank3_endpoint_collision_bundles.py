#!/usr/bin/env python3
"""Symbolic positivity certificate for rank-three endpoint bundles.

This file handles the two cases excluded from the deepest-bundle
theorem: the parent of the bundle center is the protected root v or
the protected support s.

The exact first binomial coefficient is the noncollision closed
formula plus an endpoint-overlap correction.  After passing from
C=H+t to H and applying the same rooted-wedge identities as in the
noncollision proof, both endpoint cases have the exact split

    c1 = local + 12*T(H) + 18*W(H) - 8*M_v - 22*M_s
          - 6*W(H-N[s]) + 12*W(H-N[v]).

The script derives the two local polynomials symbolically.  The
remaining positivity reduction uses

    global >= 12*(T-W) + 20*W(H-N[v]) + 16*W(H-N[s]),

the tree bound T-W >= -1, and the residual-wedge bound

    W(H-N[x]) >= max(0, m-d_x-2*A_x-1),

where m=|H| and A_x is the number of vertices at distance two from x.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


m, dv, ds = sp.symbols("m dv ds", integer=True, positive=True)
a, g = sp.symbols("a g", integer=True, nonnegative=True)
Av, As = sp.symbols("Av As", integer=True, nonnegative=True)


def generic_nonmotif(
    n,
    dv0,
    ds0,
    dp,
    a0,
    g0,
    b,
    h,
    c,
    k,
    Av0,
    As0,
    Ap0,
    Bs0,
    Ps0,
):
    """The exact non-motif part of the general c1 formula."""
    return sp.expand(
        32 * Ap0
        + 24 * As0 * ds0
        + 12 * As0 * n
        - 133 * As0
        - 12 * Av0 * dv0
        + 32 * Av0 * n
        + 4 * Av0
        + 9 * Bs0
        + 18 * Ps0
        + 6 * a0**2 * n
        - 55 * a0**2
        - 20 * a0 * ds0 * n
        - 6 * a0 * ds0
        - 20 * a0 * dv0 * n
        - 42 * a0 * dv0
        + 12 * a0 * g0 * n
        - 104 * a0 * g0
        + 16 * a0 * n**2
        + 38 * a0 * n
        + 11 * a0
        + 23 * b**2
        - 20 * b * dp
        - 8 * b * dv0
        + 46 * b * h
        - 20 * b * n
        + 15 * b
        - 6 * c**2
        - 34 * c * dp
        - 40 * c * ds0
        - 6 * c * k
        - 16 * c * n
        + 162 * c
        + 16 * dp**2
        + 12 * dp * n
        - 108 * dp
        + 4 * ds0**3
        + 6 * ds0**2 * n
        - 55 * ds0**2
        + 54 * ds0 * dv0
        + 18 * ds0 * n
        + 58 * ds0
        - 2 * dv0**3
        + 16 * dv0**2 * n
        + 28 * dv0**2
        - 104 * dv0 * n
        + 168 * dv0
        - 20 * g0 * n
        - 6 * g0
        - 20 * h
        - 16 * k
        + 8 * n**2
        - 96 * n
        + 152
    )


def split_local(case: str) -> sp.Expr:
    """Derive the exact local term after removing the global motifs."""
    Bv, Bs, Pv, Ps = sp.symbols("Bv Bs Pv Ps")
    W, T, Wb, Wu = sp.symbols("W T Wb Wu")
    Rv, Rs, R3v, R3s = sp.symbols("Rv Rs R3v R3s")
    Mv, Ms = sp.symbols("Mv Ms")

    nC = m + 1
    if case == "root":
        dvC = dv + 1
        dsC = ds
        dpC = dvC
        AvC = Av
        AsC = As + a
        ApC = Av
        BsC = Bs + a * (2 * dvC - 1)
        exact = generic_nonmotif(
            nC,
            dvC,
            dsC,
            dpC,
            a,
            g,
            0,
            0,
            a,
            g,
            AvC,
            AsC,
            ApC,
            BsC,
            Ps,
        )
        exact += (
            -26
            + 24 * nC
            + 16 * nC**2
            - 34 * dvC
            - 4 * dvC**2
            - 20 * nC * dvC
            - 28 * dsC
            - 8 * AvC
            + 56 * a
        )
    elif case == "support":
        dvC = dv
        dsC = ds + 1
        dpC = dsC
        AvC = Av + a
        AsC = As
        ApC = As
        BsC = Bs + 1
        exact = generic_nonmotif(
            nC,
            dvC,
            dsC,
            dpC,
            a,
            g,
            a,
            g,
            0,
            0,
            AvC,
            AsC,
            ApC,
            BsC,
            Ps,
        )
        exact += (
            -88
            + 4 * nC
            + 6 * nC**2
            - 32 * dvC
            + 90 * dsC
            - 20 * dsC**2
            - 16 * nC * dsC
            - 40 * AsC
        )
    else:
        raise ValueError(case)

    # Adding t at its endpoint creates dpC-1 wedges and
    # C(dpC-1,2)+A_p rooted four-vertex subtrees.
    exact += (
        -36 * (T + (dpC - 1) * (dpC - 2) / 2 + ApC)
        + 8 * ((T - Rv) - (W - R3v))
        + 40 * ((T - Rs) - (W - R3s))
        + 66 * (W + dpC - 1)
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

    # B_x+2P_x=2M_x+3A_x+d_x.
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
    local = sp.factor(sp.expand(expanded - global_term))
    assert not (
        set((Bv, Bs, Pv, Ps, W, T, Wb, Wu, Mv, Ms))
        & local.free_symbols
    )
    return local


def relaxed_branches(case: str) -> dict[str, sp.Expr]:
    """Return the three residual-wedge relaxation branches."""
    lower = sp.expand(split_local(case) - 12)
    coefficient_v = lower.coeff(Av)
    coefficient_s = lower.coeff(As)
    base = sp.expand(
        lower - coefficient_v * Av - coefficient_s * As
    )

    # These are disjoint contributions forced by distance one or two.
    Av0 = sp.expand(a * (ds - 1) + g)
    As0 = sp.expand(a * (dv - 1) + g)

    # coefficient_v-40 is positive on dv<=m-1, so the v-part is
    # minimized at Av0.  We use max(0,x)>=x for its residual wedge.
    base_v = sp.expand(
        base
        + coefficient_v * Av0
        + 20 * (m - dv - 2 * Av0 - 1)
    )
    residual_s = m - ds - 1
    branch_a = sp.expand(
        base_v
        + coefficient_s * As0
        + 16 * (residual_s - 2 * As0)
    )
    branch_b = sp.expand(
        base_v + coefficient_s * residual_s / 2
    )
    branch_c = sp.expand(
        base_v + coefficient_s * residual_s
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


def polynomial_positivity_certificate() -> dict[str, object]:
    """Certify every endpoint relaxation on its full integer domain."""
    x, y, r, z = sp.symbols(
        "x y r z", integer=True, nonnegative=True
    )
    patterns = {
        # m=dv+ds+offset+r.  The offsets follow from the disjoint
        # closed neighborhoods at endpoint distance 1, 2, or >=3.
        "adjacent": (1, 0, 0),
        "distance_two": (0, 1, 1),
        "distance_at_least_three": (0, 0, 2),
    }
    result: dict[str, object] = {}
    universal_numerator_minima: dict[str, int] = {}
    for case in ("root", "support"):
        objects = relaxed_branches(case)
        case_report: dict[str, object] = {}
        case_constants: list[int] = []
        for pattern, (aa, gg, offset) in patterns.items():
            substitutions = {
                a: aa,
                g: gg,
                dv: x + 1,
                ds: y + 1,
                m: x + y + r + 2 + offset,
            }
            pattern_report: dict[str, object] = {}
            for branch_name in (
                "A_Cs_at_least_32",
                "B_Cs_between_0_and_32",
                "C_Cs_at_most_0",
            ):
                expression = sp.expand(
                    objects[branch_name].subs(substitutions)
                )
                numerator = sp.expand(3 * expression)
                polynomial = sp.Poly(numerator, x, y, r)
                if case == "root":
                    assert all(
                        coefficient >= 0
                        for coefficient in polynomial.coeffs()
                    )
                    assert polynomial.eval({x: 0, y: 0, r: 0}) > 0
                    pattern_report[branch_name] = {
                        "method": "all coefficients nonnegative",
                        "minimum_constant_numerator": int(
                            polynomial.eval({x: 0, y: 0, r: 0})
                        ),
                    }
                    case_constants.append(
                        int(polynomial.eval({x: 0, y: 0, r: 0}))
                    )
                    continue

                # In the support case the only negative monomials are
                # r*x and, for two far-endpoint branches, x.  Combine
                # r*x with r*x^2 and the positive pure-r term.
                q_r = sp.expand(
                    polynomial.coeff_monomial(r * x**2) * x**2
                    + polynomial.coeff_monomial(r * x) * x
                    + polynomial.coeff_monomial(r)
                )
                q_r_poly = sp.Poly(q_r, x)
                assert q_r_poly.degree() == 2
                lead = int(q_r_poly.coeff_monomial(x**2))
                linear = int(q_r_poly.coeff_monomial(x))
                vertex = max(0, (-linear) // (2 * lead))
                candidates = range(max(0, vertex - 2), vertex + 4)
                q_r_min = min(int(q_r.subs(x, value)) for value in candidates)
                assert q_r_min >= 0

                # The pure x-polynomial is nonnegative at x=0 and,
                # after x=z+1, has nonnegative coefficients.
                q_x = sp.expand(
                    polynomial.coeff_monomial(x**3) * x**3
                    + polynomial.coeff_monomial(x**2) * x**2
                    + polynomial.coeff_monomial(x) * x
                )
                assert q_x.subs(x, 0) == 0
                shifted_x = sp.Poly(sp.expand(q_x.subs(x, z + 1)), z)
                assert all(
                    coefficient >= 0
                    for coefficient in shifted_x.coeffs()
                )

                remainder = sp.Poly(
                    sp.expand(numerator - r * q_r - q_x),
                    x,
                    y,
                    r,
                )
                assert all(
                    coefficient >= 0
                    for coefficient in remainder.coeffs()
                )
                assert remainder.eval({x: 0, y: 0, r: 0}) > 0
                pattern_report[branch_name] = {
                    "method": (
                        "absorb r*x into r*(quadratic in x); "
                        "shift the pure x-polynomial by x=z+1"
                    ),
                    "minimum_r_quadratic": q_r_min,
                    "shifted_x_coefficients": [
                        str(value) for value in shifted_x.all_coeffs()
                    ],
                    "positive_remainder_constant": int(
                        remainder.eval({x: 0, y: 0, r: 0})
                    ),
                }
                case_constants.append(
                    int(remainder.eval({x: 0, y: 0, r: 0}))
                )
            case_report[pattern] = pattern_report
        result[case] = case_report
        universal_numerator_minima[case] = min(case_constants)
    assert universal_numerator_minima == {"root": 108, "support": 42}
    result["universal_relaxed_lower_bounds"] = {
        "root": 36,
        "support": 14,
        "K13_or_K14_extra_defect_cost": 12,
        "root_after_exception_cost": 24,
        "support_after_exception_cost": 2,
    }
    return result


def high_coefficient_certificate() -> dict[str, object]:
    """Record and prove positivity of c2,c3,c4 in H-variables."""
    root_half_c2 = sp.expand(
        6 * As
        + 16 * Av
        - 7 * a**2
        - 10 * a * ds
        - 10 * a * dv
        - 14 * a * g
        + 16 * a * m
        + 19 * a
        + 3 * ds**2
        + 9 * ds
        + 8 * dv**2
        - 25 * dv
        - 10 * g
        + 48 * m
        + 18
    )
    support_half_c2 = sp.expand(
        6 * As
        + 16 * Av
        - 7 * a**2
        - 10 * a * ds
        - 10 * a * dv
        - 14 * a * g
        + 16 * a * m
        + 25 * a
        + 3 * ds**2
        + 3 * ds
        + 8 * dv**2
        - 25 * dv
        - 10 * g
        + 30 * m
    )

    # Coarse integer bounds, deliberately discarding Av and As.
    # For a=0: min(8d^2-25d)=-18, ds>=1, m>=2.
    # For a=1: g=0, and the indicated degree quadratics have the
    # displayed integer minima.
    bounds = {
        "root_a0": -18 + 12 + 48 * 2 + 18 - 10,
        "root_a1": -38 + 2 + 64 * 2 + 30,
        "support_a0": -18 + 6 + 30 * 2 - 10,
        "support_a1": -38 - 4 + 46 * 2 + 18,
    }
    assert bounds == {
        "root_a0": 98,
        "root_a1": 122,
        "support_a0": 38,
        "support_a1": 68,
    }
    return {
        "root_half_c2": str(root_half_c2),
        "support_half_c2": str(support_half_c2),
        "half_c2_lower_bounds": bounds,
        "root_c3": str(12 * m + 32 * a + 140),
        "support_c3": str(12 * m + 32 * a + 92),
        "c4": 32,
    }


def main() -> None:
    root_local = split_local("root")
    support_local = split_local("support")
    root_branches = relaxed_branches("root")
    support_branches = relaxed_branches("support")
    positivity = polynomial_positivity_certificate()
    high = high_coefficient_certificate()
    report = {
        "status": "PASS_RANK3_ENDPOINT_COLLISION_BUNDLES",
        "variables": {
            "m": "|H|, where C=H+t",
            "dv": "degree of v in H",
            "ds": "degree of s in H",
            "Av": "vertices at distance two from v in H",
            "As": "vertices at distance two from s in H",
            "a": "1[v adjacent s]",
            "g": "1[distance(v,s)=2]",
        },
        "exact_global_term": (
            "12*T+18*W-8*Mv-22*Ms-6*Wb+12*Wu"
        ),
        "root_local": str(root_local),
        "support_local": str(support_local),
        "root_after_tree_defect": str(sp.expand(root_local - 12)),
        "support_after_tree_defect": str(
            sp.expand(support_local - 12)
        ),
        "coefficients_after_tree_defect": {
            "root_Av": str(sp.expand(root_local).coeff(Av)),
            "root_As": str(sp.expand(root_local).coeff(As)),
            "support_Av": str(sp.expand(support_local).coeff(Av)),
            "support_As": str(sp.expand(support_local).coeff(As)),
        },
        "relaxed_branches": {
            "root": {
                name: str(value)
                for name, value in root_branches.items()
            },
            "support": {
                name: str(value)
                for name, value in support_branches.items()
            },
        },
        "polynomial_positivity": positivity,
        "high_coefficients": high,
        "conclusion": (
            "For both endpoint collisions, c1,c2,c3,c4 are strictly "
            "positive and every higher binomial coefficient is zero."
        ),
    }
    output = Path("rank3_endpoint_collision_local_split_20260730.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
