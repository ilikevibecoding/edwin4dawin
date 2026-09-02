#!/usr/bin/env python3
"""Explore a large-order moment certificate for the rooted rank-5 payment.

This reconstructs the payment M(B,p) from
RANK5_LEAF_INDUCTION_REDUCTION_2026-07-27.md in the normalized rooted
moment coordinates already used by the proved rank-4 leaf theorem.

When D=B-p, the number K of connected four-edge subsets of B containing
p enters i_5(D) with a negative sign.  The payment is increasing in K.
The elementary lower bound counts all connected four-edge subsets
containing at least two edges incident with \(p\):

    K >= C(d,4) + C(d-1,2)L
         + (L^2-L_2)/2 + (d-1)((L_2-L)/2+D_2),

where L and L_2 are the first two excess-degree sums over neighbors
of p and D_2 is the excess-degree sum at distance two.  This still
avoids a new local shape coordinate.
"""

from __future__ import annotations

import argparse

import numpy as np
import sympy as sp


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def independent_3(order, edges, wedges):
    return choose(order, 3) - edges * (order - 2) + wedges


def independent_4(order, edges, wedges, triples):
    return (
        choose(order, 4)
        - edges * choose(order - 2, 2)
        + wedges * (order - 4)
        + choose(edges, 2)
        - triples
    )


def independent_5(order, edges, wedges, triples, stars, fours):
    pair_plus_edge = wedges * (edges - 2) - 2 * triples - stars
    return (
        choose(order, 5)
        - edges * choose(order - 2, 3)
        + wedges * choose(order - 3, 2)
        + (choose(edges, 2) - wedges) * (order - 4)
        - triples * (order - 4)
        - pair_plus_edge
        + fours
    )


def build_lower_bound():
    n, S, R, H, W, degree, Z, Y = sp.symbols(
        "n S R H W degree Z Y", real=True
    )
    tree_edges = n - 1
    a = independent_4(n, tree_edges, S, R)
    b = independent_5(n, tree_edges, S, R, H, W)

    # Statistics after deleting p.  The lower bound for K counts the
    # centered four-stars and the shapes with three p-edges and one
    # continuation.  Replacing K by this lower bound in W_D=W-K
    # maximizes f subject to the bound and therefore lowers the payment.
    m = n - 1
    deleted_edges = tree_edges - degree
    deleted_wedges = S - Z
    deleted_triples = R - Y
    neighbor_stars = sp.symbols("neighbor_stars", nonnegative=True)
    neighbor_excess = sp.symbols("neighbor_excess", nonnegative=True)
    neighbor_square = sp.symbols("neighbor_square", nonnegative=True)
    distance_excess = sp.symbols("distance_excess", nonnegative=True)
    rooted_two = (
        (neighbor_square - neighbor_excess) / 2
        + distance_excess
    )
    K_lower = (
        choose(degree, 4)
        + choose(degree - 1, 2) * neighbor_excess
        + (neighbor_excess**2 - neighbor_square) / 2
        + (degree - 1) * rooted_two
    )
    deleted_stars = (
        H - choose(degree, 3) - neighbor_stars
    )
    d = independent_3(m, deleted_edges, deleted_wedges)
    e = independent_4(
        m, deleted_edges, deleted_wedges, deleted_triples
    )
    f_upper = independent_5(
        m,
        deleted_edges,
        deleted_wedges,
        deleted_triples,
        deleted_stars,
        W - K_lower,
    )
    q4 = 8 * e**2 - d * e - 10 * d * f_upper
    cross_error = (
        a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 50 * (b * d - a * e) ** 2
    )
    payment = sp.expand(6 * a * (a + d) * q4 + cross_error)

    u = sp.symbols("u", positive=True)
    A2, A3, A4, t = sp.symbols(
        "A2 A3 A4 t", nonnegative=True
    )
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)
    N = 1 / u
    normalized = sp.cancel(
        payment.subs(
            {
                n: N,
                S: (N**2 * A2 + N - 2) / 2,
                H: (N**3 * A3 - (N - 2)) / 6,
                R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
                W: (
                    N**4 * A4
                    - 2 * N**3 * A3
                    - N**2 * A2
                    + 2 * (N - 2)
                )
                / 24
                + N**3 * Tc
                + N**2 * P5,
                degree: N * t + 1,
                Z: (
                    N**2 * t**2 + N * t
                )
                / 2
                + N * q1,
                Y: (
                    (N**3 * t**3 - N * t) / 6
                    + (N**2 * q2 - N * q1) / 2
                    + N**2 * t * q1
                    + N * qd
                ),
                neighbor_stars: (N**2 * q2 - N * q1) / 2,
                neighbor_excess: N * q1,
                neighbor_square: N**2 * q2,
                distance_excess: N * qd,
            }
        )
        * u**16
    )
    assert sp.denom(normalized) == 1
    return sp.expand(normalized), (
        u,
        A2,
        A3,
        A4,
        t,
        B,
        Tc,
        P5,
        q1,
        q2,
        qd,
    )


