#!/usr/bin/env python3
"""Enhanced d=1 q-gap-mass floor using forced empty path components."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from pathlib import Path

from prove_d1_spider_direct_qgap_mass_floor_adversary import (
    coefficient,
    direct_mass_floor,
)
from prove_d1_spider_one_edge_decomposition_adversary import spider_formula
from prove_linear_forest_empty_component_token_ratio_adversary import refined_cap


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_spider_empty_component_qgap_mass_floor_exact_adversary_20260829.json"
NOTE = ROOT / "D1_SPIDER_EMPTY_COMPONENT_QGAP_MASS_FLOOR_2026-08-29.md"
PINS = {
    "prove_d1_spider_direct_qgap_mass_floor_adversary.py": "CA6071E5397B0858900CC1A095F2D61B2E5B851BFE2E11CF81B42DAECCB870FA",
    "d1_spider_direct_qgap_mass_floor_exact_adversary_20260829.json": "688244A0720AF856C61936FCD5D1325CDCB757B3F867A654F3A5F9360B89DC27",
    "prove_linear_forest_empty_component_token_ratio_adversary.py": "9DEB925A6D71D9A03EA46F32A3A6EE8BC4F37CCCDA3EC7EA1AF835EADC3749E8",
    "linear_forest_empty_component_token_ratio_exact_adversary_20260829.json": "7FFEE5D98743F179FB613774A4EB051F015F394961B16282A3556B16E1734CAD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def enhanced_mass_floor(
    R: int, T: int, Y: int, rank: int, q3: Fraction
) -> dict[str, object]:
    """Lower floor for f_j(q3-q_j), given smaller-forest q_j<=q3."""
    base = direct_mass_floor(R, T, Y, rank, q3)

    # H has R nonempty path components on R+T vertices, and exactly Y of
    # those paths have at least two vertices.
    q_h = (
        refined_cap(R + T, R, Y, rank)
        if int(base["Hmax_rank"])
        else Fraction(0)
    )

    # K has Y nonempty paths on T vertices.  If T>Y, at least one is long;
    # at target rank rank-1>=2 this extra fact never weakens the formula, but
    # retaining it makes the vertex/component shifts explicit.
    target_tail = rank - 1
    minimum_deep = int(T > Y)
    q_k = (
        refined_cap(T, Y, minimum_deep, target_tail)
        if int(base["Kmax_previous_rank"])
        else Fraction(0)
    )
    q_included = (
        (target_tail * q_k + R) / rank
        if int(base["Kmax_previous_rank"])
        else Fraction(0)
    )

    h_slope = q3 - q_h
    k_slope = q3 - q_included
    h_endpoint = (
        int(base["Hconc_rank"])
        if h_slope >= 0
        else int(base["Hmax_rank"])
    )
    k_endpoint = (
        int(base["Kmin_previous_rank"])
        if k_slope >= 0
        else int(base["Kmax_previous_rank"])
    )
    block_floor = h_endpoint * h_slope + k_endpoint * k_slope
    mass_floor = max(Fraction(0), block_floor)
    assert mass_floor >= base["mass_floor"]
    return {
        **base,
        "mass_floor": mass_floor,
        "raw_block_floor": block_floor,
        "q_H_unrefined_cap": base["q_H_cap"],
        "q_K_unrefined_cap": base["q_K_cap"],
        "q_H_cap": q_h,
        "q_K_cap": q_k,
        "included_block_cap": q_included,
        "H_slope": h_slope,
        "K_slope": k_slope,
        "H_endpoint": h_endpoint,
        "K_endpoint": k_endpoint,
        "minimum_K_deep_components": minimum_deep,
    }


def bounded_literal_audit() -> dict[str, object]:
    allocations = ranks = improved = 0
    minimum_mass_slack = None
    minimum_improvement = None
    stream = hashlib.sha256()
    for arms in range(1, 6):
        for subdivisions in itertools.product(range(4), repeat=arms):
            T = sum(subdivisions)
            Y = sum(value > 0 for value in subdivisions)
            if not T:
                continue
            F, Z, pieces = spider_formula(subdivisions)
            H, K, ZH, ZK, J = (
                pieces[name] for name in ("H", "K", "ZH", "ZK", "J")
            )
            f3 = coefficient(F, 3)
            if not f3:
                continue
            q3 = Fraction(coefficient(Z, 4), 3 * f3)
            allocations += 1
            for rank in range(3, len(F)):
                fj = coefficient(F, rank)
                if not fj:
                    continue
                qj = Fraction(coefficient(Z, rank + 1), rank * fj)
                assert qj <= q3
                actual_mass = fj * (q3 - qj)
                floor = enhanced_mass_floor(arms, T, Y, rank, q3)
                assert actual_mass >= floor["mass_floor"]

                h = coefficient(H, rank)
                k = coefficient(K, rank - 1)
                if h:
                    assert coefficient(ZH, rank + 1) <= rank * h * floor["q_H_cap"]
                if k:
                    assert coefficient(ZK, rank) <= (
                        (rank - 1) * k * floor["q_K_cap"]
                    )
                    assert coefficient(J, rank - 1) <= arms * k
                literal_block = h * floor["H_slope"] + k * floor["K_slope"]
                assert actual_mass >= literal_block >= floor["raw_block_floor"]
                slack = actual_mass - floor["mass_floor"]
                minimum_mass_slack = slack if minimum_mass_slack is None else min(minimum_mass_slack, slack)
                base_floor = direct_mass_floor(arms, T, Y, rank, q3)["mass_floor"]
                gain = floor["mass_floor"] - base_floor
                assert gain >= 0
                improved += gain > 0
                minimum_improvement = gain if minimum_improvement is None else min(minimum_improvement, gain)
                stream.update(
                    f"{subdivisions}:{rank}:{actual_mass}:{floor['mass_floor']}\n".encode()
                )
                ranks += 1
    return {
        "literal_spider_allocations": allocations,
        "supported_rank_checks": ranks,
        "strict_improvements_over_direct_floor": improved,
        "minimum_actual_mass_minus_floor": str(minimum_mass_slack),
        "minimum_enhanced_minus_direct_floor": str(minimum_improvement),
        "ordered_enhanced_mass_stream_sha256": stream.hexdigest().upper(),
    }


def critical_replays() -> dict[str, object]:
    records = {}
    for name, subdivisions, rank in (
        ("corrected_N315_R9", (298, 1, 1, 1, 1, 1, 1, 1, 0), 24),
        ("old_payment_failure_N315_R20", (275,) + (1,) * 19, 14),
    ):
        R = len(subdivisions)
        T = sum(subdivisions)
        Y = sum(value > 0 for value in subdivisions)
        F, Z, _ = spider_formula(subdivisions)
        q3 = Fraction(coefficient(Z, 4), 3 * coefficient(F, 3))
        qj = Fraction(coefficient(Z, rank + 1), rank * coefficient(F, rank))
        enhanced = enhanced_mass_floor(R, T, Y, rank, q3)
        direct = direct_mass_floor(R, T, Y, rank, q3)
        actual_mass = coefficient(F, rank) * (q3 - qj)
        assert actual_mass >= enhanced["mass_floor"] >= direct["mass_floor"]
        records[name] = {
            "parameters": {
                "N": 1 + R + T,
                "rank": rank,
                "R": R,
                "T": T,
                "Y": Y,
            },
            "actual_qgap_mass": str(actual_mass),
            "direct_mass_floor": str(direct["mass_floor"]),
            "enhanced_mass_floor": str(enhanced["mass_floor"]),
            "enhanced_over_direct": str(
                enhanced["mass_floor"] / direct["mass_floor"]
                if direct["mass_floor"]
                else 0
            ),
            "enhanced_details": {key: str(value) for key, value in enhanced.items()},
        }
    return records


def note_text(replays: dict[str, object], audit: dict[str, object]) -> str:
    critical = replays["old_payment_failure_N315_R20"]
    return f"""# Empty-component q-gap-mass floor for one-centre spiders

