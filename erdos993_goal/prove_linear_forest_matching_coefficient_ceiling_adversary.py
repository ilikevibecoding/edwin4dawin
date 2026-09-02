#!/usr/bin/env python3
"""All-order coefficient ceiling for a linear forest via a forced matching."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "linear_forest_matching_coefficient_ceiling_exact_adversary_20260829.json"
NOTE = ROOT / "LINEAR_FOREST_MATCHING_COEFFICIENT_CEILING_2026-08-29.md"


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


def path(vertices: int) -> list[int]:
    return [C(vertices + 1 - rank, rank) for rank in range((vertices + 1) // 2 + 1)]


def linear_forest(lengths: tuple[int, ...]) -> list[int]:
    row = [1]
    for vertices in lengths:
        row = multiply(row, path(vertices))
    return row


def matching_ceiling(T: int, components: int) -> tuple[int, list[int]]:
    matching = (T - components + 1) // 2
    row = [1]
    for _ in range(matching):
        row = multiply(row, [1, 2])
    for _ in range(T - 2 * matching):
        row = multiply(row, [1, 1])
    return matching, row


def bounded_audit() -> dict[str, object]:
    forests = ranks = strict = 0
    minimum_slack = None
    stream = hashlib.sha256()
    for components in range(1, 6):
        for lengths in itertools.product(range(1, 7), repeat=components):
            T = sum(lengths)
            actual_matching = sum(value // 2 for value in lengths)
            forced, ceiling = matching_ceiling(T, components)
            assert actual_matching >= forced
            actual = linear_forest(lengths)
            maximum = max(len(actual), len(ceiling))
            for rank in range(maximum):
                left = actual[rank] if rank < len(actual) else 0
                right = ceiling[rank] if rank < len(ceiling) else 0
                slack = right - left
                assert slack >= 0
                minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                strict += slack > 0
                stream.update(f"{lengths}:{rank}:{left}:{right}:{slack}\n".encode())
                ranks += 1
            forests += 1
    return {
        "literal_linear_forests": forests,
        "coefficient_checks": ranks,
        "strict_ceiling_checks": strict,
        "minimum_ceiling_minus_actual": minimum_slack,
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(audit: dict[str, object]) -> str:
    return f"""# Linear-forest coefficient ceiling from a forced matching

Date: 2026-08-29

Let a linear forest have `T` vertices and `c` nonempty path components of
orders `n_i`.  Its matching number satisfies

```text
sum floor(n_i/2) >= ceil((T-c)/2)=m.                (1)
```

Choose any `m` disjoint edges.  Every independent set of the full forest is
an independent set of the spanning subgraph consisting of those `m` edges
and `T-2m` isolated vertices.  Hence, coefficientwise,

```text
I_F(x) <= (1+2x)^m (1+x)^(T-2m).                   (2)
```

This applies in particular to every d=1 deep-tail row `K` with `c=Y`.
The bounded replay checked {audit['literal_linear_forests']} literal forests
and {audit['coefficient_checks']} coefficients.

This is only a linear-forest row ceiling; terminal-payment signs and Erdos
Problem 993 remain separate.
"""


def main() -> None:
    audit = bounded_audit()
    NOTE.write_text(note_text(audit), encoding="utf-8")
    payload = {
        "schema": "linear-forest-matching-coefficient-ceiling-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_LINEAR_FOREST_MATCHING_COEFFICIENT_CEILING",
        "theorem": {
            "forced_matching": "nu(F)>=ceil((T-c)/2)",
            "coefficient_ceiling": "I_F <=coeff (1+2x)^m(1+x)^(T-2m)",
            "scope": "all linear forests, every coefficient rank",
        },
        "bounded_literal_audit": audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This is a row ceiling only, not a terminal-payment sign theorem "
            "or proof of Erdos Problem 993."
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
