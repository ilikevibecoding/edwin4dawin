#!/usr/bin/env python3
"""Numerically localize the adjacent S coefficient-box obstruction.

This optimizes the path/path corner of the same high-sector relaxation used
by the exact Bernstein probe.  It is diagnostic only.  A negative value is
an obstruction to the relaxation, not a marked-forest counterexample.
"""

from __future__ import annotations

import json
import math

from scipy.optimize import differential_evolution


def generalized_choose(value: float, rank: int) -> float:
    out = 1.0
    for offset in range(rank):
        out *= value - offset
    return out / math.factorial(rank)


def path_row(order: float) -> list[float]:
    return [1.0, order] + [generalized_choose(order - rank + 1, rank) for rank in range(2, 6)]


def coefficient_floor(order: float, edges: float, rank: int) -> float:
    path = generalized_choose(order - rank + 1, rank)
    incidence = generalized_choose(order, rank) - edges * generalized_choose(order - 2, rank - 2)
    return max(path, incidence)


def termwise_lower(point, return_details=False):
    """Safe coefficientwise lower bound using the edge-incidence floor for A."""
    s, z, _r0, _r1, _r2, _r3, P, Q = point
    p = P / (1.0 - P)
    q = Q / (1.0 - Q)
    mb = 7.0 + p
    mc = 7.0 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    if n < 13.0:
        return 1.0 + (13.0 - n)

    upper_a = [generalized_choose(n, rank) for rank in range(7)]
    lower_a = [1.0, n, generalized_choose(n, 2) - edges] + [
        coefficient_floor(n, edges, rank) for rank in range(3, 7)
    ]
    a1 = n
    a2 = generalized_choose(n, 2) - edges
    h_lower = (
        2*a1*lower_a[4]-5*a1*upper_a[5]-6*a1*upper_a[6]
        +6*a2*lower_a[3]-8*a2*upper_a[5]
        +5*lower_a[3]**2+6*lower_a[3]*lower_a[4]
    )

    def lower_row(order):
        return [1.0, order] + [
            generalized_choose(order-rank+1, rank) for rank in range(2, 6)
        ]

    def upper_row(order):
        return [generalized_choose(order, rank) for rank in range(6)]

    bL, cL = lower_row(mb), lower_row(mc)
    bU, cU = upper_row(mb), upper_row(mc)

    def ell_lower(xL, xU):
        return 2*(
            a1*xL[3]-2*a1*xU[4]-3*a1*xU[5]
            +2*a2*xL[2]+2*a2*xL[3]-a2*xU[4]
            +lower_a[3]*xL[1]+2*lower_a[3]*xL[2]+4*lower_a[3]*xL[3]
            -2*upper_a[4]*xU[1]-upper_a[4]*xU[2]-3*upper_a[5]*xU[1]
        )

    k_lower = (
        2*bL[1]*cL[2]-3*bU[1]*cU[3]-6*bU[1]*cU[4]
        +2*bL[2]*cL[1]+6*bL[2]*cL[2]+4*bL[2]*cL[3]
        -3*bU[3]*cU[1]+4*bL[3]*cL[2]-6*bU[4]*cU[1]
    )
    paid_h_lower = max(0.0, h_lower)
    value = paid_h_lower + ell_lower(bL, bU) + ell_lower(cL, cU) + k_lower
    normalized = value / n**6
    if return_details:
        return {
            "variables": list(map(float, point)), "p": p, "q": q,
            "mB": mb, "mC": mc, "N": n, "overlap": overlap,
            "edges": edges, "H_incidence_lower": h_lower,
            "H_paid_lower": paid_h_lower,
            "L_B_lower": ell_lower(bL, bU), "L_C_lower": ell_lower(cL, cU),
            "K_lower": k_lower, "S_lower": value, "S_lower_over_N6": normalized,
        }
    return normalized


