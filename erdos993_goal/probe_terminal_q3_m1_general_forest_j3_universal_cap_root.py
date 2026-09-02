#!/usr/bin/env python3
"""Exploratory numeric scan for forest m=1, j=3.

Combines the exact M-sign split with the all-R balanced-neighbor y cap and
minimizes each selected quadratic over the full continuous W interval.
This is a search probe, not a proof artifact.
"""

from __future__ import annotations

import math
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from probe_terminal_q3_m1_general_forest_j3_exact_m_agent import expressions


def path_floor(n: int, k: int) -> int:
    return math.comb(n - k + 1, k) if n >= 2 * k - 1 else 0


def main(max_N: int = 100) -> None:
    current_num, current_den, alt_num, alt_den, mnum, mden, variables = expressions()
    j, r, h, d, R, W, y = variables
    current = sp.cancel((current_num / current_den).subs(j, 3))
    alternate = sp.cancel((alt_num / alt_den).subs(j, 3))
    mcoef = sp.cancel((mnum / mden).subs(j, 3))
    current_fn = sp.lambdify((r, h, d, R, W, y), current, "math")
    alternate_fn = sp.lambdify((r, h, d, R, W, y), alternate, "math")
    mcoef_fn = sp.lambdify((r, h, d, y), mcoef, "math")

    # Exact quadratic coefficients for locating an interior W vertex.
    current_poly = sp.Poly(sp.together(current).as_numer_denom()[0], W)
    alternate_poly = sp.Poly(sp.together(alternate).as_numer_denom()[0], W)
    quad = {}
    for name, poly in (("current", current_poly), ("alternate", alternate_poly)):
        qa = sp.lambdify((r, h, d, R, y), poly.coeff_monomial(W**2), "math")
        qb = sp.lambdify((r, h, d, R, y), poly.coeff_monomial(W), "math")
        quad[name] = (qa, qb)

    minimum = None
    negatives = 0
    cells = surfaces = 0
    for N in range(13, max_N + 1):
        rv = N - 3
        for hv in range(1, (N - 1) // 2 + 1):
            edge_budget = N - 2 * hv
            B = edge_budget - 1
            if B <= 0:
                continue
            for dv in range(1, edge_budget + 1):
                Sv = N - dv
                cS3 = math.comb(Sv, 3) if Sv >= 3 else 0
                for Rv in range(edge_budget - dv + 1):
                    eH = N - hv - dv - Rv
                    # Exact i3 identity plus W(H)<=C(eH,2).
                    h3max = cS3 - eH * (Sv - 2) + eH * (eH - 1) // 2
                    assert h3max >= 0
                    qv, sv = divmod(Rv, dv)
                    center = (
                        (dv - sv) * path_floor(Sv - qv, 2)
                        + sv * path_floor(Sv - qv - 1, 2)
                    )
                    balanced_cap = h3max / (h3max + center) if h3max else 0.0
                    relative_cap = (
                        (Sv - 2) / (Sv - 2 + 3 * (dv - 3))
                        if dv > 3 and Sv >= 3 else 1.0
                    )
                    ycap = min(balanced_cap, relative_cap)
                    c0 = mcoef_fn(rv, hv, dv, 0.0)
                    c1 = mcoef_fn(rv, hv, dv, ycap)
                    ys = [0.0, ycap]
                    if c0 < 0.0 < c1:
                        # mcoef is affine in y.
                        ys.append(ycap * (-c0) / (c1 - c0))
                    low = max(dv * (dv - 1) / 2 + Rv, B)
                    # Exact marked-component correlated wedge upper:
                    # C(d,2)+C(R+1,2)+C(N-2h-d-R+1,2).
                    slack = edge_budget - dv - Rv
                    high = (
                        dv * (dv - 1) / 2
                        + Rv * (Rv + 1) / 2
                        + slack * (slack + 1) / 2
                    )
                    assert low <= high + 1e-9
                    cells += 1
                    for yv in sorted(set(ys)):
                        cv = mcoef_fn(rv, hv, dv, yv)
                        kind = "current" if cv >= -1e-10 else "alternate"
                        fn = current_fn if kind == "current" else alternate_fn
                        qa, qb = quad[kind]
                        wvalues = [low, high]
                        av = qa(rv, hv, dv, Rv, yv)
                        bv = qb(rv, hv, dv, Rv, yv)
                        if av > 0:
                            vertex = -bv / (2 * av)
                            if low < vertex < high:
                                wvalues.append(vertex)
                        for Wv in wvalues:
                            value = fn(rv, hv, dv, Rv, Wv, yv)
                            surfaces += 1
                            record = (value, N, hv, dv, Rv, Wv, yv, kind, ycap)
                            if minimum is None or record < minimum:
                                minimum = record
                            if value < -1e-4:
                                negatives += 1
                                if negatives <= 5:
                                    print("negative", record, flush=True)
    print("cells", cells, "surfaces", surfaces, "negatives", negatives, flush=True)
    print("minimum", minimum, flush=True)


if __name__ == "__main__":
    main()
