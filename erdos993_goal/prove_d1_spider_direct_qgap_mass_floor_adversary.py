#!/usr/bin/env python3
"""Exact all-order direct q-gap-mass floor for one-centre spiders.

This keeps the H and included-centre K blocks separate.  The final use of
``q_j<=q_3`` is explicitly a smaller-forest strong-induction input; the file
does not claim an independent proof of that envelope or of terminal m=0.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    h_max_row,
    k_min_row,
)
from prove_d1_spider_one_edge_decomposition_adversary import spider_formula
from prove_d1_spider_quantitative_qgap_cap_adversary import (
    h_concentrated_row,
    k_coefficient_ceiling,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_spider_direct_qgap_mass_floor_exact_adversary_20260829.json"
NOTE = ROOT / "D1_SPIDER_DIRECT_QGAP_MASS_FLOOR_2026-08-29.md"
PINS = {
    "prove_linear_forest_token_ratio_bound_adversary.py": "7B24E2C6BD2B1C9A025FD58BB36C17C6848613AD93845F1458F7A81CFD8FCE68",
    "linear_forest_token_ratio_bound_exact_adversary_20260829.json": "892A9D196EDFB0FBB530EF93127D8687A78E93CA403243925529EA928E4C415F",
    "prove_d1_spider_one_edge_decomposition_adversary.py": "D97B51A3DDE990F1A8675815F5172AF7B32A41CA0B2DD69C0E4A5A0F8FEE8C21",
    "d1_spider_one_edge_decomposition_exact_adversary_20260829.json": "F922735746F2D384F545F74321FC15F23A94B26DCA6FAAC947090A2F059A5420",
    "prove_d1_spider_quantitative_qgap_cap_adversary.py": "D9082960652CB4DD2DBD014CE32AD935474836EDB8143D5E42CE075BA5B4B4AF",
    "d1_spider_quantitative_qgap_cap_exact_adversary_20260829.json": "6C0030627F913ECACE5CA94DB831E35EB120F77E57BF9074D3DD56B11101E200",
    "prove_balanced_subdivided_star_m0_row_correlation_adversary.py": "D9D4F8F7B7F3609C886B8FF354862DE9A5E15FBD7550A693ED3B3121B1BBD73E",
    "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json": "A7F2CD73425A74B26ADB20847DDDB2E87F44100D6438D62D0F612D21727164C7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def coefficient(row: tuple[int, ...] | list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def direct_mass_floor(
    R: int, T: int, Y: int, rank: int, q3: Fraction
) -> dict[str, object]:
    """Rigorous lower floor for f_j(q3-q_j), given q_j<=q3.

    Zero coefficients are handled literally, so unlike the earlier scalar
    cap this statement also covers ranks at which the concentrated H row is
    unsupported.
    """
    assert 1 <= Y <= min(R, T)
    assert rank >= 3

    h_floor = coefficient(h_concentrated_row(R, T, Y), rank)
    h_ceiling = h_max_row(R, T, Y, rank)[rank]
    assert 0 <= h_floor <= h_ceiling

    k_floor = k_min_row(T, Y, rank - 1)[rank - 1]
    k_ceiling, maximizing_z = k_coefficient_ceiling(T, Y, rank - 1)
    assert 0 <= k_floor <= k_ceiling

    free_h = 2 * R + T - 2 * rank
    length_h = 2 * R + T - rank
    if h_ceiling:
        assert free_h >= 0 and length_h > 0
        q_h = Fraction(free_h, length_h)
    else:
        q_h = Fraction(0)

    target_tail = rank - 1
    free_k = T + Y - 2 * target_tail
    length_k = T + Y - target_tail
    if k_ceiling:
        assert free_k >= 0 and length_k > 0
        q_k = Fraction(free_k, length_k)
        q_included = (target_tail * q_k + R) / rank
    else:
        q_k = Fraction(0)
        q_included = Fraction(0)

    h_slope = q3 - q_h
    k_slope = q3 - q_included
    h_endpoint = h_floor if h_slope >= 0 else h_ceiling
    k_endpoint = k_floor if k_slope >= 0 else k_ceiling
    block_floor = h_endpoint * h_slope + k_endpoint * k_slope
    # The legitimate smaller-forest induction independently supplies
    # f_j(q3-q_j)>=0, so the stronger of the two lower floors may be retained.
    mass_floor = max(Fraction(0), block_floor)
    return {
        "mass_floor": mass_floor,
        "raw_block_floor": block_floor,
        "q_H_cap": q_h,
        "q_K_cap": q_k,
        "included_block_cap": q_included,
        "H_slope": h_slope,
        "K_slope": k_slope,
        "Hconc_rank": h_floor,
        "Hmax_rank": h_ceiling,
        "Kmin_previous_rank": k_floor,
        "Kmax_previous_rank": k_ceiling,
        "Kmax_deep_occupied_Z": maximizing_z,
        "H_endpoint": h_endpoint,
        "K_endpoint": k_endpoint,
    }


def bounded_literal_audit() -> dict[str, object]:
    allocations = ranks = endpoint_checks = 0
    minimum_mass_slack = None
    minimum_block_slack = None
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
                target_z = coefficient(Z, rank + 1)
                qj = Fraction(target_z, rank * fj)
                assert qj <= q3
                actual_mass = fj * (q3 - qj)
                floor = direct_mass_floor(arms, T, Y, rank, q3)
                assert actual_mass >= floor["mass_floor"]

                h = coefficient(H, rank)
                k = coefficient(K, rank - 1)
                assert fj == h + k
                assert coefficient(Z, rank + 1) == (
                    coefficient(ZH, rank + 1)
                    + coefficient(ZK, rank)
                    + coefficient(J, rank - 1)
                )
                if h:
                    assert coefficient(ZH, rank + 1) <= (
                        rank * h * floor["q_H_cap"]
                    )
                if k:
                    assert coefficient(ZK, rank) <= (
                        (rank - 1) * k * floor["q_K_cap"]
                    )
                    assert coefficient(J, rank - 1) <= arms * k
                literal_block = (
                    h * floor["H_slope"] + k * floor["K_slope"]
                )
                assert actual_mass >= literal_block >= floor["raw_block_floor"]
                mass_slack = actual_mass - floor["mass_floor"]
                block_slack = literal_block - floor["raw_block_floor"]
                minimum_mass_slack = (
                    mass_slack
                    if minimum_mass_slack is None
                    else min(minimum_mass_slack, mass_slack)
                )
                minimum_block_slack = (
                    block_slack
                    if minimum_block_slack is None
                    else min(minimum_block_slack, block_slack)
                )
                stream.update(
                    f"{subdivisions}:{rank}:{actual_mass}:{floor['mass_floor']}\n".encode()
                )
                ranks += 1
                endpoint_checks += 4
    return {
        "literal_spider_allocations": allocations,
        "supported_rank_checks": ranks,
        "row_endpoint_checks": endpoint_checks,
        "minimum_actual_mass_minus_floor": str(minimum_mass_slack),
        "minimum_literal_block_minus_endpoint_floor": str(minimum_block_slack),
        "ordered_mass_stream_sha256": stream.hexdigest().upper(),
    }


def corrected_N315_replay() -> dict[str, object]:
    subdivisions = (298, 1, 1, 1, 1, 1, 1, 1, 0)
    rank = 24
    F, Z, _ = spider_formula(subdivisions)
    q3 = Fraction(coefficient(Z, 4), 3 * coefficient(F, 3))
    qj = Fraction(coefficient(Z, rank + 1), rank * coefficient(F, rank))
    floor = direct_mass_floor(9, 305, 8, rank, q3)
    actual_mass = coefficient(F, rank) * (q3 - qj)
    assert actual_mass >= floor["mass_floor"] > 0
    return {
        "parameters": {"N": 315, "rank": rank, "R": 9, "T": 305, "Y": 8},
        "q3": str(q3),
        "qj": str(qj),
        "actual_qgap_mass": str(actual_mass),
        "rigorous_qgap_mass_floor": str(floor["mass_floor"]),
        "floor_details": {key: str(value) for key, value in floor.items()},
    }


def note_text(replay: dict[str, object], audit: dict[str, object]) -> str:
    return f"""# Direct q-gap-mass floor for one-centre spiders