def coefficient_box_pathpath(point, return_details=False):
    """Optimize S over individual A coefficient intervals, B/C at path floors."""
    s, z, t3, t4, t5, t6, P, Q = point
    p = P / (1.0 - P)
    q = Q / (1.0 - Q)
    mb = 7.0 + p
    mc = 7.0 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    if n < 13.0:
        return 1.0 + (13.0 - n)
    a = [1.0, n, generalized_choose(n, 2) - edges]
    for rank, parameter in zip(range(3, 7), (t3, t4, t5, t6)):
        lower = coefficient_floor(n, edges, rank)
        upper = generalized_choose(n, rank)
        a.append(lower + parameter * (upper - lower))
    b, c = path_row(mb), path_row(mc)
    h = (
        2*a[1]*a[4]-5*a[1]*a[5]-6*a[1]*a[6]+6*a[2]*a[3]
        -8*a[2]*a[5]+5*a[3]**2+6*a[3]*a[4]
    )
    def ell(x):
        return 2*(
            a[1]*x[3]-2*a[1]*x[4]-3*a[1]*x[5]
            +2*a[2]*x[2]+2*a[2]*x[3]-a[2]*x[4]
            +a[3]*x[1]+2*a[3]*x[2]+4*a[3]*x[3]
            -2*a[4]*x[1]-a[4]*x[2]-3*a[5]*x[1]
        )
    k = (
        2*b[1]*c[2]-3*b[1]*c[3]-6*b[1]*c[4]
        +2*b[2]*c[1]+6*b[2]*c[2]+4*b[2]*c[3]
        -3*b[3]*c[1]+4*b[3]*c[2]-6*b[4]*c[1]
    )
    paid_h = max(0.0, h)
    value = paid_h + ell(b) + ell(c) + k
    normalized = value / n**6
    if return_details:
        return {
            "variables": list(map(float, point)), "p": p, "q": q,
            "mB": mb, "mC": mc, "N": n, "overlap": overlap,
            "edges": edges, "A_coefficients": a, "H_raw": h,
            "H_paid": paid_h,
            "L_B": ell(b), "L_C": ell(c), "K": k,
            "S": value, "S_over_N6": normalized,
        }
    return normalized


def objective(point, return_details=False):
    s, z, r0, r1, r2, r3, P, Q = point
    p = P / (1.0 - P)
    q = Q / (1.0 - Q)
    mb = 7.0 + p
    mc = 7.0 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    if n < 13.0:
        return 1.0 + (13.0 - n)
    rho1 = 2.0 * (n - 1.0) - 4.0 * edges / n
    budget = rho1 - 4.0
    rho5 = budget * r0
    d4 = budget * (1.0 - r0) * r1
    d3 = budget * (1.0 - r0) * (1.0 - r1) * r2
    d2 = budget * (1.0 - r0) * (1.0 - r1) * (1.0 - r2) * r3
    d1 = budget * (1.0 - r0) * (1.0 - r1) * (1.0 - r2) * (1.0 - r3)
    rho4 = rho5 + 1.0 + d4
    rho3 = rho4 + 1.0 + d3
    rho2 = rho3 + 1.0 + d2
    assert abs(rho2 + 1.0 + d1 - rho1) <= 1e-6 * max(1.0, abs(rho1))
    rho = (rho1, rho2, rho3, rho4, rho5)
    qrow = [1.0, 2.0 * n]
    for ratio in rho:
        qrow.append(qrow[-1] * ratio)
    a = [qrow[index] / (2.0**index * math.factorial(index)) for index in range(7)]
    b, c = path_row(mb), path_row(mc)
    h = (
        2*a[1]*a[4]-5*a[1]*a[5]-6*a[1]*a[6]+6*a[2]*a[3]
        -8*a[2]*a[5]+5*a[3]**2+6*a[3]*a[4]
    )
    def ell(x):
        return 2*(
            a[1]*x[3]-2*a[1]*x[4]-3*a[1]*x[5]
            +2*a[2]*x[2]+2*a[2]*x[3]-a[2]*x[4]
            +a[3]*x[1]+2*a[3]*x[2]+4*a[3]*x[3]
            -2*a[4]*x[1]-a[4]*x[2]-3*a[5]*x[1]
        )
    k = (
        2*b[1]*c[2]-3*b[1]*c[3]-6*b[1]*c[4]
        +2*b[2]*c[1]+6*b[2]*c[2]+4*b[2]*c[3]
        -3*b[3]*c[1]+4*b[3]*c[2]-6*b[4]*c[1]
    )
    value = h + ell(b) + ell(c) + k
    normalized = value / n**6
    if return_details:
        return {
            "variables": list(map(float, point)), "p": p, "q": q,
            "mB": mb, "mC": mc, "N": n, "overlap": overlap,
            "edges": edges, "rho": list(rho), "H": h,
            "L_B": ell(b), "L_C": ell(c), "K": k,
            "S": value, "S_over_N6": normalized,
        }
    return normalized


def main():
    bounds = [(0, 1), (0, 1), (0, 1), (0, 1), (0, 1), (0, 1), (0, 0.995), (0, 0.995)]
    results = {}
    for name, function in (
        ("ratio_box", objective),
        ("edge_incidence_termwise", termwise_lower),
        ("coefficient_box_pathpath", coefficient_box_pathpath),
    ):
        result = differential_evolution(
            function,
            bounds=bounds,
            seed=993,
            popsize=18,
            maxiter=250,
            polish=True,
            workers=1,
            updating="immediate",
            tol=1e-10,
        )
        results[name] = {
            "success": bool(result.success),
            "message": str(result.message),
            "iterations": int(result.nit),
            "evaluations": int(result.nfev),
            "minimum": function(result.x, return_details=True),
        }
    report = {
        "results": results,
        "scope": "Numeric relaxation diagnostic only; not a forest counterexample or theorem.",
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
