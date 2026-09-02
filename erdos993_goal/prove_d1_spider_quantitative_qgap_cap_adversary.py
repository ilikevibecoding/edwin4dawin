#!/usr/bin/env python3
"""All-order quantitative q-gap cap for a one-centre spider.

The theorem supplies a rigorous upper bound on q_j from correlated H/K rows.
Combining it with the legitimate inductive q_j<=q_3 input gives a positive
q_3-q_j floor whenever the displayed cap lies below q_3.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from functools import lru_cache
from math import comb
from pathlib import Path

from prove_balanced_subdivided_star_m0_row_correlation_adversary import h_max_row
from prove_d1_spider_one_edge_decomposition_adversary import (
    path_independence,
    product,
    spider_formula,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_spider_quantitative_qgap_cap_exact_adversary_20260829.json"
NOTE = ROOT / "D1_SPIDER_QUANTITATIVE_QGAP_CAP_2026-08-29.md"
PINS = {
    "prove_linear_forest_token_ratio_bound_adversary.py": "7B24E2C6BD2B1C9A025FD58BB36C17C6848613AD93845F1458F7A81CFD8FCE68",
    "linear_forest_token_ratio_bound_exact_adversary_20260829.json": "892A9D196EDFB0FBB530EF93127D8687A78E93CA403243925529EA928E4C415F",
    "prove_d1_spider_one_edge_decomposition_adversary.py": "D97B51A3DDE990F1A8675815F5172AF7B32A41CA0B2DD69C0E4A5A0F8FEE8C21",
    "d1_spider_one_edge_decomposition_exact_adversary_20260829.json": "F922735746F2D384F545F74321FC15F23A94B26DCA6FAAC947090A2F059A5420",
    "prove_balanced_subdivided_star_h_graft_residual_tangent_adversary.py": "EBB9BE9DD2394138685E462F2366E4E528473ED9AF9E2CA7141B5558201655AD",
    "balanced_subdivided_star_h_graft_residual_tangent_exact_adversary_20260829.json": "7800EDFB4FFED3D5B81B16069CF0921DFB39B2EA9938582FDB1270DCD5689042",
    "prove_balanced_subdivided_star_m0_row_correlation_adversary.py": "D9D4F8F7B7F3609C886B8FF354862DE9A5E15FBD7550A693ED3B3121B1BBD73E",
    "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json": "A7F2CD73425A74B26ADB20847DDDB2E87F44100D6438D62D0F612D21727164C7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def coefficient(row: tuple[int, ...] | list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


@lru_cache(maxsize=None)
def h_concentrated_row(R: int, T: int, Y: int) -> tuple[int, ...]:
    return product(
        [path_independence(1)] * (R - Y)
        + [path_independence(T - Y + 2)]
        + [path_independence(2)] * (Y - 1)
    )


@lru_cache(maxsize=None)
def k_coefficient_ceiling(T: int, Y: int, rank: int) -> tuple[int, int]:
    """Return (ceiling, maximizing Z=#{ell_i>=2})."""
    if T == Y:
        return C(Y, rank), 0
    best = -1
    best_z = -1
    for deep_occupied in range(1, min(Y, T - Y) + 1):
        row = h_max_row(Y, T - Y, deep_occupied, rank)
        value = row[rank]
        if value > best:
            best, best_z = value, deep_occupied
    assert best >= 0 and best_z >= 1
    return best, best_z


@lru_cache(maxsize=None)
def quantitative_cap(
    R: int, T: int, Y: int, rank: int
) -> dict[str, object] | None:
    """Rigorous q_rank cap; None means the common H floor is unsupported."""
    assert 1 <= Y <= min(R, T)
    N = 1 + R + T
    Hfloor = h_concentrated_row(R, T, Y)
    h_floor = coefficient(Hfloor, rank)
    if not h_floor:
        return None
    k_ceiling, maximizing_z = k_coefficient_ceiling(T, Y, rank - 1)
    weight = Fraction(k_ceiling, h_floor)

    free_h = (N - 1) - 2 * rank + R
    length_h = free_h + rank
    assert free_h >= 0 and length_h > 0
    q_h = Fraction(free_h, length_h)

    target_tail = rank - 1
    free_k = T - 2 * target_tail + Y
    length_k = free_k + target_tail
    if k_ceiling:
        assert free_k >= 0 and length_k > 0
        q_k = Fraction(free_k, length_k)
        included = (target_tail * q_k + R) / rank
    else:
        q_k = Fraction(0)
        included = Fraction(0)

    weighted_endpoint = (q_h + weight * included) / (1 + weight)
    cap = max(q_h, weighted_endpoint)
    return {
        "cap": cap,
        "q_H_cap": q_h,
        "q_K_cap": q_k,
        "included_block_cap": included,
        "k_over_h_cap": weight,
        "Hconc_rank": h_floor,
        "Kmax_previous_rank": k_ceiling,
        "Kmax_deep_occupied_Z": maximizing_z,
        "weighted_endpoint": weighted_endpoint,
    }


def bounded_literal_audit() -> dict[str, object]:
    allocations = rank_checks = quantitative_checks = unsupported = 0
    minimum_cap_slack = None
    minimum_gap_floor_slack = None
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
            allocations += 1
            for rank in range(3, len(F)):
                fj = coefficient(F, rank)
                if not fj:
                    continue
                target_z = coefficient(Z, rank + 1)
                actual_q = Fraction(target_z, rank * fj)
                cap_data = quantitative_cap(arms, T, Y, rank)
                if cap_data is None:
                    unsupported += 1
                    continue
                cap = cap_data["cap"]
                assert isinstance(cap, Fraction)
                assert actual_q <= cap

                # Independently replay the exact two-block mixture and each
                # numerator location in Z=ZH+xZK+x^2J.
                h = coefficient(H, rank)
                k = coefficient(K, rank - 1)
                assert fj == h + k
                assert target_z == (
                    coefficient(ZH, rank + 1)
                    + coefficient(ZK, rank)
                    + coefficient(J, rank - 1)
                )
                if h:
                    qh = Fraction(coefficient(ZH, rank + 1), rank * h)
                    assert qh <= cap_data["q_H_cap"]
                if k:
                    qk_numerator = coefficient(ZK, rank)
                    qk = Fraction(qk_numerator, (rank - 1) * k) if rank > 1 else Fraction(0)
                    assert qk <= cap_data["q_K_cap"]
                    assert coefficient(J, rank - 1) <= arms * k
                    assert Fraction(k, h) <= cap_data["k_over_h_cap"]
                slack = cap - actual_q
                minimum_cap_slack = slack if minimum_cap_slack is None else min(minimum_cap_slack, slack)

                if coefficient(F, 3):
                    q3 = Fraction(coefficient(Z, 4), 3 * coefficient(F, 3))
                    # This floor additionally uses the legitimate inductive
                    # envelope q_rank<=q3.
                    floor = max(Fraction(0), q3 - cap)
                    actual_gap = q3 - actual_q
                    assert actual_gap >= floor
                    floor_slack = actual_gap - floor
                    minimum_gap_floor_slack = (
                        floor_slack
                        if minimum_gap_floor_slack is None
                        else min(minimum_gap_floor_slack, floor_slack)
                    )
                    quantitative_checks += 1
                rank_checks += 1
                stream.update(
                    f"{subdivisions}:{rank}:{actual_q}:{cap}\n".encode()
                )
    return {
        "literal_spider_allocations": allocations,
        "supported_cap_checks": rank_checks,
        "inductive_qgap_floor_checks": quantitative_checks,
        "unsupported_common_H_floor_rows": unsupported,
        "minimum_qcap_slack": str(minimum_cap_slack),
        "minimum_qgap_floor_slack": str(minimum_gap_floor_slack),
        "ordered_cap_stream_sha256": stream.hexdigest().upper(),
    }


def corrected_N315_replay() -> dict[str, object]:
    subdivisions = (298, 1, 1, 1, 1, 1, 1, 1, 0)
    rank = 24
    F, Z, _ = spider_formula(subdivisions)
    q3 = Fraction(coefficient(Z, 4), 3 * coefficient(F, 3))
    qj = Fraction(coefficient(Z, rank + 1), rank * coefficient(F, rank))
    cap_data = quantitative_cap(9, 305, 8, rank)
    assert cap_data is not None
    cap = cap_data["cap"]
    floor = max(Fraction(0), q3 - cap)
    required = Fraction(
        2555205982135450061559820301822794209491999803,
        3338465406782362201721217274608106386382551624000,
    )
    assert q3 - qj >= floor > required > 0
    return {
        "parameters": {"N": 315, "rank": rank, "R": 9, "T": 305, "Y": 8},
        "q3": str(q3),
        "qj": str(qj),
        "actual_qgap": str(q3 - qj),
        "rigorous_qgap_floor": str(floor),
        "minimum_required_qgap": str(required),
        "floor_over_required": str(floor / required),
        "cap_details": {key: str(value) for key, value in cap_data.items()},
    }


def note_text(replay: dict[str, object], audit: dict[str, object]) -> str:
    return f"""# Quantitative q-gap cap for one-centre spiders

Date: 2026-08-29

Let `F` be a spider with `R` arms, subdivision counts `ell_i>=0`, total
`T=sum ell_i`, and `Y=#{{i:ell_i>0}}`.  Put

```text
H=product_i P_(ell_i+1),   K=product_i P_(ell_i),
F=H+xK.
```

At target rank `j`, write `h=[x^j]H`, `k=[x^(j-1)]K`.  The exact one-edge
decomposition and the all-order linear-forest token-ratio theorem give

```text
q_j(H) <= u_H=(R+T-2j+R)/(R+T-j+R),
q_(j-1)(K) <= u_K=(T-2j+2+Y)/(T-j+1+Y),
included block <= u_I=((j-1)u_K+R)/j.               (1)
```

The incident-centre term is at most `Rk`.  The frozen path-graft theorems
give the correlated row bounds

```text
h >= Hconc_j,
Hconc=(1+x)^(R-Y) P_(T-Y+2) P_2^(Y-1),
k <= Kmax_(j-1),                                    (2)
```

where `Kmax` is the maximum, over the feasible value
`Z=#{{i:ell_i>=2}}`, of the frozen Hmax row with parameters
`(R,T,Y)=(Y,T-Y,Z)`.  Hence `w=k/h<=w*=Kmax/Hconc`, and

```text
q_j(F) <= U_j=max(u_H,(u_H+w* u_I)/(1+w*)).          (3)
```

Under the legitimate smaller-forest induction `q_j(F)<=q_3(F)`, (3) gives
the quantitative reserve

```text
q_3(F)-q_j(F) >= max(0,q_3(F)-U_j).                  (4)
```

At the corrected N=315 obstruction, the floor in (4) is
`{replay['rigorous_qgap_floor']}`, while the terminal deficit requires only
`{replay['minimum_required_qgap']}`.  Their exact ratio is
`{replay['floor_over_required']}`.

The bounded literal replay checked {audit['literal_spider_allocations']}
spider allocations and {audit['supported_cap_checks']} supported cap rows.

This theorem supplies a rigorous q-gap floor on the displayed supported
one-centre-spider rows.  It does not prove that this floor pays the terminal
margin at every parameter value, does not cover `d>1`, and does not by itself
prove terminal Newton `m=0` or Erdos Problem 993.

Replay:

```powershell
python .\\prove_d1_spider_quantitative_qgap_cap_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_QUANTITATIVE_QGAP_CAP
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    audit = bounded_literal_audit()
    replay = corrected_N315_replay()
    NOTE.write_text(note_text(replay, audit), encoding="utf-8")
    payload = {
        "schema": "d1-spider-quantitative-qgap-cap-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_SPIDER_QUANTITATIVE_QGAP_CAP",
        "theorem": {
            "qj_cap": "q_j(F)<=max(u_H,(u_H+w_star*u_I)/(1+w_star))",
            "inductive_gap_floor": "q3-q_j>=max(0,q3-qj_cap)",
            "row_weight": "w_star=Kmax_(j-1)/Hconc_j",
            "scope": "one-centre spiders on supported Hconc target rows",
        },
        "corrected_N315_replay": replay,
        "bounded_literal_audit": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves the q-gap cap only.  The all-order payment of the "
            "terminal m=0 margin and all d>1 sectors remain separate obligations."
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
