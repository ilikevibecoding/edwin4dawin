#!/usr/bin/env python3
"""Coefficientwise one-long-component ceiling for linear forests."""

from __future__ import annotations

import hashlib
import json
import os
from functools import lru_cache
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "linear_forest_one_long_componentwise_ceiling_exact_adversary_20260829.json"
NOTE = ROOT / "LINEAR_FOREST_ONE_LONG_COMPONENTWISE_CEILING_2026-08-29.md"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolve(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return tuple(out)


@lru_cache(maxsize=None)
def path_row(vertices: int) -> tuple[int, ...]:
    if vertices == -1:
        return (1,)
    assert vertices >= 0
    return tuple(C(vertices + 1 - rank, rank) for rank in range(vertices + 1))


def subtract(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        (left[i] if i < len(left) else 0) - (right[i] if i < len(right) else 0)
        for i in range(max(len(left), len(right)))
    )


def shift(row: tuple[int, ...], amount: int) -> tuple[int, ...]:
    return (0,) * amount + row


def partitions(total: int, parts: int, minimum: int = 1):
    if parts == 0:
        if total == 0:
            yield ()
        return
    for first in range(minimum, total // parts + 1):
        for tail in partitions(total - first, parts - 1, first):
            yield (first,) + tail


def forest_row(edge_lengths: tuple[int, ...], isolates: int) -> tuple[int, ...]:
    row = (1,)
    for edge_length in edge_lengths:
        row = convolve(row, path_row(edge_length + 1))
    for _ in range(isolates):
        row = convolve(row, path_row(1))
    return row


def merge_identity_audit() -> dict[str, object]:
    checks = 0
    minimum_coefficient = None
    stream = hashlib.sha256()
    for a in range(2, 41):
        for b in range(2, 41):
            lhs = subtract(
                convolve(path_row(a + b - 1), path_row(1)),
                convolve(path_row(a), path_row(b)),
            )
            rhs = shift(convolve(path_row(a - 3), path_row(b - 3)), 3)
            length = max(len(lhs), len(rhs))
            lhs = lhs + (0,) * (length - len(lhs))
            rhs = rhs + (0,) * (length - len(rhs))
            assert lhs == rhs
            minimum_coefficient = (
                min(rhs)
                if minimum_coefficient is None
                else min(minimum_coefficient, min(rhs))
            )
            stream.update(f"{a}:{b}:{lhs}\n".encode())
            checks += 1
    # The identity is all-order by double recurrence.  Both sides obey the
    # path recurrence in a and b.  The four displayed recurrence bases are
    # checked literally here, including P_-1=1.
    bases = {}
    for a, b in ((2, 2), (2, 3), (3, 2), (3, 3)):
        lhs = subtract(
            convolve(path_row(a + b - 1), path_row(1)),
            convolve(path_row(a), path_row(b)),
        )
        rhs = shift(convolve(path_row(a - 3), path_row(b - 3)), 3)
        length = max(len(lhs), len(rhs))
        lhs = lhs + (0,) * (length - len(lhs))
        rhs = rhs + (0,) * (length - len(rhs))
        assert lhs == rhs
        bases[f"({a},{b})"] = list(lhs)
    return {
        "identity": "P_(a+b-1)P_1-P_aP_b=x^3 P_(a-3)P_(b-3)",
        "domain": "a,b>=2 with P_-1=1",
        "double_recurrence": "both sides satisfy X_n=X_(n-1)+xX_(n-2) in each index",
        "recurrence_bases": bases,
        "finite_formula_replays": checks,
        "minimum_rhs_coefficient": minimum_coefficient,
        "ordered_identity_stream_sha256": stream.hexdigest().upper(),
    }


def bounded_literal_audit() -> dict[str, object]:
    checks = coefficient_checks = 0
    minimum_slack = None
    stream = hashlib.sha256()
    for T in range(1, 31):
        for Y in range(1, T + 1):
            E = T - Y
            ceiling = forest_row((E,), Y - 1) if E else forest_row((), Y)
            if E == 0:
                candidates = [((), Y)]
            else:
                candidates = []
                for Z in range(1, min(Y, E) + 1):
                    candidates.extend((parts, Y - Z) for parts in partitions(E, Z))
            for parts, isolates in candidates:
                actual = forest_row(parts, isolates)
                length = max(len(actual), len(ceiling))
                padded_actual = actual + (0,) * (length - len(actual))
                padded_ceiling = ceiling + (0,) * (length - len(ceiling))
                slacks = tuple(b - a for a, b in zip(padded_actual, padded_ceiling))
                assert all(slack >= 0 for slack in slacks)
                minimum_slack = (
                    min(slacks)
                    if minimum_slack is None
                    else min(minimum_slack, min(slacks))
                )
                coefficient_checks += length
                stream.update(f"{T}:{Y}:{parts}:{slacks}\n".encode())
                checks += 1
    return {
        "box": {"T": [1, 30], "all_component_counts_and_ranks": True},
        "exact_path_multisets": checks,
        "coefficient_checks": coefficient_checks,
        "minimum_coefficientwise_slack": minimum_slack,
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(literal: dict[str, object]) -> str:
    return f"""# One-long-component coefficientwise ceiling for linear forests

Date: 2026-08-29

Write `P_n` for the independence polynomial of the n-vertex path, with the
boundary convention `P_-1=1`.  For every `a,b>=2`, the path recurrence gives

```text
P_(a+b-1) P_1 - P_a P_b = x^3 P_(a-3) P_(b-3).       (1)
```

Both sides of (1) satisfy `X_n=X_(n-1)+xX_(n-2)` in each unbounded index;
the four bases `(a,b) in {{2,3}}^2` are exact.  Hence (1) is all-order and
its right side is coefficientwise nonnegative.

Let `K` be any linear forest on `T` vertices with `Y` components.  If two
components are nontrivial paths of orders `a,b`, replace them by a path of
order `a+b-1` and one isolated vertex.  This preserves both `T` and `Y`, and
(1), multiplied by all untouched component rows, says every coefficient can
only increase.  Repeating leaves at most one nontrivial component.  Thus

```text
I(K;x) <=coeff (1+x)^(Y-1) P_(T-Y+1).                 (2)
```

The edgeless case is equality.  Equation (2) is simultaneous in every rank;
it upgrades the previously frozen rank-four ceiling used for `d=1,j=5`.
The bounded audit checks {literal['exact_path_multisets']} path-length
multisets through `T=30`, but the unbounded proof is the repeated exact
identity (1), not finite extrapolation.

This is only a linear-forest row extremum.  It does not by itself prove the
all-rank `d=1` terminal-m0 sector or Erdos Problem 993.
"""


def main() -> None:
    identity = merge_identity_audit()
    literal = bounded_literal_audit()
    NOTE.write_text(note_text(literal), encoding="utf-8")
    payload = {
        "schema": "linear-forest-one-long-componentwise-ceiling-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_LINEAR_FOREST_ONE_LONG_COMPONENTWISE_CEILING",
        "theorem": {
            "merge_identity": identity["identity"],
            "ceiling": "I(K;x)<=coeff (1+x)^(Y-1)P_(T-Y+1)",
            "domain": "every T-vertex Y-component linear forest, simultaneously all ranks",
        },
        "merge_identity_audit": identity,
        "bounded_literal_audit": literal,
        "scope_warning": (
            "This is a coefficientwise linear-forest ceiling only; all-rank d=1 "
            "terminal m=0 and Erdos 993 remain open."
        ),
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("merge_identity_audit", identity)
    print("bounded_literal_audit", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
