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

from array import array
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
from derive_iso_n6_bundle_g1_adjacent_common_compatible_constraints_root import (
    adjacent_common_constraints,
)
from derive_iso_n6_bundle_g1_mark_cross_edge_constraints_root import (
    mark_cross_edge_constraints,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_compatible_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_ADJACENT_COMMON_COMPATIBLE_IPM_ROOT"
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


def build_constraints(
    label: str,
    target: sp.Expr,
    variables: tuple[sp.Symbol, ...],
    generators_only: bool = False,
):
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
    if label.startswith("adjacent"):
        rlinear, rquadratic, rcubic, rquartic = adjacent_common_constraints(
            names, s
        )
        linear.extend(rlinear)
        quadratic.extend(rquadratic)
        cubic.extend(rcubic)
        quartic.extend(rquartic)
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

    if generators_only:
        return linear, quadratic, cubic, quartic, frozen_cells(label, variables), equalities

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


def polynomial_terms(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> dict[tuple[int, ...], sp.Rational]:
    return {
        powers: sp.Rational(coefficient)
        for powers, coefficient in sp.Poly(expression, *variables).terms()
        if coefficient != 0
    }


def multiply_terms(
    left: dict[tuple[int, ...], sp.Rational],
    right: dict[tuple[int, ...], sp.Rational],
) -> dict[tuple[int, ...], sp.Rational]:
    answer: dict[tuple[int, ...], sp.Rational] = {}
    for left_powers, left_coefficient in left.items():
        for right_powers, right_coefficient in right.items():
            powers = tuple(a + b for a, b in zip(left_powers, right_powers))
            answer[powers] = answer.get(powers, sp.Integer(0)) + left_coefficient * right_coefficient
    return {powers: value for powers, value in answer.items() if value != 0}


def shift_terms(
    terms: dict[tuple[int, ...], sp.Rational],
    shift: tuple[int, ...],
) -> dict[tuple[int, ...], sp.Rational]:
    return {
        tuple(a + b for a, b in zip(powers, shift)): coefficient
        for powers, coefficient in terms.items()
    }


def solve(label: str, target: sp.Expr):
    variables = tuple(sorted(
        target.free_symbols | (
            {sp.Symbol("HX", integer=True, nonnegative=True)}
            if not label.startswith("adjacent") else set()
        ) | (
            {sp.Symbol(f"CR{rank}", integer=True, nonnegative=True) for rank in range(2, 7)}
            if label.startswith("adjacent") else set()
        ),
        key=str,
    ))
    linear, quadratic, cubic, quartic, frozen, equalities = build_constraints(
        label, target, variables, generators_only=True
    )
    print(f"{label}: converting {len(linear)+len(quadratic)+len(cubic)+len(quartic)+len(frozen)+len(equalities)} base generators", flush=True)
    linear_terms = [(name, polynomial_terms(value, variables)) for name, value in linear]
    quadratic_terms = [(name, polynomial_terms(value, variables)) for name, value in quadratic]
    cubic_terms = [(name, polynomial_terms(value, variables)) for name, value in cubic]
    quartic_terms = [(name, polynomial_terms(value, variables)) for name, value in quartic]
    frozen_terms = [(name, polynomial_terms(value, variables)) for name, value in frozen]
    equality_terms = [(name, polynomial_terms(value, variables)) for name, value in equalities]

    powers = tuple(sorted(all_powers(len(variables), 4), reverse=True))
    row_index = {power: index for index, power in enumerate(powers)}
    atom_names: list[str] = []
    indices = array("i")
    values = array("d")
    indptr = array("q", [0])

    def add_atom(name: str, terms: dict[tuple[int, ...], sp.Rational]) -> None:
        if not terms or max(map(sum, terms)) > 4:
            return
        atom_names.append(name)
        for atom_power, coefficient in sorted(terms.items(), reverse=True):
            indices.append(row_index[atom_power])
            values.append(float(coefficient))
        indptr.append(len(indices))

    zero_power = (0,) * len(variables)
    for monomial_power in all_powers(len(variables), 4):
        add_atom(
            "monomial:" + ",".join(map(str, monomial_power)),
            {monomial_power: sp.Integer(1)},
        )
    for name, terms in linear_terms:
        for multiplier in all_powers(len(variables), 3):
            add_atom(f"linear:{name}*" + ",".join(map(str, multiplier)), shift_terms(terms, multiplier))
    linear_pairs = []
    for left in range(len(linear_terms)):
        for right in range(left, len(linear_terms)):
            name = f"{linear_terms[left][0]}*{linear_terms[right][0]}"
            terms = multiply_terms(linear_terms[left][1], linear_terms[right][1])
            linear_pairs.append((name, terms))
            add_atom(f"product:{name}", terms)
    for name, terms in quadratic_terms:
        for multiplier in all_powers(len(variables), 2):
            add_atom(f"quadratic:{name}*" + ",".join(map(str, multiplier)), shift_terms(terms, multiplier))
    for name, terms in cubic_terms:
        for multiplier in all_powers(len(variables), 1):
            add_atom(f"cubic:{name}*" + ",".join(map(str, multiplier)), shift_terms(terms, multiplier))
    for name, terms in quartic_terms:
        add_atom(f"quartic:{name}", terms)
    for name, terms in equality_terms:
        for multiplier in all_powers(len(variables), 2):
            shifted = shift_terms(terms, multiplier)
            suffix = ",".join(map(str, multiplier))
            add_atom(f"equality:+{name}*{suffix}", shifted)
            add_atom(
                f"equality:-{name}*{suffix}",
                {power: -coefficient for power, coefficient in shifted.items()},
            )
    for name, terms in frozen_terms:
        for multiplier in all_powers(len(variables), 2):
            add_atom(f"frozen:{name}*" + ",".join(map(str, multiplier)), shift_terms(terms, multiplier))

    degree_two_generators = [
        (f"quadratic:{name}", terms) for name, terms in quadratic_terms
    ] + [
        (f"frozen:{name}", terms) for name, terms in frozen_terms
    ]
    for generator_name, generator_terms in degree_two_generators:
        for linear_name, linear_value in linear_terms:
            add_atom(
                f"mixed:{generator_name}*{linear_name}",
                multiply_terms(generator_terms, linear_value),
            )
        for linear_pair_name, linear_pair_terms in linear_pairs:
            add_atom(
                f"mixed:{generator_name}*{linear_pair_name}",
                multiply_terms(generator_terms, linear_pair_terms),
            )
    for left in range(len(degree_two_generators)):
        for right in range(left, len(degree_two_generators)):
            add_atom(
                f"mixed:{degree_two_generators[left][0]}*{degree_two_generators[right][0]}",
                multiply_terms(
                    degree_two_generators[left][1], degree_two_generators[right][1]
                ),
            )
    for cubic_name, cubic_value in cubic_terms:
        for linear_name, linear_value in linear_terms:
            add_atom(
                f"mixed:cubic:{cubic_name}*{linear_name}",
                multiply_terms(cubic_value, linear_value),
            )

    print(f"{label}: assembled {len(atom_names)} atoms with {len(indices)} nonzeros", flush=True)
    matrix = csc_matrix(
        (
            np.frombuffer(values, dtype=np.float64),
            np.frombuffer(indices, dtype=np.int32),
            np.frombuffer(indptr, dtype=np.int64),
        ),
        shape=(len(powers), len(atom_names)),
    )
    rhs = np.zeros(len(powers), dtype=float)
    for power, coefficient in sp.Poly(target, *variables).terms():
        rhs[row_index[power]] = float(coefficient)
    print(f"{label}: entering HiGHS", flush=True)
    result = linprog(
        np.zeros(len(atom_names)),
        A_eq=matrix,
        b_eq=rhs,
        bounds=(0, None),
        method="highs-ipm",
        options={"presolve": True},
    )
    positive = []
    residual = None
    if result.success:
        for index, value in enumerate(result.x):
            if value > 1e-8:
                positive.append((
                    atom_names[index], value,
                    str(Fraction(value).limit_denominator(1_000_000)),
                ))
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
        "atoms": len(atom_names),
        "coefficient_rows": len(powers),
        "matrix_nonzeros": int(matrix.nnz),
        "positive_atoms": positive,
        "build_method": "sparse exact coefficient dictionaries; algebraically identical generator cone",
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
        "adjacent_common_compatible_source_sha256": sha256(
            HERE / "derive_iso_n6_bundle_g1_adjacent_common_compatible_constraints_root.py"
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