Date: 2026-08-29

Let `F=H+xK` be the exact one-centre-spider split at rank `j`, with
`h=H_j`, `k=K_(j-1)`, and `f_j=h+k`.  Let `u_H` be the all-order
linear-forest token cap for `H`, and let

```text
u_I=((j-1)u_K+R)/j
```

be the cap for the included-centre block; the extra `R` comes from the exact
incident-centre term `J_(j-1)<=R k`.  The one-edge decomposition gives

```text
f_j(q3-q_j) >= h(q3-u_H)+k(q3-u_I).                 (1)
```

At fixed `(R,T,Y)`, use the frozen coefficientwise endpoints

```text
Hconc_j <= h <= Hmax_j,
Kmin_(j-1) <= k <= Kmax_(j-1).                      (2)
```

Choose the lower or upper endpoint in each block according to the sign of
its slope in (1).  This gives an explicit all-order block floor `L_j`.
The legitimate smaller-forest strong-induction input `q_j(F)<=q3(F)` is
noncircular because `F` has one fewer vertex than the source tree; it gives
the combined quantitative floor

```text
f_j(q3-q_j) >= max(0,L_j).                          (3)
```

Zero H or K rows are handled literally, so (3) is not restricted to common
Hconc-supported ranks.

At the corrected N=315 obstruction, (3) gives
`{replay['rigorous_qgap_mass_floor']}`.  The bounded literal replay checked
{audit['literal_spider_allocations']} spiders and
{audit['supported_rank_checks']} supported ranks.

This theorem is the direct quantitative reserve lemma only.  It does not
prove that the floor pays the terminal m=0 certificate at every unbounded
parameter value, does not cover `d>1`, and does not prove Erdos Problem 993.

Replay:

```powershell
python .\\prove_d1_spider_direct_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_DIRECT_QGAP_MASS_FLOOR
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    audit = bounded_literal_audit()
    replay = corrected_N315_replay()
    NOTE.write_text(note_text(replay, audit), encoding="utf-8")
    payload = {
        "schema": "d1-spider-direct-qgap-mass-floor-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_SPIDER_DIRECT_QGAP_MASS_FLOOR",
        "theorem": {
            "block_floor": "f_j(q3-q_j)>=h_j(q3-u_H)+k_(j-1)(q3-u_I)",
            "endpoint_floor": "L_j=H_endpoint*(q3-u_H)+K_endpoint*(q3-u_I)",
            "inductive_floor": "f_j(q3-q_j)>=max(0,L_j)",
            "induction_scope": "q_j(F)<=q3(F) for the smaller forest F",
            "scope": "all one-centre spiders and all supported ranks j>=3",
        },
        "corrected_N315_replay": replay,
        "bounded_literal_audit": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the direct q-gap-mass floor only.  Its all-order "
            "payment of terminal m=0 and all d>1 sectors remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("N315", replay)
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
