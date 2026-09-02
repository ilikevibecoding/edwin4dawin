#!/usr/bin/env python3
"""Root-degree-partition diagnostic for terminal Newton m=1."""

import sympy as sp
import numpy as np
import prove_terminal_q3_anchor_ordering_root as anchor_theorem


def C(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main():
    N, d, R, B2, tau, j, y = sp.symbols("N d R B2 tau j y", nonnegative=True)
    r = sp.symbols("r", integer=True, nonnegative=True)
    n = N + 1
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = sp.expand(C(N, 2) - S)
    wedgesF = W - C(d, 2) - R
    z2 = sp.expand(S * (N - 2) - 2 * wedgesF)
    h2 = sp.expand(C(S, 2) - (S - R))
    c0 = sp.expand(a + z2 + h2)

    cross, symbols = anchor_theorem.symbolic_cross()
    ns, ds, ts, ps, vs, neighbor = symbols
    A0 = sp.expand(cross.subs({
        ns: n, ds: d, ts: 1, ps: W, vs: n - 3 + B2 + tau, neighbor: R,
    }))
    ebar = j + 2 * y
    Q0 = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)
    S1 = j / (r + 1)
    H1 = j * y / r
    U1 = 1 + S1 + H1
    coupledU0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + H1
    componentU0 = (d + 1) / (j + 1) + y + H1
    A1bar = sp.cancel(p0 + N + 2 + 2 * W + (c0 - a) * p1 / a)

    # Split excess among root, root-neighbors, and remaining nonroots.
    B3max = sp.expand(C(d - 1, 3) + C(R, 3) + C(S - R, 3))
    tau_zagreb = sp.expand((2 * (n - 4) * B2 + B3max) / 7)
    # Root-oriented adjacency bound.  After the root-edge contribution
    # (d-1)R, child weights sum to S-R and every parent weight is at most
    # max(R,S-R).
    tau_adj_lowR = sp.expand(
        B3max + (d - 1) * R + (S - R) ** 2 - (N - 2)
    )
    tau_adj_highR = sp.expand(
        B3max + (d - 1) * R + R * (S - R) - (N - 2)
    )
    B2lo = C(d - 1, 2)
    B2hi = sp.expand(B2lo + C(R, 2) + C(j + r - d - R, 2))

    functions = {}
    for method, U0 in (("coupled", coupledU0), ("component", componentU0)):
        gap = sp.cancel((j + 1) * (A0 * U1 + a * A1bar * (U0 + U1)) + remainder)
        print(method, "tau_degree", sp.Poly(gap, tau).degree())
        print(method, "y_degree", sp.Poly(gap, y).degree())
        functions[method] = sp.lambdify(
            (j, r, d, R, B2, tau, y), gap.subs(N, j + r), "numpy"
        )

    negative_count = 0
    negative_minima = []
    minima = {}
    for jv in range(4, 26):
        for rv in range(1, 51):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv):
                Sv = Nv - dv
                Rvalues = np.arange(1, Sv + 1, dtype=np.float64)
                low_mask = 2 * Rvalues <= Sv
                B2low = (dv - 1) * (dv - 2) / 2
                B2high = (
                    B2low
                    + Rvalues * (Rvalues - 1) / 2
                    + (Sv - Rvalues) * (Sv - Rvalues - 1) / 2
                )
                B3maximum = (
                    (dv - 1) * (dv - 2) * (dv - 3) / 6
                    + Rvalues * (Rvalues - 1) * (Rvalues - 2) / 6
                    + (Sv - Rvalues) * (Sv - Rvalues - 1) * (Sv - Rvalues - 2) / 6
                )
                tau_adjacency = (
                    B3maximum + (dv - 1) * Rvalues
                    + np.maximum(Rvalues, Sv - Rvalues) * (Sv - Rvalues)
                    - (Nv - 2)
                )
                for yv in (0, 1):
                    for endpoint, B2values in (("lo", B2low), ("hi", B2high)):
                        B2array = np.broadcast_to(
                            np.asarray(B2values, dtype=np.float64), Rvalues.shape
                        )
                        tau_zagreb_values = (
                            2 * (Nv - 3) * B2array + B3maximum
                        ) / 7
                        arrays = []
                        for method in ("coupled", "component"):
                            zagreb = functions[method](
                                jv, rv, dv, Rvalues, B2array, tau_zagreb_values, yv
                            )
                            adjacency = functions[method](
                                jv, rv, dv, Rvalues, B2array, tau_adjacency, yv
                            )
                            arrays.extend((
                                np.broadcast_to(np.asarray(zagreb, dtype=np.float64), Rvalues.shape),
                                np.broadcast_to(np.asarray(adjacency, dtype=np.float64), Rvalues.shape),
                            ))
                        value_array = np.maximum.reduce(arrays)
                        index = int(np.argmin(value_array))
                        value = float(value_array[index])
                        Rv = index + 1
                        vals = [float(array[index]) for array in arrays]
                        label = (yv, endpoint)
                        record = (value, vals, jv, rv, dv, Rv, label)
                        if label not in minima or value < minima[label][0]:
                            minima[label] = record
                        local_negative_count = int(np.count_nonzero(value_array < 0))
                        negative_count += local_negative_count
                        if value < 0:
                            negative_minima.append(record)
    print("minima", minima)
    print("negative_count", negative_count)
    print("negative_minima", sorted(negative_minima)[:20])


if __name__ == "__main__":
    main()
