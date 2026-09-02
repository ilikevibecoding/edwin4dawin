#!/usr/bin/env python3
"""Joint exact Delta2/Delta3 scan of the e=1 layer at n=23 and n=28."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from scan_rank8_delta3_n28_e1_subdivided_claws import (
    claw_poly,
    deletion_poly,
    forest_poly,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_graph(arms: tuple[int, int, int]):
    order = 1 + sum(arms)
    adjacency = [[] for _ in range(order)]
    metadata: list[tuple[int | None, int | None]] = [(None, None)]
    next_vertex = 1
    for arm_index, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            metadata.append((arm_index, distance))
            previous = vertex
    assert next_vertex == order
    return adjacency, metadata


def evaluator(rank: int, order: int):
    n = sp.symbols("n", integer=True, positive=True)
    expression = sp.expand(
        newton_coefficients(residual())[rank].subs(
            {c[0]: 1, c[1]: order, c[2]: (order - 1) * (order - 2) // 2}
        )
    )
    variables = (*c[3:9], h[6], h[7])
    terms = sp.Poly(expression, *variables, domain=sp.QQ).terms()

    def evaluate(values: tuple[int, ...]) -> int:
        total = sp.S.Zero
        for monomial, coefficient in terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                term *= value**exponent
            total += term
        assert total.q == 1
        return int(total)

    return evaluate, len(terms)


def scan_order(order: int):
    evaluators = {rank: evaluator(rank, order)[0] for rank in (2, 3)}
    term_counts = {rank: evaluator(rank, order)[1] for rank in (2, 3)}
    triples = []
    arm_total = order - 1
    for first in range(1, arm_total + 1):
        for second in range(first, arm_total + 1):
            third = arm_total - first - second
            if third >= second:
                triples.append((first, second, third))

    rows = {
        rank: {
            "negative": 0,
            "zero": 0,
            "positive": 0,
            "minimum": None,
            "witness": None,
        }
        for rank in (2, 3)
    }
    tau_bounds = {
        tau: {
            "cores": 0,
            "c5_min": None,
            "c5_max": None,
            "c6_min": None,
            "c6_max": None,
            "c7_min": None,
            "c7_max": None,
            "H6_min": None,
            "H6_max": None,
            "H7_min": None,
            "H7_max": None,
        }
        for tau in (1, 2, 3)
    }
    placements = 0
    profiles = set()
    for arms in triples:
        tau = 3 - sum(length == 1 for length in arms)
        assert tau in (1, 2, 3)
        bounds = tau_bounds[tau]
        bounds["cores"] += 1
        core = claw_poly(arms)
        assert core[3] == int(sp.binomial(order - 2, 3)) + 1
        assert core[4] == int(sp.binomial(order - 3, 4)) + (order - 4) - tau
        for coefficient_rank in (5, 6, 7):
            key_min = f"c{coefficient_rank}_min"
            key_max = f"c{coefficient_rank}_max"
            bounds[key_min] = core[coefficient_rank] if bounds[key_min] is None else min(bounds[key_min], core[coefficient_rank])
            bounds[key_max] = core[coefficient_rank] if bounds[key_max] is None else max(bounds[key_max], core[coefficient_rank])
        adjacency, metadata = build_graph(arms)
        assert forest_poly(adjacency) == core
        for root, (root_arm, distance) in enumerate(metadata):
            deleted = deletion_poly(arms, root_arm, distance)
            assert forest_poly(adjacency, root) == deleted
            placements += 1
            profiles.add((tuple(core[3:9]), deleted[6], deleted[7]))
            for Hrank in (6, 7):
                key_min = f"H{Hrank}_min"
                key_max = f"H{Hrank}_max"
                bounds[key_min] = deleted[Hrank] if bounds[key_min] is None else min(bounds[key_min], deleted[Hrank])
                bounds[key_max] = deleted[Hrank] if bounds[key_max] is None else max(bounds[key_max], deleted[Hrank])
            for rank, evaluate in evaluators.items():
                value = evaluate((*core[3:9], deleted[6], deleted[7]))
                label = "negative" if value < 0 else "zero" if value == 0 else "positive"
                rows[rank][label] += 1
                if rows[rank]["minimum"] is None or value < rows[rank]["minimum"]:
                    rows[rank]["minimum"] = value
                    rows[rank]["witness"] = {
                        "arms": list(arms),
                        "tau": tau,
                        "root": root,
                        "root_arm": root_arm,
                        "distance": distance,
                        "c3_through_c8": core[3:9],
                        "H6": deleted[6],
                        "H7": deleted[7],
                        f"Delta{rank}": value,
                    }

    return {
        "order": order,
        "arm_partitions": len(triples),
        "root_placements": placements,
        "unique_profiles": len(profiles),
        "expression_terms": {str(rank): count for rank, count in term_counts.items()},
        "Delta2": rows[2],
        "Delta3": rows[3],
        "bounds_by_tau": {str(tau): bounds for tau, bounds in tau_bounds.items()},
    }


def main() -> None:
    here = Path(__file__).resolve().parent
    order_rows = [scan_order(order) for order in (23, 28)]
    for row in order_rows:
        for rank in ("Delta2", "Delta3"):
            assert row[rank]["negative"] == 0
            assert row[rank]["zero"] == 0

    delta2_audit = here / "rank8_delta2_path_face_independent_audit_20260820.json"
    delta3_e1 = here / "rank8_delta3_n28_e1_subdivided_claws_exact_20260820.json"
    payload = {
        "status": "PASS_EXACT_DELTA2_DELTA3_POSITIVE_ON_E1_SUBDIVIDED_CLAWS_N23_N28",
        "scope": (
            "joint literal-tree replay for all degree-surplus-one subdivided claws and "
            "all roots at the two representative orders n=23 and n=28; not all orders"
        ),
        "method": (
            "closed arm-product identities for c5,c6,c7 and rooted H6,H7, "
            "independently checked by forest DP"
        ),
        "orders": order_rows,
        "conclusion": (
            "The relaxed e=1 negative points for both Delta2 and Delta3 disappear after "
            "literal higher-coefficient and rooted-deletion coupling."
        ),
        "dependencies": {
            delta2_audit.name: sha256(delta2_audit),
            delta3_e1.name: sha256(delta3_e1),
        },
        "warning": "This is a bounded two-order theorem, not an all-order nonpath result.",
    }
    output = here / "rank8_delta23_e1_subdivided_claws_n23_n28_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for row in order_rows:
        print(
            "ORDER",
            row["order"],
            row["arm_partitions"],
            row["root_placements"],
            "D2MIN",
            row["Delta2"]["minimum"],
            "D3MIN",
            row["Delta3"]["minimum"],
        )
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
