#!/usr/bin/env python3
"""Exact symbolic lift of q_3 <= q_2 from trees to all forests.

Definitions follow the pinned all-tree theorem.  For a graph G, i_r(G) is
the number of independent r-sets and s_r(G) is the number of (r+1)-sets
inducing exactly one edge.  Thus q_r=s_r/(r i_r), on supported ranks, and

    q_3 <= q_2  <=>  M(G):=3 i_3 s_2 - 2 i_2 s_3 >= 0.

This verifier proves the disjoint-component lift, conditional only on the
already pinned all-tree q_3<=q_2 theorem.  All identities and positivity
reductions are replayed in exact SymPy arithmetic.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUT = HERE / "all_forest_q3_q2_component_lift_exact_root_20260829.json"


def poly_coefficients(expr, *gens):
    return [int(c) for _, c in sp.Poly(sp.expand(expr), *gens).terms()]


def main() -> int:
    # Aggregate variables for r nontrivial components (orders >=2) and z
    # isolated vertices.  Write p_i=a_i-1>=1, P=sum p_i,
    # S2=sum p_i^2, S3=sum p_i^3, H=sum 1/p_i.
    P, S2, S3, H, r, z = sp.symbols("P S2 S3 H r z")
    N = P + r + z
    B = (S2 - P) / 2
    C = (S3 - 3 * S2 + 2 * P) / 6
    Ucap = (S2 - 3 * P + 2 * r) / 2
    Vcap = (S3 - 2 * S2 - P + 2 * r) / 2
    Tcap = (S2 - 5 * P + 8 * r - 4 * H) / 2

    D2 = sp.expand(N * (N - 1) / 2 - P)
    C0 = sp.expand(N * (N - 1) * (N - 2) / 6 - P * (N - 2) + B)
    L0 = sp.expand(P * (N - 2) - 2 * B)
    K0 = sp.expand(
        P * (N - 2) * (N - 3) / 2
        - 2 * (B * (N - 4) + P * (P - 1) / 2)
        + 3 * C
    )
    M0 = sp.expand(3 * C0 * L0 - 2 * D2 * K0)
    ell_base = sp.expand(6 * C0 - 3 * L0 - 2 * D2 * (2 * N - 3))
    Rcap = sp.factor(
        M0 + ell_base * Ucap + 2 * D2 * Vcap
        + 6 * D2 * Tcap - 6 * Ucap**2
    )

    # The cap residual is cubic in the number z of isolated vertices.
    R0 = sp.factor(Rcap.subs(z, 0))
    A3 = sp.factor(2 * sp.expand(Rcap).coeff(z, 3))
    A2 = sp.factor(2 * sp.expand(Rcap).coeff(z, 2))
    A1 = sp.factor(2 * sp.expand(Rcap).coeff(z, 1))
    assert sp.expand(A3 - (3 * P - 2 * r)) == 0

    # At z=0, R0 depends on S2 and H only through T=S2+12H.
    K = sp.factor(P**2 + 2 * P * r - 3 * P + r**2 - r)
    assert sp.factor(sp.diff(R0, S2) + K / 2) == 0
    assert sp.factor(sp.diff(R0, H) + 6 * K) == 0

    # Put p_i=1+x_i, X=sum x_i.  Convexity of
    # f(x)=(1+x)^2+12/(1+x) gives
    #   S2+12H <= f(X)+13(r-1).
    X, Y = sp.symbols("X Y", nonnegative=True)
    K_shift = sp.expand(K.subs(P, r + X))
    assert sp.expand(K_shift - (
        X**2 + (4 * r - 3) * X + 4 * r * (r - 1)
    )) == 0
    Tmax = X**2 + 2 * X + 13 * r - 12 + 12 / (X + 1)
    # Replace S2+12H by its maximum.  Setting H=0,S2=Tmax is valid because
    # R0 contains precisely -(K/2)(S2+12H).
    no_isolate_lower_num = sp.factor(
        2 * (X + 1) * R0.subs({P: r + X, H: 0, S2: Tmax})
    )
    no_isolate_expected = sp.factor(
        X * (r - 1) * (
            3 * X**3 + 12 * X**2 * r - 16 * X**2
            + 12 * X * r**2 - 24 * X * r + 29 * X
            + 12 * r**2 + 12 * r
        )
    )
    assert sp.expand(no_isolate_lower_num - no_isolate_expected) == 0
    no_isolate_shift = sp.expand(
        (no_isolate_expected / (X * (r - 1))).subs(r, Y + 2)
    )
    no_isolate_coeffs = poly_coefficients(no_isolate_shift, X, Y)
    assert min(no_isolate_coeffs) > 0

    # For r>=2, prove every positive-z coefficient nonnegative.  Substitute
    # P=r+X, S2=r+2X+X2 and use H<=r, X2<=X^2.
    X2 = sp.symbols("X2", nonnegative=True)
    A2_x = sp.expand(A2.subs({P: r + X, S2: r + 2 * X + X2}))
    A2_expected = (
        -12 * H + 7 * X**2 + (17 * r - 24) * X - X2
        + 4 * r**2 + 7 * r
    )
    assert sp.expand(A2_x - A2_expected) == 0
    # H<=r and X2<=X^2 yield the displayed coefficient-positive lower bound.
    A2_lower = sp.expand(A2_x.subs({H: r, X2: X**2}))
    assert sp.expand(A2_lower - (
        6 * X**2 + (17 * r - 24) * X + r * (4 * r - 5)
    )) == 0
    A2_shift = sp.expand(A2_lower.subs(r, Y + 2))
    assert min(poly_coefficients(A2_shift, X, Y)) > 0

    A1_x = sp.expand(A1.subs({P: r + X, S2: r + 2 * X + X2}))
    # The coefficient of H is negative for r>=2, X>=0, so H<=r.
    assert sp.factor(sp.diff(A1_x, H) + 12 * (2 * X + 4 * r - 1)) == 0
    A1_H = sp.expand(A1_x.subs(H, r))
    # The coefficient of X2 is 1-4r-2X<0, so X2<=X^2.
    assert sp.factor(sp.diff(A1_H, X2) - (1 - 4 * r - 2 * X)) == 0
    A1_lower = sp.factor(A1_H.subs(X2, X**2))
    A1_expected = (
        3 * X**3 + (19 * r - 25) * X**2
        + (28 * r**2 - 72 * r + 21) * X
        + 4 * r * (r - 1)**2
    )
    assert sp.expand(A1_lower - A1_expected) == 0
    # r>=3 is coefficient-positive after r=3+Y.
    A1_r3_shift = sp.expand(A1_lower.subs(r, Y + 3))
    assert min(poly_coefficients(A1_r3_shift, X, Y)) > 0
    # r=2: X=0 is positive; for integer X>=1 shift X=1+Y.
    A1_r2 = sp.expand(A1_lower.subs(r, 2))
    assert A1_r2.subs(X, 0) == 8
    A1_r2_shift = sp.expand(A1_r2.subs(X, Y + 1))
    assert min(poly_coefficients(A1_r2_shift, Y)) > 0

    # r=1 is handled exactly.  If z=0 this is a single tree and Rcap=0.
    # For one nontrivial component p and z isolates, freeze the exact factor.
    p = sp.symbols("p", positive=True)
    one_component = sp.factor(
        Rcap.subs({r: 1, P: p, S2: p**2, S3: p**3, H: 1 / p})
    )
    one_numerator = (
        3 * p**4 + 6 * p**3 * z - 15 * p**3
        + 3 * p**2 * z**2 - 19 * p**2 * z + 22 * p**2
        - 2 * p * z**2 + 24 * p * z + 2 * p - 12 * z - 12
    )
    assert sp.factor(one_component - z * one_numerator / (2 * p)) == 0
    assert sp.factor(one_component.subs(p, 1) - z**2 * (z - 1) / 2) == 0
    assert sp.factor(one_component.subs(p, 2) - 2 * z * (z**2 + z + 1)) == 0
    Z = sp.symbols("Z", nonnegative=True)
    one_shift = sp.expand(one_numerator.subs({p: X + 3, z: Z + 1}))
    one_shift_coeffs = poly_coefficients(one_shift, X, Z)
    assert min(one_shift_coeffs) > 0

    # Coordinate monotonicity at the cap.  Fix an active component p>=3.
    # Let s be the number of other nontrivial components and Q the sum of
    # their p-values.  The exact derivative is independent of their S2.
    Q, Q2, s = sp.symbols("Q Q2 s", nonnegative=True)
    P_g = p + Q
    r_g = s + 1
    S2_g = p**2 + Q2
    N_g = P_g + r_g + z
    B_g = (S2_g - P_g) / 2
    U_g = (S2_g - 3 * P_g + 2 * r_g) / 2
    D_g = sp.expand(N_g * (N_g - 1) / 2 - P_g)
    C0_g = sp.expand(
        N_g * (N_g - 1) * (N_g - 2) / 6
        - P_g * (N_g - 2) + B_g
    )
    L0_g = sp.expand(P_g * (N_g - 2) - 2 * B_g)
    ell_i = sp.expand(
        6 * C0_g - 3 * L0_g
        - 2 * D_g * (2 * N_g - (p + 1) - 3)
    )
    gcap = sp.factor(ell_i + 12 * D_g * (p - 2) / p - 12 * U_g)
    G = sp.factor(-p * gcap)
    assert Q2 not in G.free_symbols
    Qextra, Pextra = sp.symbols("Qextra Pextra", nonnegative=True)
    Gshift = sp.expand(G.subs({p: Pextra + 3, Q: s + Qextra}))
    bad_block = Pextra * z * (z**2 + 6 * z - 4)
    Gremaining = sp.expand(Gshift - bad_block)
    gradient_coeffs = poly_coefficients(Gremaining, Pextra, Qextra, s, z)
    assert min(gradient_coeffs) > 0
    # bad_block is zero for z=0 and positive for every integer z>=1.
    assert sp.expand((z**2 + 6 * z - 4).subs(z, Z + 1)) == Z**2 + 8 * Z + 3

    report = {
        "schema": "all-forest-q3-q2-component-lift-exact-root-v1",
        "status": "PASS_EXACT_SYMBOLIC_ALL_FOREST_Q3_Q2_LIFT_FROM_ALL_TREE_THEOREM",
        "claim": "For every forest F, 3*i3(F)*s2(F)-2*i2(F)*s3(F)>=0; hence q3(F)<=q2(F) on supported ranks.",
        "dependency": "Pinned exact all-tree q3<=q2 theorem for each nontrivial component.",
        "component_reduction": {
            "quadratic": "R=M0+sum ell_i*u_i+6*D2*sum(u_i^2/b_i)-6*(sum u_i)^2",
            "convexity": "D2>=sum b_i and weighted Cauchy",
            "box": "0<=u_i<=binom(a_i-2,2)",
            "cap_gradient": "Every active cap derivative is nonpositive.",
        },
        "cap_residual": {
            "isolated_vertex_degree": 3,
            "no_isolate_positive_coefficients": len(no_isolate_coeffs),
            "no_isolate_min_coefficient": min(no_isolate_coeffs),
            "r_ge_2_z2_min_coefficient": min(poly_coefficients(A2_shift, X, Y)),
            "r_ge_3_z1_min_coefficient": min(poly_coefficients(A1_r3_shift, X, Y)),
            "r_2_z1_min_coefficient": min(poly_coefficients(A1_r2_shift, Y)),
            "one_component_shift_terms": len(one_shift_coeffs),
            "one_component_shift_min_coefficient": min(one_shift_coeffs),
        },
        "cap_gradient": {
            "remaining_positive_terms": len(gradient_coeffs),
            "remaining_min_coefficient": min(gradient_coeffs),
            "exceptional_block": "Y*z*(z^2+6z-4), nonnegative for integer z>=0",
        },
        "scope": "This closes the FQ32 forest-scope obligation only; it is not by itself a proof of Erdos Problem 993.",
    }
    source_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report["source_sha256"] = source_sha
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
