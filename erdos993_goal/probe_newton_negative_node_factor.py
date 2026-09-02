#!/usr/bin/env python3
"""Test the negative-node evaluation factorization of L_q^(-1) C_q."""

from fractions import Fraction as F
from itertools import product

from fast_bottom_forward import matmul, polynomial_coefficient_matrix
from probe_beta_newton_compressed_factor import neville_pair
from probe_beta_newton_coordinates import beta_newton_lower
from probe_confluent_transition_sections import inverse_matrix


def evaluate_matrix(coefficients, nodes):
    return [
        [
            sum(coefficients[d][j] * node**d for d in range(len(coefficients)))
            for j in range(len(coefficients[0]))
        ]
        for node in nodes
    ]


def signed_rows(matrix, signs, reverse=False):
    rows = matrix[::-1] if reverse else matrix
    return [[signs[i] * value for value in row] for i, row in enumerate(rows)]


def sign_summary(matrix):
    values = [value for row in matrix for value in row if value]
    return (
        sum(value > 0 for value in values),
        sum(value < 0 for value in values),
        len(values),
    )


def main():
    for q in range(2, 11):
        nodes = [F(0)] + [F(-5 - s) for s in range(q - 1)]
        lower_eval = evaluate_matrix(beta_newton_lower(q), nodes)
        target_eval = evaluate_matrix(polynomial_coefficient_matrix(q), nodes)
        assert matmul(inverse_matrix(lower_eval), target_eval) == matmul(
            inverse_matrix(beta_newton_lower(q)),
            polynomial_coefficient_matrix(q),
        )

        found = []
        for reverse in (False, True):
            # Row signs are forced by the first nonzero target entry whenever
            # that row is sign-coherent; also test the two alternating choices.
            target_rows = target_eval[::-1] if reverse else target_eval
            candidates = []
            coherent = []
            possible = True
            for row in target_rows:
                nonzero = [value for value in row if value]
                signs = {1 if value > 0 else -1 for value in nonzero}
                if len(signs) != 1:
                    possible = False
                    break
                coherent.append(next(iter(signs)))
            if possible:
                candidates.append(tuple(coherent))
            candidates.extend(
                [
                    tuple(1 if i % 2 == parity else -1 for i in range(q))
                    for parity in (0, 1)
                ]
            )
            for signs in candidates:
                left_eval = signed_rows(lower_eval, signs, reverse)
                right = signed_rows(target_eval, signs, reverse)
                left = inverse_matrix(left_eval)
                left_status = tuple(x["status"] for x in neville_pair(left))
                right_status = tuple(x["status"] for x in neville_pair(right))
                if left_status == right_status == ("PASS", "PASS"):
                    found.append((reverse, signs))
        print(
            f"q={q} lower_inv_signs={sign_summary(inverse_matrix(lower_eval))} "
            f"target_signs={sign_summary(target_eval)} found={found}",
            flush=True,
        )


if __name__ == "__main__":
    main()