def grouped_expression(polynomial, variables):
    (
        u,
        A2,
        A3,
        A4,
        t,
        B,
        Tc,
        P5,
        q1,
        q2,
        qd,
    ) = variables
    s, group, split, zn, zd, zr = sp.symbols(
        "s group split zn zd zr", nonnegative=True
    )
    mass = 1 - 2 * u
    root_mass = (1 - 3 * u) * s
    remainder = (1 - 3 * u) * (1 - s)
    neighbor_mass = u + remainder * group
    distance_mass = remainder * (1 - group) * split
    far_mass = remainder * (1 - group) * (1 - split)
    second = (
        root_mass**2
        + neighbor_mass**2 * zn
        + distance_mass**2 * zd
        + far_mass**2 * zr
    )
    third = (
        root_mass**3
        + neighbor_mass**3 * zn**2
        + distance_mass**3 * zd**2
        + far_mass**3 * zr**2
    )
    fourth = (
        root_mass**4
        + neighbor_mass**4 * zn**2
        + distance_mass**4 * zd**2
        + far_mass**4 * zr**2
    )
    edge_lower = root_mass * neighbor_mass + u * distance_mass
    grouped = polynomial.subs(
            {
                A2: second,
                A3: third,
                A4: fourth,
                t: root_mass,
                B: edge_lower,
                Tc: (1 - 4 * u) * edge_lower / 2,
                P5: (mass**2 - second) / 2,
                q1: neighbor_mass,
                q2: neighbor_mass**2 * zn,
                qd: distance_mass,
            }
    )
    return grouped, (u, s, group, split, zn, zd, zr)


