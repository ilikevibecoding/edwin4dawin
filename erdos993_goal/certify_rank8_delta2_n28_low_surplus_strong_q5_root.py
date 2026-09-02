#!/usr/bin/env python3
"""Exact n=28 Delta2 certificate for nonstar surplus e=7,...,39.

The certificate combines four independently proved realizability inputs:

* the exact branch-weight upper table for tau;
* the rank-(4,5) path ratio (used for e=7,...,10);
* the ordinary two-extension D4 cap (sufficient for e>=11);
* the strong order-through-28 Q5 theorem, giving V<=24/25.

For each integer surplus the only continuous coordinates are tau, the D4
defect parameter, V, and the rooted attachment coordinate Z.  The pinned
5,703-term sparse rank-8 source is mapped exactly and certified by rational
tensor Bernstein coefficients.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import minimum_with_index, to_flint
from explore_rank4_three_halves_grouped import split_bernstein_midpoint
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
CACHE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
TAU_REPORT = HERE / "tree_tau_branch_weight_upper_exact_root_20260826.json"
OUTPUT = HERE / "rank8_delta2_n28_low_surplus_strong_q5_exact_root_20260826.json"
D4_CEILING = sp.Rational(1559, 3575)
ORDER = 28
X_DEGREE = 12
U_DEGREE = 12
V_DEGREE = 8
Z_DEGREE = 2


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify_adaptive(coefficients, degrees, maximum_depth=20):
    stack = [(coefficients, 0)]
    leaves = 0
    deepest = 0
    smallest = None
    axis_order = (0, 1, 2, 3)
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            smallest = minimum if smallest is None else min(smallest, minimum)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved minimum={minimum}, index={index}, depth={depth}"
            )
        interiorities = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        if max(interiorities) > 0:
            axis = max(range(len(degrees)), key=interiorities.__getitem__)
        else:
            axis = axis_order[depth % len(axis_order)]
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    return leaves, deepest, smallest


def load_inputs():
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    assert cache["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"
    assert cache["variables"] == ["n", "w", "x", "U", "V", "Z"]
    assert cache["numerator_degrees"] == [2, 0, 12, 12, 8, 2]
    terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in cache["numerator_terms"]
    ]
    assert len(terms) == 5703
    tau = json.loads(TAU_REPORT.read_text(encoding="utf-8"))
    assert tau["status"] == "PASS_EXACT_TREE_TAU_BRANCH_WEIGHT_UPPER_AND_N28_TABLE"
    table = {int(row["e"]): int(row["tau_upper"]) for row in tau["order28"]["table"]}
    assert all(excess in table for excess in range(7, 40))
    return cache, terms, table


def certify_excess(excess, tau_upper, source_terms):
    started = time.perf_counter()
    A, J, Vc, Zc = sp.symbols("A J Vc Zc", nonnegative=True)
    variables = (A, J, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in variables])
    gamma = max(
        sp.S.Zero,
        sp.Rational(excess * (2 * excess - (ORDER - 2)), 3 * (ORDER - 2)),
    )
    tau_lower = sp.Rational(excess) + gamma
    assert tau_lower <= tau_upper
    tau = sp.expand(tau_lower + (sp.Rational(tau_upper) - tau_lower) * A)
    N = sp.Integer(sp.binomial(ORDER - 2, 3) + excess)
    D = sp.expand(sp.binomial(ORDER - 3, 4) + (ORDER - 4) * excess - tau)
    G = sp.expand((10 * D4_CEILING - 2) * D - N)
    if excess <= 10:
        cap = "rank45"
        P = sp.expand(40 * D - 173 * N)
        Q = sp.expand(5 * G)
    else:
        cap = "two_extension"
        P = sp.Integer(5 * N)
        Q = G
    Zn = 9 + 7 * Zc
    for endpoint in (0, 1):
        substitution = {A: endpoint}
        assert D.subs(substitution) > 0
        assert G.subs(substitution) > 0
        assert P.subs(substitution) > 0
        assert Q.subs(substitution) > 0

    Df = to_flint(context, D, variables)
    Pf = to_flint(context, P, variables)
    Qf = to_flint(context, Q, variables)
    Jf = to_flint(context, J, variables)
    Vcf = to_flint(context, Vc, variables)
    Znf = to_flint(context, Zn, variables)
    D_powers = [Df**power for power in range(X_DEGREE + 1)]
    P_powers = [Pf**power for power in range(U_DEGREE + 1)]
    Q_powers = [Qf**power for power in range(U_DEGREE + 1)]
    J_powers = [Jf**power for power in range(U_DEGREE + 1)]
    V_powers = [Vcf**power for power in range(V_DEGREE + 1)]
    Z_powers = [Znf**power for power in range(Z_DEGREE + 1)]

    mapped = context.constant(0)
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        assert w_power == 0
        scalar = sp.factor(
            coefficient
            * ORDER**n_power
            * N**x_power
            * 24**v_power
            * 25 ** (V_DEGREE - v_power)
            * 16 ** (Z_DEGREE - z_power)
        )
        numerator, denominator = sp.fraction(scalar)
        term = context.constant(fmpq(int(numerator), int(denominator)))
        term *= D_powers[X_DEGREE - x_power]
        term *= P_powers[u_power]
        term *= Q_powers[U_DEGREE - u_power]
        term *= J_powers[u_power]
        term *= V_powers[v_power]
        term *= Z_powers[z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(variables), chunk_columns=4096
    )
    initial_minimum, initial_index = minimum_with_index(bernstein)
    if initial_minimum >= 0:
        leaves, deepest, terminal_minimum = 1, 0, initial_minimum
    else:
        leaves, deepest, terminal_minimum = certify_adaptive(bernstein, degrees)
    row = {
        "degree_surplus": excess,
        "tau_interval": [str(tau_lower), str(tau_upper)],
        "D4_cap": cap,
        "D4_parameter": f"U=({sp.factor(P)})*J/({sp.factor(Q)})",
        "V_parameter": "V=24*Vc/25",
        "Z_parameter": "Z=(9+7*Zc)/16",
        "mapped_degrees": [int(value) for value in degrees],
        "mapped_terms": int(mapped_terms),
        "initial_Bernstein_coefficients": int(bernstein.size),
        "initial_minimum": str(initial_minimum),
        "initial_minimum_index": [int(value) for value in initial_index],
        "terminal_patches": leaves,
        "maximum_depth": deepest,
        "terminal_minimum": str(terminal_minimum),
        "certified_Bernstein_coefficients": int(bernstein.size) * leaves,
        "elapsed_seconds": time.perf_counter() - started,
    }
    print(
        "PASS", "e", excess, cap, "degrees", degrees,
        "initial", initial_minimum, "leaves", leaves,
        "depth", deepest, flush=True,
    )
    return row


def main():
    cache, source_terms, tau_table = load_inputs()
    rows = [
        certify_excess(excess, tau_table[excess], source_terms)
        for excess in range(7, 40)
    ]
    payload = {
        "schema": "rank8-delta2-n28-low-surplus-strong-q5-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_N28_SURPLUS_7_TO_39_STRONG_Q5",
        "theorem": (
            "The k=1 lower-cross Delta2 source is nonnegative at order 28 "
            "for every nonstar tree with integer degree surplus 7 through 39."
        ),
        "coverage": {
            "order": 28,
            "degree_surpluses": [7, 39],
            "cells": len(rows),
            "missing_integer_surpluses": [],
        },
        "positive_multiplier": "D^12*Q^12*25^8*16^2",
        "source_denominator_factor": cache["positive_denominator_factor"],
        "cells": rows,
        "total_certified_Bernstein_coefficients": sum(
            row["certified_Bernstein_coefficients"] for row in rows
        ),
        "dependencies": {
            CACHE.name: sha256(CACHE),
            TAU_REPORT.name: sha256(TAU_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Surplus 6, surplus at least 40, the star, and the other live "
            "rank-8 tensors are separate proof components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
