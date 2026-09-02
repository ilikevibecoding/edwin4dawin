#!/usr/bin/env python3
"""D=1 q-gap mass floor using inductive low-block caps for H and K."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

from prove_d1_spider_direct_qgap_mass_floor_adversary import coefficient
from prove_d1_spider_empty_component_qgap_mass_floor_adversary import (
    enhanced_mass_floor,
)
from prove_d1_spider_one_edge_decomposition_adversary import spider_formula


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_spider_inductive_lowblock_qgap_mass_floor_exact_adversary_20260829.json"
NOTE = ROOT / "D1_SPIDER_INDUCTIVE_LOWBLOCK_QGAP_MASS_FLOOR_2026-08-29.md"
PINS = {
    "prove_d1_spider_empty_component_qgap_mass_floor_adversary.py": "057D4C780DE37DFB293BCC00BF80FE6E6981C67D30106AFC1286A52F0C4C7263",
    "d1_spider_empty_component_qgap_mass_floor_exact_adversary_20260829.json": "1E57FC98141BB02AA1758CEAEA79175B8861FE171944E1ECFEB66E580DB61F96",
    "prove_all_forest_q3_q2_component_lift_root.py": "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json": "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def linear_q3(M: int, components: int, long2: int, long3: int) -> Fraction:
    """Exact q3 of a linear forest from its length thresholds."""
    edges = M - components
    wedges = M - components - long2
    f3 = C(M, 3) - edges * (M - 2) + wedges
    matchings = C(edges, 2) - wedges
    connected_four = M - components - long2 - long3
    z3 = (
        edges * C(M - 2, 2)
        - 2 * (wedges * (M - 3) + matchings)
        + 3 * connected_four
    )
    assert f3 > 0 and z3 >= 0
    return Fraction(z3, 3 * f3)


def linear_q2(M: int, components: int, long2: int) -> Fraction:
    """Exact q2 of a linear forest from its number of length>=2 paths."""
    edges = M - components
    wedges = M - components - long2
    f2 = C(M, 2) - edges
    z2 = edges * (M - 2) - 2 * wedges
    assert f2 > 0 and z2 >= 0
    return Fraction(z2, 2 * f2)


def inductive_lowblock_mass_floor(
    R: int, T: int, Y: int, rank: int, q3: Fraction
) -> dict[str, object]:
    """Lower floor for f_j(q3-q_j), using smaller-forest low blocks."""
    base = enhanced_mass_floor(R, T, Y, rank, q3)

    # H has R components, exactly Y of length>=2, and at least one of
    # length>=3 iff T>Y.  Its f3 is fixed by (R,T,Y), while z3 decreases by
    # exactly three for every additional length>=3 component.
    if int(base["Hmax_rank"]):
        minimum_h_long3 = int(T > Y)
        h_q3_upper = linear_q3(R + T, R, Y, minimum_h_long3)
        q_h = min(base["q_H_cap"], h_q3_upper)
    else:
        minimum_h_long3 = 0
        h_q3_upper = Fraction(0)
        q_h = Fraction(0)

    # K has Y nonempty path components on T vertices.  The number Z of
    # length>=2 components is at most min(Y,T-Y).  q2 is increasing in Z.
    # Strong induction gives q_(j-1)(K)<=q3(K), and the frozen all-forest
    # theorem gives q3(K)<=q2(K).
    if int(base["Kmax_previous_rank"]):
        maximum_k_long2 = min(Y, T - Y)
        k_q2_upper = linear_q2(T, Y, maximum_k_long2)
        q_k = min(base["q_K_cap"], k_q2_upper)
        q_included = ((rank - 1) * q_k + R) / rank
    else:
        maximum_k_long2 = 0
        k_q2_upper = Fraction(0)
        q_k = Fraction(0)
        q_included = Fraction(0)

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
        "q_H_empty_component_cap": base["q_H_cap"],
        "q_K_empty_component_cap": base["q_K_cap"],
        "q_H_cap": q_h,
        "q_K_cap": q_k,
        "included_block_cap": q_included,
        "H_slope": h_slope,
        "K_slope": k_slope,
        "H_endpoint": h_endpoint,
        "K_endpoint": k_endpoint,
        "H_q3_upper": h_q3_upper,
        "K_q2_upper": k_q2_upper,
        "minimum_H_length3_components": minimum_h_long3,
        "maximum_K_length2_components": maximum_k_long2,
    }


def bounded_literal_audit() -> dict[str, object]:
    allocations = ranks = improved = 0
    h_inductive_checks = k_inductive_checks = 0
    minimum_slack = None
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
            for rank in range(4, len(F)):
                fj = coefficient(F, rank)
                if not fj:
                    continue
                qj = Fraction(coefficient(Z, rank + 1), rank * fj)
                assert qj <= q3
                actual_mass = fj * (q3 - qj)
                floor = inductive_lowblock_mass_floor(arms, T, Y, rank, q3)
                assert actual_mass >= floor["mass_floor"]

                h = coefficient(H, rank)
                k = coefficient(K, rank - 1)
                if h:
                    qh = Fraction(coefficient(ZH, rank + 1), rank * h)
                    assert qh <= floor["H_q3_upper"]
                    assert qh <= floor["q_H_cap"]
                    h_inductive_checks += 1
                if k:
                    qk = Fraction(coefficient(ZK, rank), (rank - 1) * k)
                    assert qk <= floor["K_q2_upper"]
                    assert qk <= floor["q_K_cap"]
                    assert coefficient(J, rank - 1) <= arms * k
                    k_inductive_checks += 1
                literal_block = h * floor["H_slope"] + k * floor["K_slope"]
                assert actual_mass >= literal_block >= floor["raw_block_floor"]
                slack = actual_mass - floor["mass_floor"]
                minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                old = enhanced_mass_floor(arms, T, Y, rank, q3)["mass_floor"]
                assert floor["mass_floor"] >= old
                improved += floor["mass_floor"] > old
                stream.update(
                    f"{subdivisions}:{rank}:{actual_mass}:{floor['mass_floor']}\n".encode()
                )
                ranks += 1
    return {
        "literal_spider_allocations": allocations,
        "supported_rank_checks": ranks,
        "H_inductive_q3_checks": h_inductive_checks,
        "K_inductive_q2_checks": k_inductive_checks,
        "strict_improvements_over_empty_component_floor": improved,
        "minimum_actual_mass_minus_floor": str(minimum_slack),
        "ordered_lowblock_mass_stream_sha256": stream.hexdigest().upper(),
    }


def critical_replays() -> dict[str, object]:
    records = {}
    for name, subdivisions, rank in (
        ("corrected_N315_R9", (298, 1, 1, 1, 1, 1, 1, 1, 0), 24),
        ("empty_component_failure_N315_R11", (299, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0), 11),
        ("empty_component_failure_N315_R20", (275,) + (1,) * 19, 14),
    ):
        R = len(subdivisions)
        T = sum(subdivisions)
        Y = sum(value > 0 for value in subdivisions)
        F, Z, _ = spider_formula(subdivisions)
        q3 = Fraction(coefficient(Z, 4), 3 * coefficient(F, 3))
        qj = Fraction(coefficient(Z, rank + 1), rank * coefficient(F, rank))
        old = enhanced_mass_floor(R, T, Y, rank, q3)
        new = inductive_lowblock_mass_floor(R, T, Y, rank, q3)
        actual = coefficient(F, rank) * (q3 - qj)
        assert actual >= new["mass_floor"] >= old["mass_floor"]
        records[name] = {
            "parameters": {"N": 1 + R + T, "rank": rank, "R": R, "T": T, "Y": Y},
            "actual_qgap_mass": str(actual),
            "empty_component_mass_floor": str(old["mass_floor"]),
            "lowblock_mass_floor": str(new["mass_floor"]),
            "lowblock_over_empty_component": str(
                new["mass_floor"] / old["mass_floor"] if old["mass_floor"] else 0
            ),
            "lowblock_details": {key: str(value) for key, value in new.items()},
        }
    return records


def note_text(replays: dict[str, object], audit: dict[str, object]) -> str:
    critical = replays["empty_component_failure_N315_R11"]
    return f"""# Inductive low-block q-gap floor for one-centre spiders

