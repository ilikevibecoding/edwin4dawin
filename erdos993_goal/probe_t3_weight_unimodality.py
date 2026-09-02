#!/usr/bin/env python3
"""Probe strict unimodality of the t=3 central barycentric weight rows.

This records exact finite evidence only.  An earlier guessed closed formula for
the peak location was false (first counterexample q=7, p=3), so no peak formula
is asserted here.
"""

from fast_bottom_forward import central_k, eye, matmul
from probe_beta_newton_superballot_bridge import super_ballot
from probe_confluent_transition_sections import inverse_matrix
from probe_t3_barycentric_bridge import cumulative_bridge


def weight_matrix(q):
    tau = super_ballot(q)
    reversal = [row[::-1] for row in eye(q)]
    tau_transpose = [list(row) for row in zip(*tau)]
    h = matmul(
        matmul(matmul(tau, central_k(q + 1)), reversal), tau_transpose
    )
    return matmul(inverse_matrix(cumulative_bridge(q)), h)


def unique_peak(values):
    peak = max(range(len(values)), key=values.__getitem__)
    if not all(values[i] < values[i + 1] for i in range(peak)):
        return None
    if not all(values[i] > values[i + 1] for i in range(peak, len(values) - 1)):
        return None
    return peak


def main():
    comparisons = 0
    for q in range(4, 51):
        matrix = weight_matrix(q)
        peaks = []
        for p, row in enumerate(matrix):
            values = row[: q - p]
            peak = unique_peak(values)
            assert peak is not None, (q, p, values)
            peaks.append(peak)
            comparisons += len(values) - 1
        print(f"q={q} PASS peaks={peaks}", flush=True)
    print(f"PASS comparisons={comparisons}")


if __name__ == "__main__":
    main()
