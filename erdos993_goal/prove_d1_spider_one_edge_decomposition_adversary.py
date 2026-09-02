#!/usr/bin/env python3
"""Exact zero/one-edge polynomial decomposition for a one-centre spider.

This is a structural input for the terminal Newton m=0 quantitative q-gap
lane.  It proves no sign for the terminal margin by itself.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path

from disprove_terminal_q3_m0_uniform_repaired_certificate_adversary import (
    literal_tree_rows,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_spider_one_edge_decomposition_exact_adversary_20260829.json"
NOTE = ROOT / "D1_SPIDER_ONE_EDGE_DECOMPOSITION_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    size = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    )


def shift(row: tuple[int, ...], amount: int) -> tuple[int, ...]:
    return (0,) * amount + row


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    return tuple(output)


def product(rows: list[tuple[int, ...]]) -> tuple[int, ...]:
    output = (1,)
    for row in rows:
        output = multiply(output, row)
    return output


def path_independence(vertices: int) -> tuple[int, ...]:
    """Independence polynomial of P_vertices; P_-1=P_0=1."""
    assert vertices >= -1
    if vertices <= 0:
        return (1,)
    return tuple(
        comb(vertices + 1 - rank, rank)
        for rank in range((vertices + 1) // 2 + 1)
    )


def path_one_edge(vertices: int) -> tuple[int, ...]:
    """Polynomial whose x^k coefficient counts k-sets with one edge."""
    assert vertices >= 0
    if vertices <= 1:
        return (0,)
    residual = (0,)
    for edge_left in range(1, vertices):
        term = multiply(
            path_independence(edge_left - 2),
            path_independence(vertices - edge_left - 2),
        )
        residual = add(residual, term)
    return shift(residual, 2)


def spider_formula(
    subdivisions: tuple[int, ...]
) -> tuple[tuple[int, ...], tuple[int, ...], dict[str, tuple[int, ...]]]:
    """Return I_F,Z_F and the five exact decomposition rows.

    An arm with subdivision count ell has L=ell+1 vertices away from the
    centre.  Z counts sets by their selected-set size, not terminal rank.
    """
    lengths = tuple(value + 1 for value in subdivisions)
    h_factors = [path_independence(length) for length in lengths]
    k_factors = [path_independence(length - 1) for length in lengths]
    H = product(h_factors)
    K = product(k_factors)
    ZH = (0,)
    ZK = (0,)
    J = (0,)
    for index, length in enumerate(lengths):
        ZH = add(
            ZH,
            product(
                [
                    path_one_edge(value) if other == index else h_factors[other]
                    for other, value in enumerate(lengths)
                ]
            ),
        )
        ZK = add(
            ZK,
            product(
                [
                    path_one_edge(value - 1)
                    if other == index
                    else k_factors[other]
                    for other, value in enumerate(lengths)
                ]
            ),
        )
        J = add(
            J,
            product(
                [
                    path_independence(value - 2)
                    if other == index
                    else k_factors[other]
                    for other, value in enumerate(lengths)
                ]
            ),
        )
    independence = add(H, shift(K, 1))
    one_edge = add(add(ZH, shift(ZK, 1)), shift(J, 2))
    return independence, one_edge, {"H": H, "K": K, "ZH": ZH, "ZK": ZK, "J": J}


def trim(row: tuple[int, ...] | list[int]) -> tuple[int, ...]:
    output = list(row)
    while len(output) > 1 and output[-1] == 0:
        output.pop()
    return tuple(output)


def audit_path_closed_form() -> dict[str, int]:
    coefficient_checks = gap_checks = 0
    for vertices in range(1, 81):
        independent = path_independence(vertices)
        one_edge = path_one_edge(vertices)
        for rank in range(vertices + 1):
            expected_i = (
                comb(vertices - rank + 1, rank)
                if 0 <= rank <= vertices - rank + 1
                else 0
            )
            actual_i = independent[rank] if rank < len(independent) else 0
            assert actual_i == expected_i
            coefficient_checks += 1
        for rank in range(1, vertices + 1):
            expected_z = (
                rank * comb(vertices - rank, rank)
                if 0 <= rank <= vertices - rank
                else 0
            )
            actual_z = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
            assert actual_z == expected_z
            coefficient_checks += 1
        for rank in range(3, vertices + 1):
            f3 = independent[3] if len(independent) > 3 else 0
            fj = independent[rank] if rank < len(independent) else 0
            if not (f3 and fj):
                continue
            z3 = one_edge[4] if len(one_edge) > 4 else 0
            zj = one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
            cross = rank * z3 * fj - 3 * f3 * zj
            # Clearing the two explicit path ratios gives this exact factor.
            expected = (
                3
                * rank
                * f3
                * fj
                * (rank - 3)
                * (vertices + 1)
                // ((vertices - 2) * (vertices - rank + 1))
            )
            assert cross == expected
            gap_checks += 1
    return {
        "orders": 80,
        "coefficient_checks": coefficient_checks,
        "q3_gap_cross_checks": gap_checks,
    }


def audit_literal_spiders() -> dict[str, int]:
    allocations = coefficient_checks = decomposition_checks = 0
    stream = hashlib.sha256()
    for arms in range(1, 6):
        for subdivisions in itertools.product(range(4), repeat=arms):
            formula_i, formula_z, pieces = spider_formula(subdivisions)
            maximum = 1 + sum(value + 1 for value in subdivisions)
            literal_i, _, literal_z, order = literal_tree_rows(subdivisions, maximum)
            assert order == maximum
            assert trim(formula_i) == trim(literal_i)
            assert trim(formula_z) == trim(literal_z)
            assert trim(formula_i) == trim(add(pieces["H"], shift(pieces["K"], 1)))
            assert trim(formula_z) == trim(
                add(add(pieces["ZH"], shift(pieces["ZK"], 1)), shift(pieces["J"], 2))
            )
            allocations += 1
            coefficient_checks += len(literal_i) + len(literal_z)
            decomposition_checks += 2
            stream.update((str(subdivisions) + ":" + str(trim(formula_i)) + ":" + str(trim(formula_z)) + "\n").encode())
    return {
        "literal_allocations": allocations,
        "literal_coefficient_checks": coefficient_checks,
        "decomposition_checks": decomposition_checks,
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(path_audit: dict[str, int], literal_audit: dict[str, int]) -> str:
    return f"""# One-centre spider one-edge decomposition

