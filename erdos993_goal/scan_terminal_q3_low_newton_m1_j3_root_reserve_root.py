#!/usr/bin/env python3
"""Diagnostic for the missing tree-base Newton m=1, target j=3 cell.

This keeps the already-proved rooted-forest reserve

    (8 h2 + K2) f3 >= 6 h3 f2,   K2 = 2 f2 - s2,

so y=h3/f3 is capped by (8*h2+2*a-z2)/(6*a).  The terminal
lower is affine in y and tau, hence their endpoint minima are exact for
each fixed root-motif cell.  This remains search code: the B2/root box
still needs an all-order symbolic certificate.
"""

from __future__ import annotations

from math import comb

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def main() -> None:
    minimum = None
    negatives = []
    checks = 0
    for N in range(15, 181):
        for d in range(1, N + 1):
            S = N - d
            if S == 0:
                Rvalues = np.array([0.0])
            else:
                Rvalues = np.arange(1, S + 1, dtype=np.float64)
            blo = np.full(Rvalues.shape, base.c2(d - 1), dtype=np.float64)
            bhi = blo + base.c2(Rvalues) + base.c2(S - Rvalues)
            for endpoint, B2 in (("lo", blo), ("hi", bhi)):
                W = N - 1 + B2
                a = base.c2(N) - S
                wedges_forest = W - base.c2(d) - Rvalues
                z2 = S * (N - 2) - 2 * wedges_forest
                h2 = base.c2(S) - (S - Rvalues)
                b = base.c3(N) - S * (N - 2) + wedges_forest
                reserve_cap = (8 * h2 + 2 * a - z2) / (6 * a)
                # At rank three the low count b is itself an exact root-motif
                # polynomial, while H has only S=N-d vertices.
                h_binomial_cap = np.divide(
                    base.c3(S), b,
                    out=np.zeros(Rvalues.shape), where=b > 0,
                )
                component_cap = 0.0 if d == 0 else S / d
                ycap = np.maximum(0.0, np.minimum.reduce((
                    np.ones(Rvalues.shape),
                    np.full(Rvalues.shape, component_cap),
                    reserve_cap,
                    h_binomial_cap,
                )))
                # Keep the independent pinned-Zagreb and rooted-adjacency
                # upper bounds correlated.  The latter is decisive for the
                # high-B2 double-star face.
                b3max = base.c3(d - 1) + base.c3(Rvalues) + base.c3(S - Rvalues)
                tau_zagreb = (N - 3) * B2 / 3
                tau_adjacency = (
                    b3max + (d - 1) * Rvalues
                    + np.maximum(Rvalues, S - Rvalues) * (S - Rvalues)
                    - (N - 2)
                )
                # Low-surplus cap.  For the rooted forest outdegrees x_v,
                # L=sum C(x_v,2)=B2-C(d-1,2) and
                #   E_deep-(S-R)=sum_(p->u)(x_p-1)x_u.
                # The integer identity
                #   C(x,2)+C(y,2)-(x-1)y=C(x-y,2)>=0
                # and degree accounting give
                #   E_deep-(S-R)<=3L+3B3',
                # while 3B3'<=(S-2)L.  Hence the displayed tau cap.
                L = B2 - base.c2(d - 1)
                tau_low_surplus = (
                    base.c3(d - 1) + (d - 2) * (Rvalues - 1)
                    + 3 * L + 4 * (S - 2) * L / 3
                )
                tau_cap = np.maximum(0.0, np.minimum.reduce((
                    tau_zagreb, tau_adjacency, tau_low_surplus,
                )))
                candidates = []
                labels = []
                yhalf = np.where(ycap >= 0.5, 0.5, ycap)
                for yname, yvalue in (
                    ("y0", np.zeros(Rvalues.shape)),
                    ("yhalf", yhalf),
                    ("ycap", ycap),
                ):
                    for tname, tvalue in (("tau0", np.zeros(Rvalues.shape)), ("taucap", tau_cap)):
                        coupled, component = base.gaps(
                            3, N - 3, d, Rvalues, B2, tvalue, yvalue
                        )
                        # A third exact extension floor is special to rank 3.
                        # Inclusion-exclusion in the S-edge forest F gives
                        #   f4=C(N,4)-S*C(N-2,2)+P*(N-4)+C(S,2)-T3(F),
                        # and trivially T3(F)<=C(S,3).  Since the constant
                        # high row is U0=f4+f3+h3+h2, this is often decisive
                        # when deleting a high-degree marked vertex leaves
                        # many isolated rooted components.
                        f4_floor = (
                            base.c3(N) * (N - 3) / 4
                            - S * base.c2(N - 2)
                            + wedges_forest * (N - 4)
                            + base.c2(S) - base.c3(S)
                        )
                        rank4_u0 = f4_floor / b + 1 + yvalue + h2 / b
                        component_u0 = (d + 1) / 4 + yvalue + 3 * yvalue / (N - 3)
                        p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
                        p1 = (N**2 + N + 2) / 2
                        c0 = a + z2 + h2
                        a1bar = p0 + N + 2 + 2 * W + (c0 - a) * p1 / a
                        rank4 = component + 4 * a * a1bar * (rank4_u0 - component_u0)
                        value = np.maximum.reduce((coupled, component, rank4))
                        candidates.append(np.asarray(value, dtype=np.float64))
                        labels.append((yname, tname))
                values = np.minimum.reduce(candidates)
                checks += int(values.size * len(candidates))
                index = int(np.argmin(values))
                value = float(values[index])
                branch = int(np.argmin([candidate[index] for candidate in candidates]))
                record = (
                    value, N, d, int(Rvalues[index]), endpoint,
                    float(B2[index]), float(ycap[index]), labels[branch],
                )
                if minimum is None or value < minimum[0]:
                    minimum = record
                if value < -1e-6:
                    negatives.append(record)
                    print("first_negative", record)
                    return
        if N in (15, 20, 30, 50, 80, 120, 180):
            print("through", N, "minimum", minimum, "checks", checks, flush=True)
    print("minimum", minimum)
    print("checks", checks)
    print("negatives", negatives)


if __name__ == "__main__":
    main()
