"""Exact replay for the Boundary-SM3 critical-last recurrence reduction.

All polynomial arithmetic is over Python integers.  Exhaustive and random
checks are bounded evidence; the algebraic identities in the companion note
are all-order statements.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import networkx as nx

from verify_boundary_sm3_mean_mode_general import (
    add,
    branch_state,
    coeff,
    forest_poly,
    mul,
    reciprocal_at,
    states_at_vertex,
)

Poly = tuple[int, ...]


def shift(p: Poly, amount: int = 1) -> Poly:
    return (0,) * amount + p


def defect_reciprocal(p: Poly, k: int) -> int:
    """L_k(p)=3p_k-p_(k+1)."""
    return 3 * coeff(p, k) - coeff(p, k + 1)


def defect_original(p: Poly, k: int) -> int:
    """D_k(p)=3p_k-p_(k-1)."""
    return 3 * coeff(p, k) - coeff(p, k - 1)


def tensor(states: list[tuple[Poly, Poly, bool, int]]) -> tuple[Poly, Poly, Poly]:
    p = (1,)
    e = (1,)
    for ei, zi, _, _ in states:
        p = mul(p, add(ei, zi))
        e = mul(e, ei)
    j = add(mul((1, 1), p), e)
    return p, e, j


def critical_last_record(
    states: list[tuple[Poly, Poly, bool, int]], last: int
) -> dict:
    ei, zi, critical, alpha = states[last]
    assert critical and ei[0] == 0
    previous = states[:last] + states[last + 1 :]
    p0, _, j0 = tensor(previous)
    beta0 = sum(state[3] for state in previous)
    beta = beta0 + alpha
    r = 2 * beta // 3
    a = beta - r

    payment1 = mul(ei, j0)
    payment2 = mul(mul((1, 1), zi), p0)
    full = add(payment1, payment2)
    q1_hat = payment1[1:]
    q1 = reciprocal_at(q1_hat, beta)
    q2 = reciprocal_at(payment2, beta)

    first = defect_reciprocal(payment1, a)
    second = defect_reciprocal(payment2, a)
    assert first == defect_original(q1, r + 1)
    assert second == defect_original(q2, r)
    assert first + second == defect_reciprocal(full, a)

    return {
        "beta": beta,
        "r": r,
        "a": a,
        "critical_alpha": alpha,
        "first_payment_D_r_plus_1_Q1": first,
        "second_payment_D_r_Q2": second,
        "boundary_margin": first + second,
        "P0": list(p0),
        "J0": list(j0),
        "critical_E": list(ei),
        "critical_Z": list(zi),
        "Q1": list(q1),
        "Q2": list(q2),
    }


def residue_shift_table() -> list[list[int]]:
    table = []
    for beta_residue in range(3):
        row = []
        for alpha_residue in range(3):
            beta = 12 + beta_residue
            alpha = 15 + alpha_residue
            old_a = (beta + 2) // 3
            new_a = (beta + alpha + 2) // 3
            m = alpha // 3
            row.append(new_a - old_a - m)
        table.append(row)
    assert table == [[0, 1, 1], [0, 0, 0], [0, 0, 1]]
    return table


def literal_no_gos() -> dict:
    # The order-seven tree has edges 01,03,04,05,06,12 and p=1.
    # Its two branch states are a noncritical rooted K_1,4 and a singleton.
    large = ((1, 4, 6, 4, 1), (0, 0, 0, 1), False, 4)
    singleton = ((0, 1), (1,), True, 1)
    states = [large, singleton]

    p0, _, j0 = tensor([singleton])
    term1 = mul(large[0], j0)
    term2 = mul(mul((1, 1), large[1]), p0)
    beta, a = 5, 2
    arbitrary_last = {
        "order": 7,
        "edges": [[0, 1], [0, 3], [0, 4], [0, 5], [0, 6], [1, 2]],
        "p": 1,
        "beta": beta,
        "a": a,
        "EJ_margin": defect_reciprocal(term1, a),
        "one_plus_x_ZP_margin": defect_reciprocal(term2, a),
        "total_margin": defect_reciprocal(add(term1, term2), a),
    }
    assert arbitrary_last["EJ_margin"] == 31
    assert arbitrary_last["one_plus_x_ZP_margin"] == -1
    assert arbitrary_last["total_margin"] == 30

    critical_last = critical_last_record(states, 1)
    assert critical_last["first_payment_D_r_plus_1_Q1"] == 11
    assert critical_last["second_payment_D_r_Q2"] == 19

    # Universal one-rank overshoot is false in residue beta=0 (mod 3).
    p5 = (1, 5, 6, 1)
    assert defect_original(p5, 3) == -3
    return {
        "arbitrary_last_two_payment_counterexample": arbitrary_last,
        "same_tree_critical_last": critical_last,
        "universal_overshoot_counterexample": {
            "forest": "P5",
            "independence_polynomial": list(p5),
            "beta": 3,
            "r_plus_1": 3,
            "D_3": -3,
        },
    }


def exhaustive(max_order: int) -> dict:
    out = {
        "max_order": max_order,
        "trees": 0,
        "vertex_setups": 0,
        "eligible_setups": 0,
        "critical_last_choices": 0,
        "first_negative_payment": None,
        "minimum_first_payment": None,
        "minimum_second_payment": None,
    }
    for n in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for tree_index, graph in enumerate(trees):
            out["trees"] += 1
            for p in graph:
                out["vertex_setups"] += 1
                states = states_at_vertex(graph, p)
                beta = sum(state[3] for state in states)
                critical_indices = [i for i, state in enumerate(states) if state[2]]
                if beta % 3 not in (1, 2) or not critical_indices:
                    continue
                out["eligible_setups"] += 1
                for last in critical_indices:
                    out["critical_last_choices"] += 1
                    item = critical_last_record(states, last)
                    tag = {"order": n, "tree_index": tree_index, "p": p, "last": last}
                    for key, target in (
                        ("first_payment_D_r_plus_1_Q1", "minimum_first_payment"),
                        ("second_payment_D_r_Q2", "minimum_second_payment"),
                    ):
                        candidate = {**tag, **item}
                        if out[target] is None or item[key] < out[target][key]:
                            out[target] = candidate
                    if (
                        min(
                            item["first_payment_D_r_plus_1_Q1"],
                            item["second_payment_D_r_Q2"],
                        )
                        < 0
                        and out["first_negative_payment"] is None
                    ):
                        out["first_negative_payment"] = {**tag, **item}
    return out


def rooted_catalog(max_order: int) -> tuple[list[tuple[Poly, Poly, bool, int]], list[dict]]:
    catalog_map: dict[tuple[Poly, Poly, bool, int], dict] = {}
    for n in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if n == 1 else nx.nonisomorphic_trees(n)
        for tree_index, graph in enumerate(trees):
            for root in graph:
                state = branch_state(graph, set(graph), root)
                catalog_map.setdefault(
                    state, {"order": n, "tree_index": tree_index, "root": root}
                )
    states = list(catalog_map)
    metadata = [catalog_map[state] for state in states]
    return states, metadata


def random_products(samples: int, catalog_max_order: int, seed: int) -> dict:
    catalog, metadata = rooted_catalog(catalog_max_order)
    critical = [i for i, state in enumerate(catalog) if state[2]]
    rng = random.Random(seed)
    out = {
        "samples_requested": samples,
        "samples_checked": 0,
        "catalog_max_order": catalog_max_order,
        "distinct_rooted_states": len(catalog),
        "critical_rooted_states": len(critical),
        "seed": seed,
        "first_negative_payment": None,
        "minimum_first_payment": None,
        "minimum_second_payment": None,
    }
    for sample in range(samples):
        count = rng.randint(1, 15)
        indices = [rng.randrange(len(catalog)) for _ in range(count - 1)]
        indices.append(rng.choice(critical))
        states = [catalog[index] for index in indices]
        beta = sum(state[3] for state in states)
        if beta % 3 not in (1, 2):
            continue
        out["samples_checked"] += 1
        item = critical_last_record(states, len(states) - 1)
        tag = {
            "sample": sample,
            "catalog_indices": indices,
            "critical_branch_source": metadata[indices[-1]],
        }
        for key, target in (
            ("first_payment_D_r_plus_1_Q1", "minimum_first_payment"),
            ("second_payment_D_r_Q2", "minimum_second_payment"),
        ):
            candidate = {**tag, **item}
            if out[target] is None or item[key] < out[target][key]:
                out[target] = candidate
        if (
            min(
                item["first_payment_D_r_plus_1_Q1"],
                item["second_payment_D_r_Q2"],
            )
            < 0
            and out["first_negative_payment"] is None
        ):
            out["first_negative_payment"] = {**tag, **item}
            break
    catalog_payload = [
        {
            "E": list(state[0]),
            "Z": list(state[1]),
            "critical": state[2],
            "alpha": state[3],
            **metadata[index],
        }
        for index, state in enumerate(catalog)
    ]
    out["catalog_sha256"] = hashlib.sha256(
        json.dumps(catalog_payload, separators=(",", ":")).encode("ascii")
    ).hexdigest()
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--catalog-max-order", type=int, default=9)
    parser.add_argument("--product-samples", type=int, default=50_000)
    parser.add_argument("--seed", type=int, default=993081321)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("boundary_sm3_critical_last_recurrence_exact_20260813.json"),
    )
    args = parser.parse_args()

    no_gos = literal_no_gos()
    exact = exhaustive(args.max_order)
    products = random_products(args.product_samples, args.catalog_max_order, args.seed)
    failure = exact["first_negative_payment"] or products["first_negative_payment"]
    result = {
        "status": (
            "CRITICAL_LAST_PAYMENT_COUNTEREXAMPLE_FOUND"
            if failure
            else "PASS_EXACT_REDUCTION_AND_BOUNDED_CRITICAL_LAST_AUDIT_NOT_PROOF"
        ),
        "all_order_identities": {
            "reciprocal_defect": "L_k(Q)=3q_k-q_(k+1)",
            "critical_last": "L_a(J)=D_(r+1)(Q1)+D_r(Q2)",
            "Q1": "C disjoint_union G0",
            "Q2": "D disjoint_union F0 disjoint_union K1",
            "remaining_target": "D_(floor(2 beta/3)+1)(Q1)>=0",
        },
        "residue_shift_extra_over_floor_alpha_over_3": residue_shift_table(),
        "literal_no_gos": no_gos,
        "exhaustive_trees": exact,
        "random_rooted_products": products,
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
