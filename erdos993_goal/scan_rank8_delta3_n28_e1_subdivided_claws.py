#!/usr/bin/env python3
"""Exact bounded Delta3 scan of every n=28 tree with degree surplus e=1.

Such a tree is a subdivided claw.  The scan uses closed path-product formulas
for c5,c6,c7 and the rooted H6,H7 profile, and independently replays them with
a small forest DP.  This is not a general tree census.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


MAX_RANK = 8
ORDER = 28
ARM_TOTAL = ORDER - 1


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def poly_add(left: list[int], right: list[int]) -> list[int]:
    return [left[index] + right[index] for index in range(MAX_RANK + 1)]


def poly_mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for i, left_value in enumerate(left):
        if not left_value:
            continue
        for j, right_value in enumerate(right[: MAX_RANK + 1 - i]):
            if right_value:
                out[i + j] += left_value * right_value
    return out


def poly_product(polynomials: list[list[int]]) -> list[int]:
    out = [1] + [0] * MAX_RANK
    for polynomial in polynomials:
        out = poly_mul(out, polynomial)
    return out


def shift(polynomial: list[int]) -> list[int]:
    return [0] + polynomial[:MAX_RANK]


def path_poly(order: int) -> list[int]:
    assert order >= 0
    return [
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank
        else 0
        for rank in range(MAX_RANK + 1)
    ]


def claw_poly(arms: tuple[int, int, int]) -> list[int]:
    excluded_center = poly_product([path_poly(length) for length in arms])
    included_center = shift(
        poly_product([path_poly(max(length - 1, 0)) for length in arms])
    )
    return poly_add(excluded_center, included_center)


def deletion_poly(
    arms: tuple[int, int, int], root_arm: int | None, distance: int | None
) -> list[int]:
    if root_arm is None:
        return poly_product([path_poly(length) for length in arms])
    assert distance is not None and 1 <= distance <= arms[root_arm]
    other = [index for index in range(3) if index != root_arm]
    prefix = distance - 1
    tail = arms[root_arm] - distance
    center_arms = (prefix, arms[other[0]], arms[other[1]])
    return poly_mul(path_poly(tail), claw_poly(center_arms))


def build_graph(arms: tuple[int, int, int]):
    adjacency = [[] for _ in range(ORDER)]
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
    assert next_vertex == ORDER
    return adjacency, metadata


def forest_poly(adjacency: list[list[int]], deleted: int | None = None) -> list[int]:
    seen = {deleted} if deleted is not None else set()

    def visit(vertex: int, parent: int):
        seen.add(vertex)
        excluded = [1] + [0] * MAX_RANK
        included = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == deleted:
                continue
            child_excluded, child_included = visit(neighbor, vertex)
            excluded = poly_mul(excluded, poly_add(child_excluded, child_included))
            included = poly_mul(included, child_excluded)
        return excluded, shift(included)

    components = []
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        components.append(poly_add(excluded, included))
    return poly_product(components)


def coefficient_evaluator():
    n = sp.symbols("n", integer=True, positive=True)
    expression = sp.expand(
        newton_coefficients(residual())[3].subs(
            {c[0]: 1, c[1]: n, c[2]: (n - 1) * (n - 2) / 2, n: ORDER}
        )
    )
    variables = (*c[3:9], h[6], h[7])
    polynomial = sp.Poly(expression, *variables, domain=sp.QQ)
    terms = polynomial.terms()

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


def main() -> None:
    here = Path(__file__).resolve().parent
    evaluate_delta3, delta3_terms = coefficient_evaluator()
    triples = []
    for first in range(1, ARM_TOTAL + 1):
        for second in range(first, ARM_TOTAL + 1):
            third = ARM_TOTAL - first - second
            if third < second:
                continue
            triples.append((first, second, third))

    total_placements = 0
    unique_profiles = set()
    sign_counts = {"negative": 0, "zero": 0, "positive": 0}
    rows_by_tau = {
        tau: {
            "cores": 0,
            "placements": 0,
            "minimum_Delta3": None,
            "minimum_witness": None,
            "minimum_H6": None,
            "maximum_H6": None,
            "minimum_H7": None,
            "maximum_H7": None,
            "minimum_lower_face_slack": None,
            "c5_min": None,
            "c5_max": None,
            "c6_min": None,
            "c6_max": None,
            "c7_min": None,
            "c7_max": None,
            "K_min": None,
            "K_max": None,
        }
        for tau in (1, 2, 3)
    }
    global_minimum = None
    global_witness = None

    for arms in triples:
        unit_arms = sum(length == 1 for length in arms)
        tau = 3 - unit_arms
        assert tau in (1, 2, 3)
        row = rows_by_tau[tau]
        row["cores"] += 1
        core = claw_poly(arms)
        adjacency, metadata = build_graph(arms)
        assert forest_poly(adjacency) == core

        # Motif identities specialized to e=1.
        assert core[3] == math.comb(26, 3) + 1
        assert core[4] == math.comb(25, 4) + 24 - tau
        for rank in (5, 6, 7):
            minimum_key = f"c{rank}_min"
            maximum_key = f"c{rank}_max"
            row[minimum_key] = core[rank] if row[minimum_key] is None else min(row[minimum_key], core[rank])
            row[maximum_key] = core[rank] if row[maximum_key] is None else max(row[maximum_key], core[rank])
        rank6_defect = sp.factor(
            12 * sp.Rational(core[6], core[5])
            - 14 * sp.Rational(core[7], core[6])
        )
        row["K_min"] = rank6_defect if row["K_min"] is None else min(row["K_min"], rank6_defect)
        row["K_max"] = rank6_defect if row["K_max"] is None else max(row["K_max"], rank6_defect)

        for root, (root_arm, distance) in enumerate(metadata):
            deleted = deletion_poly(arms, root_arm, distance)
            assert forest_poly(adjacency, root) == deleted
            total_placements += 1
            row["placements"] += 1
            unique_profiles.add((tuple(core[3:9]), deleted[6], deleted[7]))
            delta3 = evaluate_delta3((*core[3:9], deleted[6], deleted[7]))
            if delta3 < 0:
                sign_counts["negative"] += 1
            elif delta3 == 0:
                sign_counts["zero"] += 1
            else:
                sign_counts["positive"] += 1
            lower_face_slack = (
                (ORDER - 7) * (core[6] - deleted[6])
                - 6 * (core[7] - deleted[7])
            )
            assert lower_face_slack >= 0
            row["minimum_H6"] = deleted[6] if row["minimum_H6"] is None else min(row["minimum_H6"], deleted[6])
            row["maximum_H6"] = deleted[6] if row["maximum_H6"] is None else max(row["maximum_H6"], deleted[6])
            row["minimum_H7"] = deleted[7] if row["minimum_H7"] is None else min(row["minimum_H7"], deleted[7])
            row["maximum_H7"] = deleted[7] if row["maximum_H7"] is None else max(row["maximum_H7"], deleted[7])
            row["minimum_lower_face_slack"] = (
                lower_face_slack
                if row["minimum_lower_face_slack"] is None
                else min(row["minimum_lower_face_slack"], lower_face_slack)
            )
            witness = {
                "arms": list(arms),
                "tau": tau,
                "root": root,
                "root_arm": root_arm,
                "distance": distance,
                "c3_through_c8": core[3:9],
                "H6": deleted[6],
                "H7": deleted[7],
                "lower_face_slack": lower_face_slack,
                "rank6_K": str(rank6_defect),
                "Delta3": delta3,
            }
            if row["minimum_Delta3"] is None or delta3 < row["minimum_Delta3"]:
                row["minimum_Delta3"] = delta3
                row["minimum_witness"] = witness
            if global_minimum is None or delta3 < global_minimum:
                global_minimum = delta3
                global_witness = witness

    assert len(triples) == 61
    assert total_placements == 61 * ORDER
    status = (
        "PASS_EXACT_DELTA3_POSITIVE_ON_ALL_N28_E1_SUBDIVIDED_CLAW_ROOTS"
        if sign_counts["negative"] == 0 and sign_counts["zero"] == 0
        else "REAL_TREE_DELTA3_NONPOSITIVE_WITNESS_FOUND"
    )
    serialized_rows = {}
    for tau, row in rows_by_tau.items():
        serialized_rows[str(tau)] = {
            **row,
            "K_min": str(row["K_min"]),
            "K_max": str(row["K_max"]),
        }

    reduction = here / "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    representative = here / "rank8_delta3_k1_junction_n28_tightened_representative_exact_20260820.json"
    payload = {
        "status": status,
        "scope": (
            "all n=28 trees with e=sum C(deg-1,2)=1, equivalently every subdivided "
            "claw arm partition and every root; not a broad tree census"
        ),
        "closed_identities": {
            "core": (
                "I_A(x)=prod_i I(P_Li;x)+x*prod_i I(P_(Li-1);x), "
                "L1+L2+L3=27"
            ),
            "c_r": (
                "sum_(r1+r2+r3=r) prod_i C(Li-ri+1,ri) + "
                "sum_(r1+r2+r3=r-1) prod_i C(Li-ri,ri)"
            ),
            "tau": "3 minus the number of unit arms",
            "c3": "C(26,3)+1=2601",
            "c4": "C(25,4)+24-tau",
            "root_center": "H(x)=prod_i I(P_Li;x)",
            "root_on_arm": (
                "for arm j and distance d: H(x)=I(P_(Lj-d);x)*"
                "[I(P_(d-1))*I(P_Lk)*I(P_Ll)+x*I(P_max(d-2,0))*"
                "I(P_(Lk-1))*I(P_(Ll-1))]"
            ),
        },
        "bounded_counts": {
            "unlabeled_arm_partitions": len(triples),
            "root_placements_with_symmetry_repetitions": total_placements,
            "unique_coefficient_root_profiles": len(unique_profiles),
            "Delta3_expression_terms": delta3_terms,
        },
        "sign_counts": sign_counts,
        "global_minimum_Delta3": global_minimum,
        "global_minimum_witness": global_witness,
        "rows_by_tau": serialized_rows,
        "conclusion": (
            "The negative scalar k=1 junction points are excluded by literal c5,c6,c7 "
            "and rooted H6,H7 coupling throughout the complete e=1 family."
            if sign_counts["negative"] == 0
            else "A literal rooted tree has nonpositive Delta3; inspect the witness."
        ),
        "dependencies": {
            reduction.name: sha256(reduction),
            representative.name: sha256(representative),
        },
        "warning": "This proves only the n=28,e=1 family and is not an all-order Delta3 theorem.",
    }
    output = here / "rank8_delta3_n28_e1_subdivided_claws_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("COUNTS", len(triples), total_placements, len(unique_profiles), sign_counts)
    print("MINIMUM", global_minimum, global_witness)
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
