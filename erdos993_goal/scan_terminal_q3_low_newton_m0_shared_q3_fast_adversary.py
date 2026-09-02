#!/usr/bin/env python3
"""Fast floating diagnostic for the shared-q3 Newton-m0 relaxation.

Search only, not proof.  This directly evaluates the exact motif formulas
without expanded symbolic expressions.
"""

from __future__ import annotations

from math import comb
import os

import numpy as np


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


def gaps(N, j, d, R, B2, tau, A2, Y, y, u_override=None):
    n = N + 1
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    a = c2(N) - S
    wedges_f = W - c2(d) - R
    z2 = S * (N - 2) - 2 * wedges_f
    h2 = c2(S) - (S - R)
    c0 = a + z2 + h2

    v4 = n - 3 + B2 + tau
    iq, R0 = rank3(n + 1, n - 1, W, v4)
    it, st = rank3(
        n + 2,
        n + 1,
        W + d + 1,
        v4 + c2(d) + R + d,
    )
    A0 = st * iq - R0 * it
    assert np.allclose(iq, p0)

    f3 = c3(N) - S * (N - 2) + wedges_f
    matchings_f = c2(S) - wedges_f
    T4_f = N - 2 + B2 + tau - c3(d) - A2 - (d - 1) * R - Y
    z3 = S * c2(N - 2) - 2 * (wedges_f * (N - 3) + matchings_f) + 3 * T4_f
    assert np.all(f3 > 0)
    ebar = 1 + y + j * z3 / (3 * f3)
    Q0 = (j + 1) * (c0 + R0) - 3 * (p0 + a) * ebar
    coupled_u0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    component_u0 = (d + 1) / (j + 1) + y
    exact_j3_u0 = (
        (N - 2) * (N - 3) * (N - 4) * (N - 5) / 24
        + (N - 4) * B2 - tau
        + c3(N - 1) + B2
    ) / f3

    def gap(u0):
        return (j + 1) * a * A0 * u0 + a * p0 * Q0

    output = (gap(coupled_u0), gap(component_u0), gap(exact_j3_u0))
    return output if u_override is None else gap(u_override)


def star_forest_row(arms, maximum):
    row = [1]
    for arm in arms:
        component = [comb(arm, rank) for rank in range(min(arm, maximum) + 1)]
        if len(component) < 2:
            component.append(0)
        component[1] += 1
        updated = [0] * min(maximum + 1, len(row) + len(component) - 1)
        for left, a in enumerate(row):
            for right, b in enumerate(component):
                if left + right < len(updated):
                    updated[left + right] += a * b
        row = updated
    return row


