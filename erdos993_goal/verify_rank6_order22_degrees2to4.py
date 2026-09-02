#!/usr/bin/env python3
"""Certify the order-22 strong rank-6 inequality at root degrees 2--4."""

from __future__ import annotations

from math import comb

import sympy as sp

from verify_rank6_order23_degrees2to4 import (
    dense_certificate,
    sparse_enumeration,
)


ROOTED_TYPE_COUNTS = {
    1: 1,
    2: 2,
    3: 4,
    4: 9,
    5: 20,
    6: 48,
    7: 114,
    8: 283,
    9: 699,
    10: 1756,
}

EXPECTED_EXTRAS = {
    2: {
        0: 204,
        1: 232,
        2: 260,
        3: 289,
        4: 326,
        5: 363,
        6: 409,
        7: 455,
        8: 511,
        9: 567,
        10: 634,
        11: 701,
        12: 780,
        13: 859,
        14: 951,
        15: 1043,
        16: 1149,
        17: 1255,
        18: 1376,
    },
    3: {
        0: 705,
        1: 762,
        2: 808,
        3: 855,
        4: 913,
        5: 970,
        6: 1027,
        7: 1096,
        8: 1164,
        9: 1232,
        10: 1313,
        11: 1393,
        12: 1473,
        13: 1567,
        14: 1660,
        15: 1753,
        16: 1861,
        17: 1968,
    },
    4: {
        0: 1288,
        1: 1345,
        2: 1404,
        3: 1463,
        4: 1521,
        5: 1579,
        6: 1650,
        7: 1720,
        8: 1789,
        9: 1858,
        10: 1941,
        11: 2023,
        12: 2104,
        13: 2185,
        14: 2281,
        15: 2376,
        16: 2470,
    },
}


def order_21_forest_ratios():
    ratio_32 = sp.Rational(18 * 17, 3 * 20)
    ratio_43 = sp.factor(
        sp.Rational(3, 4) * (ratio_32 - 1)
    )
    ratio_54 = sp.factor(
        sp.Rational(4, 5) * ratio_43
        - sp.Rational(3, 5)
    )
    assert (
        ratio_32,
        ratio_43,
        ratio_54,
    ) == (
        sp.Rational(51, 10),
        sp.Rational(123, 40),
        sp.Rational(93, 50),
    )
    return ratio_32, ratio_43, ratio_54


def two_component_order_21_bounds():
    residual_minima = {}
    for order in (17, 18):
        values = []
        for edges in range(order):
            wedges = max(0, 2 * edges - order)
            i2 = comb(order, 2) - edges
            i3 = (
                comb(order, 3)
                - edges * (order - 2)
                + wedges
            )
            values.append(3180 * i3 - 6643 * i2)
        residual_minima[order] = min(values)
    assert residual_minima == {
        17: 649740,
        18: 877352,
    }
    assert sp.Rational(637, 3) * 3060 == 649740

    # The strengthened tree theorem at order 21 gives
    # 45i5-91i4 >= (1409/3)B2.
    n = sp.Integer(21)
    large_coefficient = sp.factor(
        (n**3 - 8 * n**2 - 19 * n + 302) / 6
    )
    assert large_coefficient == sp.Rational(2818, 3)
    tree_gap_coefficient = large_coefficient / 2
    assert tree_gap_coefficient == sp.Rational(1409, 3)

    # i4-i4(P21)=16B2-B3-(E-18)<=34B2 off the path.
    nonpath_margin = (
        212 * tree_gap_coefficient - 637 * 34
    )
    assert nonpath_margin == sp.Rational(233734, 3)

    g4, g5, q2, q3 = sp.symbols("g4 g5 q2 q3")
    target = 3180 * (g5 + q3) - 6643 * (g4 + q2)
    tree_gap = 45 * g5 - 91 * g4
    residual_gap = 3180 * q3 - 6643 * q2
    decomposition = (
        sp.Rational(1, 3)
        * (212 * tree_gap - 637 * g4)
        + residual_gap
    )
    assert sp.expand(target - decomposition) == 0

    h_minimum = 3060 + 120
    # For the smaller residual q=17, i2>=C(17,2)-16=120.
    assert h_minimum == 3180
    return residual_minima, h_minimum, sp.Rational(6643, 3180)


def degree_two_certificate():
    sharp = two_component_order_21_bounds()
    sparse = sparse_enumeration(
        19,
        2,
        10,
        10099,
        {
            0: 20,
            1: 36,
            2: 132,
            3: 360,
            4: 1062,
            5: 2788,
            6: 7608,
            7: 19472,
            8: 49954,
            9: 123224,
            10: 297056,
        },
        {
            0: 84141585,
            1: 75323216,
            2: 67356696,
            3: 60092421,
            4: 53528784,
            5: 47994688,
            6: 43043335,
            7: 39253952,
            8: 36506565,
            9: 34784256,
            10: 33778140,
        },
        expected_types=ROOTED_TYPE_COUNTS,
    )
    dense = dense_certificate(
        forest_order=19,
        sides=2,
        alpha=sp.Rational(6643, 3180),
        path_h=sp.Integer(3180),
        first_edge=11,
        expected_cells=18,
        expected_margin=sp.Rational(753675083, 795),
        expected_derivative=sp.Rational(47501337, 2650),
        expected_extras=EXPECTED_EXTRAS[2],
    )
    return sharp, sparse, dense


def degree_three_certificate():
    sparse = sparse_enumeration(
        18,
        3,
        7,
        534,
        {
            0: 190,
            1: 459,
            2: 1896,
            3: 5787,
            4: 18126,
            5: 49713,
            6: 134352,
            7: 329139,
        },
        {
            0: 63227979,
            1: 59049036,
            2: 54956647,
            3: 51667929,
            4: 49434336,
            5: 47387203,
            6: 46154301,
            7: 45772436,
        },
        expected_types={
            edge: count
            for edge, count in ROOTED_TYPE_COUNTS.items()
            if edge <= 7
        },
    )
    dense = dense_certificate(
        forest_order=18,
        sides=3,
        alpha=sp.Rational(93, 50),
        path_h=sp.Integer(3060),
        first_edge=8,
        expected_cells=20,
        expected_margin=sp.Rational(7962144, 25),
        expected_derivative=sp.Rational(402452, 25),
        expected_extras=EXPECTED_EXTRAS[3],
    )
    return sparse, dense


def degree_four_certificate():
    return dense_certificate(
        forest_order=17,
        sides=4,
        alpha=sp.Rational(93, 50),
        path_h=sp.Integer(3060),
        first_edge=0,
        expected_cells=28,
        expected_margin=sp.Rational(18914592, 25),
        expected_derivative=sp.Rational(412768, 25),
        expected_extras=EXPECTED_EXTRAS[4],
    )


def main():
    ratios = order_21_forest_ratios()
    degree_two = degree_two_certificate()
    degree_three = degree_three_certificate()
    degree_four = degree_four_certificate()
    print(
        "rank-6 strong inequality at every order-22 root "
        "of degree two, three, or four: CERTIFIED"
    )
    print("order-21 forest ratios:", ratios)
    print("degree-two:", degree_two)
    print("degree-three:", degree_three)
    print("degree-four:", degree_four)


if __name__ == "__main__":
    main()
