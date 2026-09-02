#!/usr/bin/env python3
"""All-order one-centre path floor for the balanced terminal m=0 sector.

The theorem replaces the occupancy histogram by two path rows.  It is an
input to, not a proof of, the remaining retained-hprev scalar sign.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import comb
from pathlib import Path

import sympy as sp

from probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary import (
    balanced_arm_counts,
    family_rows,
    weak_compositions,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_one_center_path_floor_exact_adversary_20260829.json"
NOTE = ROOT / "BALANCED_SUBDIVIDED_STAR_ONE_CENTER_PATH_FLOOR_2026-08-29.md"
DEPENDENCIES = (
    ROOT / "prove_balanced_subdivided_star_m0_occupancy_sector_rows_adversary.py",
    ROOT / "balanced_subdivided_star_m0_occupancy_sector_rows_exact_adversary_20260829.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def path_row(vertices: int, maximum: int) -> list[int]:
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def path_floor_row(d: int, R: int, Y: int, maximum: int) -> list[int]:
    q, s = divmod(R, d)
    output = [0] * (maximum + 1)
    for count, vertices in (
        (s, R + Y - q - 1),
        (d - s, R + Y - q),
    ):
        row = path_row(vertices, maximum)
        for rank in range(maximum):
            output[rank + 1] += count * row[rank]
    return output


def symbolic_join_audit() -> dict[str, object]:
    x = sp.symbols("x")
    paths = {-1: sp.Integer(1), 0: sp.Integer(1), 1: 1 + x}
    for n in range(2, 61):
        paths[n] = sp.expand(paths[n - 1] + x * paths[n - 2])
    checks = 0
    for a in range(1, 31):
        for b in range(1, 31):
            difference = sp.expand(
                paths[a] * paths[b]
                - paths[a + b]
                - x**2 * paths[a - 2] * paths[b - 2]
            )
            assert difference == 0
            checks += 1
    return {
        "identity": "P_a P_b-P_(a+b)=x^2 P_(a-2)P_(b-2)>=coeff0",
        "domain": "a,b>=1 with P_-1=1",
        "symbolic_pairs": checks,
        "induction": (
            "Repeatedly join two nonempty path components.  Each join weakly "
            "decreases every coefficient and preserves total vertex count, "
            "so every linear-forest row on v vertices dominates P_v."
        ),
    }


def literal_audit() -> dict[str, object]:
    allocations = supported_rows = coefficient_checks = 0
    minimum_slack = None
    first_positive = None
    for d in range(1, 7):
        for R in range(1, 10):
            arms = balanced_arm_counts(d, R)
            for T in range(1, 7):
                if C(T + R - 1, R - 1) > 3500:
                    continue
                N = d + R + T
                for subdivision in weak_compositions(T, R):
                    Y = sum(value > 0 for value in subdivision)
                    F, H = family_rows(arms, subdivision, N + 1)
                    floor = path_floor_row(d, R, Y, N + 1)
                    for rank in range(N + 2):
                        slack = F[rank] - H[rank] - floor[rank]
                        assert slack >= 0
                        if slack > 0 and first_positive is None:
                            first_positive = [d, R, T, list(subdivision), rank, slack]
                        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                        coefficient_checks += 1
                    supported_rows += 1
                    allocations += 1
    return {
        "literal_allocations": allocations,
        "literal_rows": supported_rows,
        "coefficient_checks": coefficient_checks,
        "minimum_slack": minimum_slack,
        "first_positive_slack": first_positive,
    }


def theorem_note() -> str:
    return """# Balanced subdivided-star one-centre path floor

Date: 2026-08-29

Let the balanced centre degrees be `r_i in {q,q+1}`, where
`R=dq+s`, `0<=s<d`.  Let `y_i` be the number of occupied arms at centre `i`
and `Y=sum y_i`.

The frozen occupancy-sector theorem gives, inside `E=F-H`, the exactly-one-
centre sector

```text
x K_i^0 product_(k!=i) H_k^0
=x(1+x)^(R-Y-r_i+2y_i)(1+2x)^(Y-y_i).             (1)
```

The two exponents in (1) are nonnegative: the unoccupied arms outside centre
`i` number `(R-Y)-(r_i-y_i)>=0`.  After the selected centre contributes the
leading `x`, the remaining factor is the independence row of a linear forest
on exactly

```text
(R-Y-r_i+2y_i)+2(Y-y_i)=R+Y-r_i                  (2)
```

vertices.  Endpoint joining obeys

```text
P_aP_b-P_(a+b)=x^2P_(a-2)P_(b-2)>=coeff 0,         (3)
```

so every such linear-forest row coefficientwise dominates the path row on
the same number of vertices.  Summing (1) over the `s` degree-`q+1` centres
and the `d-s` degree-`q` centres proves the simultaneous all-rank floor

```text
F-H >=coeff x{s P_(R+Y-q-1)+(d-s)P_(R+Y-q)}.       (4)
```

The shifts in (2)-(4) are exact.  The bound is independent of the occupancy
histogram.  It is an all-order structural lemma only; positivity of the final
retained-`h_(j-1)` scalar combination, terminal Newton `m=0`, and Erdos
Problem 993 still require separate proofs.

Replay:

```powershell
python .\\prove_balanced_subdivided_star_one_center_path_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_BALANCED_ONE_CENTER_PATH_FLOOR
```
"""


def main() -> None:
    join = symbolic_join_audit()
    audit = literal_audit()
    NOTE.write_text(theorem_note(), encoding="utf-8")
    payload = {
        "schema": "balanced-subdivided-star-one-center-path-floor-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_ONE_CENTER_PATH_FLOOR",
        "theorem": (
            "If R=dq+s, 0<=s<d, then F-H >=coeff "
            "x{s P_(R+Y-q-1)+(d-s)P_(R+Y-q)}."
        ),
        "exact_vertex_count": (
            "Each centre-i row after its leading x has "
            "R+Y-r_i vertices, independent of y_i."
        ),
        "endpoint_joining_proof": join,
        "literal_audit": audit,
        "dependency_sha256": {
            path.name: sha256(path) for path in DEPENDENCIES
        },
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This is an all-order row floor, not the final m=0 sign theorem "
            "or a proof of Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("endpoint_joining_proof", join)
    print("literal_audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
