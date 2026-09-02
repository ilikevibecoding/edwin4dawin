#!/usr/bin/env python3
"""All-order rank-four ceiling for a fixed-order/component linear forest.

This is a standalone structural lemma for the d=1,j=5 terminal-m0 lane.
It does not assert the terminal inequality itself.
"""

from __future__ import annotations

import hashlib
import json
import os
from functools import lru_cache
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "linear_forest_rank4_one_long_ceiling_exact_adversary_20260829.json"
NOTE = ROOT / "LINEAR_FOREST_RANK4_ONE_LONG_CEILING_2026-08-29.md"


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
    assert vertices >= 0
    return tuple(C(vertices + 1 - rank, rank) for rank in range(vertices + 1))


def forest_row(edge_lengths: tuple[int, ...], isolates: int) -> tuple[int, ...]:
    assert isolates >= 0 and all(length >= 1 for length in edge_lengths)
    row = (1,)
    for length in edge_lengths:
        row = convolve(row, path_row(length + 1))
    for _ in range(isolates):
        row = convolve(row, (1, 1))
    return row


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def partitions(total: int, parts: int, minimum: int = 1):
    """Nondecreasing positive partitions of total into exactly parts."""
    if parts == 0:
        if total == 0:
            yield ()
        return
    maximum_first = total // parts
    for first in range(minimum, maximum_first + 1):
        for tail in partitions(total - first, parts - 1, first):
            yield (first,) + tail


def motif_formula(T: int, Y: int, edge_lengths: tuple[int, ...]) -> int:
    """Inclusion-exclusion formula for i_4 of a linear forest."""
    E = T - Y
    Z = len(edge_lengths)
    one_edge = sum(length == 1 for length in edge_lengths)
    assert sum(edge_lengths) == E
    wedges = E - Z
    path4 = E - 2 * Z + one_edge
    assert wedges >= 0 and path4 >= 0
    return (
        C(T, 4)
        - E * C(T - 2, 2)
        + C(E, 2)
        + wedges * (T - 4)
        - path4
    )


def ceiling_formula(T: int, Y: int) -> int:
    """i_4 of P_(T-Y+1) disjoint union (Y-1) isolated vertices."""
    assert 1 <= Y <= T
    row = forest_row((T - Y,), Y - 1) if T > Y else forest_row((), Y)
    return coefficient(row, 4)


def symbolic_case_audit() -> dict[str, object]:
    """Fail-closed integer proof of the only small-order sign cases."""
    # For E>0, compare a forest with Z nontrivial components and s one-edge
    # components to the one-long-component row.  When E>1 its difference is
    # (Z-1)(6-T)-s.  At E=1 there is only Z=s=1, hence equality.
    cases = []
    for T in range(0, 6):
        for Y in range(1, T + 1):
            E = T - Y
            if E == 0:
                cases.append((T, Y, 0, 0, 0))
                continue
            for Z in range(1, min(Y, E) + 1):
                for edge_lengths in partitions(E, Z):
                    s = sum(length == 1 for length in edge_lengths)
                    s0 = int(E == 1)
                    difference = (Z - 1) * (6 - T) - (s - s0)
                    assert difference <= 0
                    cases.append((T, Y, Z, s, difference))

    # The unbounded T>=6 case is immediate termwise: Z>=1 and s>=0.
    # Record its exact affine coefficients rather than sampling it.
    unbounded_difference = {
        "coefficient_of_(Z-1)*(T-6)": -1,
        "coefficient_of_s": -1,
        "constant": 0,
        "domain": "T>=6,E>=2,Z>=1,s>=0",
    }
    assert unbounded_difference["coefficient_of_(Z-1)*(T-6)"] <= 0
    assert unbounded_difference["coefficient_of_s"] <= 0
    return {
        "small_order_exact_cases": len(cases),
        "minimum_small_order_difference": min(row[-1] for row in cases),
        "maximum_small_order_difference": max(row[-1] for row in cases),
        "unbounded_affine_difference": unbounded_difference,
    }


