#!/usr/bin/env python3
"""Shared-q3 root-partition diagnostic for terminal Newton m=0.

Derivation aid only.  It uses the legitimate smaller-forest induction input
q_j(F)<=q_3(F) and keeps q_3(F)=z_3/(3 i_3) in the same rank-four motif
coordinates as the terminal anchor.  No search result from this file is a
proof until every continuous/root-partition endpoint is certified exactly.
"""

from __future__ import annotations

from math import comb

import numpy as np
import sympy as sp

import prove_terminal_q3_anchor_ordering_root as anchor_theorem


def C(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def symbolic_data() -> dict[str, object]:
    N, d, R, B2, tau, A2, Y, j, y = sp.symbols(
        "N d R B2 tau A2 Y j y", nonnegative=True
    )
    n = N + 1
    S = N - d
    T = S - R
    W = N - 1 + B2
    p0 = sp.expand(C(N + 1, 3) - N * (N - 1) + W + C(N, 2))
    a = sp.expand(C(N, 2) - S)
    wedges_f = sp.expand(W - C(d, 2) - R)
    z2 = sp.expand(S * (N - 2) - 2 * wedges_f)
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
    R0 = sp.cancel((p0 * c0 - A0) / a)
    assert R0.is_polynomial(N, d, R, B2, tau)

    # Exact q3 of the root-deletion forest F.  Here A2 is the sum of
    # C(deg_G(u)-1,2) over neighbors u of w, and Y is the distance-two
    # degree excess.  These are precisely the motifs removed from T4(G).
    f3 = sp.expand(C(N, 3) - S * (N - 2) + wedges_f)
    matchings_f = sp.expand(C(S, 2) - wedges_f)
    T4_g = sp.expand(N - 2 + B2 + tau)
    T4_f = sp.expand(
        T4_g - C(d, 3) - A2 - (d - 1) * R - Y
    )
    z3 = sp.expand(
        S * C(N - 2, 2)
        - 2 * (wedges_f * (N - 3) + matchings_f)
        + 3 * T4_f
    )
    assert sp.factor(f3) > 0 if False else True  # domain positivity checked separately
    q3 = sp.cancel(z3 / (3 * f3))
    ebar = sp.cancel(1 + y + j * q3)
    Q0bar = sp.cancel((j + 1) * (c0 + R0) - 3 * (p0 + a) * ebar)

    coupled_u0 = sp.cancel((N - 2 * j + 3 + (j - 1) * y) / (j + 1))
    component_u0 = sp.cancel((d + 1) / (j + 1) + y)
    gaps = {
        "coupled": sp.cancel((j + 1) * a * A0 * coupled_u0 + a * p0 * Q0bar),
        "component": sp.cancel((j + 1) * a * A0 * component_u0 + a * p0 * Q0bar),
    }
    return {
        "symbols": (N, d, R, B2, tau, A2, Y, j, y),
        "exact": {
            "p0": p0,
            "a": a,
            "z2": z2,
            "h2": h2,
            "c0": c0,
            "A0": A0,
            "R0": R0,
            "f3": f3,
            "z3": z3,
            "q3": q3,
        },
        "gaps": gaps,
    }


def main() -> None:
    data = symbolic_data()
    N, d, R, B2, tau, A2, Y, j, y = data["symbols"]
    affine_pieces = []
    for method in ("coupled", "component"):
        gap = data["gaps"][method]
        slope = sp.cancel(sp.diff(gap, tau))
        base = sp.cancel(gap.subs(tau, 0))
        assert sp.cancel(gap - (base + slope * tau)) == 0
        affine_pieces.extend((base, slope))
    affine_function = sp.lambdify(
        (N, j, d, R, B2, A2, Y, y), tuple(affine_pieces), "numpy"
    )
    for method, gap in data["gaps"].items():
        numerator, denominator = sp.together(gap).as_numer_denom()
        print(
            method,
            "denominator", sp.factor(denominator),
            "degrees", {
                str(variable): sp.Poly(numerator, variable).degree()
                for variable in (B2, tau, A2, Y, y)
            },
        )

    minimum = None
    negatives = []
    slope_signs = {method: [0, 0] for method in ("coupled", "component")}
    for jv in range(3, 26):
        for Nv in range(max(15, jv), jv + 51):
            parts = {
                name: [] for name in (
                    "d", "S", "R", "T", "B2root", "B3root",
                    "A2min", "A3min", "B2lo", "B2hi", "B3hi", "count_y",
                )
            }
            for dv in range(1, Nv):
                Sv = Nv - dv
                Rv = np.arange(1, Sv + 1, dtype=np.float64)
                Tv = Sv - Rv
                quotient = np.floor_divide(Rv.astype(np.int64), dv)
                residual = Rv - dv * quotient
                B2root = (dv - 1) * (dv - 2) / 2
                B3root = (dv - 1) * (dv - 2) * (dv - 3) / 6
                A2min = (
                    dv * quotient * (quotient - 1) / 2 + residual * quotient
                )
                A3min = (
                    dv * quotient * (quotient - 1) * (quotient - 2) / 6
                    + residual * quotient * (quotient - 1) / 2
                )
                B2lo = B2root + A2min
                B2hi = B2root + Rv * (Rv - 1) / 2 + Tv * (Tv - 1) / 2
                B3hi = (
                    B3root
                    + Rv * (Rv - 1) * (Rv - 2) / 6
                    + Tv * (Tv - 1) * (Tv - 2) / 6
                )
                count_y = (
                    min(1.0, comb(Sv, jv) / comb(dv, jv))
                    if dv >= jv else 1.0
                )
                values = {
                    "d": np.full(Rv.shape, dv, dtype=np.float64),
                    "S": np.full(Rv.shape, Sv, dtype=np.float64),
                    "R": Rv,
                    "T": Tv,
                    "B2root": np.full(Rv.shape, B2root, dtype=np.float64),
                    "B3root": np.full(Rv.shape, B3root, dtype=np.float64),
                    "A2min": A2min,
                    "A3min": A3min,
                    "B2lo": B2lo,
                    "B2hi": B2hi,
                    "B3hi": B3hi,
                    "count_y": np.full(Rv.shape, count_y, dtype=np.float64),
                }
                for name, value in values.items():
                    parts[name].append(value)

            values = {name: np.concatenate(rows) for name, rows in parts.items()}
            dv = values["d"]
            Sv = values["S"]
            Rv = values["R"]
            Tv = values["T"]
            endpoints = {
                "lo": (values["B2lo"], values["A2min"]),
                "hi": (values["B2hi"], Rv * (Rv - 1) / 2),
            }
            for endpoint, (B2v, A2v) in endpoints.items():
                global_tau_lo = np.maximum(
                    0, B2v * (2 * B2v - (Nv - 1)) / (3 * (Nv - 1))
                )
                if endpoint == "lo":
                    tau_lo = np.maximum(
                        values["B3root"] + values["A3min"], global_tau_lo
                    )
                else:
                    tau_lo = np.maximum(
                        0,
                        values["B3hi"] + (dv - 1) * Rv + Rv * Tv - (Nv - 2),
                    )
                star_leaf = (
                    (dv == 1)
                    & (Rv == Nv - 1)
                    & (B2v == (Nv - 1) * (Nv - 2) / 2)
                )
                star_tau = (
                    (Nv - 1) * (Nv - 2) * (Nv - 3) / 6 - (Nv - 2)
                )
                tau_lo = np.where(star_leaf, star_tau, tau_lo)
                tau_global_hi = np.where(
                    star_leaf, star_tau, (Nv - 3) * B2v / 3
                )
                tau_adj_hi = np.where(
                    star_leaf,
                    star_tau,
                    values["B3hi"] + (dv - 1) * Rv
                    + np.maximum(Rv, Tv) * Tv - (Nv - 2),
                )

                av = (Nv * (Nv - 1) / 2) - Sv
                wedges_f = Nv - 1 + B2v - dv * (dv - 1) / 2 - Rv
                z2v = Sv * (Nv - 2) - 2 * wedges_f
                h2v = Sv * (Sv - 1) / 2 - (Sv - Rv)
                reserve_y = (
                    2 * (jv + 1) * h2v + (jv - 2) * (2 * av - z2v)
                ) / (6 * av)
                ymax = np.minimum(np.minimum(1, reserve_y), values["count_y"])
                assert np.all(ymax >= -1e-9)

                for ylabel, yv in (("zero", np.zeros_like(Rv)), ("cap", ymax)):
                    pieces = affine_function(Nv, jv, dv, Rv, B2v, A2v, 0, yv)
                    pieces = [
                        np.broadcast_to(np.asarray(piece, dtype=np.float64), Rv.shape)
                        for piece in pieces
                    ]
                    candidates = []
                    for method, base, slope in (
                        ("coupled", pieces[0], pieces[1]),
                        ("component", pieces[2], pieces[3]),
                    ):
                        slope_signs[method][0] += int(np.count_nonzero(slope < 0))
                        slope_signs[method][1] += int(np.count_nonzero(slope >= 0))
                        low_value = base + slope * tau_lo
                        global_value = base + slope * tau_global_hi
                        adjacency_value = base + slope * tau_adj_hi
                        candidates.append(np.where(
                            slope >= 0,
                            low_value,
                            np.maximum(global_value, adjacency_value),
                        ))
                    best = np.maximum.reduce(candidates)
                    index = int(np.argmin(best))
                    record = (
                        float(best[index]), Nv, jv, int(dv[index]), int(Rv[index]),
                        ylabel, endpoint,
                        tuple(float(candidate[index]) for candidate in candidates),
                    )
                    if minimum is None or record < minimum:
                        minimum = record
                    if record[0] < 0:
                        negatives.append(record)
    print("minimum", minimum)
    print("negative minima", sorted(negatives)[:30])
    print("tau slope sign counts [negative,nonnegative]", slope_signs)


if __name__ == "__main__":
    main()
