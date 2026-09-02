#!/usr/bin/env python3
"""Test PFSR on wrapped Bautista recurrence trees, exactly.

The inner rooted pattern tree has

    U = A + x B,
    A = S_ell T_{k,n}^m,
    B = (1+2x)^ell S_n^(km),

where

    S_t = (1+2x)^t + x(1+x)^t,
    T_{k,n} = S_n^k + x(1+2x)^(kn).

This is the family from Bautista-Ramos, Guillen-Galvan, and
Gomez-Salgado (Graphs and Combinatorics 42 (2026), article 59).
Attach the inner root and ``outer_leaves`` leaves to a fresh root:

    C = U(1+x)^outer_leaves,  D = A.

Then ``F=C+xD`` and ``T=F+xC`` are an exact finite-tree terminal pair.
The scan seeks live negative crosses and a failure of
``R_T >= zeta^2``.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from scan_generalized_three_defect_gbcl import gbcl_data
from search_bouquet_pfsr_realizability import (
    rank_fitness,
    rank_record,
)


X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])


def spider(t: int) -> Poly:
    return P2**t + X * P1**t


def stable_cross_ratio(record: dict) -> float:
    c = record["coefficients"]
    return (
        c["F_r_minus_1"] * c["T_k"]
    ) / (c["T_r"] * c["F_r"])


def evaluate_pair(c_poly: Poly, d_poly: Poly) -> dict:
    f_poly = c_poly + X * d_poly
    t_poly = f_poly + X * c_poly
    best = None
    best_score = float("-inf")
    live = 0
    pfsr_failure = None
    ncl_failure = None
    for rank in range(2, t_poly.degree()):
        if int(t_poly[rank]) <= int(t_poly[rank - 1]):
            continue
        data = gbcl_data(t_poly, f_poly, rank)
        if data is None:
            continue
        item = rank_record(t_poly, f_poly, rank, data)
        score = rank_fitness(item)
        if score > best_score:
            best_score = score
            best = item
        if item["live_negative_cross"]:
            live += 1
            if item["PFSR_cleared"] < 0 and pfsr_failure is None:
                pfsr_failure = item
            if item["NCL_cleared"] < 0 and ncl_failure is None:
                ncl_failure = item
    return {
        "degree_C": c_poly.degree(),
        "degree_D": d_poly.degree(),
        "degree_F": f_poly.degree(),
        "degree_T": t_poly.degree(),
        "fitness": best_score,
        "best_rank": best,
        "best_cross_ratio": (
            stable_cross_ratio(best) if best is not None else None
        ),
        "live_negative_cross_rank_count": live,
        "PFSR_failure": pfsr_failure,
        "NCL_failure": ncl_failure,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--k-min", type=int, default=1)
    parser.add_argument("--k-max", type=int, default=5)
    parser.add_argument("--n-min", type=int, default=1)
    parser.add_argument("--n-max", type=int, default=16)
    parser.add_argument("--ell-min", type=int, default=0)
    parser.add_argument("--ell-max", type=int, default=20)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=100)
    parser.add_argument("--outer-leaves-min", type=int, default=0)
    parser.add_argument("--outer-leaves-max", type=int, default=12)
    parser.add_argument("--degree-max", type=int, default=5000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    tested = live_cases = 0
    champion = None
    failure = None
    ncl_failure = None
    spider_cache = [spider(i) for i in range(args.ell_max + 1)]
    p1_powers = [P1**i for i in range(args.outer_leaves_max + 1)]
    p2_powers = [P2**i for i in range(args.ell_max + 1)]

    for k_value in range(args.k_min, args.k_max + 1):
        for n_value in range(args.n_min, args.n_max + 1):
            s_n = spider(n_value)
            t_kn = s_n**k_value + X * P2 ** (k_value * n_value)
            t_power = Poly([1])
            s_power = Poly([1])
            for m_value in range(1, args.m_max + 1):
                t_power *= t_kn
                s_power *= s_n**k_value
                if m_value < args.m_min:
                    continue
                for ell in range(args.ell_min, args.ell_max + 1):
                    a_poly = spider_cache[ell] * t_power
                    b_poly = p2_powers[ell] * s_power
                    inner = a_poly + X * b_poly
                    for outer_leaves in range(
                        args.outer_leaves_min,
                        args.outer_leaves_max + 1,
                    ):
                        degree = inner.degree() + outer_leaves + 2
                        if degree > args.degree_max:
                            continue
                        c_poly = inner * p1_powers[outer_leaves]
                        result = evaluate_pair(c_poly, a_poly)
                        tested += 1
                        live_cases += int(
                            result["live_negative_cross_rank_count"] > 0
                        )
                        inner_order = (
                            2 * ell
                            + 2
                            + m_value
                            * (
                                2 * k_value * n_value
                                + k_value
                                + 1
                            )
                        )
                        record = {
                            "parameters": {
                                "k": k_value,
                                "n": n_value,
                                "ell": ell,
                                "m": m_value,
                                "outer_leaves": outer_leaves,
                            },
                            "inner_tree_order": inner_order,
                            "terminal_F_tree_order": (
                                inner_order + outer_leaves + 1
                            ),
                            "terminal_T_tree_order": (
                                inner_order + outer_leaves + 2
                            ),
                            **result,
                        }
                        if (
                            champion is None
                            or record["fitness"] > champion["fitness"]
                        ):
                            champion = record
                        if result["PFSR_failure"] is not None:
                            failure = record
                            break
                        if (
                            result["NCL_failure"] is not None
                            and ncl_failure is None
                        ):
                            ncl_failure = record
                    if failure:
                        break
                if failure:
                    break
            print(
                f"k={k_value} n={n_value} tested={tested} "
                f"live={live_cases} "
                f"cross={champion['best_cross_ratio']:.12f} "
                f"fitness={champion['fitness']:.6f}",
                flush=True,
            )
            if failure:
                break
        if failure:
            break

    status = (
        "ACTUAL_PATTERN_TREE_COUNTEREXAMPLE_TO_PFSR"
        if failure is not None
        else "NO_PATTERN_TREE_PFSR_FAILURE_FOUND"
    )
    report = {
        "status": status,
        "scope": (
            "All pairs are finite trees from a published exact "
            "recurrence family. A PFSR failure alone would refute "
            "the auxiliary reserve, not unimodality."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "families_with_live_negative_cross": live_cases,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
        "first_PFSR_failure": failure,
        "first_NCL_failure": ncl_failure,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": status,
                "tested": tested,
                "live_cases": live_cases,
                "elapsed_seconds": report["elapsed_seconds"],
                "champion": champion,
                "first_failure": failure,
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
