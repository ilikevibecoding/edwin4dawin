#!/usr/bin/env python3
"""Search a universal nested-complex shadow cone for rank-five g2.

Discovery only.  The four marked rows are written as the f-vectors of the
four face categories P,A,B,Z (neither mark, u only, v only, both), and D gives
induced subcomplex categories.  The LP cone uses nonnegative monomials,
containment slacks, and the elementary face-shadow incidence

    X_1 Y_k - (k+1)Y_(k+1) >= 0  whenever Y is a subcomplex of X.
"""

from __future__ import annotations

import itertools

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import nested, raw_g2


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def category_rows(prefix):
    p = tuple(sp.symbols(f"{prefix}P0:7"))
    a = tuple(sp.symbols(f"{prefix}A0:7"))
    b = tuple(sp.symbols(f"{prefix}B0:7"))
    z = tuple(sp.symbols(f"{prefix}Z0:7"))
    rows = []
    for kind in "EUVW":
        values = []
        for rank in range(7):
            mapping = {
                "E": p[rank] + at(a, rank - 1) + at(b, rank - 1) + at(z, rank - 2),
                "U": p[rank] + at(b, rank - 1),
                "V": p[rank] + at(a, rank - 1),
                "W": p[rank],
            }
            values.append(mapping[kind])
        rows.append(tuple(values))
    return tuple(rows), {"P": p, "A": a, "B": b, "Z": z}


