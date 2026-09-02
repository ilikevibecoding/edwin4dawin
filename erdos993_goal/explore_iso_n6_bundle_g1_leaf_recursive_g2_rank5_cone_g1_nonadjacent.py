#!/usr/bin/env python3
"""Search exact rank-five gap decompositions after the forced rank-six g2 term.

This is an exploratory cone search.  It never promotes a numerical solution:
every candidate returned by HiGHS is rationalized and checked by exact SymPy
expansion before it is printed.
"""

from __future__ import annotations

import itertools
from fractions import Fraction

import numpy as np
import sympy as sp
from scipy.linalg import qr
from scipy.optimize import linprog
from scipy.sparse import csc_matrix

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply, nested as nested_scalar
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def substitute_rank5(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(expression.subs(rules))


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def defect_coefficient(rowset, a, b):
    e, u, v, w = rowset
    return sp.expand(
        at(e, b) * at(w, a - 2)
        + at(e, a) * at(w, b - 2)
        + at(u, b - 1) * at(v, a - 1)
        + at(u, a - 1) * at(v, b - 1)
    )


def c5(rowset):
    return sp.expand(defect_coefficient(rowset, 4, 4) - defect_coefficient(rowset, 3, 5))


def nested_off_diagonal(rowset, a, b):
    """Get [z^a w^b] of the full nested operator by direct polynomials."""
    from derive_iso_common_factor_product_rule_root import nested
    from derive_iso_nested_compact_operator_root import w, z

    polynomial_rows = []
    for row in rowset:
        pz = sum(value * z**rank for rank, value in enumerate(row))
        pw = sum(value * w**rank for rank, value in enumerate(row))
        polynomial_rows.append((pz, pw, sp.diff(pz, z), sp.diff(pw, w)))
    value = sp.expand(nested(tuple(polynomial_rows)))
    return sp.expand(value.coeff(z, a).coeff(w, b))


def scalar_atoms(label, rowset):
    c = c5(rowset)
    n = nested_scalar(rowset, 5)
    m = 2 * nested_off_diagonal(rowset, 4, 5)
    return [
        (f"C5({label})", c),
        (f"N5({label})", n),
        (f"S5({label})", sp.expand(m + 3 * c)),
    ]


def exact_nonnegative_solution(target, candidates):
    variables = tuple(sorted(
        target.free_symbols | set().union(*(value.free_symbols for _, value in candidates)),
        key=str,
    ))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(value, *variables).terms()) for _, value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    row_index = {monomial: index for index, monomial in enumerate(monomials)}
    rr, cc, vv = [], [], []
    for column, terms in enumerate(candidate_terms):
        for monomial, coefficient in terms.items():
            rr.append(row_index[monomial])
            cc.append(column)
            vv.append(float(coefficient))
    matrix = csc_matrix((vv, (rr, cc)), shape=(len(monomials), len(candidates)))
    rhs = np.array([float(target_terms.get(monomial, 0)) for monomial in monomials])
    result = linprog(
        np.ones(len(candidates)),
        A_eq=matrix,
        b_eq=rhs,
        bounds=(0, None),
        method="highs",
        options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
    )
    print("LP", matrix.shape, "nnz", matrix.nnz, result.status, result.message, flush=True)
    if not result.success:
        dense = matrix.toarray()
        least, *_ = np.linalg.lstsq(dense, rhs, rcond=None)
        residual = np.max(np.abs(dense @ least - rhs))
        print("UNCONSTRAINED_MAX_RESIDUAL", residual, flush=True)
        if residual < 1e-7:
            _q, rfactor, pivots = qr(dense, mode="economic", pivoting=True)
            diagonal = np.abs(np.diag(rfactor))
            rank = int(np.count_nonzero(diagonal > 1e-9 * (diagonal[0] if len(diagonal) else 1)))
            selected = list(map(int, pivots[:rank]))
            exact_matrix = sp.MutableSparseMatrix(len(monomials), rank, {})
            for new_column, old_column in enumerate(selected):
                for monomial, coefficient in candidate_terms[old_column].items():
                    exact_matrix[row_index[monomial], new_column] = coefficient
            exact_rhs = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
            exact = sp.linsolve((exact_matrix, exact_rhs))
            print("UNCONSTRAINED_EXACT_RANK", rank, "SOLUTION", exact, flush=True)
            if exact is not sp.EmptySet:
                vector = next(iter(exact))
                chosen = [
                    (candidates[selected[index]][0], value)
                    for index, value in enumerate(vector) if value
                ]
                print("UNCONSTRAINED_EXACT_CHOSEN", chosen, flush=True)
        return None
    rational = [sp.Rational(Fraction(float(value)).limit_denominator(10000)) for value in result.x]
    chosen = [(candidates[index][0], value) for index, value in enumerate(rational) if value]
    recovered = sp.expand(sum(value * candidates[index][1] for index, value in enumerate(rational)))
    print("CHOSEN", chosen, flush=True)
    print("EXACT", sp.expand(recovered - target) == 0, flush=True)
    return chosen if recovered == target else None


