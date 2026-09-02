#!/usr/bin/env python3
"""Exact obstruction to the proposed global-ceiling K_Z=Zmax relaxation.

This disproves only a candidate lower-bound route.  It is not a negative
terminal-m0 cell and not a counterexample to Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_kz_global_ceiling_zmax_obstruction_exact_adversary_20260829.json"
NOTE = ROOT / "D1_KZ_GLOBAL_CEILING_ZMAX_OBSTRUCTION_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def multiply(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    return output


def power(row: list[int], exponent: int) -> list[int]:
    output = [1]
    for _ in range(exponent):
        output = multiply(output, row)
    return output


def path(vertices: int) -> list[int]:
    if vertices == -1:
        return [1]
    assert vertices >= 0
    return [C(vertices + 1 - k, k) for k in range((vertices + 1) // 2 + 1)]


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def tangent_ratio(T: int, target_rank: int) -> Fraction:
    vertices = max(0, T - 8)
    residual_rank = target_rank - 4
    denominator = C(vertices + 1 - residual_rank, residual_rank)
    numerator = C(vertices - residual_rank, residual_rank + 1)
    return Fraction(numerator, denominator) if denominator else Fraction(0)


def residual_row(T: int, Y: int, Z: int) -> tuple[int, list[int]]:
    L = T - Y - Z + 2
    assert L >= 3
    row = power([1, 1], Y - Z - 1)
    row = multiply(row, power([1, 2], Z - 1))
    row = multiply(row, path(L - 4))
    return L, row


def exact_obstruction() -> dict[str, object]:
    T, Y, Z, rank = 9, 2, 1, 5
    L, D = residual_row(T, Y, Z)
    rho = tangent_ratio(T, rank - 1)
    previous = coefficient(D, rank - 4)
    current = coefficient(D, rank - 3)
    comparison = Fraction(current) - rho * previous
    assert (L, D, rho, previous, current, comparison) == (
        8,
        [1, 4, 3],
        Fraction(1),
        4,
        3,
        Fraction(-1),
    )
    return {
        "parameters": {"T": T, "Y": Y, "Z": Z, "rank_j": rank, "L": L},
        "D_row": D,
        "rho": str(rho),
        "D_(j-4)": previous,
        "D_(j-3)": current,
        "D_(j-3)-rho*D_(j-4)": str(comparison),
        "consequence": (
            "For R_Z=K_Z[j]-rho*K_Z[j-1], the exact one-step identity gives "
            "R_(Z+1)-R_Z=1>0, so R_Z is not uniformly decreasing and Zmax "
            "cannot be selected as a rigorous global lower endpoint."
        ),
    }


def bounded_audit() -> dict[str, object]:
    checks = negatives = 0
    first = []
    minimum = None
    stream = hashlib.sha256()
    for T in range(2, 51):
        for Y in range(2, T):
            for Z in range(1, min(Y, T - Y)):
                L, D = residual_row(T, Y, Z)
                for rank in range(4, min(30, T + 1) + 1):
                    rho = tangent_ratio(T, rank - 1)
                    value = Fraction(coefficient(D, rank - 3)) - rho * coefficient(D, rank - 4)
                    record = (value, T, Y, Z, L, rank, rho)
                    minimum = record if minimum is None else min(minimum, record)
                    if value < 0:
                        negatives += 1
                        if len(first) < 20:
                            first.append(record)
                    stream.update(f"{T}:{Y}:{Z}:{L}:{rank}:{rho}:{value}\n".encode())
                    checks += 1
    assert checks == 245_489
    assert negatives == 39_201
    assert first[0] == (Fraction(-1), 9, 2, 1, 8, 5, Fraction(1))
    return {
        "box": {"T": [2, 50], "rank": [4, 30]},
        "exact_comparisons": checks,
        "negative_comparisons": negatives,
        "minimum": [str(value) for value in minimum],
        "first_negative": [[str(value) for value in row] for row in first],
        "ordered_comparison_stream_sha256": stream.hexdigest().upper(),
    }


def note_text() -> str:
    return """# Obstruction to the d=1 global-ceiling Zmax relaxation

Date: 2026-08-29

The exact one-step identity

```text
K_(Z+1)-K_Z=-x^3 D_Z
```

is valid, but the proposed comparison `D_Z[j-3]/D_Z[j-4]>=rho` is false.
At `(T,Y,Z,j)=(9,2,1,5)`, `D_Z=P4=(1,4,3)` and `rho=1`, so the cleared
comparison is `3-4=-1`.  Consequently the residual increases at this step;
replacing the Z-dependent ceiling by a global ceiling and selecting `Zmax`
does not give a valid lower bound.

This is an obstruction to that relaxation only.  The actual terminal margin
is not negative, and no theorem or conjecture counterexample is claimed.
"""


def main() -> None:
    obstruction = exact_obstruction()
    audit = bounded_audit()
    NOTE.write_text(note_text(), encoding="utf-8")
    payload = {
        "schema": "d1-kz-global-ceiling-zmax-obstruction-exact-adversary-v1",
        "status": "FAIL_EXACT_D1_KZ_GLOBAL_CEILING_ZMAX_RELAXATION",
        "exact_smallest_obstruction": obstruction,
        "bounded_audit": audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This falsifies only the proposed Zmax relaxation. It is not a "
            "negative terminal-m0 cell or a counterexample to Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("obstruction", obstruction)
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
