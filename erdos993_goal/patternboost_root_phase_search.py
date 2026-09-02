#!/usr/bin/env python3
"""Search central-root phase sums built from PatternBoost rooted trees.

For a rooted tree (T,r), put A=I(T) and E=I(T-r).  Joining a new
vertex to the roots of m disjoint copies of T gives the genuine tree

    P_m(x) = A(x)^m + x E(x)^m.

The existing product searches only convolve tree polynomials.  This
rooted construction is the simplest tree operation that adds two product
phases and can therefore create, rather than merely smooth, a shoulder.
Floating point is used only to rank candidates.  Every retained candidate
is replayed with exact fmpz arithmetic before it is reported.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from patternboost_corpus_audit import adjacency_from_prufer
from rooted_product_amplification_search import rooted_pair
from bouquet_ratio_evolution import ratio_score as exact_ratio_score


def moments(coefficients: list[int]) -> tuple[float, float, float]:
    values = np.asarray(coefficients, dtype=np.float64)
    total = float(values.sum())
    indices = np.arange(len(values), dtype=np.float64)
    mean = float(np.dot(indices, values) / total)
    variance = float(np.dot((indices - mean) ** 2, values) / total)
    return total, mean, variance


def normalized(coefficients: list[int]) -> np.ndarray:
    values = np.asarray(coefficients, dtype=np.float64)
    return values / values.sum()


def convolve_normalized(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    out = np.convolve(left, right)
    scale = float(out.max())
    if scale:
        out /= scale
    return out


def rebound_score(values: np.ndarray) -> tuple[tuple[float, ...], dict]:
    """Score a genuine adjacent-ratio rebound after a descent.

    Merely having a ratio close to one beside a broad mode is not useful:
    powers of every smooth distribution do that.  Credit is given only if
    a later ratio rises above an earlier ratio trough.
    """
    scale = float(values.max())
    floor = max(np.finfo(np.float64).tiny, scale * 1e-280)
    ratios = np.divide(
        values[1:],
        values[:-1],
        out=np.zeros(len(values) - 1, dtype=np.float64),
        where=values[:-1] > floor,
    )
    descent = next(
        (
            index
            for index, ratio in enumerate(ratios)
            if values[index] > floor and ratio < 1.0
        ),
        -1,
    )
    alpha = len(values) - 1
    tail_start = math.ceil((2 * alpha - 1) / 3)
    trough_index = descent
    legal = None
    any_rebound = None
    if descent >= 0:
        for index in range(descent + 1, len(ratios)):
            if values[index] <= floor:
                break
            if ratios[index] > ratios[trough_index] * (1.0 + 1e-13):
                item = (float(ratios[index]), index, trough_index)
                if any_rebound is None or item[0] > any_rebound[0]:
                    any_rebound = item
                if index < tail_start and (
                    legal is None or item[0] > legal[0]
                ):
                    legal = item
            if ratios[index] < ratios[trough_index]:
                trough_index = index
    boundary_gap = (
        alpha + 1
        if any_rebound is None
        else max(0, any_rebound[1] - (tail_start - 1))
    )
    score = (
        1.0 if legal is not None else 0.0,
        0.0 if legal is None else legal[0],
        1.0 if any_rebound is not None else 0.0,
        -float(boundary_gap),
        0.0 if any_rebound is None else any_rebound[0],
        0.0
        if any_rebound is None
        else any_rebound[0] / ratios[any_rebound[2]],
    )
    return score, {
        "first_descent": descent,
        "tail_start": tail_start,
        "legal_ratio": None if legal is None else legal[0],
        "legal_index": -1 if legal is None else legal[1],
        "legal_trough": -1 if legal is None else legal[2],
        "any_ratio": None if any_rebound is None else any_rebound[0],
        "any_index": -1 if any_rebound is None else any_rebound[1],
        "any_trough": -1 if any_rebound is None else any_rebound[2],
        "boundary_gap": boundary_gap,
    }


def phase_sum(
    a_power: np.ndarray,
    e_power: np.ndarray,
    log_mass_ratio: float,
) -> np.ndarray:
    size = max(len(a_power), len(e_power) + 1)
    out = np.zeros(size, dtype=np.float64)
    out[: len(a_power)] += a_power
    # The powers are independently max-normalized.  Restore the relative
    # scale using their max coefficients as well as their total masses.
    # Arrays returned by repeated convolution have max one.
    log_ratio = log_mass_ratio
    if log_ratio > -740:
        out[1 : len(e_power) + 1] += math.exp(log_ratio) * e_power
    return out


def exact_candidate(
    record: dict,
    root: int,
    exponent: int,
    e_coefficients: list[int],
) -> dict:
    a = Poly(record["polynomial"])
    e = Poly(e_coefficients)
    polynomial = a**exponent + Poly([0, 1]) * e**exponent
    coefficients = [int(value) for value in polynomial]
    result = profile(polynomial)
    rebound_rank, rebound = exact_ratio_score(coefficients)
    return {
        "corpus_first_line": record["first_line"],
        "prufer_code_one_based": record["prufer_code_one_based"],
        "branch_order": record["order"],
        "root_zero_based": root,
        "exponent": exponent,
        "tree_order": exponent * record["order"] + 1,
        "tree_degree": len(polynomial) - 1,
        "E": e_coefficients,
        "profile": result,
        "rebound_rank": rebound_rank,
        "rebound": rebound,
        "polynomial": (
            coefficients
            if not result["unimodal"]
            else None
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=200)
    parser.add_argument("--metric-roots", type=int, default=600)
    parser.add_argument("--max-exponent", type=int, default=120)
    parser.add_argument("--replay", type=int, default=30)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rooted: list[dict] = []

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        a_total, a_mean, a_variance = moments(record["polynomial"])
        for root in range(len(adjacency)):
            e_poly, j_poly = rooted_pair(adjacency, root)
            a_check = e_poly + Poly([0, 1]) * j_poly
            if list(a_check) != record["polynomial"]:
                raise AssertionError("rooted decomposition mismatch")
            e_coefficients = [int(value) for value in e_poly]
            e_total, e_mean, e_variance = moments(e_coefficients)
            loss = math.log(a_total / e_total)
            separation = a_mean - e_mean
            # Large separation per unit log-mass loss is the relevant
            # two-phase tradeoff; variance contrast breaks close ties.
            metric = separation / loss if loss > 0 else -math.inf
            rooted.append(
                {
                    "record_index": record_index,
                    "root": root,
                    "E": e_coefficients,
                    "log_ratio": math.log(e_total / a_total),
                    "metric": metric,
                    "mean_separation": separation,
                    "variance_separation": a_variance - e_variance,
                }
            )
        if (record_index + 1) % 25 == 0:
            print(
                f"root metrics {record_index + 1}/{len(records)} "
                f"states={len(rooted):,}",
                flush=True,
            )

    rooted.sort(
        key=lambda item: (
            item["metric"],
            abs(item["variance_separation"]),
        ),
        reverse=True,
    )
    selected = rooted[: min(args.metric_roots, len(rooted))]

    # Cache the A powers once per corpus record.  Each selected E state is
    # advanced incrementally, so the screen costs one short convolution per
    # state and exponent rather than repeated exponentiation.
    selected_by_record: dict[int, list[dict]] = {}
    for item in selected:
        selected_by_record.setdefault(item["record_index"], []).append(item)

    floating: list[dict] = []
    screened = 0
    for record_index, items in selected_by_record.items():
        record = records[record_index]
        a_base = normalized(record["polynomial"])
        a_power = a_base.copy()
        e_bases = [normalized(item["E"]) for item in items]
        e_powers = [base.copy() for base in e_bases]
        for exponent in range(2, args.max_exponent + 1):
            a_power = convolve_normalized(a_power, a_base)
            for state_index, item in enumerate(items):
                e_powers[state_index] = convolve_normalized(
                    e_powers[state_index], e_bases[state_index]
                )
                # Since each normalized convolution is divided by its max,
                # reconstruct the phase ratio directly from exact total
                # masses and the sums of the max-normalized arrays.
                log_ratio = (
                    exponent * item["log_ratio"]
                    + math.log(float(a_power.sum()))
                    - math.log(float(e_powers[state_index].sum()))
                )
                values = phase_sum(
                    a_power, e_powers[state_index], log_ratio
                )
                score, rebound = rebound_score(values)
                screened += 1
                candidate = {
                    "record_index": record_index,
                    "root": item["root"],
                    "exponent": exponent,
                    "score": score,
                    "rebound": rebound,
                    "metric": item["metric"],
                    "E": item["E"],
                }
                if len(floating) < args.replay:
                    floating.append(candidate)
                    floating.sort(key=lambda x: x["score"], reverse=True)
                elif score > floating[-1]["score"]:
                    floating[-1] = candidate
                    floating.sort(key=lambda x: x["score"], reverse=True)
        print(
            f"screen record={record_index} roots={len(items)} "
            f"screened={screened:,} best={floating[0]['score']}",
            flush=True,
        )

    exact = []
    witness = None
    for rank, item in enumerate(floating):
        replay = exact_candidate(
            records[item["record_index"]],
            item["root"],
            item["exponent"],
            item["E"],
        )
        replay["floating"] = {
            key: item[key]
            for key in ("score", "rebound", "metric")
        }
        exact.append(replay)
        ratio = replay["profile"]["best_post_descent_ratio"]
        exact_rebound = replay["rebound"]
        print(
            f"exact {rank + 1}/{len(floating)} "
            f"m={item['exponent']} valley_ratio="
            f"{None if ratio is None else ratio['decimal']} "
            f"legal_rebound={exact_rebound['legal_rebound_ratio']:.12f}",
            flush=True,
        )
        if not replay["profile"]["unimodal"]:
            witness = replay
            break

    def exact_score(item: dict) -> tuple[float, ...]:
        return tuple(float(value) for value in item["rebound_rank"])

    champion = max(exact, key=exact_score) if exact else None
    payload = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "construction": "A(x)^m + x E(x)^m from a rooted tree",
        "exact_integer_replay": True,
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "rooted_states_measured": len(rooted),
        "rooted_states_screened": len(selected),
        "floating_instances": screened,
        "exact_replays": len(exact),
        "champion": witness or champion,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": payload["status"],
                "rooted_states_measured": len(rooted),
                "floating_instances": screened,
                "champion_ratio": (
                    None
                    if champion is None
                    else champion["rebound"]["legal_rebound_ratio"]
                ),
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