def main():
    crows, ccat = category_rows("c")
    drows, dcat = category_rows("d")
    expression = raw_g2(crows, drows)

    # Each branch fixes whether {u,v} is a face and which marks survive in D.
    branches = []
    for nonadjacent, survive_u, survive_v in itertools.product((0, 1), repeat=3):
        substitutions = {
            ccat["P"][0]: 1,
            ccat["A"][0]: 1,
            ccat["B"][0]: 1,
            ccat["Z"][0]: nonadjacent,
            dcat["P"][0]: 1,
            dcat["A"][0]: survive_u,
            dcat["B"][0]: survive_v,
            dcat["Z"][0]: nonadjacent * survive_u * survive_v,
        }
        for category in ("A", "B", "Z"):
            if substitutions[dcat[category][0]] == 0:
                substitutions.update({value: 0 for value in dcat[category]})
        if not nonadjacent:
            substitutions.update({value: 0 for value in ccat["Z"]})
            substitutions.update({value: 0 for value in dcat["Z"]})
        target = sp.expand(expression.subs(substitutions))
        all_reduced_values = [
            sp.expand(value.subs(substitutions))
            for sequence in (*ccat.values(), *dcat.values())
            for value in sequence
        ]
        variables = tuple(sorted(set().union(*(value.free_symbols for value in all_reduced_values)), key=str))

        # Directed containment pairs (small,big).
        pairs = [
            (ccat["A"], ccat["P"]), (ccat["B"], ccat["P"]),
            (ccat["Z"], ccat["A"]), (ccat["Z"], ccat["B"]),
            (dcat["P"], ccat["P"]), (dcat["A"], ccat["A"]),
            (dcat["B"], ccat["B"]), (dcat["Z"], ccat["Z"]),
            (dcat["A"], dcat["P"]), (dcat["B"], dcat["P"]),
            (dcat["Z"], dcat["A"]), (dcat["Z"], dcat["B"]),
        ]
        # Apply the branch substitutions and retain only live sequences.
        sequences = []
        for sequence in (*ccat.values(), *dcat.values()):
            reduced = tuple(sp.expand(value.subs(substitutions)) for value in sequence)
            if any(value != 0 for value in reduced):
                sequences.append(reduced)
        reduced_pairs = []
        for small, big in pairs:
            small_r = tuple(sp.expand(value.subs(substitutions)) for value in small)
            big_r = tuple(sp.expand(value.subs(substitutions)) for value in big)
            if any(small_r) and any(big_r):
                reduced_pairs.append((small_r, big_r))

        generators = []
        labels = []
        # Every nonnegative monomial of degree at most two is available as a
        # residual cone ray.
        generators.append(sp.Integer(1))
        labels.append("monomial:1")
        for variable in variables:
            generators.append(variable)
            labels.append(f"monomial:{variable}")
        for index, left in enumerate(variables):
            for right in variables[index:]:
                generators.append(sp.expand(left * right))
                labels.append(f"monomial:{left}*{right}")

        # Containment slacks, optionally multiplied by any live count.
        multipliers = (sp.Integer(1), *variables)
        for pair_index, (small, big) in enumerate(reduced_pairs):
            for rank in range(7):
                slack = sp.expand(big[rank] - small[rank])
                if slack == 0:
                    continue
                for multiplier in multipliers:
                    generators.append(sp.expand(slack * multiplier))
                    labels.append(f"contain:{pair_index}:{rank}*{multiplier}")

        # Face-splitting incidence.  If Y is contained in X, every (i+j)-face
        # of Y has C(i+j,i) ordered complementary splits into an i-face of X
        # and a j-face of Y.  Dropping the requirement that the two pieces be
        # disjoint gives X_i*Y_j >= C(i+j,i)Y_(i+j).  The usual vertex-shadow
        # inequality is the i=1 subfamily.
        shadow_pairs = [(sequence, sequence) for sequence in sequences] + reduced_pairs
        for pair_index, (small, big) in enumerate(shadow_pairs):
            for left_rank in range(1, 6):
                for right_rank in range(1, 7 - left_rank):
                    total_rank = left_rank + right_rank
                    slack = sp.expand(
                        big[left_rank] * small[right_rank]
                        - sp.binomial(total_rank, left_rank) * small[total_rank]
                    )
                    if slack != 0:
                        generators.append(slack)
                        labels.append(f"shadow:{pair_index}:{left_rank},{right_rank}")

        # Optional discovery rays from the forest weak-prefix ratios
        # k*f_k-f_(k-1)>=0.  A successful cone would still require a separate
        # support audit because these ratios only hold in their certified
        # prefix range.
        for sequence_index, sequence in enumerate(sequences):
            for rank in range(2, 7):
                weak = sp.expand(rank * sequence[rank] - sequence[rank - 1])
                if weak == 0:
                    continue
                for multiplier in multipliers:
                    generators.append(sp.expand(weak * multiplier))
                    labels.append(f"weak:{sequence_index}:{rank}*{multiplier}")
            for rank in range(2, 6):
                q_value = sp.expand(
                    rank * sequence[rank] ** 2
                    + sequence[rank - 1] ** 2
                    - (rank + 1) * sequence[rank - 1] * sequence[rank + 1]
                )
                strong = sp.expand(
                    2 * rank * sequence[rank] ** 2
                    - sequence[rank - 1] * sequence[rank]
                    - 2 * (rank + 1) * sequence[rank - 1] * sequence[rank + 1]
                )
                generators.extend((q_value, strong))
                labels.extend((f"Q:{sequence_index}:{rank}", f"S:{sequence_index}:{rank}"))

        # Already proved marked-forest forms on C and D themselves.
        crows_branch = tuple(tuple(sp.expand(value.subs(substitutions)) for value in row) for row in crows)
        drows_branch = tuple(tuple(sp.expand(value.subs(substitutions)) for value in row) for row in drows)

        def row_q(row, rank):
            return sp.expand(
                rank * row[rank] ** 2 + row[rank - 1] ** 2
                - (rank + 1) * row[rank - 1] * row[rank + 1]
            )

        def row_leaf_d(left, right, rank):
            return sp.expand(
                right[rank - 1] ** 2 + 2 * rank * left[rank] * right[rank - 1]
                + 2 * left[rank - 1] * right[rank - 2]
                - (rank + 1) * left[rank - 1] * right[rank]
                - (rank + 1) * right[rank - 2] * left[rank + 1]
                - right[rank - 2] * right[rank]
            )

        for family_name, rows in (("C", crows_branch), ("D", drows_branch)):
            for rank in (3, 4):
                generators.append(sp.expand(nested(rows, rank)))
                labels.append(f"N:{family_name}:{rank}")
            _e, row_u, row_v, row_w = rows
            oriented = tuple(sp.expand(row_u[k] + (row_w[k - 1] if k else 0)) for k in range(7))
            for rank in (4, 5):
                generators.append(sp.expand(row_q(oriented, rank) + row_leaf_d(row_v, row_w, rank)))
                labels.append(f"CROSS:{family_name}:{rank}")

        polynomials = [sp.Poly(target, *variables)] + [sp.Poly(value, *variables) for value in generators]
        dictionaries = [dict(polynomial.terms()) for polynomial in polynomials]
        monomials = sorted(set().union(*(dictionary for dictionary in dictionaries)))
        matrix = np.zeros((len(monomials), len(generators)))
        rhs = np.zeros(len(monomials))
        for row, monomial in enumerate(monomials):
            rhs[row] = float(dictionaries[0].get(monomial, 0))
            for column, dictionary in enumerate(dictionaries[1:]):
                matrix[row, column] = float(dictionary.get(monomial, 0))
        result = linprog(np.ones(len(generators)), A_eq=matrix, b_eq=rhs, bounds=(0, None), method="highs")
        branch = (nonadjacent, survive_u, survive_v)
        print("BRANCH", branch, "VARS", len(variables), "RAYS", len(generators), "FEASIBLE", result.success)
        if result.success:
            active = [(labels[i], value) for i, value in enumerate(result.x) if value > 1e-8]
            print("ACTIVE", len(active))
            for label, value in active:
                print(" ", label, value)
        branches.append(result.success)
    print("ALL_BRANCHES", all(branches))


if __name__ == "__main__":
    main()
