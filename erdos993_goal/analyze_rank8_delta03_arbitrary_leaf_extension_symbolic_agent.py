#!/usr/bin/env python3
"""Exact symbolic dependency audit for arbitrary leaf-extension induction.

This script derives the three required leaf-extension gates and records their
exact polynomial fingerprints.  It deliberately makes no sign claim: mixed
coefficient signs and mixed endpoint derivatives are method obstructions, not
counterexamples on the much narrower cone of compatible forest polynomials.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


d = sp.symbols("d0:9", nonnegative=True)  # I(A-v)
e = sp.symbols("e0:9", nonnegative=True)  # I(A-{q,v}) for q != v
f = sp.symbols("f0:8", nonnegative=True)  # I(A-N[v])
g = sp.symbols("g0:8", nonnegative=True)  # I((A-q)-N[v])
j = sp.symbols("j0:8", nonnegative=True)  # I((A-v)-N[q])
k = sp.symbols("k0:8", nonnegative=True)  # I(A-N[q])

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json"

PINNED_INPUTS = (
    "verify_rank8_q8_terminal_reduction.py",
    "rank7_integration_readonly_20260820.json",
    "RANK8_E2_LENGTH_EXTENSION_FINITE_AND_THIN_THEOREMS_2026-08-20.md",
    "audit_rank8_delta013_e1_leaf_extension_package.py",
    "probe_rank8_delta03_arbitrary_leaf_extension_random_root.rs",
    "probe_rank8_delta03_arbitrary_leaf_extension_exhaustive_root.rs",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def extend_coefficients(base, deleted):
    """Coefficients of I(base graph plus a leaf at v): C+x*I(base-v)."""
    return [base[index] + (deleted[index - 1] if index else 0) for index in range(9)]


def substitute_delta(expression, new_c, new_h):
    substitutions = {c[index]: new_c[index] for index in range(9)}
    substitutions.update({h[6]: new_h[6], h[7]: new_h[7]})
    return sp.expand(expression.subs(substitutions, simultaneous=True))


def canonical_polynomial(expression: sp.Expr) -> tuple[bytes, sp.Poly]:
    """Return a deterministic sparse serialization and its exact polynomial."""
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    serial = {
        "generators": [str(value) for value in generators],
        "terms": [
            [list(monomial), str(coefficient)]
            for monomial, coefficient in polynomial.terms()
        ],
    }
    return json.dumps(serial, sort_keys=True, separators=(",", ":")).encode(), polynomial


def polynomial_record(expression: sp.Expr) -> dict[str, object]:
    serial, polynomial = canonical_polynomial(expression)
    coefficients = [coefficient for _, coefficient in polynomial.terms()]
    return {
        "terms": len(coefficients),
        "negative": sum(1 for coefficient in coefficients if coefficient < 0),
        "positive": sum(1 for coefficient in coefficients if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def derivative_record(expression: sp.Expr, variable: sp.Symbol) -> dict[str, object]:
    first = sp.expand(sp.diff(expression, variable))
    second = sp.expand(sp.diff(first, variable))
    first_record = polynomial_record(first)
    second_record = polynomial_record(second)

    def orientation(row: dict[str, object]) -> str:
        if row["terms"] == 1 and row["positive"] == 0 and row["negative"] == 0:
            return "ZERO"
        if row["negative"] == 0:
            return "COEFFICIENTWISE_NONNEGATIVE"
        if row["positive"] == 0:
            return "COEFFICIENTWISE_NONPOSITIVE"
        return "MIXED"

    return {
        "degree": sp.Poly(expression, variable).degree(),
        "first_derivative": {**first_record, "orientation": orientation(first_record)},
        "second_derivative": {**second_record, "orientation": orientation(second_record)},
    }


def family_records(
    rows: list[sp.Expr], top_variables: tuple[sp.Symbol, ...]
) -> list[dict[str, object]]:
    return [
        {
            "rank": rank,
            "polynomial": polynomial_record(expression),
            "top_variable_derivatives": {
                str(variable): derivative_record(expression, variable)
                for variable in top_variables
            },
        }
        for rank, expression in enumerate(rows)
    ]


def build_gates() -> dict[str, list[sp.Expr]]:
    base = newton_coefficients(residual())[:4]

    # Old root q, with the new leaf attached directly to q.  Then A-v=A-q=H
    # and deleting q leaves H plus an isolated vertex.
    c_attach_root = extend_coefficients(c, h)
    h_attach_root = [h[index] + (h[index - 1] if index else 0) for index in range(9)]
    attach_root = [
        sp.expand(substitute_delta(row, c_attach_root, h_attach_root) - row)
        for row in base
    ]

    # The inserted leaf is the root.  Its deletion polynomial is exactly C.
    c_new_leaf = extend_coefficients(c, d)
    new_leaf = [substitute_delta(row, c_new_leaf, c) for row in base]

    # Old root q distinct from the attachment vertex v.  Both deletion
    # recurrences are live: C'=C+xD and H'=H+xE.
    c_general = extend_coefficients(c, d)
    h_general = extend_coefficients(h, e)
    general_old_root = [
        sp.expand(substitute_delta(row, c_general, h_general) - row)
        for row in base
    ]

    attach_root_structural = [
        sp.expand(row.subs(
            {c[index]: h[index] + (k[index - 1] if index else 0) for index in range(9)},
            simultaneous=True,
        ))
        for row in attach_root
    ]
    new_leaf_structural = [
        sp.expand(row.subs(
            {c[index]: d[index] + (f[index - 1] if index else 0) for index in range(9)},
            simultaneous=True,
        ))
        for row in new_leaf
    ]
    general_structural_substitution = {}
    for index in range(9):
        previous = index - 1
        general_structural_substitution[d[index]] = e[index] + (j[previous] if index else 0)
        general_structural_substitution[h[index]] = e[index] + (g[previous] if index else 0)
        general_structural_substitution[c[index]] = e[index] + (
            j[previous] + f[previous] if index else 0
        )
    general_old_root_structural = [
        sp.expand(row.subs(general_structural_substitution, simultaneous=True))
        for row in general_old_root
    ]
    # If q and v are adjacent then deleting N[v] already deletes q, and
    # deleting N[q] already deletes v.  Hence G=F and J=K.  Only G occurs as
    # a separate family in the structural expression, so substitute G=F;
    # the remaining J variables are the coefficients of K.
    general_old_root_adjacent = [
        sp.expand(row.subs({g[index]: f[index] for index in range(8)}, simultaneous=True))
        for row in general_old_root_structural
    ]
    return {
        "attach_at_old_root_raw": attach_root,
        "new_leaf_root_raw": new_leaf,
        "general_old_root_raw": general_old_root,
        "attach_at_old_root_structural": attach_root_structural,
        "new_leaf_root_structural": new_leaf_structural,
        "general_old_root_structural": general_old_root_structural,
        "general_old_root_adjacent_structural": general_old_root_adjacent,
    }


def main():
    gates = build_gates()
    top_variables = {
        "attach_at_old_root_raw": (c[8], h[7]),
        "new_leaf_root_raw": (c[8], d[7]),
        "general_old_root_raw": (c[8], h[7], d[7], e[6]),
        "attach_at_old_root_structural": (h[8], k[7]),
        "new_leaf_root_structural": (d[8], f[7]),
        "general_old_root_structural": (e[8], j[7], f[7], g[6]),
        "general_old_root_adjacent_structural": (e[8], j[7], f[7]),
    }
    records = {
        name: family_records(rows, top_variables[name])
        for name, rows in gates.items()
    }

    # Every displayed top-coordinate curvature is coefficientwise nonpositive
    # except the Delta0 g6 curvature of the general old-root gate.  Its exact
    # bracket has just two negative monomials, both paid by G being an induced
    # subforest of E, hence g5<=e5.
    general_zero = gates["general_old_root_structural"][0]
    g6_curvature_bracket = sp.expand(-sp.diff(general_zero, g[6], 2) / 4)
    g6_paid_pair = (62 * e[5] - g[5]) * (e[6] + j[5])
    g6_nonnegative_remainder = sp.expand(g6_curvature_bracket - g6_paid_pair)
    remainder_coefficients = [
        coefficient for _, coefficient in sp.Poly(g6_nonnegative_remainder).terms()
    ]
    assert all(coefficient >= 0 for coefficient in remainder_coefficients)
    for family_name in (
        "attach_at_old_root_structural",
        "new_leaf_root_structural",
        "general_old_root_structural",
        "general_old_root_adjacent_structural",
    ):
        for rank, row in enumerate(records[family_name]):
            for variable, derivative in row["top_variable_derivatives"].items():
                if family_name == "general_old_root_structural" and rank == 0 and variable == "g6":
                    assert derivative["second_derivative"]["orientation"] == "MIXED"
                else:
                    assert derivative["second_derivative"]["orientation"] in {
                        "ZERO", "COEFFICIENTWISE_NONPOSITIVE"
                    }

    # The source order is n>=27.  For any forest obtained by deleting at most
    # two named vertices, alpha drops by at most two, so H,D have alpha>=13
    # and E has alpha>=12.  This is exactly enough for the final forest-Q7
    # theorem.  Closed-neighborhood forests K,F,J,G do not inherit that guard;
    # their needed lower-rank endpoints require a separate support split.
    payload = {
        "schema": "rank8-delta03-arbitrary-leaf-extension-symbolic-dependency-v1",
        "status": "PASS_EXACT_IDENTITIES_DEPENDENCY_OPEN_NO_SIGN_CLAIM",
        "input_sha256": {name: sha256(HERE / name) for name in PINNED_INPUTS},
        "target": (
            "For every tree A of order n>=27, every attachment vertex v, and every "
            "root q of A+w (including w), prove the relevant Delta0..Delta3 old-root "
            "increment or new-root value nonnegative."
        ),
        "exact_leaf_identities": {
            "core": "C'=C+xD, D=I(A-v)",
            "old_root_q_equals_v": "H'=(1+x)H and C=H+xK, K=I(A-N[v])",
            "old_root_q_not_equals_v": (
                "H'=H+xE; D=E+xJ; H=E+xG; C=D+xF, where "
                "E=I(A-{q,v}), J=I((A-v)-N[q]), G=I((A-q)-N[v]), F=I(A-N[v])"
            ),
            "old_root_adjacent_subcase": "q~v implies G=F and J=K",
            "old_root_nonadjacent_subcase": "q not~v implies G=F-q and J=K-v",
            "new_leaf_root": "H'=C and C'=C+xD, with C=D+xF",
        },
        "gate_meaning": {
            "attach_at_old_root": "Delta^r R_1(C',H')-Delta^r R_1(C,H)",
            "general_old_root": "Delta^r R_1(C',H')-Delta^r R_1(C,H)",
            "new_leaf_root": "Delta^r R_1(C',C)",
            "ranks": [0, 1, 2, 3],
        },
        "families": records,
        "separate_concavity_reduction": {
            "conclusion": (
                "On compatible forest tuples every Delta0..Delta3 structural gate is "
                "separately concave in every displayed top coefficient."
            ),
            "general_Delta0_g6_curvature": str(sp.factor(sp.diff(general_zero, g[6], 2))),
            "general_Delta0_g6_bracket": polynomial_record(g6_curvature_bracket),
            "compatibility_payment": (
                "G is an induced subforest of E, so g5<=e5; the only negative bracket "
                "terms combine with 62*e5*(e6+j5) as (62*e5-g5)*(e6+j5)>=0"
            ),
            "remaining_bracket_after_payment": polynomial_record(g6_nonnegative_remainder),
            "sharp_Q_endpoint_corner_counts_by_rank": {
                "attach_at_old_root": [4, 4, 1, 1],
                "new_leaf_root": [4, 4, 1, 1],
                "general_old_root_nonadjacent": [16, 16, 2, 2],
                "general_old_root_adjacent": [8, 8, 1, 1],
            },
            "corner_count_explanation": (
                "Delta0/1 are concave and retain zero/upper endpoints. Delta2/3 are "
                "coefficientwise decreasing in every top coordinate except g6; hence only "
                "the g6 zero/upper choice remains in the nonadjacent general gate."
            ),
        },
        "forest_Q_endpoint_inventory": {
            "attach_at_old_root_structural": [
                "Q7(H) would upper-bound h8 when its scope guard holds",
                "Q6(K) would upper-bound k7 only after a support/scope split",
            ],
            "new_leaf_root_structural": [
                "Q7(D) upper-bounds d8 because alpha(D)>=13",
                "Q6(F) would upper-bound f7 only after a support/scope split",
            ],
            "general_old_root_structural": [
                "Q7(E) upper-bounds e8 because alpha(E)>=12",
                "Q6(J), Q6(F), and Q5(G) would bound j7,f7,g6 only after support/scope splits",
            ],
            "endpoint_formula": (
                "Q_s(X)>=0 gives x_(s+1) <= x_s*(2*s*x_s-x_(s-1))/"
                "(2*(s+1)*x_(s-1)) when x_(s-1)>0; support-zero cases are separate"
            ),
        },
        "order_alpha_guard": {
            "tree": "n>=27 implies alpha(A)>=ceil(n/2)>=14",
            "one_vertex_deletions": "alpha(H),alpha(D)>=alpha(A)-1>=13",
            "two_vertex_deletion": "alpha(E)>=alpha(A)-2>=12",
            "closed_neighborhood_warning": (
                "No comparable lower bound follows for alpha(K),alpha(F),alpha(J),alpha(G); "
                "a high-degree support can leave a very small forest."
            ),
        },
        "degree_surplus": {
            "definition": "e(A)=sum_u binom(deg_A(u)-1,2)",
            "leaf_change": "e(A+w)-e(A)=deg_A(v)-1",
            "induction_effect": (
                "Leaf deletion never raises e, but an e>=5 target can delete to an e=4 "
                "source; therefore leaf monotonicity would still depend on the separate e=4 closure."
            ),
            "closed_neighborhood_scope_split": (
                "If n>=27 and e(A)<=65, then every vertex has degree<=12, so K and F "
                "have order>=14 and J,G have order>=13 even in the nonadjacent case. "
                "Thus the proved order>=13 forest Q6 theorem and order>=10 forest Q5 "
                "theorem supply every closed-neighborhood endpoint. Failure of this easy "
                "order guard forces e(A)>=66, but e>=66 does not itself imply failure."
            ),
        },
        "exact_conclusion": {
            "proved": [
                "the three leaf gates and all deletion recurrences are exact",
                "the order/alpha guard supplies forest Q7 endpoints for H,D,E",
                "all top-coordinate curvatures are nonpositive on compatible tuples",
                "for n>=27 and e(A)<=65 the existing Q7/Q6/Q5 theorems supply every sharp top endpoint",
                "the raw and structurally substituted gate polynomials have the recorded exact fingerprints",
            ],
            "not_proved": [
                "nonnegativity of any of the three gates on all compatible tree/forest tuples",
                "the signs of the retained endpoint-corner polynomials, even in the e<=65 range",
                "a support-complete sharp endpoint reduction in the possible high-degree e>=66 range",
                "a coupled inequality controlling the compatible E,J,F,G endpoint corners",
                "leaf monotonicity for n>=27, connected Q8 for n>=28, forest Q8, rank-eight PGC, or Problem 993",
            ],
            "method_boundary": (
                "Separate forest-Q endpoint bounds plus degree surplus do not automatically "
                "discharge the gate: the endpoint derivatives/curvatures recorded above must "
                "be coupled with compatibility inequalities. Mixed signs are not a proof that "
                "no such deeper reduction exists."
            ),
            "empirical_probes": (
                "The two Rust probes are hash-pinned only as uncredited diagnostics; no finite "
                "PASS is used in this symbolic conclusion."
            ),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
