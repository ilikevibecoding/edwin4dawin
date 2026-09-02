#!/usr/bin/env python3
"""Exploratory rank-shift checks for singleton-ordinary sibling coefficients.

Diagnostic only.  Rebuild the ordinary-leaf increment at arbitrary rank and
test whether the binomial coefficients in the number of sibling leaves are
scalar copies of lower-rank increments.
"""

from __future__ import annotations

import hashlib

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import (
    add_xd, isolate_multiply, nested,
)
from derive_iso_n4_bundle_polynomial_root import (
    binomial_basis, isolate_multiply as isolate_polynomial,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
)
from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    symbolic_rows,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolates_g1_nonadjacent import (
    replace_rows, structural, scalar_ratio,
)


def g1(rank, crows, drows):
    return sp.expand(
        nested(add_xd(isolate_multiply(crows, 1), drows), rank)
        - nested(add_xd(crows, drows), rank)
        - nested(crows, rank - 1)
    )


def leaf_delta(rank):
    hrows, krows, jrows, lrows = (
        symbolic_rows(prefix) for prefix in "HKJL"
    )
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    brows = add_leaf(jrows, lrows)
    drows = add_leaf(brows, jrows)
    return sp.expand(g1(rank, crows, drows) - g1(rank, arows, brows))


def specialize(expression, mode, t, n):
    rrows, srows, xrows, yrows = (
        symbolic_rows(prefix) for prefix in "RSXY"
    )
    if mode == "collision":
        value = replace_rows(
            expression,
            H=isolate_polynomial(rrows, t, 7), K=srows,
            J=isolate_polynomial(srows, t, 7), L=srows,
        )
        return sp.expand(value.subs(
            structural(rrows, n) | structural(srows, n - 1)
        ))
    value = replace_rows(
        expression,
        H=isolate_polynomial(rrows, t, 7), K=srows,
        J=isolate_polynomial(xrows, t, 7), L=yrows,
    )
    return sp.expand(value.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    ))


def digest(expression):
    return hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()


def main():
    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    deltas = {rank: leaf_delta(rank) for rank in range(3, 7)}
    for mode in ("collision", "distinct"):
        blocks = {
            rank: binomial_basis(specialize(delta, mode, t, n), t)
            for rank, delta in deltas.items()
        }
        for index in range(1, 4):
            target = blocks[6][index]
            lower_rank = 6 - index
            candidate = blocks[lower_rank][0]
            print(
                mode, "j", index, "rank", lower_rank,
                "ratio", scalar_ratio(target, candidate),
                "target_sha", digest(target),
                "candidate_sha", digest(candidate),
                "residual_terms",
                len(sp.Poly(
                    sp.expand(target - candidate),
                    *sorted((target - candidate).free_symbols, key=str),
                ).terms()),
            )
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