Date: 2026-08-29

In the exact spider split `F=H+xK`, both `H` and `K` are strictly smaller
forests than the source tree.  Thus the strong induction input is available
separately on both blocks, with no same-order circularity:

```text
q_j(H)<=q3(H),
q_(j-1)(K)<=q3(K)<=q2(K).                          (1)
```

For `H`, the order, component count, and number of paths of length at least
two are `(R+T,R,Y)`.  Its rank-three denominator is fixed, while its
one-edge numerator decreases by exactly three for every extra path of length
at least three.  Hence the maximum `q3(H)` occurs with zero such paths when
`T=Y`, and one otherwise.

For `K`, the order and component count are `(T,Y)`.  Its exact `q2` increases
with the number of paths of length at least two, whose maximum is
`min(Y,T-Y)`.  Taking the minimum of these low-block caps and the frozen
empty-component caps in each block gives a stronger all-order H/K mass
floor.

At the N=315,R=11,Y=5,j=11 relaxation failure, the earlier floor was
`{critical['empty_component_mass_floor']}` and the low-block floor is
`{critical['lowblock_mass_floor']}`.  The bounded replay checked
{audit['literal_spider_allocations']} spiders and
{audit['supported_rank_checks']} supported ranks.

This theorem proves the inductive low-block reserve floor only.  Its
unbounded payment of the terminal m=0 certificate and all d>1 sectors remain
separate obligations.

Replay:

```powershell
python .\\prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_INDUCTIVE_LOWBLOCK_QGAP_MASS_FLOOR
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    audit = bounded_literal_audit()
    replays = critical_replays()
    NOTE.write_text(note_text(replays, audit), encoding="utf-8")
    payload = {
        "schema": "d1-spider-inductive-lowblock-qgap-mass-floor-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_SPIDER_INDUCTIVE_LOWBLOCK_QGAP_MASS_FLOOR",
        "theorem": {
            "H_cap": "q_j(H)<=min(empty_cap,q3_H_at_minimum_length3_count)",
            "K_cap": "q_(j-1)(K)<=min(empty_cap,q2_K_at_maximum_length2_count)",
            "induction_scope": "H and K are strictly smaller forests than the source tree",
            "scope": "all one-centre spiders and all supported ranks j>=4",
        },
        "critical_replays": replays,
        "bounded_literal_audit": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the low-block q-gap mass floor only.  Its unbounded "
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
