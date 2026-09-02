#!/usr/bin/env python3
"""Exact all-order token-sliding ratio bound for linear forests."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from prove_d1_spider_one_edge_decomposition_adversary import (
    path_independence,
    path_one_edge,
    product,
    add,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "linear_forest_token_ratio_bound_exact_adversary_20260829.json"
NOTE = ROOT / "LINEAR_FOREST_TOKEN_RATIO_BOUND_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def linear_forest_rows(lengths: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    factors = [path_independence(length) for length in lengths]
    independent = product(factors)
    one_edge = (0,)
    for index, length in enumerate(lengths):
        one_edge = add(
            one_edge,
            product(
                [
                    path_one_edge(value) if other == index else factors[other]
                    for other, value in enumerate(lengths)
                ]
            ),
        )
    return independent, one_edge


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for cuts in itertools.combinations(range(1, total), parts - 1):
        points = (0, *cuts, total)
        yield tuple(points[index + 1] - points[index] for index in range(parts))


def allocation_formula(lengths: tuple[int, ...], counts: tuple[int, ...]) -> tuple[int, Fraction]:
    weight = 1
    half_average_degree = Fraction(0)
    for vertices, selected in zip(lengths, counts):
        slack = vertices - 2 * selected + 1
        if slack < 0:
            return 0, Fraction(0)
        weight *= comb(slack + selected, selected)
        half_average_degree += Fraction(selected * slack, selected + slack)
    return weight, half_average_degree


def symbolic_parallel_sum() -> str:
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    expression = sp.factor(
        (a + c) * (b + d) / (a + b + c + d)
        - a * b / (a + b)
        - c * d / (c + d)
    )
    expected = (a * d - b * c) ** 2 / (
        (a + b) * (c + d) * (a + b + c + d)
    )
    assert sp.factor(expression - expected) == 0
    return str(expression)


def bounded_audit() -> dict[str, object]:
    forests = rank_checks = allocation_checks = coefficient_checks = 0
    minimum_slack = None
    stream = hashlib.sha256()
    for components in range(1, 5):
        for lengths in itertools.product(range(1, 6), repeat=components):
            independent, one_edge = linear_forest_rows(lengths)
            order = sum(lengths)
            forests += 1
            for rank in range(1, len(independent)):
                f = coefficient(independent, rank)
                if not f:
                    continue
                z = coefficient(one_edge, rank + 1)
                free = order - 2 * rank + components
                assert free >= 0
                cross = rank * f * free - z * (free + rank)
                assert cross >= 0
                minimum_slack = cross if minimum_slack is None else min(minimum_slack, cross)
                rank_checks += 1

                total_weight = 0
                total_edges = Fraction(0)
                for counts in compositions(rank + components, components):
                    # Convert the positive composition of rank+c into a
                    # weak composition of rank.
                    selected = tuple(value - 1 for value in counts)
                    weight, half_degree = allocation_formula(lengths, selected)
                    if not weight:
                        continue
                    assert sum(selected) == rank
                    allocation_free = sum(
                        vertices - 2 * value + 1
                        for vertices, value in zip(lengths, selected)
                    )
                    assert allocation_free == free
                    assert half_degree <= Fraction(rank * free, rank + free)
                    total_weight += weight
                    total_edges += weight * half_degree
                    allocation_checks += 1
                assert total_weight == f
                assert total_edges.denominator == 1
                assert total_edges.numerator == z
                coefficient_checks += len(independent) + len(one_edge)
                stream.update(
                    f"{lengths}:{rank}:{f}:{z}:{cross}\n".encode()
                )
    return {
        "linear_forests": forests,
        "supported_rank_checks": rank_checks,
        "token_allocation_checks": allocation_checks,
        "row_coefficient_references": coefficient_checks,
        "minimum_cleared_slack": minimum_slack,
        "ordered_rank_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(audit: dict[str, object]) -> str:
    return f"""# Linear-forest token-sliding ratio bound

Date: 2026-08-29

Let `L` be a disjoint union of `c>=1` nonempty paths on a total of `M`
vertices.  Let `f_j=i_j(L)` and let `z_j` count `(j+1)`-sets inducing
exactly one edge.  At every supported rank,

```text
q_j(L)=z_j/(j f_j) <= (M-2j+c)/(M-j+c).             (1)
```

To prove (1), condition on the numbers `k_i` of selected vertices in the
path components.  Put `g_i=n_i-2k_i+1`.  A hard-particle configuration on
that path is a weak composition of `g_i` into `k_i+1` gaps.  A specified gap
is positive with probability `g_i/(g_i+k_i)`, hence half the mean directed
token-slide degree in this allocation is

```text
sum_i k_i g_i/(k_i+g_i).                            (2)
```

The exact two-pair identity

```text
(a+c)(b+d)/(a+b+c+d)-ab/(a+b)-cd/(c+d)
=(ad-bc)^2/((a+b)(c+d)(a+b+c+d)) >=0               (3)
```

iterates to bound (2) by `jG/(j+G)`, where
`G=sum_i g_i=M-2j+c`.  Each one-edge set is exactly an undirected edge of
the token-sliding graph, so division by `j` gives (1).  The value of `G` is
the same in every token allocation, and averaging preserves the bound.

The exact replay checked {audit['linear_forests']} bounded linear forests,
{audit['supported_rank_checks']} supported ranks, and
{audit['token_allocation_checks']} token allocations directly against the
zero/one-edge polynomial rows.

This is an all-order structural theorem.  It does not by itself prove the
terminal Newton `m=0` sign, the full terminal-payment theorem, or Erdos
Problem 993.

Replay:

```powershell
python .\\prove_linear_forest_token_ratio_bound_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_LINEAR_FOREST_TOKEN_RATIO_BOUND
```
"""


def main() -> None:
    pair_identity = symbolic_parallel_sum()
    audit = bounded_audit()
    NOTE.write_text(note_text(audit), encoding="utf-8")
    payload = {
        "schema": "linear-forest-token-ratio-bound-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_LINEAR_FOREST_TOKEN_RATIO_BOUND",
        "theorem": "z_j/(j*f_j)<=(M-2*j+c)/(M-j+c)",
        "parallel_sum_identity": pair_identity,
        "bounded_exact_replay": audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the all-order linear-forest ratio bound only; no "
            "terminal Newton coefficient or Erdos 993 conclusion is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
