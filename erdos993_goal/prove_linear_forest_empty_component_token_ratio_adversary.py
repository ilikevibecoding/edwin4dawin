#!/usr/bin/env python3
"""Exact empty-component refinement of the linear-forest token bound."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from pathlib import Path

from prove_linear_forest_token_ratio_bound_adversary import (
    allocation_formula,
    compositions,
    linear_forest_rows,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "linear_forest_empty_component_token_ratio_exact_adversary_20260829.json"
NOTE = ROOT / "LINEAR_FOREST_EMPTY_COMPONENT_TOKEN_RATIO_2026-08-29.md"
PINS = {
    "prove_linear_forest_token_ratio_bound_adversary.py": "7B24E2C6BD2B1C9A025FD58BB36C17C6848613AD93845F1458F7A81CFD8FCE68",
    "linear_forest_token_ratio_bound_exact_adversary_20260829.json": "892A9D196EDFB0FBB530EF93127D8687A78E93CA403243925529EA928E4C415F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def empty_gap_floor(components: int, long_components: int, rank: int) -> int:
    """Minimum free-gap mass forced into zero-token components.

    Every empty nonempty path contributes n_i+1>=2.  Among the components,
    ``long_components`` have n_i>=2 and hence contribute at least 3 if empty.
    At most ``rank`` components can receive a token.
    """
    assert 0 <= long_components <= components
    return 2 * max(0, components - rank) + max(0, long_components - rank)


def refined_cap(
    order: int, components: int, long_components: int, rank: int
) -> Fraction:
    total_free = order - 2 * rank + components
    active_free_ceiling = total_free - empty_gap_floor(
        components, long_components, rank
    )
    assert active_free_ceiling >= 0
    if active_free_ceiling == 0:
        return Fraction(0)
    return Fraction(active_free_ceiling, rank + active_free_ceiling)


def bounded_audit() -> dict[str, object]:
    forests = ranks = allocations = 0
    strict_improvements = 0
    minimum_cross = None
    minimum_allocation_slack = None
    stream = hashlib.sha256()
    for components in range(1, 5):
        for lengths in itertools.product(range(1, 6), repeat=components):
            independent, one_edge = linear_forest_rows(lengths)
            order = sum(lengths)
            long_components = sum(value >= 2 for value in lengths)
            forests += 1
            for rank in range(1, len(independent)):
                f = coefficient(independent, rank)
                if not f:
                    continue
                z = coefficient(one_edge, rank + 1)
                cap = refined_cap(order, components, long_components, rank)
                cross = rank * f * cap.numerator - z * cap.denominator
                assert cross >= 0
                minimum_cross = cross if minimum_cross is None else min(minimum_cross, cross)
                old_free = order - 2 * rank + components
                old_cap = Fraction(old_free, rank + old_free)
                assert cap <= old_cap
                strict_improvements += cap < old_cap

                total_weight = 0
                total_edges = Fraction(0)
                for positive in compositions(rank + components, components):
                    selected = tuple(value - 1 for value in positive)
                    weight, half_degree = allocation_formula(lengths, selected)
                    if not weight:
                        continue
                    total_free = sum(
                        vertices - 2 * value + 1
                        for vertices, value in zip(lengths, selected)
                    )
                    empty_free = sum(
                        vertices + 1
                        for vertices, value in zip(lengths, selected)
                        if value == 0
                    )
                    forced = empty_gap_floor(components, long_components, rank)
                    assert empty_free >= forced
                    active_free = total_free - empty_free
                    allocation_cap = Fraction(
                        rank * active_free, rank + active_free
                    ) if active_free else Fraction(0)
                    theorem_half_degree_cap = rank * cap
                    assert half_degree <= allocation_cap <= theorem_half_degree_cap
                    slack = theorem_half_degree_cap - half_degree
                    minimum_allocation_slack = (
                        slack
                        if minimum_allocation_slack is None
                        else min(minimum_allocation_slack, slack)
                    )
                    total_weight += weight
                    total_edges += weight * half_degree
                    allocations += 1
                assert total_weight == f
                assert total_edges.denominator == 1
                assert total_edges.numerator == z
                stream.update(
                    f"{lengths}:{rank}:{f}:{z}:{cap}:{cross}\n".encode()
                )
                ranks += 1
    return {
        "linear_forests": forests,
        "supported_rank_checks": ranks,
        "token_allocation_checks": allocations,
        "strict_improvements_over_unrefined_cap": strict_improvements,
        "minimum_cleared_rank_slack": minimum_cross,
        "minimum_allocation_half_degree_slack": str(minimum_allocation_slack),
        "ordered_refined_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(audit: dict[str, object]) -> str:
    return f"""# Empty-component refinement of the linear-forest token bound

Date: 2026-08-29

Let `L` be a disjoint union of `c>=1` nonempty paths on `M` vertices, and
suppose at least `s` components have at least two vertices.  At a supported
rank `j`, put

```text
G=M-2j+c,
E=2(c-j)_+ +(s-j)_+,
G*=G-E.
```

Then the one-edge ratio satisfies

```text
q_j(L)=z_j/(j f_j) <= G*/(j+G*).                   (1)
```

Indeed, condition on a token allocation `k_i`.  At most `j` components are
nonempty, so at least `(c-j)_+` components contain no token.  Every empty
path contributes `n_i+1>=2` free gaps.  After all `c-s` one-vertex paths
have been used as the cheapest empty components, each further empty path
contributes at least one additional gap.  Thus the empty components contain
at least `E` of the fixed total `G` free gaps.

The empty components contribute zero to

```text
sum_i k_i g_i/(k_i+g_i).
```

Applying the frozen parallel-sum identity only to active components bounds
this by `j(G-E)/(j+G-E)`.  The function is increasing in the active free-gap
mass, and averaging over token allocations proves (1).

The exact replay checked {audit['linear_forests']} bounded linear forests,
{audit['supported_rank_checks']} supported ranks, and
{audit['token_allocation_checks']} token allocations.

This is an all-order structural theorem.  It does not by itself prove the
terminal Newton m=0 sign or Erdos Problem 993.

Replay:

```powershell
python .\\prove_linear_forest_empty_component_token_ratio_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_LINEAR_FOREST_EMPTY_COMPONENT_TOKEN_RATIO
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    audit = bounded_audit()
    NOTE.write_text(note_text(audit), encoding="utf-8")
    payload = {
        "schema": "linear-forest-empty-component-token-ratio-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_LINEAR_FOREST_EMPTY_COMPONENT_TOKEN_RATIO",
        "theorem": {
            "empty_gap_floor": "E=2(c-j)_+ +(s-j)_+",
            "refined_cap": "q_j<=G_star/(j+G_star), G_star=M-2j+c-E",
            "scope": "all linear forests, all supported ranks",
        },
        "bounded_exact_replay": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the empty-component token refinement only; no "
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
