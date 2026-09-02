#!/usr/bin/env python3
"""Explore a grouped-moment certificate for the rank-6 rooted cross bound.

The target is the stronger sufficient inequality

    i4(T) (2 i5(T) + i4(T))
        >= 24 (i5(T)i4(T-p) - i4(T)i5(T-p)).

Together with the proved rank-5 forest reserve, this implies the exact
rank-6 rooted cross inequality.
"""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)


def choose(value, rank):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def independent_4(order, edges, wedges, triples):
    return (
        choose(order, 4)
        - edges * choose(order - 2, 2)
        + wedges * (order - 4)
        + choose(edges, 2)
        - triples
    )


def independent_5(
    order,
    edges,
    wedges,
    triples,
    wedge_edge,
    connected_four,
):
    return (
        choose(order, 5)
        - edges * choose(order - 2, 3)
        + wedges * choose(order - 3, 2)
        + (choose(edges, 2) - wedges) * (order - 4)
        - triples * (order - 4)
        - wedge_edge
        + connected_four
    )


def normalized_relaxation():
    n, S, R, U, V, degree, Z, Y, W, X = sp.symbols(
        "n S R U V degree Z Y W X"
    )
    d = independent_4(n, n - 1, S, R)
    e = independent_5(n, n - 1, S, R, U, V)
    h = independent_4(
        n - 1,
        n - 1 - degree,
        S - Z,
        R - Y,
    )
    k = independent_5(
        n - 1,
        n - 1 - degree,
        S - Z,
        R - Y,
        U - W,
        V - X,
    )
    margin = sp.expand(d * (2 * e + d) - 24 * (e * h - d * k))

    u, A, B, C, D, tt, z, y, w, x = sp.symbols(
        "u A B C D tt z y w x"
    )
    normalized = sp.cancel(
        margin.subs(
            {
                n: 1 / u,
                S: A / u**2,
                R: B / u**3,
                U: C / u**4,
                V: D / u**4,
                degree: tt / u,
                Z: z / u**2,
                Y: y / u**3,
                W: w / u**4,
                X: x / u**4,
            }
        )
        * u**9
    )
    assert sp.denom(normalized) == 1

    A2, A3, root, edge_correlation, q1, q2, qd = sp.symbols(
        "A2 A3 root edge_correlation q1 q2 qd"
    )
    moment_substitution = {
        A: (A2 + u - 2 * u**2) / 2,
        B: (
            A3 / 6
            - (u**2 - 2 * u**3) / 6
            + u * edge_correlation
        ),
        tt: root + u,
        z: (root**2 + root * u) / 2 + u * q1,
        y: (
            (root**3 - root * u**2) / 6
            + (u * q2 - u**2 * q1) / 2
            + u * root * q1
            + u**2 * qd
        ),
        # Exact normalized count of the disconnected P3+K2
        # three-edge motif.  It follows by summing, over each wedge,
        # the edges disjoint from its three vertices.
        C: (
            u
            * (1 + u)
            * (A2 + u - 2 * u**2)
            / 2
            - u * A3 / 2
            - 2 * u**2 * A2
            - 2 * u**2 * edge_correlation
            - 3 * u**3 * (1 - 2 * u) / 2
        ),
        # The connected-four variables D=V(T)/n^4 and
        # x=(V(T)-V(T-p))/n^4 remain explicit.  Their opposite
        # derivative directions require a rooted coupling.
        w: 0,
    }
    moments = sp.expand(normalized.subs(moment_substitution))
    return moments, (
        u,
        A2,
        A3,
        root,
        edge_correlation,
        q1,
        q2,
        qd,
        D,
        x,
    )


