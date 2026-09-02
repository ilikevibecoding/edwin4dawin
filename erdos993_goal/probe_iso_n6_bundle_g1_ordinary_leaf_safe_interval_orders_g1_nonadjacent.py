#!/usr/bin/env python3
"""Explore a universal forest interval lower bound for rank-six g1 leaf deltas.

For a forest on q vertices, the independent-set row obeys

    C(q,r) - (q-1) C(q-2,r-2) <= i_r <= C(q,r),

by the union bound over at most q-1 edges.  Each signed quadratic monomial
in a complete leaf delta is charged by the corresponding product interval.
This script scans the resulting exact lower envelope over the four Venn
orders L, K\L, J\L, H\(K union J).  It is exploratory only.
"""

from __future__ import annotations

import argparse
from math import comb

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
)


def choose(n: int, r: int) -> int:
    return comb(n, r) if 0 <= r <= n else 0


def interval(order: int, rank: int) -> tuple[int, int]:
    upper = choose(order, rank)
    lower = upper - max(0, order - 1) * choose(order - 2, rank - 2)
    return max(0, lower), upper


def compile_terms(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    terms = []
    for monomial, coefficient in sp.Poly(expression, *symbols).terms():
        factors = []
        for symbol, exponent in zip(symbols, monomial):
            factors.extend([str(symbol)] * exponent)
        assert len(factors) == 2
        terms.append((int(coefficient), tuple(factors)))
    return tuple(terms)


def symbol_interval(name: str, sizes: dict[str, int], masks: dict[str, int]):
    prefix, family, rank = name[0], name[1], int(name[2:])
    mask = masks[prefix]
    removed = (1 if family in "UW" and mask & 1 else 0)
    removed += (1 if family in "VW" and mask & 2 else 0)
    return interval(sizes[prefix] - removed, rank)


def lower_value(terms, sizes, masks):
    cache = {}
    answer = 0
    for coefficient, factors in terms:
        bounds = []
        for factor in factors:
            if factor not in cache:
                cache[factor] = symbol_interval(factor, sizes, masks)
            bounds.append(cache[factor])
        if coefficient >= 0:
            answer += coefficient * bounds[0][0] * bounds[1][0]
        else:
            answer += coefficient * bounds[0][1] * bounds[1][1]
    return answer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=80)
    args = parser.parse_args()
    expressions = build_expressions()
    cases = {
        "00": expressions["g2"] + expressions["F"],
        "01": expressions["g2"] + expressions["F"] + expressions["QHJ"] + expressions["QKJ"] + expressions["T"],
        "10": expressions["g2"] + expressions["F"] + expressions["QHL"],
        "11": expressions["g2"] + expressions["F"] + expressions["QHL"] + expressions["QHJ"] + expressions["QKJ"] + expressions["T"],
    }
    compiled = {label: compile_terms(sp.expand(value)) for label, value in cases.items()}
    suffix_clean = {label: None for label in cases}
    by_order = []
    for n in range(2, args.max_order + 1):
        minima = {label: None for label in cases}
        witnesses = {label: None for label in cases}
        for ell in range(n + 1):
            for konly in range(n - ell + 1):
                for jonly in range(n - ell - konly + 1):
                    neither = n - ell - konly - jonly
                    sizes = {
                        "H": n,
                        "K": ell + konly,
                        "J": ell + jonly,
                        "L": ell,
                    }
                    region_sizes = (ell, konly, jonly, neither)
                    # Assign each of the two distinct marks to its genuine
                    # Venn region.  This enforces, for example, that K=H
                    # necessarily retains both marks.
                    for uregion in range(4):
                        for vregion in range(4):
                            required = [0, 0, 0, 0]
                            required[uregion] += 1
                            required[vregion] += 1
                            if any(required[index] > region_sizes[index] for index in range(4)):
                                continue
                            kmask = (1 if uregion in (0, 1) else 0) | (2 if vregion in (0, 1) else 0)
                            jmask = (1 if uregion in (0, 2) else 0) | (2 if vregion in (0, 2) else 0)
                            masks = {"H": 3, "K": kmask, "J": jmask, "L": kmask & jmask}
                            for label, terms in compiled.items():
                                value = lower_value(terms, sizes, masks)
                                if minima[label] is None or value < minima[label]:
                                    minima[label] = value
                                    witnesses[label] = (ell, konly, jonly, neither, uregion, vregion)
        by_order.append(minima)
        print("ORDER", n, *(f"{label}={minima[label]}@{witnesses[label]}" for label in cases), flush=True)

    for start in range(len(by_order)):
        if all(all(row[label] >= 0 for row in by_order[start:]) for label in cases):
            print("OBSERVED_CLEAN_SUFFIX", start + 2, "THROUGH", args.max_order)
            break


if __name__ == "__main__":
    main()
