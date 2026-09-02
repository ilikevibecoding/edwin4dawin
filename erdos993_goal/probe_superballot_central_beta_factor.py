#!/usr/bin/env python3
"""Audit Tau K J B^T J, the remaining factor at confluent root zero."""

from fast_bottom_forward import beta_coefficients, central_k, eye, matmul
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_superballot_bridge import super_ballot


def remaining_factor(q):
    reversal = [row[::-1] for row in eye(q)]
    beta_transpose = [list(row) for row in zip(*beta_coefficients(q))]
    return matmul(
        matmul(
            matmul(matmul(super_ballot(q), central_k(q + 1)), reversal),
            beta_transpose,
        ),
        reversal,
    )


def main():
    for q in range(2, 41):
        matrix = remaining_factor(q)
        forward, transpose = neville_pair(matrix)
        if forward["status"] != "PASS" or transpose["status"] != "PASS":
            print(f"q={q} FAIL forward={forward} transpose={transpose}")
            return
        print(
            f"q={q} PASS f+={forward['positive']} "
            f"t+={transpose['positive']}",
            flush=True,
        )


if __name__ == "__main__":
    main()
