#!/usr/bin/env python3
"""Replay the universal rooted rank-6 theorem from order 22."""

from verify_rank6_all_leaf_roots_n22 import (
    coarse_partition_certificate,
    exact_inconclusive_certificate,
    scaled_margin_polynomials,
)
from verify_rank6_all_roots_n23 import main as verify_order_23_plus
from verify_rank6_order22_degree5plus import (
    degree_five_forest_ratio,
    degree_sensitive_endpoint,
    sparse_cases as degree_five_sparse,
)
from verify_rank6_order22_degrees2to4 import (
    degree_four_certificate,
    degree_three_certificate,
    degree_two_certificate,
    order_21_forest_ratios,
)


def main():
    verify_order_23_plus()

    (
        one_polynomial,
        branch_polynomial,
        one_variables,
        branch_variables,
    ) = scaled_margin_polynomials()
    coarse = coarse_partition_certificate(
        one_polynomial,
        branch_polynomial,
        one_variables,
        branch_variables,
    )
    exact = exact_inconclusive_certificate(coarse[2])

    order_21_forest_ratios()
    degree_two_certificate()
    degree_three_certificate()
    degree_four_certificate()
    degree_sensitive_endpoint()
    degree_five_forest_ratio()
    degree_five_sparse()

    print(
        "rank-6 strong inequality at every root of every tree "
        "of order n>=22: CERTIFIED"
    )
    print(
        "order-22 leaf exact fallback:",
        exact[0],
        "states, minimum",
        exact[1],
    )


if __name__ == "__main__":
    main()