def grouped_numeric(points, terminal_deep=False):
    """Evaluate the grouped lower bound without symbolic expansion."""
    u, s, group, split, zn, zd, zr = (
        points[:, index] for index in range(7)
    )
    N = 1 / u
    mass = 1 - 2 * u
    t = (1 - 3 * u) * s
    remainder = (1 - 3 * u) * (1 - s)
    q1 = u + remainder * group
    qd = remainder * (1 - group) * split
    far = remainder * (1 - group) * (1 - split)
    A2 = t**2 + q1**2 * zn + qd**2 * zd + far**2 * zr
    A3 = (
        t**3 + q1**3 * zn**2 + qd**3 * zd**2 + far**3 * zr**2
    )
    A4 = (
        t**4 + q1**4 * zn**2 + qd**4 * zd**2 + far**4 * zr**2
    )
    B = t * q1 + u * qd
    Tc = (1 - 4 * u) * B / 2
    P5 = (mass**2 - A2) / 2
    q2 = q1**2 * zn

    def ch(value, rank):
        out = np.ones_like(value)
        for offset in range(rank):
            out *= value - offset
        return out / float(sp.factorial(rank))

    tree_edges = N - 1
    S = (N**2 * A2 + N - 2) / 2
    H = (N**3 * A3 - (N - 2)) / 6
    R = H + N**2 * B
    W = (
        (
            N**4 * A4
            - 2 * N**3 * A3
            - N**2 * A2
            + 2 * (N - 2)
        )
        / 24
        + N**3 * Tc
        + N**2 * P5
    )

    def i4(order, edges, wedges, triples):
        return (
            ch(order, 4)
            - edges * ch(order - 2, 2)
            + wedges * (order - 4)
            + ch(edges, 2)
            - triples
        )

    def i5(order, edges, wedges, triples, stars, fours):
        pair_plus_edge = wedges * (edges - 2) - 2 * triples - stars
        return (
            ch(order, 5)
            - edges * ch(order - 2, 3)
            + wedges * ch(order - 3, 2)
            + (ch(edges, 2) - wedges) * (order - 4)
            - triples * (order - 4)
            - pair_plus_edge
            + fours
        )

    a = i4(N, tree_edges, S, R)
    b = i5(N, tree_edges, S, R, H, W)
    degree = N * t + 1
    Z = (N**2 * t**2 + N * t) / 2 + N * q1
    Y = (
        (N**3 * t**3 - N * t) / 6
        + (N**2 * q2 - N * q1) / 2
        + N**2 * t * q1
        + N * qd
    )
    neighbor_stars = (N**2 * q2 - N * q1) / 2
    order = N - 1
    edges = tree_edges - degree
    wedges = S - Z
    triples = R - Y
    stars = H - ch(degree, 3) - neighbor_stars
    d = ch(order, 3) - edges * (order - 2) + wedges
    e = i4(order, edges, wedges, triples)
    neighbor_excess = N * q1
    neighbor_square = N**2 * q2
    rooted_two = (
        (neighbor_square - neighbor_excess) / 2 + N * qd
    )
    K_lower = (
        ch(degree, 4)
        + ch(degree - 1, 2) * neighbor_excess
        + (neighbor_excess**2 - neighbor_square) / 2
        + (degree - 1) * rooted_two
    )
    # The grouped moment bound also retains four-edge subtrees made of
    # the p-edge followed by a three-star at its neighbor.  Cauchy's
    # M3 >= M2^2/M1 bound gives the displayed neighbor-cube lower
    # endpoint.  The expression may be negative, which remains a valid
    # (if weak) lower bound for this nonnegative shape count.
    neighbor_cube_lower = N**3 * q1**3 * zn**2
    K_lower += (
        neighbor_cube_lower
        - 3 * neighbor_square
        + 2 * neighbor_excess
    ) / 6
    if terminal_deep:
        # If p has only one nonleaf neighbor q, the distance-two group
        # is exactly the set of neighbors of q other than p.  The
        # connected three-edge subtrees on the q side contribute these
        # additional four-edge subtrees containing p.  The still
        # omitted distance-three excess is nonnegative.
        distance_stars = (
            N**2 * qd**2 * zd - N * qd
        ) / 2
        K_lower += distance_stars + (N * q1 - 1) * (N * qd)
    f = i5(order, edges, wedges, triples, stars, W - K_lower)
    q4 = 8 * e**2 - d * e - 10 * d * f
    cross = (
        a * d * e * (a + d + 2 * e)
        + 2 * a**2 * e**2
        - 50 * (b * d - a * e) ** 2
    )
    return (6 * a * (a + d) * q4 + cross) * u**16


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--derivatives", action="store_true")
    parser.add_argument("--grouped-random", type=int, default=0)
    parser.add_argument("--scale", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    polynomial = None
    variables = None
    if not args.grouped_random or args.derivatives:
        polynomial, variables = build_lower_bound()
        print("degrees", sp.Poly(polynomial, *variables).degree_list())
    if args.derivatives:
        assert polynomial is not None and variables is not None
        for variable in variables[1:]:
            derivative = sp.factor(sp.diff(polynomial, variable))
            print("derivative", variable, derivative)
    if args.grouped_random:
        rng = np.random.default_rng(args.seed)
        minimum = float("inf")
        point = None
        batch = 10_000
        for start in range(0, args.grouped_random, batch):
            size = min(batch, args.grouped_random - start)
            values = rng.random((size, 7))
            values[:, 0] /= args.scale
            results = grouped_numeric(values)
            index = int(np.argmin(results))
            if float(results[index]) < minimum:
                minimum = float(results[index])
                point = values[index].tolist()
        print("grouped random minimum", minimum)
        print("grouped random point", point)


if __name__ == "__main__":
    main()
