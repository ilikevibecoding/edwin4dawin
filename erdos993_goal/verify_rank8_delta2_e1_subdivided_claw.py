#!/usr/bin/env python3
"""Exact first-nonpath (degree-surplus e=1) Delta2 analysis.

For a tree, e=sum_v binom(deg(v)-1,2)=1 is equivalent to one vertex of
degree three and all other degrees at most two.  Thus the tree is a
subdivided claw with three positive arm lengths.  This script derives its
independence coefficients and every rooted-deletion orbit directly from the
arm lengths, then exhausts the small exact n=23 layer without graph census.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_counts(order: int, max_rank: int = 8) -> list[int]:
    """Independence coefficients of P_order; P_-1 is the empty factor."""
    if order == -1:
        return [1] + [0] * max_rank
    if order < -1:
        raise ValueError(order)
    out = []
    for rank in range(max_rank + 1):
        top = order - rank + 1
        out.append(math.comb(top, rank) if top >= rank >= 0 else 0)
    return out


def multiply(left: list[int], right: list[int], max_rank: int = 8) -> list[int]:
    out = [0] * (max_rank + 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right[: max_rank + 1 - i]):
            out[i + j] += x * y
    return out


def product(factors: list[list[int]], max_rank: int = 8) -> list[int]:
    out = [1] + [0] * max_rank
    for factor in factors:
        out = multiply(out, factor, max_rank)
    return out


def claw_counts(arms: tuple[int, int, int], max_rank: int = 8) -> list[int]:
    """I(C(a,b,c))=prod I(P_a)+x prod I(P_{a-1})."""
    if any(arm < 0 for arm in arms):
        raise ValueError(arms)
    center_out = product([path_counts(arm, max_rank) for arm in arms], max_rank)
    center_in = product([path_counts(arm - 1, max_rank) for arm in arms], max_rank)
    return [center_out[0]] + [center_out[k] + center_in[k - 1] for k in range(1, max_rank + 1)]


def deletion_counts_center(arms: tuple[int, int, int], max_rank: int = 8) -> list[int]:
    return product([path_counts(arm, max_rank) for arm in arms], max_rank)


def deletion_counts_arm(
    arms: tuple[int, int, int], arm_index: int, distance: int, max_rank: int = 8
) -> list[int]:
    """Delete the vertex at center-distance distance on one selected arm."""
    selected = arms[arm_index]
    if not (1 <= distance <= selected):
        raise ValueError((arms, arm_index, distance))
    other = [arms[j] for j in range(3) if j != arm_index]
    tail = selected - distance
    near = distance - 1
    central_component = claw_counts((near, other[0], other[1]), max_rank)
    return multiply(path_counts(tail, max_rank), central_component, max_rank)


def delta2_evaluator():
    expression = sp.expand(newton_coefficients(residual())[2])
    variables = (*c[:9], h[6], h[7])
    polynomial = sp.Poly(expression, *variables)
    assert all(value.q == 1 for value in polynomial.coeffs())
    terms = [(powers, int(value)) for powers, value in polynomial.terms()]

    def evaluate(core: list[int], deletion: list[int]) -> int:
        values = (*core[:9], deletion[6], deletion[7])
        total = 0
        for powers, coefficient in terms:
            monomial = coefficient
            for value, power in zip(values, powers):
                if power:
                    monomial *= value**power
            total += monomial
        return total

    return evaluate, len(terms), expression


def n23_scan(evaluate):
    order = 23
    arm_sum = order - 1
    rows = []
    minimum = None
    minimizers = []
    negatives = []
    triples = 0
    rooted_orbits = 0
    all_placements_with_duplicates = 0
    tau_counts = {1: 0, 2: 0, 3: 0}

    for a in range(1, arm_sum + 1):
        for b in range(a, arm_sum + 1):
            cc = arm_sum - a - b
            if cc < b:
                continue
            arms = (a, b, cc)
            triples += 1
            tau = 3 - sum(arm == 1 for arm in arms)
            assert tau in tau_counts
            tau_counts[tau] += 1
            core = claw_counts(arms)
            assert core[0] == 1 and core[1] == order
            assert core[2] == math.comb(order - 1, 2)
            assert core[3] == math.comb(order - 2, 3) + 1
            assert core[4] == math.comb(order - 3, 4) + (order - 4) - tau

            placements = [("center", 0, 0, deletion_counts_center(arms))]
            distinct_lengths = sorted(set(arms))
            for arm_length in distinct_lengths:
                arm_index = arms.index(arm_length)
                for distance in range(1, arm_length + 1):
                    placements.append(
                        (
                            "arm",
                            arm_length,
                            distance,
                            deletion_counts_arm(arms, arm_index, distance),
                        )
                    )
            rooted_orbits += len(placements)
            all_placements_with_duplicates += 1 + sum(arms)

            local_min = None
            local_witness = None
            for kind, arm_length, distance, deletion in placements:
                value = evaluate(core, deletion)
                witness = {
                    "arms": list(arms),
                    "root_kind": kind,
                    "root_arm_length": arm_length,
                    "root_distance_from_center": distance,
                    "h6": deletion[6],
                    "h7": deletion[7],
                    "Delta2": str(value),
                }
                if local_min is None or value < local_min:
                    local_min, local_witness = value, witness
                if minimum is None or value < minimum:
                    minimum = value
                    minimizers = [witness]
                elif value == minimum:
                    minimizers.append(witness)
                if value < 0:
                    negatives.append(witness)
            rows.append(
                {
                    "arms": list(arms),
                    "tau": tau,
                    "root_orbits": len(placements),
                    "minimum_Delta2": str(local_min),
                    "minimum_root": {
                        key: local_witness[key]
                        for key in ("root_kind", "root_arm_length", "root_distance_from_center")
                    },
                }
            )

    assert triples == len(rows)
    assert minimum is not None
    return {
        "order": order,
        "unordered_arm_triples": triples,
        "rooted_orbits": rooted_orbits,
        "literal_root_placements_counting_equal_arm_duplicates": all_placements_with_duplicates,
        "tau_triple_counts": {str(key): value for key, value in tau_counts.items()},
        "negative_rooted_orbits": len(negatives),
        "minimum_Delta2": str(minimum),
        "minimum_witnesses": minimizers,
        "per_arm_triple": rows,
    }


def main() -> None:
    evaluate, term_count, expression = delta2_evaluator()
    scan = n23_scan(evaluate)
    assert scan["negative_rooted_orbits"] == 0
    assert int(scan["minimum_Delta2"]) > 0

    report = {
        "schema": "rank8-delta2-e1-subdivided-claw-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E1_N23_ALL_ROOTED_ORBITS",
        "scope": "exact n=23 first-nonpath layer only; not an all-order Delta2 theorem",
        "classification": {
            "degree_surplus": "e=sum_v binom(deg(v)-1,2)=1",
            "unrooted_shape": "one degree-3 center with three positive path arms (a,b,c), a+b+c=n-1",
            "unrooted_orbits": "sort a<=b<=c",
            "rooted_orbits": "center, or a distinct arm length together with distance 1..arm_length from the center",
        },
        "exact_independence_parameterization": {
            "path": "[x^k] I(P_s)=binom(s-k+1,k)",
            "core": "I(C(a,b,c))=I(P_a)I(P_b)I(P_c)+x I(P_(a-1))I(P_(b-1))I(P_(c-1))",
            "root_center": "I(C-q)=I(P_a)I(P_b)I(P_c)",
            "root_on_arm": "for selected arm a and center-distance d, I(C-q)=I(P_(a-d))*I(C(d-1,b,c)); P_-1 is the empty factor",
            "derived_coefficients": "c5,c6,c7 are ranks 5,6,7 of the core formula; h6,h7 are ranks 6,7 of the appropriate deletion formula",
        },
        "delta2_polynomial_terms": term_count,
        "delta2_expression_sha256": hashlib.sha256(str(expression).encode("utf-8")).hexdigest().upper(),
        "n23": scan,
        "next_step": "seek an all-order cell certificate after splitting short arm/tail segments (orders 0..5) from symbolic long segments; no relaxed negative is a tree counterexample",
    }
    output = HERE / "rank8_delta2_e1_subdivided_claw_exact_20260820.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("triples", scan["unordered_arm_triples"])
    print("rooted_orbits", scan["rooted_orbits"])
    print("minimum_Delta2", scan["minimum_Delta2"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
