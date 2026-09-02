#!/usr/bin/env python3
"""Polarize a coupled-cone leaf-growth difference into a 3-vertex kernel."""

from __future__ import annotations

import itertools
import random

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise import (
    S,
    T,
    choose,
    cone_controls,
    d,
    n,
)


y, z, w = sp.symbols("y z w", integer=True, positive=True)
SLOTS = (y, z, w)
VARIABLES = tuple(S.values())+tuple(T.values())
FEATURES = {
    S[rank]: (lambda value, rank=rank: choose(value, rank))
    for rank in S
}
FEATURES.update({
    T[rank]: (lambda value, rank=rank: choose(value, rank)**2)
    for rank in T
})


def growth_differences():
    old = cone_controls(n, S, T)
    new_s = {
        rank: sp.expand(S[rank]+choose(d, rank-1))
        for rank in S
    }
    new_t = {
        rank: sp.expand(T[rank]-choose(d, rank)**2+choose(d+1, rank)**2)
        for rank in T
    }
    new = cone_controls(n+1, new_s, new_t)
    return tuple(sp.expand(after-before) for after, before in zip(new, old))


def triple_kernel(expression):
    result = 0
    poly = sp.Poly(expression, *VARIABLES)
    for powers, coefficient in poly.terms():
        features = []
        for variable, power in zip(VARIABLES, powers):
            features.extend([variable]*power)
        degree = len(features)
        assert degree <= 3
        padded = features+[None]*(3-degree)
        terms = []
        for assignment in itertools.permutations(padded):
            term = sp.Integer(1)
            for slot, feature in zip(SLOTS, assignment):
                if feature is not None:
                    term *= FEATURES[feature](slot)
            terms.append(term)
        symmetric = sum(terms)/6
        result += coefficient*symmetric/n**(3-degree)
    return sp.factor(result)


def mass_triple_kernel(expression):
    result = 0
    poly = sp.Poly(expression, *VARIABLES)
    mass = n-2

    def mass_feature(feature, value):
        if feature in S.values():
            rank = next(rank for rank in S if S[rank] == feature)
            return sp.cancel(choose(value+1, rank)/value)
        rank = next(rank for rank in T if T[rank] == feature)
        return sp.cancel(choose(value+1, rank)**2/value)

    for powers, coefficient in poly.terms():
        features = []
        for variable, power in zip(VARIABLES, powers):
            features.extend([variable]*power)
        degree = len(features)
        padded = features+[None]*(3-degree)
        terms = []
        for assignment in itertools.permutations(padded):
            term = sp.Integer(1)
            for slot, feature in zip(SLOTS, assignment):
                if feature is not None:
                    term *= mass_feature(feature, slot)
            terms.append(term)
        result += coefficient*(sum(terms)/6)/mass**(3-degree)
    return sp.factor(result)


def evaluated_on(expression, values):
    substitutions = {
        S[rank]: sum(choose(value, rank) for value in values)
        for rank in S
    }
    substitutions.update({
        T[rank]: sum(choose(value, rank)**2 for value in values)
        for rank in T
    })
    return sp.expand(expression.subs(substitutions))


def distinct_triple_kernel(expression):
    empty = evaluated_on(expression, ())
    one = {slot: sp.expand(evaluated_on(expression, (slot,))-empty) for slot in SLOTS}

    def two(left, right):
        return sp.expand(
            evaluated_on(expression, (left, right))-empty-one[left]-one[right]
        )

    pairs = {(y, z): two(y, z), (y, w): two(y, w), (z, w): two(z, w)}
    three = sp.expand(
        evaluated_on(expression, SLOTS)-empty-sum(one.values())-sum(pairs.values())
    )
    return sp.factor(
        three+sum(pairs.values())/(n-2)
        +sum(one.values())/choose(n-1, 2)
        +empty/choose(n, 3)
    )


def main() -> None:
    differences = growth_differences()
    for index in (0, 3, 4, 5, 6, 7, 8):
        kernel = triple_kernel(differences[index])
        numerator = sp.cancel(kernel).as_numer_denom()[0]
        print("CONTROL", index, "KERNEL_TERMS", len(sp.Poly(numerator, y, z, w).terms()),
              "YZW_DEGREE", sp.Poly(numerator, y, z, w).total_degree())
        if index != 6:
            continue
        function = sp.lambdify((n, d, y, z, w), kernel, "math")
        minimum = None
        for order in range(40, 61):
            for maximum in range(4, order-4):
                values = {1, 2, 3, 4, maximum}
                values.update(random.Random(order*100+maximum).randrange(1, maximum+1) for _ in range(20))
                for triple in itertools.product(sorted(values), repeat=3):
                    value = function(order, maximum, *triple)
                    candidate = (value, order, maximum, triple)
                    minimum = candidate if minimum is None else min(minimum, candidate)
        print("CONTROL6_SAMPLE_MIN", minimum)
        distinct = distinct_triple_kernel(differences[index])
        distinct_function = sp.lambdify((n, d, y, z, w), distinct, "math")
        distinct_minimum = None
        for order in range(40, 61):
            for maximum in range(4, order-4):
                values = {1, 2, 3, 4, maximum}
                values.update(random.Random(order*100+maximum).randrange(1, maximum+1) for _ in range(20))
                for triple in itertools.product(sorted(values), repeat=3):
                    if sum(triple) > order+1:
                        continue
                    value = distinct_function(order, maximum, *triple)
                    candidate = (value, order, maximum, triple)
                    distinct_minimum = candidate if distinct_minimum is None else min(distinct_minimum, candidate)
        numerator = sp.cancel(distinct).as_numer_denom()[0]
        print("CONTROL6_DISTINCT_TERMS", len(sp.Poly(numerator, y, z, w).terms()),
              "DEGREE", sp.Poly(numerator, y, z, w).total_degree())
        print("CONTROL6_DISTINCT_SAMPLE_MIN", distinct_minimum)
        mass_kernel = mass_triple_kernel(differences[index])
        mass_function = sp.lambdify((n, d, y, z, w), mass_kernel, "math")
        mass_minimum = None
        for order in range(40, 61):
            for maximum in range(4, order-4):
                max_increment = maximum-1
                values = {1, 2, 3, max_increment}
                values.update(random.Random(order*100+maximum).randrange(1, max_increment+1) for _ in range(20))
                for triple in itertools.product(sorted(values), repeat=3):
                    value = mass_function(order, maximum, *triple)
                    candidate = (value, order, maximum, triple)
                    mass_minimum = candidate if mass_minimum is None else min(mass_minimum, candidate)
        numerator = sp.cancel(mass_kernel).as_numer_denom()[0]
        print("CONTROL6_MASS_TERMS", len(sp.Poly(numerator, y, z, w).terms()),
              "DEGREE", sp.Poly(numerator, y, z, w).total_degree())
        print("CONTROL6_MASS_SAMPLE_MIN", mass_minimum)


if __name__ == "__main__":
    main()
