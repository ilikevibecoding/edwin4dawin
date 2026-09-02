#!/usr/bin/env python3
"""Exact finite-order Delta2 cells from a pinned sparse source polynomial.

This is the repeated-cell counterpart of
``certify_rank8_delta2_lcross_k1_finite_surplus_cell_root.py``.  It avoids
reconstructing the rank-8 source expression with SymPy for every cell: the
5,703 exact rational terms are read from a separately generated and pinned
sparse artifact.  Every subsequent substitution and every tensor Bernstein
coefficient is still computed over the rationals.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import minimum_with_index, to_flint
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
CACHE_NAME = "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
D4_CONSTANT_CEILING = sp.Rational(1559, 3575)
PINNED = {
    CACHE_NAME:
        "F88BDFE79B3FA3C476BEE505CDB3C2C2AAF4665C5B9AE3320CC46088E193DA00",
    "generate_rank8_delta2_lcross_k1_source_sparse_root.py":
        "0AE45C6AA5A08657D8D22E2071A038B0912A70D57B7E85597BC5E07F3A6AF6CC",
    "certify_rank8_delta4_junction_coupled_box.py":
        "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "verify_forest_rank345_defect_ceiling.py":
        "B2AAF96271AE47FA606E35F56D8C3841977F35347C691594CCADBA72B747C59B",
    "FOREST_RANK345_DEFECT_CEILING_2026-07-28.md":
        "ACA8EDFD30E249FB46155237EE49CD21695E4A1459E8D494176D3F000768E085",
    "verify_tree_degree_surplus_tau_interval_root.py":
        "24E054CD42BBCC67DE2BB0D675775EDAE3240D9A25913749A605CED1426EC5EF",
    "tree_degree_surplus_tau_interval_exact_root_20260826.json":
        "062A8B4383232A4AEB95324DF7ADBF0FEA1FF1DE1DA50D64A11EB9868487EDFB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_sparse_source():
    payload = json.loads((HERE / CACHE_NAME).read_text(encoding="utf-8"))
    assert payload["status"] == "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE"
    assert payload["variables"] == ["n", "w", "x", "U", "V", "Z"]
    assert payload["numerator_term_count"] == 5703
    assert payload["numerator_degrees"] == [2, 0, 12, 12, 8, 2]
    terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in payload["numerator_terms"]
    ]
    assert len(terms) == 5703
    return terms, tuple(payload["numerator_degrees"]), payload["positive_denominator_factor"]


def certify_cell(order, e_low, e_high, gamma_branch, source_terms, maxima):
    started = time.perf_counter()
    mass = sp.Integer(order - 2)
    threshold = mass / 2
    nonstar_max = sp.binomial(order - 3, 2)
    assert 28 <= order <= 34
    assert 6 <= e_low < e_high <= nonstar_max
    assert gamma_branch in ("zero", "cauchy")
    if gamma_branch == "zero":
        assert e_high <= threshold
    else:
        assert e_low >= threshold

    _, w_degree, x_degree, u_degree, v_degree, z_degree = maxima
    assert maxima == (2, 0, 12, 12, 8, 2)
    B, A, J, Vc, Zc = sp.symbols("B A J Vc Zc", nonnegative=True)
    cube = (B, A, J, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    excess = sp.expand(e_low + (e_high - e_low) * B)
    gamma = (
        sp.S.Zero if gamma_branch == "zero"
        else sp.expand(excess * (2 * excess - mass) / (3 * mass))
    )
    tau_low = sp.expand(excess + gamma)
    tau_high = sp.expand(sp.Rational(order - 1, 3) * excess)
    tau_width = sp.factor(tau_high - tau_low)
    assert tau_width.subs(B, 0) >= 0 and tau_width.subs(B, 1) >= 0
    tau = sp.expand(tau_low + (tau_high - tau_low) * A)

    c2_actual = sp.binomial(order - 1, 2)
    N = sp.expand(sp.binomial(order - 2, 3) + excess)
    D = sp.expand(sp.binomial(order - 3, 4) + (order - 4) * excess - tau)
    G = sp.expand((10 * D4_CONSTANT_CEILING - 2) * D - N)
    z_denominator = sp.Integer(order - 12)
    z_numerator = sp.expand((order - 19) + 7 * Zc)
    for b in (0, 1):
        for a in (0, 1):
            assert N.subs(B, b) > 0
            assert D.subs({B: b, A: a}) > 0
            assert G.subs({B: b, A: a}) > 0
    assert z_denominator > 0

    Nf = to_flint(context, N, cube)
    Df = to_flint(context, D, cube)
    Gf = to_flint(context, G, cube)
    Jf = to_flint(context, J, cube)
    Vf = to_flint(context, Vc, cube)
    Znf = to_flint(context, z_numerator, cube)
    max_n_power = w_degree + x_degree + u_degree
    N_powers = [Nf**power for power in range(max_n_power + 1)]
    D_powers = [Df**power for power in range(x_degree + 1)]
    G_powers = [Gf**power for power in range(u_degree + 1)]
    J_powers = [Jf**power for power in range(u_degree + 1)]
    V_powers = [Vf**power for power in range(v_degree + 1)]
    Zn_powers = [Znf**power for power in range(z_degree + 1)]

    mapped = context.constant(0)
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        scalar = sp.factor(
            coefficient
            * sp.Integer(order) ** n_power
            * c2_actual ** w_power
            * 5 ** u_power
            * z_denominator ** (z_degree - z_power)
        )
        scalar_numerator, scalar_denominator = sp.fraction(scalar)
        term = context.constant(fmpq(int(scalar_numerator), int(scalar_denominator)))
        term *= N_powers[w_degree - w_power + x_power + u_power]
        term *= D_powers[x_degree - x_power]
        term *= G_powers[u_degree - u_power]
        term *= J_powers[u_power]
        term *= V_powers[v_power]
        term *= Zn_powers[z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(cube), chunk_columns=4096
    )
    minimum, index = minimum_with_index(bernstein)
    negative_count = sum(bool(coefficient < 0) for coefficient in bernstein.flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in bernstein.flat)
    positive_count = int(bernstein.size) - negative_count - zero_count
    status = (
        "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_SURPLUS_CELL"
        if negative_count == 0 else
        "FINITE_SURPLUS_CELL_BERNSTEIN_UNRESOLVED"
    )
    label = "low" if gamma_branch == "zero" else "high"
    output = HERE / (
        f"rank8_delta2_lcross_k1_finite_surplus_n{order}_{label}_"
        "exact_root_20260826.json"
    )
    payload = {
        "schema": "rank8-delta2-lcross-k1-finite-surplus-cell-root-v2-sparse",
        "status": status,
        "scope": (
            "Exact Delta2 sign on the k=1 lower-cross path for the displayed "
            "continuous nonstar degree-surplus/tau cell."
        ),
        "order": order,
        "degree_surplus_interval": [str(e_low), str(e_high)],
        "gamma_branch": gamma_branch,
        "nonstar_degree_surplus_maximum": str(nonstar_max),
        "maps": {
            "e": str(excess),
            "tau_lower": str(sp.factor(tau_low)),
            "tau_upper": str(sp.factor(tau_high)),
            "tau_width": str(tau_width),
            "tau": str(sp.factor(tau)),
            "c3_actual_N": str(sp.factor(N)),
            "c4_actual_D": str(sp.factor(D)),
            "old_U_denominator_scaled_G": str(sp.factor(G)),
            "old_U": "5*N*J/G",
            "root_Z": str(sp.factor(z_numerator / z_denominator)),
        },
        "positive_multiplier": (
            f"N**{w_degree} * D**{x_degree} * G**{u_degree} * "
            f"{z_denominator}**{z_degree}"
        ),
        "source_terms": len(source_terms),
        "source_degrees": [int(entry) for entry in maxima],
        "mapped_terms": int(mapped_terms),
        "mapped_degrees": [int(entry) for entry in degrees],
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": [int(entry) for entry in index],
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": positive_count,
        },
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "immutable_inputs": {name: sha256(HERE / name) for name in PINNED},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A PASS is one finite cell only. Full finite-band coverage requires "
            "a no-gap assembly plus the separate star and n=28 certificates."
        ),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(
        "CELL", order, label, "MAPPED", degrees, bernstein.size,
        minimum, index, status, flush=True,
    )
    return payload, output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--orders", type=int, nargs="+", default=[30, 31, 32, 33, 34])
    args = parser.parse_args()
    assert args.orders and len(set(args.orders)) == len(args.orders)
    assert all(29 <= order <= 34 for order in args.orders)
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    source_terms, maxima, denominator = load_sparse_source()

    rows = []
    overall_started = time.perf_counter()
    for order in args.orders:
        threshold = sp.Rational(order - 2, 2)
        nonstar_max = sp.binomial(order - 3, 2)
        for low, high, branch in (
            (sp.Integer(6), threshold, "zero"),
            (threshold, nonstar_max, "cauchy"),
        ):
            payload, output = certify_cell(
                order, low, high, branch, source_terms, maxima
            )
            rows.append({
                "order": order,
                "branch": branch,
                "interval": payload["degree_surplus_interval"],
                "status": payload["status"],
                "report": output.name,
                "report_sha256": sha256(output),
                "minimum": payload["minimum"],
                "bernstein_coefficients": payload["bernstein_coefficients"],
            })

    passed = all(row["status"].startswith("PASS_EXACT") for row in rows)
    status = (
        "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_ORDERS_BATCH"
        if passed else "FINITE_ORDERS_BATCH_UNRESOLVED"
    )
    output = HERE / "rank8_delta2_lcross_k1_finite_orders_batch_exact_root_20260826.json"
    payload = {
        "schema": "rank8-delta2-lcross-k1-finite-orders-batch-root-v1",
        "status": status,
        "orders": args.orders,
        "coverage": (
            "For each displayed order, two closed cells cover every real "
            "nonstar degree surplus e from 6 through binomial(n-3,2), with "
            "the common endpoint (n-2)/2 included in both cells."
        ),
        "source_denominator_factor": denominator,
        "cells": rows,
        "resources": {"elapsed_seconds": time.perf_counter() - overall_started},
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This batch covers only the k=1 lower-cross finite nonstar cells; "
            "the other live tensors, stars, and order-28 exceptional work are "
            "separate proof components."
        ),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(status, flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