def convolve_rows(left, right, maximum):
    output = [0] * min(maximum + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for k, b in enumerate(right):
            if i + k < len(output):
                output[i + k] += a * b
    return output


def high_endpoint_rows(d, R, T, maximum):
    """Exact F,H rows forced by the concentrated B2 endpoint."""
    leaves = R - 1 + T
    core = [comb(leaves, rank) if rank <= leaves else 0 for rank in range(maximum + 1)]
    for rank in range(1, min(maximum, T + 1) + 1):
        core[rank] += comb(T, rank - 1)
    for rank in range(1, min(maximum, R) + 1):
        core[rank] += comb(R - 1, rank - 1)
    isolates = [comb(d - 1, rank) for rank in range(min(d - 1, maximum) + 1)]
    frow = convolve_rows(core, isolates, maximum)

    star_h = [comb(T, rank) if rank <= T else 0 for rank in range(maximum + 1)]
    star_h[1] += 1
    h_isolates = [comb(R - 1, rank) for rank in range(min(R - 1, maximum) + 1)]
    hrow = convolve_rows(star_h, h_isolates, maximum)
    return frow, hrow


def main():
    minimum = None
    negatives = []
    start_j = int(os.environ.get("M0_SCAN_START_J", "3"))
    stop_j = int(os.environ.get("M0_SCAN_STOP_J", "31"))
    for j in range(start_j, stop_j):
        for N in range(max(15, j), j + 81):
            parts = {name: [] for name in (
                "d", "S", "R", "T", "B2root", "B3root", "A2min", "A3min",
                "B2lo", "B2hi", "B3hi", "count_y",
            )}
            for d in range(1, N):
                S = N - d
                R = np.arange(1, S + 1, dtype=np.float64)
                T = S - R
                q = np.floor_divide(R.astype(np.int64), d)
                residual = R - d * q
                B2root = c2(d - 1)
                B3root = c3(d - 1)
                A2min = d * c2(q) + residual * q
                A3min = d * c3(q) + residual * c2(q)
                row = {
                    "d": np.full(R.shape, d, dtype=np.float64),
                    "S": np.full(R.shape, S, dtype=np.float64),
                    "R": R,
                    "T": T,
                    "B2root": np.full(R.shape, B2root, dtype=np.float64),
                    "B3root": np.full(R.shape, B3root, dtype=np.float64),
                    "A2min": A2min,
                    "A3min": A3min,
                    "B2lo": B2root + A2min,
                    "B2hi": B2root + c2(R) + c2(T),
                    "B3hi": B3root + c3(R) + c3(T),
                    "count_y": np.full(
                        R.shape,
                        min(1.0, comb(S, j) / comb(d, j)) if d >= j else 1.0,
                        dtype=np.float64,
                    ),
                }
                for name, value in row.items():
                    parts[name].append(value)
            values = {name: np.concatenate(rows) for name, rows in parts.items()}
            d, S, R, T = (values[name] for name in ("d", "S", "R", "T"))
            for endpoint, (B2, A2) in {
                "lo": (values["B2lo"], values["A2min"]),
                "hi": (values["B2hi"], c2(R)),
            }.items():
                Y = np.where(T > 0, 1.0, 0.0) if endpoint == "lo" else T
                global_tau_lo = np.maximum(
                    0, B2 * (2 * B2 - (N - 1)) / (3 * (N - 1))
                )
                if endpoint == "lo":
                    B3low = values["B3root"] + values["A3min"]
                    tau_lo = np.maximum(
                        B3low
                        + (d - 1) * R + T - (N - 2),
                        global_tau_lo,
                    )
                    tau_lo = np.maximum(0, tau_lo)
                    tau_endpoint_hi = np.maximum(
                        0,
                        B3low + (d - 1) * R
                        + np.maximum(1, np.ceil(R / d)) * T - (N - 2),
                    )
                else:
                    tau_lo = np.maximum(
                        0, values["B3hi"] + (d - 1) * R + R * T - (N - 2)
                    )
                    tau_endpoint_hi = tau_lo
                star_leaf = (
                    (d == 1) & (R == N - 1) & (B2 == c2(N - 1))
                )
                star_tau = c3(N - 1) - (N - 2)
                tau_lo = np.where(star_leaf, star_tau, tau_lo)
                tau_global_hi = np.where(star_leaf, star_tau, tau_endpoint_hi)
                tau_adj_hi = tau_global_hi

                a = c2(N) - S
                wedges_f = N - 1 + B2 - c2(d) - R
                z2 = S * (N - 2) - 2 * wedges_f
                h2 = c2(S) - (S - R)
                reserve_y = (
                    2 * (j + 1) * h2 + (j - 2) * (2 * a - z2)
                ) / (6 * a)
                ymax = np.minimum(np.minimum(1, reserve_y), values["count_y"])
                # At the balanced lower B2 endpoint, F is a forest of
                # subdivided stars and H is the union of its arm paths.  An
                # H-independent (j-1)-set forbids at most j-1 of the d
                # centres, so it produces at least d-j+1 independent j-sets
                # of F containing exactly one centre.  Together with
                # j*h_j <= (S-j+1)*h_(j-1), this gives the exact family cap
                #   h_j/f_j <= (S-j+1)/(S-j+1+j(d-j+1))
                # whenever d>=j.  This remains diagnostic until the endpoint
                # reduction itself is frozen.
                center_cap = np.where(
                    S < j,
                    0.0,
                    np.where(
                        d >= j,
                        (S - j + 1)
                        / (S - j + 1 + j * (d - j + 1)),
                        1.0,
                    ),
                )
                if endpoint == "lo":
                    ymax = np.minimum(ymax, center_cap)
                assert np.all(ymax >= -1e-9)
                if j == 3:
                    B2b = B2 - values["B2root"] - A2
                    wedges_h = B2b + T - Y
                    h3 = c3(S) - (S - R) * (S - 2) + wedges_h
                    f3 = c3(N) - S * (N - 2) + wedges_f
                    y_rows = (("exact", h3 / f3),)
                else:
                    y_rows = (("zero", np.zeros_like(R)), ("cap", ymax))

                for ylabel, y in y_rows:
                    method_candidates = []
                    method_indices = (2,) if j == 3 else (0, 1)
                    for method_index in method_indices:
                        low = gaps(N, j, d, R, B2, tau_lo, A2, Y, y)[method_index]
                        global_high = gaps(
                            N, j, d, R, B2, tau_global_hi, A2, Y, y
                        )[method_index]
                        adj_high = gaps(
                            N, j, d, R, B2, tau_adj_hi, A2, Y, y
                        )[method_index]
                        # Affine slope from the two evaluated endpoints.
                        probe = gaps(N, j, d, R, B2, tau_lo + 1, A2, Y, y)[method_index]
                        slope = probe - low
                        method_candidates.append(np.where(
                            slope >= -1e-7 * np.maximum(1, np.abs(low)),
                            low,
                            np.maximum(global_high, adj_high),
                        ))
                    # The concentrated endpoint forces one double-star core
                    # plus d-1 isolates.  The balanced endpoint with T=0
                    # forces a forest of centered stars.  Use exact rows.
                    exact_indices = (
                        np.arange(len(T), dtype=np.int64)
                        if endpoint == "hi" else np.flatnonzero(T == 0)
                    )
                    for index in exact_indices:
                        di = int(d[index])
                        ri = int(R[index])
                        ti = int(T[index])
                        if endpoint == "lo":
                            quotient, residual = divmod(ri, di)
                            arms = [quotient + 1] * residual + [quotient] * (di - residual)
                            row = star_forest_row(arms, j + 1)
                            hrow = [comb(int(S[index]), rank) for rank in range(j + 2)]
                        else:
                            row, hrow = high_endpoint_rows(di, ri, ti, j + 1)
                        b = row[j] if j < len(row) else 0
                        if b == 0:
                            for candidate in method_candidates:
                                candidate[index] = np.inf
                            continue
                        h = hrow[j] if j < len(hrow) else 0
                        exact_y = h / b
                        exact_u = 1 + exact_y + (row[j + 1] / b if j + 1 < len(row) else 0)
                        exact_value = gaps(
                            N, j, d[index], R[index], B2[index], tau_lo[index],
                            A2[index], Y[index], exact_y, u_override=exact_u,
                        )
                        for candidate in method_candidates:
                            candidate[index] = exact_value
                    best = np.maximum.reduce(method_candidates)
                    index = int(np.argmin(best))
                    record = (
                        float(best[index]), N, j, int(d[index]), int(R[index]),
                        ylabel, endpoint,
                        tuple(float(candidate[index]) for candidate in method_candidates),
                    )
                    if minimum is None or record < minimum:
                        minimum = record
                    if record[0] < 0:
                        negatives.append(record)
                        if len(negatives) <= 5:
                            print("negative", record, flush=True)
    print("minimum", minimum)
    print("negative minima", sorted(negatives)[:30])


if __name__ == "__main__":
    main()
