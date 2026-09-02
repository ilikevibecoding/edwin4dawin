#!/usr/bin/env python3
"""Search for an actual rooted-tree failure of the full-square reserve.

For a rooted bouquet let

    C = product of the full child polynomials,
    D = product of the child polynomials with their attachment roots deleted.

Thus the rooted tree has polynomial ``F=C+xD``.  Adding a new leaf at its
root gives the exact two-step terminal recurrence ``T=F+xC``.  Every pair
tested here is therefore realized by a finite tree, unlike the abstract
recursive-cone stress tests.

The evolutionary score first seeks a negative-cross rank, then a live
negative-cross rank, and finally minimizes

    R_T / zeta^2

whose value below one is exactly a failure of PFSR.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
import random
import sys
import time
from collections import Counter
from pathlib import Path

from flint import fmpz_poly as Poly

HERE = Path(__file__).resolve().parent
PUBLIC = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC))
sys.path.insert(0, str(HERE))

from scripts.valley_search import (  # noqa: E402
    SWEEPS,
    _gadget_polys,
    _path_poly,
    bouquet_size,
    canon,
    mutate_spec,
    spec_label,
)
from scan_generalized_three_defect_gbcl import gbcl_data  # noqa: E402


X = Poly([0, 1])
ONE_PLUS_X = Poly([1, 1])


def rooted_bouquet_pair(spec) -> tuple[Poly, Poly]:
    """Return the exact child products ``(C,D)`` at the bouquet root."""

    gadgets, paths, leaves = spec
    c_poly = Poly([1])
    d_poly = Poly([1])
    for legs, multiplicity in Counter(gadgets).items():
        excluded, included = _gadget_polys(legs)
        c_poly *= (Poly(excluded) + Poly(included)) ** multiplicity
        d_poly *= Poly(excluded) ** multiplicity
    for length, multiplicity in Counter(paths).items():
        c_poly *= Poly(_path_poly(length)) ** multiplicity
        d_poly *= Poly(_path_poly(length - 1)) ** multiplicity
    if leaves:
        c_poly *= ONE_PLUS_X**leaves
    return c_poly, d_poly


def log2_int(value: int) -> float:
    """Accurate-enough log2 for an arbitrarily large positive integer."""

    if value <= 0:
        return float("-inf")
    shift = max(0, value.bit_length() - 53)
    return math.log2(value >> shift) + shift


def ratio_float(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return float("inf")
    return math.exp2(
        max(-1022.0, min(1023.0, log2_int(numerator) - log2_int(denominator)))
    )


def rank_record(t_poly: Poly, f_poly: Poly, k: int, data: dict) -> dict:
    r = k - 1
    a = int(t_poly[r])
    ap = int(t_poly[k])
    app = int(t_poly[k + 1]) if k + 1 <= t_poly.degree() else 0
    bm = int(f_poly[r - 1])
    b = int(f_poly[r])
    bp = int(f_poly[k]) if k <= f_poly.degree() else 0
    upper = int(data["U"])
    reserve_numerator = int(data["R_T_numerator"])
    square_denominator = k * upper * upper
    square_numerator = bm * bm * reserve_numerator
    pfsr_ratio = (
        ratio_float(square_numerator, square_denominator)
        if square_denominator > 0 and square_numerator >= 0
        else None
    )
    return {
        "rank_k": k,
        "rank_r": r,
        "coefficients": {
            "T_r": a,
            "T_k": ap,
            "T_k_plus_1": app,
            "F_r_minus_1": bm,
            "F_r": b,
            "F_k": bp,
        },
        "negative_cross": data["split_branch"] == "z_negative_NCL",
        "live_negative_cross": (
            data["split_branch"] == "z_negative_NCL"
            and data["live_C12_required"]
        ),
        "PFSR_cleared": int(data["full_square_reserve_cleared"]),
        "PFSR_ratio_R_T_over_zeta_squared": pfsr_ratio,
        "NCL_cleared": int(data["split_margin"]),
        "R_T_numerator": reserve_numerator,
        "R_F_numerator": int(data["R_F_numerator"]),
        "upper_defect": upper,
    }


def rank_fitness(record: dict) -> float:
    """Score simultaneous progress toward both live-branch inequalities."""

    coefficients = record["coefficients"]
    a = coefficients["T_r"]
    ap = coefficients["T_k"]
    bm = coefficients["F_r_minus_1"]
    b = coefficients["F_r"]
    if record["live_negative_cross"]:
        cleared = record["PFSR_cleared"]
        if cleared < 0:
            return 4000.0 + min(500.0, -log2_int(-cleared) / 1000.0)
        numerator = bm * bm * record["R_T_numerator"]
        denominator = (
            record["rank_k"]
            * record["upper_defect"]
            * record["upper_defect"]
        )
        log_ratio = log2_int(max(numerator, 1)) - log2_int(denominator)
        return 3000.0 - log_ratio
    cross_num = bm * ap
    cross_den = a * b
    cross_log = log2_int(cross_num) - log2_int(cross_den)
    return 2000.0 + 100.0 * cross_log


def evaluate(
    spec, *, wrapped: bool = False, outer_leaves: int = 2
) -> dict:
    c_poly, d_poly = rooted_bouquet_pair(spec)
    inner_order = bouquet_size(*spec)
    if wrapped:
        # Attach the inner bouquet root and ``outer_leaves`` new leaves
        # to a fresh root.  If that fresh root is excluded, its child
        # product is I(inner)*(1+x)^ell; if included, the inner root
        # and all new leaves are excluded.
        inner_total = c_poly + X * d_poly
        d_poly = c_poly
        c_poly = inner_total * ONE_PLUS_X**outer_leaves
    f_poly = c_poly + X * d_poly
    t_poly = f_poly + X * c_poly
    best = None
    best_fitness = float("-inf")
    live_checks = 0
    negative_checks = 0
    pfsr_failure = None
    ncl_failure = None
    for k in range(2, t_poly.degree()):
        # The direct-descent argument disposes of every negative cross
        # with T_k <= T_{k-1}.  Search only ranks that can genuinely
        # enter the live branch.
        if int(t_poly[k]) <= int(t_poly[k - 1]):
            continue
        data = gbcl_data(t_poly, f_poly, k)
        if data is None:
            continue
        record = rank_record(t_poly, f_poly, k, data)
        negative_checks += int(record["negative_cross"])
        live_checks += int(record["live_negative_cross"])
        score = rank_fitness(record)
        if score > best_fitness:
            best_fitness = score
            best = record
        if record["live_negative_cross"] and record["PFSR_cleared"] < 0:
            pfsr_failure = record
            break
        if record["live_negative_cross"] and record["NCL_cleared"] < 0:
            ncl_failure = record
    rooted_order = (
        inner_order + outer_leaves + 1
        if wrapped
        else inner_order
    )
    result = {
        "spec": [[list(g) for g in spec[0]], list(spec[1]), spec[2]],
        "label": spec_label(spec),
        "wrapped": wrapped,
        "outer_leaves": outer_leaves if wrapped else None,
        "inner_bouquet_order": inner_order,
        "rooted_tree_order": rooted_order,
        "F_tree_order": rooted_order,
        "T_tree_order": rooted_order + 1,
        "degree_C": c_poly.degree(),
        "degree_D": d_poly.degree(),
        "degree_F": f_poly.degree(),
        "degree_T": t_poly.degree(),
        "negative_cross_rank_count": negative_checks,
        "live_negative_cross_rank_count": live_checks,
        "fitness": best_fitness,
        "best_rank": best,
        "PFSR_failure": pfsr_failure,
        "NCL_failure": ncl_failure,
    }
    if pfsr_failure is not None or ncl_failure is not None:
        result["C_polynomial"] = [int(x) for x in c_poly]
        result["D_polynomial"] = [int(x) for x in d_poly]
        result["F_polynomial"] = [int(x) for x in f_poly]
        result["T_polynomial"] = [int(x) for x in t_poly]
    return result


def restore(record: dict):
    raw = record["spec"]
    return tuple(tuple(g) for g in raw[0]), tuple(raw[1]), raw[2]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-n", type=int, default=1000)
    parser.add_argument("--generations", type=int, default=400)
    parser.add_argument("--population", type=int, default=96)
    parser.add_argument("--children", type=int, default=16)
    parser.add_argument("--seed", type=int, default=993200)
    parser.add_argument("--sweeps", default="ABCD")
    parser.add_argument("--sweep-limit", type=int, default=3000)
    parser.add_argument("--galvin-m-max", type=int, default=60)
    parser.add_argument("--galvin-t-values", default="8,12,16,20")
    parser.add_argument(
        "--fork-seed-m-max",
        type=int,
        default=0,
        help="seed t copies of S(1^m), the inner star-fork family",
    )
    parser.add_argument(
        "--resume",
        type=Path,
        help="seed the population with the champion from a prior run",
    )
    parser.add_argument(
        "--wrapped",
        action="store_true",
        help="put one extra rooted level with new outer leaves around each bouquet",
    )
    parser.add_argument("--outer-leaves", type=int, default=2)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    rng = random.Random(args.seed)
    seen = set()
    heap: list[tuple[float, int, dict]] = []
    serial = 0
    tested = 0
    witness = None
    last_record = None

    def retain(record: dict) -> None:
        nonlocal serial
        serial += 1
        item = (float(record["fitness"]), serial, record)
        if len(heap) < args.population:
            heapq.heappush(heap, item)
        elif item[0] > heap[0][0]:
            heapq.heapreplace(heap, item)

    def test(spec) -> bool:
        nonlocal tested, witness, last_record
        last_record = None
        key = canon(spec)
        realized_order = bouquet_size(*spec) + (
            args.outer_leaves + 1 if args.wrapped else 0
        )
        if key in seen or realized_order > args.max_n:
            return False
        seen.add(key)
        record = evaluate(
            spec,
            wrapped=args.wrapped,
            outer_leaves=args.outer_leaves,
        )
        last_record = record
        tested += 1
        if record["PFSR_failure"] is not None:
            witness = record
            return True
        retain(record)
        return False

    if args.resume is not None:
        prior = json.loads(args.resume.read_text(encoding="utf-8"))
        prior_champion = prior.get("champion")
        if prior_champion is not None:
            test(restore(prior_champion))
            print(
                f"resumed={args.resume} "
                f"fitness={last_record['fitness']:.9f}",
                flush=True,
            )

    for t in (int(x) for x in args.galvin_t_values.split(",") if x):
        for m in range(1, args.galvin_m_max + 1):
            spec = (tuple((2,) * t for _ in range(m)), (), 0)
            if bouquet_size(*spec) > args.max_n:
                break
            if test(spec):
                break
        if witness:
            break

    if not witness and args.fork_seed_m_max:
        for m in range(1, args.fork_seed_m_max + 1):
            maximum_t = max(0, (args.max_n - 2) // (m + 1))
            for t in range(1, maximum_t + 1):
                spec = (tuple((1,) * m for _ in range(t)), (), 0)
                if test(spec):
                    break
            if witness:
                break

    if not witness:
        for name in args.sweeps:
            checked = 0
            for spec in SWEEPS[name](args.max_n):
                if checked >= args.sweep_limit:
                    break
                before = tested
                if test(spec):
                    break
                checked += int(tested > before)
            print(f"sweep={name} checked={checked}", flush=True)
            if witness:
                break

    population = [item[2] for item in sorted(heap, reverse=True)]
    for generation in range(args.generations):
        if witness or not population:
            break
        children = []
        elite = population[: max(8, args.population // 3)]
        for parent in elite:
            spec = restore(parent)
            for _ in range(args.children):
                child_spec = mutate_spec(spec, rng, args.max_n)
                before = tested
                if test(child_spec):
                    break
                if tested > before and last_record is not None:
                    children.append(last_record)
            if witness:
                break
        population = sorted(
            population + children, key=lambda item: item["fitness"], reverse=True
        )[: args.population]
        if generation % 5 == 0 and population:
            top = population[0]
            best = top["best_rank"]
            print(
                f"generation={generation} tested={tested} "
                f"fitness={top['fitness']:.9f} "
                f"class={'live' if best['live_negative_cross'] else 'negative' if best['negative_cross'] else 'pre-cross'} "
                f"k={best['rank_k']} n={top['rooted_tree_order']} "
                f"ratio={best['PFSR_ratio_R_T_over_zeta_squared']} "
                f"{top['label']}",
                flush=True,
            )

    champion = witness or (population[0] if population else None)
    status = (
        "ACTUAL_TREE_COUNTEREXAMPLE_TO_PFSR"
        if witness is not None
        else "NO_ACTUAL_TREE_PFSR_FAILURE_FOUND"
    )
    payload = {
        "status": status,
        "scope": (
            "Every tested pair is exactly F=C+xD, T=F+xC for a finite "
            "rooted bouquet tree; a PFSR failure is not by itself a "
            "counterexample to unimodality."
        ),
        "parameters": vars(args)
        | {
            "output": str(args.output),
            "resume": str(args.resume) if args.resume else None,
        },
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": status,
                "tested": tested,
                "elapsed_seconds": payload["elapsed_seconds"],
                "champion": champion,
                "output": str(args.output),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
