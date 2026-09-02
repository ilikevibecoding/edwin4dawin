#!/usr/bin/env python3
"""Replay the universal rooted rank-6 theorem from order 25."""

from verify_rank6_all_leaf_roots_n25 import (
    scaled_margin_polynomials,
    support_branch_certificate,
    support_one_certificate,
)
from verify_rank6_all_roots_n26 import main as verify_order_26_plus
from verify_rank6_order25_degree2 import (
    coefficient_ratios as degree_two_ratios,
    dense_certificate as degree_two_dense,
    sparse_enumeration as degree_two_sparse,
)
from verify_rank6_order25_degree3 import (
    coefficient_ratios as degree_three_ratios,
    dense_certificate as degree_three_dense,
    sparse_cases as degree_three_sparse,
)
from verify_rank6_order25_degree4plus import (
    degree_four_forest_ratio,
    degree_sensitive_endpoint,
    edgeless_depth_two_case,
)


def main():
    verify_order_26_plus()

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

    degree_two_ratios()
    degree_two_sparse()
    degree_two_dense()
    degree_three_ratios()
    degree_three_sparse()
    degree_three_dense()
    degree_sensitive_endpoint()
    degree_four_forest_ratio()
    edgeless_depth_two_case()

    print(
        "rank-6 strong inequality at every root of every tree "
        "of order n>=25: CERTIFIED"
    )
    print(
        "order-25 leaf partition minima:",
        leaf_one[1],
        leaf_branch[1],
    )


if __name__ == "__main__":
    main()
