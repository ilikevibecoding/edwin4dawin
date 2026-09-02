#!/usr/bin/env python3
"""Replay the universal rooted rank-6 theorem from order 24."""

from verify_rank6_all_leaf_roots_n24 import (
    scaled_margin_polynomials,
    support_branch_certificate,
    support_one_certificate,
)
from verify_rank6_all_roots_n25 import main as verify_order_25_plus
from verify_rank6_order24_degree2 import (
    dense_certificate as degree_two_dense,
    sparse_cases as degree_two_sparse,
    two_component_forest_bounds,
)
from verify_rank6_order24_degree3 import (
    coefficient_ratios as degree_three_ratios,
    dense_certificate as degree_three_dense,
    sparse_cases as degree_three_sparse,
)
from verify_rank6_order24_degree4plus import (
    degree_four_forest_ratio,
    degree_sensitive_endpoint,
    sparse_cases as degree_four_sparse,
)


def main():
    verify_order_25_plus()

    (
        support_one_polynomial,
        support_branch_polynomial,
        support_one_variables,
        support_branch_variables,
    ) = scaled_margin_polynomials()
    leaf_one = support_one_certificate(
        support_one_polynomial, support_one_variables
    )
    leaf_branch = support_branch_certificate(
        support_branch_polynomial,
        support_branch_variables,
    )

    two_component_forest_bounds()
    degree_two_sparse()
    degree_two_dense()
    degree_three_ratios()
    degree_three_sparse()
    degree_three_dense()
    degree_sensitive_endpoint()
    degree_four_forest_ratio()
    degree_four_sparse()

    print(
        "rank-6 strong inequality at every root of every tree "
        "of order n>=24: CERTIFIED"
    )
    print(
        "order-24 leaf partition minima:",
        leaf_one[1],
        leaf_branch[1],
    )


if __name__ == "__main__":
    main()
