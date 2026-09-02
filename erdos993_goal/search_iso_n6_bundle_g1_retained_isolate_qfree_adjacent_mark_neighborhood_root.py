#!/usr/bin/env python3
"""Search a product-closed Handelman certificate for the two q-free tails.

The candidate atoms are nonnegative monomials, valid linear forest constraints
times nonnegative monomials, products of valid forest constraints, and the
already frozen rank-six G2--G10 cells on natural actual-minor pairs.  A
feasible exact nonnegative combination would prove the corresponding
polynomial after rational reconstruction.  A failed LP is only a cone
obstruction.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import csc_matrix
import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from derive_iso_n6_bundle_g1_mark_neighborhood_constraints_root import (
    mark_neighborhood_constraints,
)
from derive_iso_n6_bundle_g1_mark_cross_edge_constraints_root import (
    mark_cross_edge_constraints,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_adjacent_mark_neighborhood_product_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_ADJACENT_MARK_NEIGHBORHOOD_PRODUCT_ROOT"
EXPECTED_INPUT_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def degree(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> int:
    return sp.Poly(sp.expand(expression), *variables).total_degree()


def monomial(variables: tuple[sp.Symbol, ...], powers: tuple[int, ...]) -> sp.Expr:
    answer = sp.Integer(1)
    for variable, power in zip(variables, powers):
        answer *= variable**power
    return answer


def frozen_cells(label: str, variables: tuple[sp.Symbol, ...]) -> list[tuple[str, sp.Expr]]:
    names = {str(variable): variable for variable in variables}
    generic = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    ce, cu, cv, cw = generic
    zero = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    states = {
        "E": generic,
        "U": (cu, cu, cw, cw),
        "V": (cv, cw, cv, cw),
        "W": (cw, cw, cw, cw),
    }
    pair_labels = [
        ("E", "0"), ("E", "E"), ("E", "U"), ("E", "V"), ("E", "W"),
        ("U", "0"), ("U", "U"), ("U", "W"),
        ("V", "0"), ("V", "V"), ("V", "W"),
        ("W", "0"), ("W", "W"),
    ]
    n = sp.Symbol("n")
    structural = {sp.Symbol(f"c{family}0"): 1 for family in "EUVW"}
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
    })
    partition, _ = partition_substitution("C", "c", 7)
    cells = []
    for index in range(2, 11):
        coefficient = reconstruct(index)
        for superstate, minorstate in pair_labels:
            drows = zero if minorstate == "0" else states[minorstate]
            expression = sp.expand(
                substitute(coefficient, states[superstate], drows)
                .subs(structural)
                .subs(partition)
                .subs(n, names["s"] + 8)
            )
            replacements = {}
            for symbol in expression.free_symbols:
                symbol_name = str(symbol)
                if symbol_name in names:
                    replacements[symbol] = names[symbol_name]
                elif label.startswith("adjacent") and symbol_name.startswith("CZ"):
                    replacements[symbol] = 0
                elif symbol_name == "CZ2":
                    replacements[symbol] = 0 if label.startswith("adjacent") else 1
                else:
                    raise RuntimeError(f"unexpected frozen-cell symbol {symbol_name}")
            expression = sp.expand(expression.xreplace(replacements))
            cells.append((f"G{index}({superstate},{minorstate})", expression))
    return cells


def all_powers(count: int, maximum_degree: int):
    for total_degree in range(maximum_degree + 1):
        for indices in itertools.combinations_with_replacement(range(count), total_degree):
            powers = [0] * count
            for index in indices:
                powers[index] += 1
            yield tuple(powers)


def build_constraints(label: str, target: sp.Expr, variables: tuple[sp.Symbol, ...]):
    names = {str(variable): variable for variable in variables}
    s = names["s"]
    m = s + 6
    linear: list[tuple[str, sp.Expr]] = []
    quadratic: list[tuple[str, sp.Expr]] = []
    cubic: list[tuple[str, sp.Expr]] = []
    quartic: list[tuple[str, sp.Expr]] = []
    equalities: list[tuple[str, sp.Expr]] = []

    for family in "AB":
        linear.append((f"order_{family}", m - names[f"C{family}2"]))
        for rank in range(3, 8):
            linear.append((
                f"cross_W_{family}{rank}",
                names[f"CW{rank - 1}"] - names[f"C{family}{rank}"],
            ))
            quadratic.append((
                f"extension_{family}{rank}",
                (names[f"C{family}2"] - rank + 2) * names[f"C{family}{rank - 1}"]
                - (rank - 1) * names[f"C{family}{rank}"],
            ))
        quadratic.extend([
            (
                f"pair_lower_{family}",
                2 * names[f"C{family}3"]
                - names[f"C{family}2"] * (names[f"C{family}2"] - 3),
            ),
            (
                f"pair_upper_{family}",
                names[f"C{family}2"] * (names[f"C{family}2"] - 1)
                - 2 * names[f"C{family}3"],
            ),
        ])
        order = names[f"C{family}2"]
        cubic.extend([
            (
                f"triple_lower_{family}",
                6 * names[f"C{family}4"] - (order - 2) * (order - 3) * (order - 4),
            ),
            (
                f"triple_upper_{family}",
                order * (order - 1) * (order - 2) - 6 * names[f"C{family}4"],
            ),
        ])
        quartic.extend([
            (
                f"quadruple_lower_{family}",
                24 * names[f"C{family}5"]
                - (order - 3) * (order - 4) * (order - 5) * (order - 6)
                + 360,
            ),
            (
                f"quadruple_upper_{family}",
                order * (order - 1) * (order - 2) * (order - 3)
                - 24 * names[f"C{family}5"],
            ),
        ])

    for rank in range(3, 8):
        quadratic.append((
            f"extension_W{rank}",
            (s + 7 - rank) * names[f"CW{rank - 1}"] - rank * names[f"CW{rank}"],
        ))
    quadratic.extend([
        ("W_pair_lower", 2 * names["CW2"] - (s + 5) * (s + 4)),
        ("W_pair_upper", (s + 6) * (s + 5) - 2 * names["CW2"]),
    ])
    cubic.extend([
        ("W_triple_lower", 6 * names["CW3"] - (m - 2) * (m - 3) * (m - 4)),
        ("W_triple_upper", m * (m - 1) * (m - 2) - 6 * names["CW3"]),
    ])
    quartic.extend([
        (
            "W_quadruple_lower",
            24 * names["CW4"] - (m - 3) * (m - 4) * (m - 5) * (m - 6),
        ),
        (
            "W_quadruple_upper",
            m * (m - 1) * (m - 2) * (m - 3) - 24 * names["CW4"],
        ),
    ])

    if label.startswith("adjacent"):
        linear.append(("marked_neighbour_lower", names["CA2"] + names["CB2"] - m))
    else:
        for rank in range(3, 8):
            if rank == 3:
                wcap = m
            else:
                wcap = names[f"CW{rank - 2}"]
            linear.extend([
                (f"cross_W_Z{rank}", wcap - names[f"CZ{rank}"]),
                (f"cross_A_Z{rank}", names[f"CA{rank - 1}"] - names[f"CZ{rank}"]),
                (f"cross_B_Z{rank}", names[f"CB{rank - 1}"] - names[f"CZ{rank}"]),
            ])
        linear.extend([
            ("marked_neighbour_lower", names["CA2"] + names["CB2"] - names["CZ3"] - s - 5),
            ("marked_neighbour_upper", s + 6 - names["CA2"] - names["CB2"] + names["CZ3"]),
            ("Z_order_A", names["CA2"] - names["CZ3"]),
            ("Z_order_B", names["CB2"] - names["CZ3"]),
        ])
        for rank in range(2, 6):
            linear.append((
                f"AB_union_W{rank}",
                names[f"CW{rank}"]
                - names[f"CA{rank + 1}"]
                - names[f"CB{rank + 1}"]
                + names[f"CZ{rank + 2}"],
            ))
        for rank in range(4, 8):
            quadratic.append((
                f"extension_Z{rank}",
                (names["CZ3"] - rank + 3) * names[f"CZ{rank - 1}"]
                - (rank - 2) * names[f"CZ{rank}"],
            ))
        zorder = names["CZ3"]
        cubic.extend([
            (
                "Z_triple_lower",
                6 * names["CZ5"] - (zorder - 2) * (zorder - 3) * (zorder - 4),
            ),
            (
                "Z_triple_upper",
                zorder * (zorder - 1) * (zorder - 2) - 6 * names["CZ5"],
            ),
        ])
        quartic.extend([
            (
                "Z_quadruple_lower",
                24 * names["CZ6"]
                - (zorder - 3) * (zorder - 4) * (zorder - 5) * (zorder - 6)
                + 360,
            ),
            (
                "Z_quadruple_upper",
                zorder * (zorder - 1) * (zorder - 2) * (zorder - 3)
                - 24 * names["CZ6"],
            ),
        ])

    neighborhood_quadratic, neighborhood_cubic, neighborhood_quartic = (
        mark_neighborhood_constraints(label, names, s)
    )
    quadratic.extend(neighborhood_quadratic)
    cubic.extend(neighborhood_cubic)
    quartic.extend(neighborhood_quartic)
    if not label.startswith("adjacent"):
        cross_equalities, cross_cubic, cross_quartic = mark_cross_edge_constraints(
            names, s
        )
        equalities.extend(cross_equalities)
        cubic.extend(cross_cubic)
        quartic.extend(cross_quartic)
        # Lift the unique possible U--V edge to HX.  On every actual forest
        # HX is its 0--1 edge count.  The lift keeps the exact r=4 union bound
        # within degree four and exposes the binary identities to the ideal.
        m = s + 6
        a, b, z = names["CA2"], names["CB2"], names["CZ3"]
        c = sp.expand(m - a - b + z)
        d = m - z
        cross_independent_pairs = sp.expand(
            names["CW2"] - names["CA3"] - names["CB3"] + names["CZ4"]
        )
        h_expression = sp.expand(
            (1 - c) * ((m - a) * (m - b) - cross_independent_pairs)
        )
        hx = names["HX"]
        linear.append(("lift_cross_edge_upper", sp.expand(1 - c - hx)))
        equalities.extend([
            ("lift_cross_edge_definition", sp.expand(hx - h_expression)),
            ("lift_cross_edge_binary", sp.expand(hx * (1 - hx))),
            ("lift_cross_edge_common_disjoint", sp.expand(hx * c)),
        ])
        quadratic.append((
            "W_neighbor_union_lifted_exact_pair_lower",
            sp.expand(2 * names["CW2"] - d * (d - 1) + 2 * hx),
        ))
        cubic.append((
            "W_neighbor_union_lifted_exact_triple_lower",
            sp.expand(
                6 * names["CW3"] - d * (d - 1) * (d - 2)
                + 6 * hx * (d - 2)
            ),
        ))
        quartic.append((
            "W_neighbor_union_lifted_exact_quadruple_lower",
            sp.expand(
                24 * names["CW4"] - d * (d - 1) * (d - 2) * (d - 3)
                + 12 * hx * (d - 2) * (d - 3)
            ),
        ))

    atoms: list[tuple[str, sp.Expr]] = []
    # Free nonnegative remainder polynomial through total degree four.
    # Its high terms cancel the negative leading terms of the valid path-count
    # constraints while preserving an exact degree-two target.
    for powers in all_powers(len(variables), 4):
        atoms.append(("monomial:" + ",".join(map(str, powers)), monomial(variables, powers)))
    # Linear valid constraints times every nonnegative monomial through degree
    # three, so each atom stays within total certificate degree four.
    multipliers = list(all_powers(len(variables), 3))
    for constraint_name, constraint in linear:
        for powers in multipliers:
            atoms.append((
                f"linear:{constraint_name}*" + ",".join(map(str, powers)),
                sp.expand(constraint * monomial(variables, powers)),
            ))
    # Products of two valid linear constraints are nonnegative.
    for left in range(len(linear)):
        for right in range(left, len(linear)):
            atoms.append((
                f"product:{linear[left][0]}*{linear[right][0]}",
                sp.expand(linear[left][1] * linear[right][1]),
            ))
    quadratic_multipliers = list(all_powers(len(variables), 2))
    for constraint_name, constraint in quadratic:
        for powers in quadratic_multipliers:
            atoms.append((
                f"quadratic:{constraint_name}*" + ",".join(map(str, powers)),
                sp.expand(constraint * monomial(variables, powers)),
            ))
    cubic_multipliers = list(all_powers(len(variables), 1))
    for constraint_name, constraint in cubic:
        for powers in cubic_multipliers:
            atoms.append((
                f"cubic:{constraint_name}*" + ",".join(map(str, powers)),
                sp.expand(constraint * monomial(variables, powers)),
            ))
    atoms.extend((f"quartic:{name}", sp.expand(value)) for name, value in quartic)
    # A zero identity may be multiplied by an arbitrary polynomial.  Adding
    # both signs times every monomial through degree two gives the full
    # degree-four piece of its ideal while retaining nonnegative LP weights.
    equality_multipliers = list(all_powers(len(variables), 2))
    for equality_name, equality in equalities:
        for powers in equality_multipliers:
            value = sp.expand(equality * monomial(variables, powers))
            atoms.append((
                f"equality:+{equality_name}*" + ",".join(map(str, powers)),
                value,
            ))
            atoms.append((
                f"equality:-{equality_name}*" + ",".join(map(str, powers)),
                -value,
            ))
    frozen = frozen_cells(label, variables)
    frozen_multipliers = list(all_powers(len(variables), 2))
    for cell_name, cell in frozen:
        for powers in frozen_multipliers:
            atoms.append((
                f"frozen:{cell_name}*" + ",".join(map(str, powers)),
                sp.expand(cell * monomial(variables, powers)),
            ))

    # Close the useful degree-four part of the semiring generated by the
    # proven quadratic constraints and the frozen rank-six cells.  These
    # products are valid because every factor is already nonnegative on the
    # marked-forest domain.  Products with one or two linear constraints and
    # products of two degree-two generators are the mixed atoms missing from
    # the preceding monomial-only frozen-cell search.
    degree_two_generators = [
        (f"quadratic:{name}", value) for name, value in quadratic
    ] + [
        (f"frozen:{name}", value) for name, value in frozen
    ]
    linear_pairs = list(itertools.combinations_with_replacement(range(len(linear)), 2))
    for generator_name, generator in degree_two_generators:
        for linear_name, linear_value in linear:
            atoms.append((
                f"mixed:{generator_name}*{linear_name}",
                sp.expand(generator * linear_value),
            ))
        for left, right in linear_pairs:
            atoms.append((
                f"mixed:{generator_name}*{linear[left][0]}*{linear[right][0]}",
                sp.expand(generator * linear[left][1] * linear[right][1]),
            ))
    for left in range(len(degree_two_generators)):
        for right in range(left, len(degree_two_generators)):
            atoms.append((
                f"mixed:{degree_two_generators[left][0]}*{degree_two_generators[right][0]}",
                sp.expand(degree_two_generators[left][1] * degree_two_generators[right][1]),
            ))
    for cubic_name, cubic_value in cubic:
        for linear_name, linear_value in linear:
            atoms.append((
                f"mixed:cubic:{cubic_name}*{linear_name}",
                sp.expand(cubic_value * linear_value),
            ))

    # Convert every atom to a polynomial once.  The previous implementation
    # reconstructed the same Poly object during degree filtering, monomial
    # discovery, and sparse-matrix assembly; caching it cuts the dominant
    # symbolic setup cost without changing the cone.
    prepared_atoms = []
    for name, value in atoms:
        polynomial = sp.Poly(value, *variables)
        if polynomial.total_degree() <= 4:
            prepared_atoms.append((name, polynomial))
    return linear, quadratic, cubic, quartic, frozen, equalities, prepared_atoms


def solve(label: str, target: sp.Expr):
    variables = tuple(sorted(
        target.free_symbols | (
            {sp.Symbol("HX", integer=True, nonnegative=True)}
            if not label.startswith("adjacent") else set()
        ),
        key=str,
    ))
    linear, quadratic, cubic, quartic, frozen, equalities, atoms = build_constraints(
        label, target, variables
    )
    target_polynomial = sp.Poly(target, *variables)
    power_set = set(target_polynomial.monoms())
    for _, atom in atoms:
        power_set.update(atom.monoms())
    powers = tuple(sorted(power_set, reverse=True))
    row_index = {power: index for index, power in enumerate(powers)}
    sparse_rows = []
    sparse_columns = []
    sparse_values = []
    for column, (_, atom) in enumerate(atoms):
        for power, coefficient in atom.terms():
            sparse_rows.append(row_index[power])
            sparse_columns.append(column)
            sparse_values.append(float(coefficient))
    matrix = csc_matrix(
        (sparse_values, (sparse_rows, sparse_columns)),
        shape=(len(powers), len(atoms)),
    )
    rhs = np.zeros(len(powers), dtype=float)
    for power, coefficient in target_polynomial.terms():
        rhs[row_index[power]] = float(coefficient)

    result = linprog(
        np.ones(len(atoms)),
        A_eq=matrix,
        b_eq=rhs,
        bounds=(0, None),
        method="highs",
        options={"presolve": True},
    )
    positive = []
    residual = None
    if result.success:
        for index, value in enumerate(result.x):
            if value > 1e-8:
                positive.append((atoms[index][0], value, str(Fraction(value).limit_denominator(1_000_000))))
        residual = float(np.max(np.abs(matrix @ result.x - rhs)))
    return {
        "success": bool(result.success),
        "status": int(result.status),
        "message": result.message,
        "objective": float(result.fun) if result.success else None,
        "maximum_float_residual": residual,
        "variables": list(map(str, variables)),
        "linear_constraints": len(linear),
        "quadratic_constraints": len(quadratic),
        "cubic_constraints": len(cubic),
        "quartic_constraints": len(quartic),
        "frozen_cells": len(frozen),
        "equality_constraints": len(equalities),
        "atoms": len(atoms),
        "coefficient_rows": len(powers),
        "positive_atoms": positive,
    }


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    n, s = sp.Symbol("n"), sp.Symbol("s", nonnegative=True)
    branches = {}
    requested = os.environ.get("HANDELMAN_BRANCH", "both")
    labels = (
        ("adjacent_u0_v0", "nonadjacent_u0_v0")
        if requested == "both" else (requested,)
    )
    for label in labels:
        target = sp.expand(sp.sympify(source["branches"][label]["lower_expression"]).subs(n, s + 8))
        branches[label] = solve(label, target)
    report = {
        "marker": MARKER,
        "domain": "n=8+s, s>=0; all category variables are nonnegative",
        "branches": branches,
        "scope_guard": (
            "A successful floating LP is not promoted until rational reconstruction and exact "
            "symbolic replay. Infeasibility obstructs only this finite atom cone."
        ),
        "input_sha256": input_hash,
        "mark_neighborhood_source_sha256": sha256(
            HERE / "derive_iso_n6_bundle_g1_mark_neighborhood_constraints_root.py"
        ),
        "mark_cross_edge_source_sha256": sha256(
            HERE / "derive_iso_n6_bundle_g1_mark_cross_edge_constraints_root.py"
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "branches": {
            label: {key: row[key] for key in (
                "success", "message", "objective", "maximum_float_residual",
                "linear_constraints", "quadratic_constraints", "atoms",
                "cubic_constraints",
                "quartic_constraints",
                "frozen_cells",
                "equality_constraints",
                "coefficient_rows",
            )}
            for label, row in branches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
