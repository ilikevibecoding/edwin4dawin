#!/usr/bin/env python3
"""Fast floating-point diagnostic for the m=1 root-partition relaxation.

This is search code only.  It evaluates the same exact motif formulas as
derive_terminal_q3_low_newton_m1_root_partition_agent.py, but directly with
NumPy arrays so that a broad counterexample scan does not spend minutes
compiling expanded symbolic endpoint expressions.
"""

from __future__ import annotations

import numpy as np
from math import comb


def c2(x):
    return x * (x - 1) / 2


def c3(x):
    return x * (x - 1) * (x - 2) / 6


def rank3(order, edges, wedges, connected_four):
    independent = c3(order) - edges * (order - 2) + wedges
    matchings = c2(edges) - wedges
    one_edge = (
        edges * c2(order - 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return independent, one_edge


def gaps(j, r, d, R, B2, tau, y):
    N = j + r
    n = N + 1
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = c2(N) - S
    wedges_forest = W - c2(d) - R
    z2 = S * (N - 2) - 2 * wedges_forest
    h2 = c2(S) - (S - R)
    c0 = a + z2 + h2

    v4 = n - 3 + B2 + tau
    iq, sq = rank3(n + 1, n - 1, W, v4)
    it, st = rank3(
        n + 2,
        n + 1,
        W + d + 1,
        v4 + c2(d) + R + d,
    )
    A0 = st * iq - sq * it
    assert np.allclose(iq, p0)

    # Two valid caps for z_j/b.  The first is unconditional rooted incidence.
    # The second is the strong-induction input q_j(F)<=q_2(F), legitimate
    # because F=G-w has strictly smaller order than the current tree base.
    zbar_incidence = j - 1 + y
    zbar_inductive_q2 = j * z2 / (2 * a)
    ebar = 1 + y + zbar_inductive_q2
    # At m=1 the positive R0 term is leading-order and must be retained.
    # Here sq=s3(G disjoint K1)=R0 exactly.
    Q0 = (j + 1) * (c0 + sq) - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    S1 = j / (r + 1)
    H1 = j * y / r
    U1 = 1 + S1 + H1
    coupled_U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + H1
    component_U0 = (d + 1) / (j + 1) + y + H1
    A1bar = p0 + N + 2 + 2 * W + (c0 - a) * p1 / a

    def gap(U0):
        return (j + 1) * (A0 * U1 + a * A1bar * (U0 + U1)) + remainder

    return gap(coupled_U0), gap(component_U0)


def main():
    minima = {}
    candidate_minima = {}
    candidate_negative_counts = {name: 0 for name in ("cz", "pz", "ca", "pa")}
    negative_count = 0
    negative_minima = []
    for j in range(4, 26):
        for r in range(1, 51):
            if j + r < 15:
                continue
            N = j + r
            for d in range(1, N):
                S = N - d
                R = np.arange(1, S + 1, dtype=np.float64)
                quotient = np.floor_divide(R.astype(np.int64), d)
                residual = R - d * quotient
                neighbor_B2_min = d * c2(quotient) + residual * quotient
                B2low = np.full(R.shape, c2(d - 1), dtype=np.float64)
                B2high = c2(d - 1) + c2(R) + c2(S - R)
                B3max = c3(d - 1) + c3(R) + c3(S - R)
                tau_adjacency = (
                    B3max + (d - 1) * R
                    + np.maximum(R, S - R) * (S - R) - (N - 2)
                )
                y_max = min(1.0, S / d)
                for y in (0.0, y_max):
                    for endpoint, B2 in (("lo", B2low), ("hi", B2high)):
                        # Pinned Zagreb plus 3*B3<=(N-3)B2 gives the
                        # correlation-preserving reduced-surplus cap.
                        tau_zagreb = (N - 3) * B2 / 3
                        cz, pz = gaps(j, r, d, R, B2, tau_zagreb, y)
                        ca, pa = gaps(j, r, d, R, B2, tau_adjacency, y)
                        values = cz
                        for name, candidate in zip(("cz", "pz", "ca", "pa"), (cz, pz, ca, pa)):
                            candidate_index = int(np.argmin(candidate))
                            candidate_value = float(candidate[candidate_index])
                            candidate_record = (
                                candidate_value, j, r, d, candidate_index + 1,
                                float(y), endpoint,
                            )
                            if name not in candidate_minima or candidate_value < candidate_minima[name][0]:
                                candidate_minima[name] = candidate_record
                            candidate_negative_counts[name] += int(np.count_nonzero(candidate < 0))
                        index = int(np.argmin(values))
                        value = float(values[index])
                        record = (
                            value, j, r, d, index + 1, int(y), endpoint,
                            tuple(float(x[index]) for x in (cz, pz, ca, pa)),
                        )
                        label = (int(y), endpoint)
                        if label not in minima or value < minima[label][0]:
                            minima[label] = record
                        count = int(np.count_nonzero(values < 0))
                        negative_count += count
                        if value < 0:
                            negative_minima.append(record)
                            print("first_negative", record)
                            return
    print("minima", minima)
    print("candidate_minima", candidate_minima)
    print("candidate_negative_counts", candidate_negative_counts)
    print("negative_count", negative_count)
    print("negative_minima", sorted(negative_minima)[:30])


if __name__ == "__main__":
    main()
