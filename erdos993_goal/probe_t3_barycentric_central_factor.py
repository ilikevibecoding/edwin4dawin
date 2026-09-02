#!/usr/bin/env python3
"""Audit F_q=T_q^(-1) (Tau K J Tau^T) J at the t=3 node."""

from fast_bottom_forward import central_k, eye, matmul
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_superballot_bridge import super_ballot
from probe_confluent_transition_sections import inverse_matrix
from probe_t3_barycentric_bridge import cumulative_bridge


def factor(q):
    tau = super_ballot(q)
    tau_transpose = [list(row) for row in zip(*tau)]
    reversal = [row[::-1] for row in eye(q)]
    central = matmul(
        matmul(matmul(tau, central_k(q + 1)), reversal), tau_transpose
    )
    return matmul(matmul(inverse_matrix(cumulative_bridge(q)), central), reversal)


def main():
    for q in range(2, 51):
        matrix = factor(q)
        assert all(matrix[i][j] == 0 for i in range(q) for j in range(i))
        forward, transpose = neville_pair(matrix)
        if forward["status"] != "PASS" or transpose["status"] != "PASS":
            print(f"q={q} FAIL forward={forward} transpose={transpose}")
            return
        print(
            f"q={q} PASS f+={forward['positive']} f0={forward['zero']} "
            f"t+={transpose['positive']} t0={transpose['zero']}",
            flush=True,
        )


if __name__ == "__main__":
    main()