Date: 2026-08-29

For a spider with centre `c` and arm subdivision counts `ell_i>=0`, put
`L_i=ell_i+1`.  Let `P_n` be the independence polynomial of the path on
`n` vertices, with the boundary convention `P_-1=P_0=1`.  Define

```text
H=product_i P_(L_i),
K=product_i P_(L_i-1),
Z_H=sum_i Z(P_(L_i)) product_(k!=i) P_(L_k),
Z_K=sum_i Z(P_(L_i-1)) product_(k!=i) P_(L_k-1),
J=sum_i P_(L_i-2) product_(k!=i) P_(L_k-1).
```

Here `Z(Q)` counts selected sets inducing exactly one edge by selected-set
size.  Splitting by whether the centre is absent, present with no incident
selected edge, or present with its unique incident selected edge gives the
all-order identities

```text
I_F=H+xK,
Z_F=Z_H+x Z_K+x^2 J.                              (1)
```

For a path on `n` vertices, direct block compression gives

```text
i_r=C(n-r+1,r),
z_r=r C(n-r,r),
q_r=(n-2r+1)/(n-r+1),
q_3-q_r=(r-3)(n+1)/((n-2)(n-r+1)).                (2)
```

The producer checked (2) through path order {path_audit['orders']} in
{path_audit['coefficient_checks']} coefficient checks and
{path_audit['q3_gap_cross_checks']} exact cleared-gap checks.  It also
reconstructed (1) against an independent integer tree DP on
{literal_audit['literal_allocations']} small spider allocations, with
{literal_audit['literal_coefficient_checks']} literal coefficient checks.

This is a structural identity and a quantitative path lemma only.  It does
not prove a positive lower bound for `q3-q_j` on a multi-arm spider, the
terminal Newton `m=0` coefficient, or Erdos Problem 993.

Replay:

```powershell
python .\\prove_d1_spider_one_edge_decomposition_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_ONE_EDGE_DECOMPOSITION
```
"""


def main() -> None:
    path_audit = audit_path_closed_form()
    literal_audit = audit_literal_spiders()
    NOTE.write_text(note_text(path_audit, literal_audit), encoding="utf-8")
    payload = {
        "schema": "d1-spider-one-edge-decomposition-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_SPIDER_ONE_EDGE_DECOMPOSITION",
        "theorem": {
            "independence": "I_F=H+x*K",
            "one_edge": "Z_F=Z_H+x*Z_K+x^2*J",
            "path_gap": "q3(P_n)-q_r(P_n)=(r-3)(n+1)/((n-2)(n-r+1))",
            "index_guard": "z_r=[x^(r+1)]Z_F",
        },
        "path_audit": path_audit,
        "literal_spider_audit": literal_audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "Structural identity and path quantitative gap only; no multi-arm "
            "q-gap lower bound or terminal m=0 sign is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("path_audit", path_audit)
    print("literal_spider_audit", literal_audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
