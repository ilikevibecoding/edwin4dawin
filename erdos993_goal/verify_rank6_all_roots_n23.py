#!/usr/bin/env python3
"""Replay the universal rooted rank-6 theorem from order 23."""

from verify_rank6_all_leaf_roots_n23 import (
    scaled_margin_polynomials,
    support_branch_certificate,
    support_one_certificate,
)
from verify_rank6_all_roots_n24 import main as verify_order_24_plus
from verify_rank6_order23_degree5plus import (
    degree_five_forest_ratio,
    degree_sensitive_endpoint,
    edgeless_depth_two_case,
)
from verify_rank6_order23_degrees2to4 import (
    degree_four_certificate,
    degree_three_certificate,
    degree_two_certificate,
    order_22_forest_ratios,
)


def main():
    verify_order_24_plus()

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

    order_22_forest_ratios()
    degree_two_certificate()
    degree_three_certificate()
    degree_four_certificate()
    degree_sensitive_endpoint()
    degree_five_forest_ratio()
    edgeless_depth_two_case()

    print(
        "rank-6 strong inequality at every root of every tree "
        "of order n>=23: CERTIFIED"
    )
    print(
        "order-23 leaf partition minima:",
        leaf_one[1],
        leaf_branch[1],
    )


if __name__ == "__main__":
    main()
