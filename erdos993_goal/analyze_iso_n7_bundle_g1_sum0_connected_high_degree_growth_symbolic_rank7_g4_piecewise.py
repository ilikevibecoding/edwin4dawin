#!/usr/bin/env python3
"""Symbolic leaf-growth differences for the coupled degree-profile cone."""

from __future__ import annotations

import math

import sympy as sp


n, d = sp.symbols("n d", integer=True, positive=True)
S = {rank: sp.symbols(f"S{rank}", nonnegative=True) for rank in range(2, 8)}
T = {rank: sp.symbols(f"T{rank}", nonnegative=True) for rank in (2, 3)}


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/math.factorial(rank)


def binomial_coefficients(poly, variable):
    degree = sp.Poly(sp.expand(poly), variable).degree()
    return {
        rank: sp.expand(sum(
            (-1)**(rank-index)*math.comb(rank, index)*poly.subs(variable, index)
            for index in range(rank+1)
        ))
        for rank in range(degree+1)
    }


def sum_degree_poly(poly, variable, order, edges, moments):
    coefficients = binomial_coefficients(poly, variable)
    result = coefficients.get(0, 0)*order+coefficients.get(1, 0)*2*edges
    result += sum(
        coefficients.get(rank, 0)*moments[rank]
        for rank in moments
    )
    assert all(rank <= max(moments) for rank in coefficients if coefficients[rank] != 0)
    return sp.expand(result)


def cone_controls(order, moments, squares):
    edges = order-1
    y = sp.symbols("y")
    stars = {
        rank: sp.expand(
            choose(order, rank)-edges*choose(order-2, rank-2)
            +sum(
                (-1)**support*moments[support]
                *choose(order-support-1, rank-support-1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 9)
    }
    s2, s3 = moments[2], moments[3]
    wedge_pairs = (s2**2-squares[2])/2
    disjoint_pairs = choose(edges, 2)-s2
    upper7 = sum_degree_poly(
        choose(y, 2)*choose(edges-y, 2), y, order, edges, moments
    )
    upper8 = sp.expand(
        sum_degree_poly(choose(y, 5)*(edges-y), y, order, edges, moments)
        +s2*moments[4]
        -sum_degree_poly(choose(y, 4)*choose(y, 2), y, order, edges, moments)
        +(s3**2-squares[3])/2
        +sum_degree_poly(choose(y, 3)*choose(edges-y, 2), y, order, edges, moments)
        +wedge_pairs*edges
        +disjoint_pairs*choose(edges-2, 2)/6
    )
    jmax = sp.expand(disjoint_pairs-(order-3))

    def q(rows):
        w3, w4, w5, w6, w7, w8 = (rows[index] for index in range(3, 9))
        return sp.expand(
            8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
            -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
            +39*w5*w5+10*w5*w6
        )

    def at(s, t):
        j4 = jmax*s
        l5 = j4*(sp.Rational(1, 2)+(order-sp.Rational(9, 2))*t)
        correction = {
            4: j4,
            5: -l5,
            6: (order-5)*l5/3,
            7: upper7,
            8: upper8,
        }
        rows = {
            rank: sp.expand(stars[rank]+sum(
                correction[support]*choose(order-support, rank-support)
                for support in range(4, rank+1)
            ))
            for rank in range(3, 9)
        }
        return q(rows)

    grid = [[at(sp.Rational(i, 2), sp.Rational(j, 2)) for j in range(3)] for i in range(3)]

    def axis(values):
        return (values[0], 2*values[1]-(values[0]+values[2])/2, values[2])

    s_controls = [axis([grid[i][j] for i in range(3)]) for j in range(3)]
    return tuple(
        sp.expand(axis([s_controls[j][i] for j in range(3)])[k])
        for i in range(3)
        for k in range(3)
    )


def main() -> None:
    old = cone_controls(n, S, T)
    new_s = {
        rank: sp.expand(S[rank]+choose(d, rank-1))
        for rank in S
    }
    new_t = {
        rank: sp.expand(
            T[rank]-choose(d, rank)**2+choose(d+1, rank)**2
        )
        for rank in T
    }
    new = cone_controls(n+1, new_s, new_t)
    variables = tuple(S.values())+tuple(T.values())
    for index, (after, before) in enumerate(zip(new, old)):
        difference = sp.expand(after-before)
        poly = sp.Poly(difference, *variables)
        negative = [(powers, coefficient) for powers, coefficient in poly.terms() if coefficient.could_extract_minus_sign()]
        print(index, "TOTAL_DEGREE", poly.total_degree(), "TERMS", len(poly.terms()),
              "NEGATIVE_COEFFICIENTS", len(negative))
        if index in (0, 3, 4, 5, 6, 7, 8):
            print("CONTROL", index, sp.factor(difference))


if __name__ == "__main__":
    main()
