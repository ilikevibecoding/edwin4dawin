#!/usr/bin/env python3
"""Component-jet refinement of the five finite mask-3 residual cells."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent as first
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_5_component_residual_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_agent.py":
        "7EF09D48838D6D991B5A755D2112F2205B066CC8F007B5301C1B9072C0A433C6",
    "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json":
        "7417437EB9605542365D6C170378866EEF77030B417BB8019531E3F0F00B5378",
    "prove_rank8_forest16_17_component_jet_bounds_agent.py":
        "F3BA34249C4A0D7FAD4B135D38EB121FED86AD6A31289A846BC1D3B13018C032",
    "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json":
        "DC5A2F6F85E62D47EB0AA43FB8E92B2C33E04DF3DA828AFF179B9E61B52F032D",
    "audit_rank8_forest16_17_component_jet_bounds_agent.py":
        "E249DEE976743CA8D31757C91DA6445DCBF11008A01BA9227EC4543C6B6FA7D8",
    "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json":
        "41C457BEB4BF565F3FCCF46BF374168AD7EA5683B115C3A50347AA72E811F9E1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_fraction(value: str) -> Fraction:
    numerator, separator, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if separator else 1)


def gap_from_minima(r: int, components: int, minima: list[int]) -> int:
    return sum(
        minima[j] * first.choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def clear_component(base, N: int, r: int, components: int, minima: list[int], t_upper: Fraction):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6_upper = first.choose(N - 1, 6) + first.choose(r - 1, 5)
    gap = gap_from_minima(r, components, minima)
    yden = xden * d6_upper
    ynum = xnum * d6_upper - gap * xden
    # The full X-box has a nonnegative y ceiling, so V in [0,1] is oriented.
    assert int(ynum(0, 0, 0)) >= 0

    t_lower = Fraction(6, m - 5)
    assert t_lower <= t_upper
    tden = math.lcm(t_lower.denominator, t_upper.denominator)
    lo = t_lower.numerator * (tden // t_lower.denominator)
    hi = t_upper.numerator * (tden // t_upper.denominator)
    tnum = lo + (hi - lo) * T
    znum = ynum * tden
    zden = yden * tnum

    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    metadata = {
        "minimum_f0_to_f4": minima,
        "component_gap": gap,
        "d6_edge_concentration_upper": d6_upper,
        "t_lower": str(t_lower),
        "t_upper_component_exact": str(t_upper),
    }
    return answer, metadata


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    cells = [tuple(row) for row in prior["open_cells"]]
    assert cells == [
        (26, 10, 16),
        (27, 10, 17),
        (27, 11, 16),
        (28, 11, 17),
        (28, 12, 16),
    ]
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    component_rows = {
        (row["order"], row["components"]): row
        for row in catalog["component_rows"]
    }
    base = base_polynomial()
    rows = []
    residual_witnesses = []
    subboxes = 0
    for N, r, m in cells:
        component_subboxes = []
        for components in range(1, m + 1):
            item = component_rows[(m, components)]
            assert item["unlabeled_forest_types"] > 0
            cleared, metadata = clear_component(
                base,
                N,
                r,
                components,
                item["minimum_f0_to_f4"],
                parse_fraction(item["maximum_f5_over_f6"]),
            )
            sign = first.sign(cleared)
            status = "SEALED" if sign["negative"] == 0 else "OPEN_COMPONENT_BERNSTEIN_METHOD"
            subbox = {
                "components": components,
                "unlabeled_forest_types": item["unlabeled_forest_types"],
                "distinct_coefficient_jets": item["distinct_coefficient_jets"],
                "status": status,
                "metadata": metadata,
                "bernstein": sign,
            }
            component_subboxes.append(subbox)
            subboxes += 1
            if sign["negative"]:
                residual_witnesses.append(
                    {
                        "N": N,
                        "r": r,
                        "m": m,
                        "components": components,
                        "negative_indices": sign["negative_indices"],
                    }
                )
        assert [row["components"] for row in component_subboxes] == list(range(1, m + 1))
        rows.append(
            {
                "N": N,
                "r": r,
                "m": m,
                "status": "SEALED" if all(row["status"] == "SEALED" for row in component_subboxes) else "OPEN_COMPONENT_BERNSTEIN_METHOD",
                "component_subboxes": component_subboxes,
            }
        )

    sealed_cells = sum(row["status"] == "SEALED" for row in rows)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-5-component-residual-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_ALL_5_COMPONENT_RESIDUAL"
            if sealed_cells == 5
            else "PASS_EXACT_PARTIAL_MASK3_5_COMPONENT_RESIDUAL_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": (
            "Exactly the five residual finite-middle cells (26,10,16), "
            "(27,10,17), (27,11,16), (28,11,17), (28,12,16) for "
            "Delta0/new-leaf/mask3, split by every possible forest component count."
        ),
        "exact_inputs": [
            "d6<=C(N-1,6)+C(r-1,5) by edge concentration",
            "d5-f5>=sum_{j=0}^4 min_i_j(F)*C(r-min(j,c),5-j) for a c-component forest F",
            "component-resolved exact maximum f5/f6 from the independently audited order-16/17 forest catalog",
        ],
        "rows": rows,
        "residual_witnesses": residual_witnesses,
        "counts": {
            "cells": len(rows),
            "sealed_cells": sealed_cells,
            "open_cells": len(rows) - sealed_cells,
            "component_subboxes": subboxes,
            "open_component_subboxes": len(residual_witnesses),
        },
        "hashes": hashes,
        "proof_boundary": (
            "Only cells with every component subbox zero-negative are eligible for "
            "credit, and only after an independent literal replay. This does not yet "
            "seal the 105-cell middle registry, all finite mask3, other masks, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "SEALED", sealed_cells, "OPEN", len(rows) - sealed_cells)
    print("SUBBOXES", subboxes, "OPEN", len(residual_witnesses))
    if residual_witnesses:
        print("RESIDUAL_WITNESSES", residual_witnesses)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
