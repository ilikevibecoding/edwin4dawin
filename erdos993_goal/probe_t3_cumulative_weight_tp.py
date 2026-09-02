#!/usr/bin/env python3
"""Test total positivity orientations of cumulative t=3 weight matrices."""

from fast_bottom_forward import eye, matmul, zeros
from probe_beta_newton_compressed_factor import neville_pair
from probe_t3_weight_unimodality import weight_matrix


def prefix_matrix(q):
    weights = weight_matrix(q)
    out = zeros(q, q)
    for p, row in enumerate(weights):
        running = 0
        for b, value in enumerate(row):
            running += value
            out[p][b] = running
    return out


def main():
    for q in range(2, 31):
        prefix = prefix_matrix(q)
        reversal = [row[::-1] for row in eye(q)]
        candidates = {
            "P": prefix,
            "PJ": matmul(prefix, reversal),
            "JP": matmul(reversal, prefix),
            "JPJ": matmul(matmul(reversal, prefix), reversal),
        }
        statuses = {
            name: tuple(record["status"] for record in neville_pair(matrix))
            for name, matrix in candidates.items()
        }
        print(f"q={q} {statuses}", flush=True)


if __name__ == "__main__":
    main()