def endpoint_polynomial(threshold: int):
    moments, variables = normalized_relaxation()
    (
        u,
        A2,
        A3,
        root,
        edge_correlation,
        q1,
        q2,
        qd,
        connected_four,
        connected_four_loss,
    ) = variables
    mass = 1 - 2 * u
    relaxed = sp.expand(
        moments.subs(
            {
                A3: mass * A2,
                edge_correlation: (mass**2 - A2) / 2,
                qd: 0,
                connected_four: 0,
                connected_four_loss: 0,
            }
        )
    )

    v, s, a, zn, zr = sp.symbols("v s a zn zr")
    U0 = v / threshold
    root_mass = (1 - 3 * U0) * s
    remainder = (1 - 3 * U0) * (1 - s)
    neighbor_mass = U0 + remainder * a
    far_mass = remainder * (1 - a)
    neighbor_second = (
        neighbor_mass**2
        * (U0 + root_mass * zn)
        / (root_mass + U0)
    )
    total_second = (
        root_mass**2 + neighbor_second + far_mass**2 * zr
    )
    rational = sp.cancel(
        relaxed.subs(
            {
                u: U0,
                root: root_mass,
                q1: neighbor_mass,
                q2: neighbor_second,
                A2: total_second,
            }
        )
    )
    numerator, denominator = sp.fraction(rational)
    return sp.expand(numerator), sp.factor(denominator), (
        v,
        s,
        a,
        zn,
        zr,
    )


def leaf_endpoint_polynomial(
    threshold: int,
    support_excess: int | None = None,
    deleted_bound: str = "star",
    edge_bound: str = "bipartite",
):
    """Root-degree-one section with exact connected-subtree bounds.

    If p is a leaf, every lost connected four-edge subtree maps
    injectively, after removing the leaf edge, to a connected
    three-edge subtree.  Also T-p is a tree of order n-1 and therefore
    has at least n-5 connected four-edge subtrees.
    """
    moments, variables = normalized_relaxation()
    (
        u,
        A2,
        A3,
        root,
        edge_correlation,
        q1,
        q2,
        qd,
        connected_four,
        connected_four_loss,
    ) = variables
    mass = 1 - 2 * u
    triples = (
        A3 / 6
        - (u**2 - 2 * u**3) / 6
        + u * edge_correlation
    )
    edge_upper = (
        mass**2 / 4
        if edge_bound == "bipartite"
        else (mass**2 - A2) / 2
    )
    relaxed = sp.expand(
        moments.subs(
            {
                # The positive-excess support is a forest, hence
                # bipartite.  Motzkin--Straus on either bipartition
                # gives sum_{uv in E} x_u x_v <= mass^2/4.
                edge_correlation: edge_upper,
                qd: 0,
            }
        )
    )

    v, a, zr = sp.symbols("v a zr")
    U0 = v / threshold
    if support_excess is None:
        neighbor_mass = U0 + (1 - 3 * U0) * a
        far_mass = (1 - 3 * U0) * (1 - a)
        output_variables = (v, a, zr)
    else:
        neighbor_mass = support_excess * U0
        far_mass = 1 - 2 * U0 - neighbor_mass
        output_variables = (v, zr)
    far_second = far_mass**2 * zr
    total_second = neighbor_mass**2 + far_second
    total_third_upper = (
        neighbor_mass**3 + far_mass * far_second
    )
    parameterized_edge_upper = (
        (1 - 2 * U0) ** 2 / 4
        if edge_bound == "bipartite"
        else (
            (1 - 2 * U0) ** 2 - total_second
        )
        / 2
    )
    if support_excess is None:
        triples_parameterized = triples.subs(
            {
                u: U0,
                A2: total_second,
                A3: total_third_upper,
                edge_correlation: parameterized_edge_upper,
            }
        )
        connected_loss_upper = U0 * triples_parameterized
    else:
        # Let q be the support of the rooted leaf and let
        # delta'=deg_T(q)-1=support_excess.  Removing the leaf edge
        # identifies each lost four-edge subtree with a connected
        # three-edge subtree of T-p containing q.  Expanding those
        # rooted triples and using the far second moment gives this
        # upper bound when delta' is 1 or 2; the omitted local-mass
        # coefficient is then nonpositive.
        rooted_triple_base = (
            U0 * neighbor_mass**3 / 6
            - U0**2 * neighbor_mass**2 / 2
            + U0**3 * neighbor_mass / 3
        )
        connected_loss_upper = (
            rooted_triple_base
            + U0**2 * far_second / 2
            + U0**3 * far_mass
        )
    if support_excess is None or deleted_bound == "component":
        deleted_connected_lower = U0**3 * (1 - 5 * U0)
    elif deleted_bound == "triple":
        triples_parameterized = triples.subs(
            {
                u: U0,
                A2: total_second,
                A3: total_third_upper,
                edge_correlation: parameterized_edge_upper,
            }
        )
        lost_triples_upper = (
            U0 * neighbor_mass**2 / 2
            - U0**2 * neighbor_mass / 2
            + U0**2 * far_mass
        )
        deleted_connected_lower = (
            U0
            * (triples_parameterized - lost_triples_upper)
            / 4
        )
    else:
        # The surviving tree contains every four-edge star centered
        # at a far vertex.  Moment log-convexity gives
        # A4 >= A2^3/A1^2, while A3 <= A1*A2.
        deleted_connected_lower = (
            far_second**3 / (24 * far_mass**2)
            - U0 * far_mass * far_second / 12
            - U0**2 * far_second / 24
            + U0**3 * far_mass / 12
        )
    rational = sp.cancel(
        relaxed.subs(
            {
                u: U0,
                root: 0,
                q1: neighbor_mass,
                q2: neighbor_mass**2,
                A2: total_second,
                A3: total_third_upper,
                connected_four_loss: connected_loss_upper,
                connected_four: (
                    connected_loss_upper
                    + deleted_connected_lower
                ),
            }
        )
    )
    numerator, denominator = sp.fraction(rational)
    return (
        sp.expand(numerator),
        sp.factor(denominator),
        output_variables,
    )


