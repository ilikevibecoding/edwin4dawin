#!/usr/bin/env python3
"""Test the shifted gap-two switch matrix times the compressed central core."""

from fractions import Fraction as F

from fast_bottom_forward import central_k, inverse_upper, matmul
from probe_beta_newton_compressed_factor import neville_pair, reversal, transpose
from probe_beta_newton_superballot_bridge import super_ballot
from probe_shifted_beta_central_factors import shifted_beta_coefficients


def status(matrix):
    forward, transposed = neville_pair(matrix)
    return forward["status"], transposed["status"], forward, transposed


def main():
    for shift in (F(0), F(1, 2), F(1), F(3, 2), F(2)):
        last_pass = 1
        obstruction = None
        for q in range(2, 31):
            j = reversal(q)
            tau = super_ballot(q)
            gamma = matmul(
                shifted_beta_coefficients(q, shift), inverse_upper(tau)
            )
            compressed = matmul(
                matmul(matmul(tau, central_k(q + 1)), j), transpose(tau)
            )
            first = matmul(matmul(gamma, compressed), j)
            result = status(first)
            if result[:2] != ("PASS", "PASS"):
                obstruction = (q, result[2], result[3])
                break
            last_pass = q
        print(
            f"shift={shift} Gamma_shift_Hd_J_last_pass={last_pass} "
            f"obstruction={obstruction}"
        )


if __name__ == "__main__":
    main()
