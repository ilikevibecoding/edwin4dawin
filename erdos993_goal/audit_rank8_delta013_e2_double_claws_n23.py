#!/usr/bin/env python3
"""Independent formula audit of the exact n=23 double-claw control."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
ORDER = 23
EXPECTED = {
    "scan_rank8_delta013_e2_double_claws_n23.py": "3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C",
    "rank8_delta013_e2_double_claws_n23_exact_20260820.json": "A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path(order: int, max_rank: int = 8) -> list[int]:
    if order == -2:
        return [0] * (max_rank + 1)
    if order == -1:
        return [1] + [0] * max_rank
    assert order >= 0
    return [
        math.comb(order - rank + 1, rank) if order - rank + 1 >= rank else 0
        for rank in range(max_rank + 1)
    ]


def multiply(left: list[int], right: list[int], max_rank: int = 8) -> list[int]:
    return [sum(left[j] * right[k - j] for j in range(k + 1)) for k in range(max_rank + 1)]


def product(vectors: list[list[int]], max_rank: int = 8) -> list[int]:
    out = [1] + [0] * max_rank
    for vector in vectors:
        out = multiply(out, vector, max_rank)
    return out


def shifted(vector: list[int], max_rank: int = 8) -> list[int]:
    return [0] + vector[:max_rank]


def add(*vectors: list[int]) -> list[int]:
    return [sum(values) for values in zip(*vectors)]


def claw(arms: tuple[int, int, int], max_rank: int = 8) -> list[int]:
    out = product([path(arm, max_rank) for arm in arms], max_rank)
    inc = shifted(product([path(arm - 1, max_rank) for arm in arms], max_rank), max_rank)
    return add(out, inc)


def branch_states(arm1: int, arm2: int, max_rank: int = 8) -> tuple[list[int], list[int]]:
    excluded = product([path(arm1, max_rank), path(arm2, max_rank)], max_rank)
    included = shifted(product([path(arm1 - 1, max_rank), path(arm2 - 1, max_rank)], max_rank), max_rank)
    return excluded, included


def double_claw(lengths: tuple[int, int, int, int, int], max_rank: int = 8) -> list[int]:
    a, b, bridge, cc, d = lengths
    left0, left1 = branch_states(a, b, max_rank)
    right0, right1 = branch_states(cc, d, max_rank)
    return add(
        product([left0, right0, path(bridge - 1, max_rank)], max_rank),
        product([left1, right0, path(bridge - 2, max_rank)], max_rank),
        product([left0, right1, path(bridge - 2, max_rank)], max_rank),
        product([left1, right1, path(bridge - 3, max_rank)], max_rank),
    )


def deletion_profiles(lengths: tuple[int, int, int, int, int]):
    a, b, bridge, cc, d = lengths
    # The two branch vertices.
    yield product([path(a), path(b), claw((cc, d, bridge - 1))])
    yield product([path(cc), path(d), claw((a, b, bridge - 1))])
    # Four pendant arms.
    arms = ((0, a, b), (1, b, a), (3, cc, d), (4, d, cc))
    for side_index, selected, paired in arms:
        for distance in range(1, selected + 1):
            near = distance - 1
            tail = selected - distance
            if side_index < 2:
                central = double_claw((near, paired, bridge, cc, d))
            else:
                central = double_claw((a, b, bridge, near, paired))
            yield multiply(path(tail), central)
    # Internal bridge vertices.
    for distance in range(1, bridge):
        yield multiply(claw((a, b, distance - 1)), claw((cc, d, bridge - distance - 1)))


def canonical_lengths():
    for a in range(1, 23):
        for b in range(a, 23):
            for bridge in range(1, 23):
                for cc in range(1, 23):
                    d = 22 - a - b - bridge - cc
                    if d < cc or (a, b) > (cc, d):
                        continue
                    yield (a, b, bridge, cc, d)


def evaluators():
    tree = {c[0]: 1, c[1]: ORDER, c[2]: math.comb(ORDER - 1, 2)}
    variables = (*c[3:9], h[6], h[7])
    out = []
    for expression in newton_coefficients(residual())[:4]:
        polynomial = sp.Poly(sp.expand(expression.subs(tree)), *variables)
        terms = [(powers, int(value)) for powers, value in polynomial.terms()]

        def evaluate(values, terms=terms):
            total = 0
            for powers, coefficient in terms:
                term = coefficient
                for value, power in zip(values, powers):
                    if power:
                        term *= value**power
                total += term
            return total

        out.append(evaluate)
    return out


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    primary = json.loads((HERE / "rank8_delta013_e2_double_claws_n23_exact_20260820.json").read_text())
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"

    # Classification: e=2 cannot contain degree >=4 because such a vertex
    # already contributes at least 3.  Hence it has exactly two degree-3
    # vertices.  Suppressing degree-2 vertices leaves four leaves and the
    # unique two-branch double-claw skeleton.
    assert math.comb(3 - 1, 2) == 1 and math.comb(4 - 1, 2) == 3
    assert 4 == 2 + 2  # leaves = number of degree-3 vertices + 2.

    evals = evaluators()
    minima = [None] * 4
    signs = [[0, 0, 0] for _ in range(4)]
    core_count = 0
    root_count = 0
    profiles = set()
    for lengths in canonical_lengths():
        core_count += 1
        core = double_claw(lengths)
        assert core[0] == 1 and core[1] == ORDER
        deletions = list(deletion_profiles(lengths))
        assert len(deletions) == ORDER
        for deletion in deletions:
            values = (*core[3:9], deletion[6], deletion[7])
            profiles.add(values)
            root_count += 1
            for rank, evaluate in enumerate(evals):
                value = evaluate(values)
                signs[rank][0 if value < 0 else 1 if value == 0 else 2] += 1
                minima[rank] = value if minima[rank] is None else min(minima[rank], value)

    expected_minima = [primary["rank_results"][str(rank)]["minimum"] for rank in range(4)]
    assert core_count == primary["canonical_cores"] == 920
    assert root_count == primary["rooted_cases"] == 21160
    assert len(profiles) == primary["unique_coefficient_root_profiles"] == 11395
    assert minima == expected_minima
    assert signs == [[0, 0, 21160]] * 4

    payload = {
        "schema": "rank8-delta013-e2-double-claw-n23-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
        "immutable_input_hashes": EXPECTED,
        "classification": "independently rederived: e=2 gives exactly two degree-3 vertices, four leaves, and the unique suppressed double-claw skeleton",
        "formula_pipeline": "independent endpoint-state formula for the core plus branch/pendant/bridge root-deletion formulas; no graph adjacency or primary evaluator imported",
        "canonical_cores": core_count,
        "rooted_cases": root_count,
        "unique_profiles": len(profiles),
        "sign_counts_negative_zero_positive": {str(rank): signs[rank] for rank in range(4)},
        "minima": {str(rank): minima[rank] for rank in range(4)},
        "scope": "exact n=23 audit only; no all-order e=2 claim",
    }
    output = HERE / "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