Date: 2026-08-29

This strengthens the frozen direct H/K block floor by using the mandatory
empty path components in every token allocation.  For the excluded-centre
block `H`, there are `R` path components on `R+T` vertices and exactly `Y`
have length at least two.  Therefore

```text
E_H=2(R-j)_+ +(Y-j)_+,
u_H=(2R+T-2j-E_H)/(2R+T-j-E_H).                    (1)
```

For `K` at rank `j-1`, there are `Y` nonempty path components on `T`
vertices, giving

```text
E_K=2(Y-j+1)_+,
u_K=(T-2(j-1)+Y-E_K)/(T-(j-1)+Y-E_K).              (2)
```

Retain `u_I=((j-1)u_K+R)/j` for the included-centre block and choose the
frozen H/K coefficient endpoints according to the two slope signs.  Under
the legitimate smaller-forest strong-induction input `q_j<=q3`, this gives
the all-order enhanced mass floor

```text
f_j(q3-q_j)>=max(0,H_endpoint(q3-u_H)+K_endpoint(q3-u_I)).  (3)
```

At the previous N=315,R=20,Y=20,j=14 payment relaxation failure, the direct
floor was `{critical['direct_mass_floor']}` and (3) raises it to
`{critical['enhanced_mass_floor']}`, an exact factor
`{critical['enhanced_over_direct']}`.  The bounded literal replay checked
{audit['literal_spider_allocations']} spiders and
{audit['supported_rank_checks']} supported ranks.

This theorem proves the enhanced reserve floor only.  The unbounded
terminal-payment sign cone and every d>1 sector remain separate obligations.

Replay:

```powershell
python .\\prove_d1_spider_empty_component_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_EMPTY_COMPONENT_QGAP_MASS_FLOOR
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    audit = bounded_literal_audit()
    replays = critical_replays()
    NOTE.write_text(note_text(replays, audit), encoding="utf-8")
    payload = {
        "schema": "d1-spider-empty-component-qgap-mass-floor-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_SPIDER_EMPTY_COMPONENT_QGAP_MASS_FLOOR",
        "theorem": {
            "H_empty_gap": "E_H=2(R-j)_+ +(Y-j)_+",
            "K_empty_gap": "E_K=2(Y-j+1)_+",
            "enhanced_floor": "f_j(q3-qj)>=max(0,H_endpoint*(q3-uH)+K_endpoint*(q3-uI))",
            "induction_scope": "q_j(F)<=q3(F) for the smaller forest F",
            "scope": "all one-centre spiders and all supported ranks j>=3",
        },
        "critical_replays": replays,
        "bounded_literal_audit": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the enhanced q-gap-mass floor only.  Its unbounded "
            "terminal m=0 payment and all d>1 sectors remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("critical_replays", replays)
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
