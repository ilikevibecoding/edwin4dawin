#!/usr/bin/env python3
"""Exact strong-Q5 Delta2 cells for orders 29..34 and surplus 1..5."""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import minimum_with_index, to_flint
from certify_rank8_delta2_n28_low_surplus_strong_q5_root import certify_adaptive
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
CACHE = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
TAU_REPORT = HERE / "tree_tau_branch_weight_upper_exact_root_20260826.json"
OUTPUT = HERE / "rank8_delta2_orders29_34_surplus1_5_strong_q5_exact_root_20260826.json"
D4_CEILING = sp.Rational(1559, 3575)
DEGREES = (24, 12, 8, 2)
TAU_UPPER = {1: 3, 2: 7, 3: 11, 4: 15, 5: 20}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_terms():
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
    table = {int(row["e"]): int(row["tau_upper"]) for row in tau["order28"]["table"]}
    assert {excess: table[excess] for excess in TAU_UPPER} == TAU_UPPER
    return cache, terms


def certify_cell(order: int, excess: int, source_terms):
    started = time.perf_counter()
    assert 29 <= order <= 34 and 1 <= excess <= 5
    A, J, Vc, Zc = sp.symbols("A J Vc Zc", nonnegative=True)
    variables = (A, J, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in variables])
    mass = order - 2
    gamma = max(sp.S.Zero, sp.Rational(excess * (2 * excess - mass), 3 * mass))
    assert gamma == 0
    tau_lower = sp.Integer(excess)
    tau_upper = sp.Integer(TAU_UPPER[excess])
    tau = sp.expand(tau_lower + (tau_upper - tau_lower) * A)
    N = sp.Integer(sp.binomial(order - 2, 3) + excess)
    D = sp.expand(sp.binomial(order - 3, 4) + (order - 4) * excess - tau)
    G = sp.expand((10 * D4_CEILING - 2) * D - N)
    P = sp.expand(40 * D - 173 * N)
    Q = sp.expand(5 * G)
    z_denominator = sp.Integer(order - 12)
    Zn = sp.expand((order - 19) + 7 * Zc)
    for endpoint in (0, 1):
        assert D.subs(A, endpoint) > 0
        assert G.subs(A, endpoint) > 0
        assert P.subs(A, endpoint) > 0
        assert Q.subs(A, endpoint) > 0

    Df = to_flint(context, D, variables)
    Pf = to_flint(context, P, variables)
    Qf = to_flint(context, Q, variables)
    Jf = to_flint(context, J, variables)
    Vcf = to_flint(context, Vc, variables)
    Znf = to_flint(context, Zn, variables)
    D_powers = [Df**power for power in range(13)]
    P_powers = [Pf**power for power in range(13)]
    Q_powers = [Qf**power for power in range(13)]
    J_powers = [Jf**power for power in range(13)]
    V_powers = [Vcf**power for power in range(9)]
    Zn_powers = [Znf**power for power in range(3)]

    mapped = context.constant(0)
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        assert w_power == 0
        scalar = sp.factor(
            coefficient
            * order**n_power
            * N**x_power
            * 24**v_power
            * 25 ** (8 - v_power)
            * z_denominator ** (2 - z_power)
        )
        numerator, denominator = sp.fraction(scalar)
        term = context.constant(fmpq(int(numerator), int(denominator)))
        term *= D_powers[12 - x_power]
        term *= P_powers[u_power]
        term *= Q_powers[12 - u_power]
        term *= J_powers[u_power]
        term *= V_powers[v_power]
        term *= Zn_powers[z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(variables), chunk_columns=4096
    )
    initial_minimum, initial_index = minimum_with_index(bernstein)
    if initial_minimum >= 0:
        leaves, deepest, terminal_minimum = 1, 0, initial_minimum
    else:
        leaves, deepest, terminal_minimum = certify_adaptive(bernstein, degrees)
    assert terminal_minimum >= 0
    row = {
        "order": order,
        "degree_surplus": excess,
        "tau_interval": [str(tau_lower), str(tau_upper)],
        "D4_cap": "rank45",
        "D4_parameter": f"U=({sp.factor(P)})*J/({sp.factor(Q)})",
        "V_parameter": "V=24*Vc/25",
        "Z_parameter": f"Z=({sp.factor(Zn)})/{z_denominator}",
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
        "PASS", order, excess, "degrees", degrees,
        "initial", initial_minimum, "leaves", leaves,
        flush=True,
    )
    return row


def main() -> int:
    started = time.perf_counter()
    cache, terms = load_terms()
    rows = [
        certify_cell(order, excess, terms)
        for order in range(29, 35)
        for excess in range(1, 6)
    ]
    assert len(rows) == 30
    assert all(row["mapped_degrees"] == list(DEGREES) for row in rows)
    assert all(row["terminal_patches"] == 1 for row in rows)
    payload = {
        "schema": "rank8-delta2-orders29-34-surplus1-5-strong-q5-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_ORDERS29_TO34_SURPLUS1_TO5_STRONG_Q5",
        "theorem": (
            "The k=1 lower-cross Delta2 source is positive at every order "
            "29 through 34 for every tree with degree surplus 1 through 5, "
            "conditional only on the separately assembled strong-Q5 input."
        ),
        "coverage": {
            "orders": [29, 34],
            "degree_surpluses": [1, 5],
            "cells": len(rows),
            "missing_order_surplus_pairs": [],
        },
        "positive_multiplier": "D^12*Q^12*25^8*(n-12)^2",
        "source_denominator_factor": cache["positive_denominator_factor"],
        "cells": rows,
        "total_certified_Bernstein_coefficients": sum(
            row["certified_Bernstein_coefficients"] for row in rows
        ),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "dependencies": {
            CACHE.name: sha256(CACHE),
            TAU_REPORT.name: sha256(TAU_REPORT),
        },
        "required_proof_input": (
            "Q5(T)>=i4(T)*i5(T)/5 for trees through order 34, which gives "
            "the displayed exact V<=24/25 cap."
        ),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Surplus zero paths, surplus at least 6, stars, the strong-Q5 "
            "assembly, and the other live tensors are separate components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