def main():
    rank6_g1 = reconstruct(1)
    rank6_g2 = reconstruct(2)
    hrows, krows, jrows, lrows = (rows(prefix) for prefix in "HKJL")
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    ihrows = isolate_multiply(hrows, 1)
    ijrows = isolate_multiply(jrows, 1)
    b1rows = add_leaf(jrows, lrows)
    d1rows = add_leaf(b1rows, jrows)

    recursive = substitute(rank6_g2, hrows, jrows)
    targets = {}
    base = substitute(rank6_g1, arows, jrows)
    targets["00"] = sp.expand(substitute(rank6_g1, crows, jrows) - base - recursive)
    targets["01"] = sp.expand(substitute(rank6_g1, crows, ijrows) - base - recursive)
    base = substitute(rank6_g1, arows, b1rows)
    targets["10"] = sp.expand(substitute(rank6_g1, crows, b1rows) - base - recursive)
    targets["11"] = sp.expand(substitute(rank6_g1, crows, d1rows) - base - recursive)

    generic_c, generic_d, rank5_g1, rank5_g2 = raw_coefficients()
    zero = tuple(tuple(sp.Integer(0) for _ in range(7)) for _ in "EUVW")
    zero6 = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    sources = {
        "H": hrows,
        "K": krows,
        "J": jrows,
        "L": lrows,
        "A": arows,
        "C": crows,
        "IH": ihrows,
        "IJ": ijrows,
        "B1": b1rows,
        "D1": d1rows,
    }
    # Every displayed pair corresponds to an induced-subforest relation in at
    # least one of the four genuine retention cases.  Case-specific filtering
    # below prevents using B1/D1 in the parent-deleted branches.
    base_pairs = {
        ("H", "0"), ("H", "H"), ("H", "K"), ("H", "J"), ("H", "L"),
        ("K", "0"), ("K", "K"), ("K", "L"),
        ("A", "0"), ("A", "A"), ("A", "H"), ("A", "K"), ("A", "J"),
        ("C", "0"), ("C", "C"), ("C", "A"), ("C", "H"), ("C", "K"),
        ("IH", "0"), ("IH", "IH"), ("IH", "H"), ("IH", "J"), ("IH", "IJ"),
    }
    extra_pairs = {
        "00": set(),
        "01": set(),
        "10": {("A", "B1"), ("C", "B1"), ("H", "J"), ("K", "L")},
        "11": {("A", "B1"), ("C", "D1"), ("IH", "IJ"), ("K", "L")},
    }
    scalar_sources = ["H", "K", "A", "C", "IH"]
    cached_scalar_atoms = list(itertools.chain.from_iterable(
        scalar_atoms(label, sources[label]) for label in scalar_sources
    ))
    for case, target in targets.items():
        pairs = sorted(base_pairs | extra_pairs[case])
        candidates = []
        for index, raw in ((1, rank5_g1), (2, rank5_g2)):
            for cname, dname in pairs:
                candidates.append((
                    f"g{index}_5({cname},{dname})",
                    substitute_rank5(
                        raw, generic_c, generic_d, sources[cname],
                        zero if dname == "0" else sources[dname],
                    ),
                ))
        candidates.extend(cached_scalar_atoms)
        print("CASE", case, "TARGET_TERMS", len(sp.Poly(target, *sorted(target.free_symbols, key=str)).terms()),
              "CANDIDATES", len(candidates), flush=True)
        exact_nonnegative_solution(target, candidates)
        # Conditional-G2 search: allow universal rank-six g2 on strictly
        # smaller natural induced configurations, while retaining only proved
        # rank-five atoms for the lower-rank part.
        conditional = list(candidates)
        for cname, dname in pairs:
            if cname == "C":
                continue
            conditional.append((
                f"g2_6({cname},{dname})",
                substitute(
                    rank6_g2, sources[cname],
                    zero6 if dname == "0" else sources[dname],
                ),
            ))
        full_target = sp.expand(target + recursive)
        print("CASE_CONDITIONAL_G2", case, "TARGET_TERMS",
              len(sp.Poly(full_target, *sorted(full_target.free_symbols, key=str)).terms()),
              "CANDIDATES", len(conditional), flush=True)
        exact_nonnegative_solution(full_target, conditional)


if __name__ == "__main__":
    main()
