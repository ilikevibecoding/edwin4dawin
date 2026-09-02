#!/usr/bin/env python3
"""Adversarial symbolic diagnostic for terminal Newton m=0.

This is a derivation aid, not a theorem certificate.  It keeps the common
tree root-partition coordinates used by the terminal anchor, replaces only
the terminal one-edge ratio and the rank-(j+1) shadow by proved bounds, and
tests whether the resulting relaxation has a viable endpoint structure.
"""

from __future__ import annotations

import sympy as sp
import numpy as np

import prove_terminal_q3_anchor_ordering_root as anchor_theorem


def C(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def symbolic_data() -> dict[str, object]:
    N, d, R, B2, tau, j, y = sp.symbols(
        "N d R B2 tau j y", nonnegative=True
    )
    r = sp.symbols("r", integer=True, nonnegative=True)
    n = N + 1
    S = N - d

    # Exact tree/root coordinates.
    W = N - 1 + B2
    p0 = sp.expand(C(N + 1, 3) - N * (N - 1) + W + C(N, 2))
    a = sp.expand(C(N, 2) - S)
    wedgesF = W - C(d, 2) - R
    z2 = sp.expand(S * (N - 2) - 2 * wedgesF)
    h2 = sp.expand(C(S, 2) - (S - R))
    c0 = sp.expand(a + z2 + h2)

    cross, symbols = anchor_theorem.symbolic_cross()
    ns, ds, ts, ps, vs, neighbor = symbols
    A0 = sp.expand(cross.subs({
        ns: n,
        ds: d,
        ts: 1,
        ps: W,
        vs: n - 3 + B2 + tau,
        neighbor: R,
    }))
    # A0=p0*c0-a*R0 exactly.
    R0 = sp.cancel((p0 * c0 - A0) / a)
    assert sp.cancel(R0).is_polynomial(N, d, R, B2, tau)

    # Strong-induction coupling: q_j(F)<=q_2(F), equivalently
    # z_j/b<=j*z2/(2a).  This is unconditional at j=3 from FQ32 and is a
    # legitimate smaller-forest input at j>=4 in the global induction.
    # Keep y=h_j/b separately.
    ebar = 1 + y + j * z2 / (2 * a)
    Q0bar = sp.expand((j + 1) * (c0 + R0) - 3 * (p0 + a) * ebar)

    # Exact delta_0/b lower bound after choosing either proved U0/b floor.
    coupled_u0 = sp.cancel(
        (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    )
    component_u0 = sp.cancel((d + 1) / (j + 1) + y)
    gaps = {
        "coupled": sp.cancel((j + 1) * a * A0 * coupled_u0 + a * p0 * Q0bar),
        "component": sp.cancel((j + 1) * a * A0 * component_u0 + a * p0 * Q0bar),
    }

    B3max = sp.expand(C(d - 1, 3) + C(R, 3) + C(S - R, 3))
    tau_zagreb = sp.expand((2 * (n - 4) * B2 + B3max) / 7)
    tau_adj = sp.expand(
        B3max
        + (d - 1) * R
        + sp.Max(R, S - R) * (S - R)
        - (N - 2)
    )
    B2lo = C(d - 1, 2)
    B2hi = sp.expand(B2lo + C(R, 2) + C(S - R, 2))

    return {
        "symbols": (N, d, R, B2, tau, j, y, r),
        "exact": {
            "p0": p0,
            "a": a,
            "z2": z2,
            "h2": h2,
            "c0": c0,
            "A0": A0,
            "R0": R0,
            "Q0bar": Q0bar,
        },
        "gaps": gaps,
        "bounds": {
            "B2lo": B2lo,
            "B2hi": B2hi,
            "B3max": B3max,
            "tau_zagreb": tau_zagreb,
            "tau_adj": tau_adj,
        },
    }


def main() -> None:
    data = symbolic_data()
    N, d, R, B2, tau, j, y, r = data["symbols"]
    bounds = data["bounds"]
    for method, gap in data["gaps"].items():
        print(method)
        print("degrees B2,tau,y", [sp.Poly(gap, v).degree() for v in (B2, tau, y)])
        print("tau slope", sp.factor(sp.diff(gap, tau)))
        print("B2 curvature", sp.factor(sp.diff(gap, B2, 2)))

    # Discrete diagnostic only.  The margin increases with tau on the tested
    # domain, so use the pinned nonstar joint lower endpoint
    #   tau >= max(0,B2(2B2-(N-1))/(3(N-1))).
    # Here tau is the reduced coordinate B3+E-(N-2); the tau in the pinned
    # degree-surplus interval is B2 larger.
    # The one star-leaf partition is assigned its exact tau separately.
    functions = {
        method: sp.lambdify(
            (N, j, d, R, B2, tau, y), gap, "numpy"
        )
        for method, gap in data["gaps"].items()
    }
    slope_functions = {
        method: sp.lambdify(
            (N, j, d, R, B2, y), sp.diff(gap, tau), "numpy"
        )
        for method, gap in data["gaps"].items()
    }
    yreserve_function = sp.lambdify(
        (N, j, d, R, B2),
        sp.cancel(
            (
                2 * (j + 1) * data["exact"]["h2"]
                + (j - 2) * (2 * data["exact"]["a"] - data["exact"]["z2"])
            )
            / (6 * data["exact"]["a"])
        ),
        "numpy",
    )
    minimum = None
    negatives = []
    nonpositive_tau_slopes = []
    for jv in range(3, 26):
        for Nv in range(max(15, jv), jv + 51):
            dparts = []
            rparts = []
            b2loparts = []
            b2hiparts = []
            tauloparts = []
            tauhiparts = []
            for dv in range(1, Nv):
                Sv = Nv - dv
                Rvalues = np.arange(1, Sv + 1, dtype=np.float64)
                dparts.append(np.full(Rvalues.shape, dv, dtype=np.float64))
                rparts.append(Rvalues)
                quotient = np.floor_divide(Rvalues.astype(np.int64), dv)
                residual = Rvalues - dv * quotient
                B2root = (dv - 1) * (dv - 2) / 2
                B3root = (dv - 1) * (dv - 2) * (dv - 3) / 6
                B2low = (
                    B2root
                    + dv * quotient * (quotient - 1) / 2
                    + residual * quotient
                )
                B3low = (
                    B3root
                    + dv * quotient * (quotient - 1) * (quotient - 2) / 6
                    + residual * quotient * (quotient - 1) / 2
                )
                b2loparts.append(B2low)
                b2hiparts.append(
                    B2root
                    + Rvalues * (Rvalues - 1) / 2
                    + (Sv - Rvalues) * (Sv - Rvalues - 1) / 2
                )
                # At the balanced lower endpoint B3 is minimized by the same
                # distribution and reduced tau>=B3 for every nonstar tree.
                # At the concentrated upper endpoint both B3 and the weighted
                # adjacency moment are forced exactly.
                global_low = np.maximum(
                    0,
                    B2low * (2 * B2low - (Nv - 1)) / (3 * (Nv - 1)),
                )
                tauloparts.append(np.maximum(B3low, global_low))
                Tvalues = Sv - Rvalues
                B3high = (
                    B3root
                    + Rvalues * (Rvalues - 1) * (Rvalues - 2) / 6
                    + Tvalues * (Tvalues - 1) * (Tvalues - 2) / 6
                )
                tauhiparts.append(np.maximum(
                    0,
                    B3high + (dv - 1) * Rvalues + Rvalues * Tvalues - (Nv - 2),
                ))
            dvalues = np.concatenate(dparts)
            Rvalues = np.concatenate(rparts)
            B2endpoints = {
                "lo": (np.concatenate(b2loparts), np.concatenate(tauloparts)),
                "hi": (np.concatenate(b2hiparts), np.concatenate(tauhiparts)),
            }
            for endpoint, (B2array, taulower) in B2endpoints.items():
                star_leaf = (
                    (dvalues == 1)
                    & (Rvalues == Nv - 1)
                    & (B2array == (Nv - 1) * (Nv - 2) / 2)
                )
                star_tau = (
                    (Nv - 1) * (Nv - 2) * (Nv - 3) / 6 - (Nv - 2)
                )
                taulower = np.where(star_leaf, star_tau, taulower)
                yreserve = np.asarray(yreserve_function(
                    Nv, jv, dvalues, Rvalues, B2array
                ), dtype=np.float64)
                assert np.all(yreserve >= -1e-9)
                yendpoints = {
                    "zero": np.zeros(yreserve.shape, dtype=np.float64),
                    "reserve": np.minimum(1, yreserve),
                }
                for ylabel, yv in yendpoints.items():
                    method_values = []
                    for method in ("coupled", "component"):
                        values = np.asarray(functions[method](
                            Nv, jv, dvalues, Rvalues, B2array, taulower, yv
                        ), dtype=np.float64)
                        slopes = np.asarray(slope_functions[method](
                            Nv, jv, dvalues, Rvalues, B2array, yv
                        ), dtype=np.float64)
                        if np.any(slopes <= 0):
                            index = int(np.flatnonzero(slopes <= 0)[0])
                            nonpositive_tau_slopes.append((
                                float(slopes[index]), method, Nv, jv,
                                int(dvalues[index]), int(Rvalues[index]),
                                ylabel, endpoint,
                            ))
                        method_values.append(values)
                    best = np.maximum.reduce(method_values)
                    index = int(np.argmin(best))
                    record = (
                        float(best[index]), Nv, jv, int(dvalues[index]),
                        int(Rvalues[index]), ylabel, endpoint,
                        float(method_values[0][index]),
                        float(method_values[1][index]),
                    )
                    if minimum is None or record < minimum:
                        minimum = record
                    if record[0] < 0:
                        negatives.append(record)
    print("grid minimum", minimum)
    print("grid negative minima", sorted(negatives)[:20])
    print("nonpositive tau slopes", sorted(nonpositive_tau_slopes)[:20])


if __name__ == "__main__":
    main()
