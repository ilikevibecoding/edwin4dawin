#!/usr/bin/env python3
"""Test the gap-two switch coefficient factor against the compressed core.

The exact identity B Tau^{-1}=Gamma gives columns

    gamma_p(x)=(x+3)_p (x+p+5)_(q-1-p).

Writing H_d=Tau K J Tau^T and H=Tau^T V D yields

    C = (Gamma H_d J) (J V J) (J D J).

The latter two factors are TN.  This script audits the first factor exactly.
"""

from fast_bottom_forward import beta_coefficients, central_k, inverse_upper, matmul
from probe_beta_newton_compressed_factor import neville_pair, reversal, transpose
from probe_beta_newton_superballot_bridge import super_ballot


def statuses(matrix):
    forward, transposed = neville_pair(matrix)
    return forward["status"], transposed["status"], forward, transposed


def main():
    for q in range(2, 31):
        j = reversal(q)
        tau = super_ballot(q)
        gamma = matmul(beta_coefficients(q), inverse_upper(tau))
        compressed = matmul(
            matmul(matmul(tau, central_k(q + 1)), j), transpose(tau)
        )
        first = matmul(matmul(gamma, compressed), j)
        result = statuses(first)
        print(f"q={q} Gamma_Hd_J={result[:2]}")
        if result[:2] != ("PASS", "PASS"):
            print(f"  forward={result[2]} transpose={result[3]}")
            break


if __name__ == "__main__":
    main()