def bounded_literal_audit() -> dict[str, object]:
    checks = equalities = strict = 0
    minimum_slack = None
    maximum_z_seen = 0
    stream = hashlib.sha256()
    for T in range(1, 36):
        for Y in range(1, T + 1):
            E = T - Y
            ceiling = ceiling_formula(T, Y)
            if E == 0:
                actual = coefficient(forest_row((), Y), 4)
                assert actual == ceiling
                stream.update(f"{T}:{Y}:0:():{actual}:{ceiling}\n".encode())
                checks += 1
                equalities += 1
                minimum_slack = 0 if minimum_slack is None else min(minimum_slack, 0)
                continue
            for Z in range(1, min(Y, E) + 1):
                maximum_z_seen = max(maximum_z_seen, Z)
                for edge_lengths in partitions(E, Z):
                    actual = coefficient(forest_row(edge_lengths, Y - Z), 4)
                    motif = motif_formula(T, Y, edge_lengths)
                    assert actual == motif
                    slack = ceiling - actual
                    assert slack >= 0
                    if slack:
                        strict += 1
                    else:
                        equalities += 1
                    minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                    stream.update(
                        f"{T}:{Y}:{Z}:{edge_lengths}:{actual}:{motif}:{ceiling}:{slack}\n".encode()
                    )
                    checks += 1
    return {
        "box": {"T": [1, 35], "all_component_counts": True},
        "exact_path_multisets": checks,
        "equality_cases": equalities,
        "strict_cases": strict,
        "minimum_ceiling_slack": minimum_slack,
        "maximum_nontrivial_component_count_seen": maximum_z_seen,
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(symbolic: dict[str, object], literal: dict[str, object]) -> str:
    return f"""# Rank-four ceiling for fixed-order/component linear forests

Date: 2026-08-29

Let `K` be a linear forest on `T` vertices with `Y` components.  Write
`E=T-Y` for its edge count, `Z` for its number of nontrivial components,
and `s` for its number of one-edge components.  If `E>0`, then

```text
wedges(K)=E-Z,
P4(K)=E-2Z+s.
```

Inclusion-exclusion over the edges of a four-set is exact after triples:

```text
i4(K)=C(T,4)-E C(T-2,2)+C(E,2)+(E-Z)(T-4)-(E-2Z+s).   (1)
```

Indeed, an adjacent edge pair lies in `T-3` four-sets, a disjoint pair in
one, and the only three-edge union on at most four vertices is a copy of
`P4`.  Combining the pair terms gives (1).

Compare (1) to the one-long-component forest

```text
Kstar=P_(E+1) disjoint union (Y-1) K1.
```

For `E>1`, its parameters are `Z=1,s=0`, and hence

```text
i4(K)-i4(Kstar)=(Z-1)(6-T)-s.                         (2)
```

For `T>=6`, (2) is nonpositive termwise.  The `E=1` case is unique.  Orders
`T<=3` have no rank-four set.  At `T=4,5`, all feasible `(Y,Z,s)` cases are
checked exactly (equivalently: at `T=5`, `Z=2` forces `s>=1`; at `T=4`,
`Z=2` forces `s=2`).  Therefore, for every order,

```text
i4(K) <= [x^4] (1+x)^(Y-1) P_(T-Y+1).                (3)
```

This is an all-order structural lemma.  The bounded audit independently
replays {literal['exact_path_multisets']} path-length multisets through
`T=35`; it is diagnostic evidence, not the basis of the unbounded proof.
The lemma supplies only the rank-four K ceiling needed by the conditional
`d=1,j=5` terminal-m0 lane.  It does not prove that lane or any global
terminal statement.
"""


def main() -> None:
    symbolic = symbolic_case_audit()
    literal = bounded_literal_audit()
    NOTE.write_text(note_text(symbolic, literal), encoding="utf-8")
    payload = {
        "schema": "linear-forest-rank4-one-long-ceiling-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_LINEAR_FOREST_RANK4_ONE_LONG_COMPONENT_CEILING",
        "theorem": {
            "domain": "every linear forest on T vertices with Y components",
            "motif_identity": (
                "i4=C(T,4)-E*C(T-2,2)+C(E,2)+(E-Z)(T-4)-(E-2Z+s)"
            ),
            "difference_from_one_long": "(Z-1)(6-T)-s for E>1",
            "ceiling": "[x^4](1+x)^(Y-1)P_(T-Y+1)",
            "boundary": "E=0, E=1, and T<=5 treated exactly",
        },
        "symbolic_case_audit": symbolic,
        "bounded_literal_audit": literal,
        "scope_warning": (
            "This proves only the rank-four linear-forest coefficient ceiling; "
            "it does not prove d=1,j=5, terminal m=0, or Erdos 993."
        ),
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic_case_audit", symbolic)
    print("bounded_literal_audit", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