def leaf_multibranch_endpoint_polynomial(
    threshold: int,
    branch_case: str,
    deleted_bound: str = "component",
):
    """Continuous relaxation with exact multi-branch mass reserves.

    The total normalized positive excess-degree mass is 1-2u.

    * support1-far2: the support of the rooted leaf has excess one,
      and at least two branch vertices occur farther away.
    * support2-far1: the support has excess at least two, and at least
      one further branch vertex occurs away from it.
    """
    moments, variables = normalized_relaxation()
    (
        u,
        A2,
        A3,
        root,
        edge_correlation,
        q1,
        q2,
        qd,
        connected_four,
        connected_four_loss,
    ) = variables
    mass = 1 - 2 * u
    triples = (
        A3 / 6
        - (u**2 - 2 * u**3) / 6
        + u * edge_correlation
    )
    relaxed = sp.expand(
        moments.subs(
            {
                edge_correlation: mass**2 / 4,
                qd: 0,
            }
        )
    )

    v, a, zr = sp.symbols("v a zr")
    U0 = v / threshold
    if branch_case.startswith("support1-far"):
        far_branches = int(branch_case.removeprefix("support1-far"))
        neighbor_mass = U0
        far_mass = 1 - 3 * U0
        # With at least two positive integer excesses, the largest
        # second moment puts one unit at one branch vertex and all
        # remaining mass at the other.
        far_second_upper = (
            far_mass - (far_branches - 1) * U0
        ) ** 2 + (far_branches - 1) * U0**2
        far_second = far_second_upper * zr
        output_variables = (v, zr)
    elif branch_case.startswith("support2-far"):
        far_branches = int(branch_case.removeprefix("support2-far"))
        # Reserve two excess units at the leaf support and one at a
        # farther branch vertex.  Split every remaining unit freely.
        remainder = 1 - (4 + far_branches) * U0
        neighbor_mass = 2 * U0 + remainder * a
        far_mass = (
            far_branches * U0 + remainder * (1 - a)
        )
        far_second_upper = (
            far_mass - (far_branches - 1) * U0
        ) ** 2 + (far_branches - 1) * U0**2
        far_second = far_second_upper * zr
        output_variables = (v, a, zr)
    else:
        raise ValueError(branch_case)

    total_second = neighbor_mass**2 + far_second
    total_third_upper = neighbor_mass**3 + far_mass * far_second
    triples_parameterized = triples.subs(
        {
            u: U0,
            A2: total_second,
            A3: total_third_upper,
            edge_correlation: (1 - 2 * U0) ** 2 / 4,
        }
    )
    if branch_case.startswith("support1-far"):
        rooted_triple_base = (
            U0 * neighbor_mass**3 / 6
            - U0**2 * neighbor_mass**2 / 2
            + U0**3 * neighbor_mass / 3
        )
        connected_loss_upper = (
            rooted_triple_base
            + U0**2 * far_second / 2
            + U0**3 * far_mass
        )
    else:
        # Exact local expansion of the connected three-edge subtrees
        # containing the leaf support q.  If t=deg_{T-p}(q)>=2,
        # their four terms are bounded by the far excess-degree mass
        # and second moment.  The displayed coefficient uses t-1
        # instead of t-3/2, so it also safely covers the t=2 endpoint.
        rooted_triple_base = (
            U0 * neighbor_mass**3 / 6
            - U0**2 * neighbor_mass**2 / 2
            + U0**3 * neighbor_mass / 3
        )
        connected_loss_upper = (
            rooted_triple_base
            + U0**2 * far_second / 2
            + U0**2 * neighbor_mass * far_mass
            - U0**3 * far_mass
        )

    if branch_case.startswith("support1-far") or deleted_bound == "star":
        # Count four-edge stars centered at far vertices.  Moment
        # log-convexity supplies the fourth-moment term.
        deleted_connected_lower = (
            far_second**3 / (24 * far_mass**2)
            - U0 * far_mass * far_second / 12
            - U0**2 * far_second / 24
            + U0**3 * far_mass / 12
        )
    else:
        # A tree of order n-1 contains at least n-5 connected
        # four-edge subtrees (the path is extremal).
        deleted_connected_lower = U0**3 * (1 - 5 * U0)

    rational = sp.cancel(
        relaxed.subs(
            {
                u: U0,
                root: 0,
                q1: neighbor_mass,
                q2: neighbor_mass**2,
                A2: total_second,
                A3: total_third_upper,
                connected_four_loss: connected_loss_upper,
                connected_four: (
                    connected_loss_upper
                    + deleted_connected_lower
                ),
            }
        )
    )
    numerator, denominator = sp.fraction(rational)
    return (
        sp.expand(numerator),
        sp.factor(denominator),
        output_variables,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=int, default=18)
    parser.add_argument("--leaf", action="store_true")
    parser.add_argument(
        "--support-excess",
        type=int,
        choices=(1, 2),
    )
    parser.add_argument(
        "--deleted-bound",
        choices=("star", "component", "triple"),
        default="star",
    )
    parser.add_argument(
        "--edge-bound",
        choices=("bipartite", "all-pairs"),
        default="bipartite",
    )
    parser.add_argument(
        "--branch-case",
        choices=(
            "support1-far2",
            "support1-far3",
            "support1-far4",
            "support1-far5",
            "support1-far6",
            "support1-far7",
            "support1-far8",
            "support2-far1",
            "support2-far2",
            "support2-far3",
            "support2-far4",
            "support2-far5",
            "support2-far6",
            "support2-far7",
            "support2-far8",
        ),
    )
    args = parser.parse_args()
    if args.branch_case:
        numerator, denominator, variables = (
            leaf_multibranch_endpoint_polynomial(
                args.threshold,
                args.branch_case,
                args.deleted_bound,
            )
        )
    elif args.leaf:
        numerator, denominator, variables = leaf_endpoint_polynomial(
            args.threshold,
            args.support_excess,
            args.deleted_bound,
            args.edge_bound,
        )
    else:
        numerator, denominator, variables = endpoint_polynomial(
            args.threshold
        )
    polynomial = sp.Poly(numerator, *variables)
    print("denominator", denominator)
    print(
        "power degrees",
        polynomial.degree_list(),
        "terms",
        len(polynomial.terms()),
    )
    degrees, coefficients = tensor_bernstein_fast(
        numerator, variables
    )
    minimum, index = minimum_with_index(coefficients)
    negatives = sum(1 for value in coefficients.flat if value < 0)
    zeros = sum(1 for value in coefficients.flat if value == 0)
    print(
        "Bernstein",
        f"degrees={degrees}",
        f"coefficients={coefficients.size}",
        f"minimum={minimum}",
        f"index={index}",
        f"negatives={negatives}",
        f"zeros={zeros}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
