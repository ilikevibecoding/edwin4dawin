#!/usr/bin/env python3
"""All-order d=1,j=5 terminal-m0 certificate.

The conclusion is restricted to the root-degree-one rank-five sector under
the pinned smaller-forest strong-induction inputs.  It is not a proof of all
ranks, arbitrary root degree, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import (
    block_data,
    coefficient,
    tangent_ratio,
)
from derive_d1_j5_lowblock_symbolic_cones_adversary import all_cone_groups
from prove_balanced_subdivided_star_m0_row_correlation_adversary import k_min_row
from prove_d1_canonical_h_retained_dprev_reduction_adversary import (
    canonical_gap_row,
    sigma_floor,
)
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    linear_q2,
    linear_q3,
)
from prove_d1_spider_one_edge_decomposition_adversary import path_independence
from prove_d1_spider_quantitative_qgap_cap_adversary import (
    h_concentrated_row,
    k_coefficient_ceiling,
)
from prove_linear_forest_rank4_one_long_ceiling_adversary import ceiling_formula


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_low_newton_m0_d1_j5_exact_adversary_20260829.json"
NOTE = ROOT / "TERMINAL_Q3_LOW_NEWTON_M0_D1_J5_2026-08-29.md"
PINS = {
    "derive_d1_j5_lowblock_symbolic_cones_adversary.py": "B6D9025E3989A47815CC51D06306CE70A3790D395230976431E223BDC3B428C6",
    "prove_d1_canonical_h_retained_dprev_reduction_adversary.py": "05732280B99B74FE8E597AA223704A98D9108126748D0B87E67939F06766ACF8",
    "d1_canonical_h_retained_dprev_reduction_exact_adversary_20260829.json": "F08FC31D7127A47D99AE03D7D9C17ABF58139C4D4D5DB2C34D92EBBE14005C3B",
    "prove_balanced_subdivided_star_h_graft_residual_tangent_adversary.py": "EBB9BE9DD2394138685E462F2366E4E528473ED9AF9E2CA7141B5558201655AD",
    "balanced_subdivided_star_h_graft_residual_tangent_exact_adversary_20260829.json": "7800EDFB4FFED3D5B81B16069CF0921DFB39B2EA9938582FDB1270DCD5689042",
    "prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py": "25892589FA0312EC739AD1AC0A0C29CD2B5941CFC8A4C55EDDBC34F69D326D6F",
    "d1_spider_inductive_lowblock_qgap_mass_floor_exact_adversary_20260829.json": "A67530B1FE0E62B89BC02C3F97F3DB48D9BB36AE3F87C225D1A9114CFB61E741",
    "prove_balanced_subdivided_star_m0_row_correlation_adversary.py": "D9D4F8F7B7F3609C886B8FF354862DE9A5E15FBD7550A693ED3B3121B1BBD73E",
    "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json": "A7F2CD73425A74B26ADB20847DDDB2E87F44100D6438D62D0F612D21727164C7",
    "prove_linear_forest_rank4_one_long_ceiling_adversary.py": "9BD58D63085F4C07587E8CF1BC96BA0D535BEB2F10CE2410C23D546934CB6860",
    "linear_forest_rank4_one_long_ceiling_exact_adversary_20260829.json": "3FDE53E55B58609DA9C543719A370E68FAAB87BDC884D2B4244772B6D87B67DD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def exact_lowblock_cell(S: int, R: int, Y: int) -> dict[str, object]:
    """Rebuild one literal lower independently from the symbolic cone source."""
    rank = 5
    T = S - R
    N = S + 1
    assert S >= 14 and 1 <= Y <= min(R, T)
    data = block_data(N, rank, R, T, Y)
    a, P, A0, R0 = (int(data[name]) for name in ("a", "p0", "A0", "R0"))
    c0_numerator = A0 + a * R0
    assert c0_numerator % P == 0
    c0 = c0_numerator // P

    qH = linear_q3(S, R, Y, int(T > Y))
    kmax4 = k_coefficient_ceiling(T, Y, 4)[0]
    assert kmax4 == ceiling_formula(T, Y)
    if kmax4:
        qK = linear_q2(T, Y, min(Y, T - Y))
        included = (4 * qK + R) / 5
    else:
        qK = Fraction(0)
        included = Fraction(0)

    lead = Fraction(6 * A0)
    BH = (
        12 * A0
        + 6 * P * (c0 + R0)
        - 6 * P * (P + a)
        - 15 * P * (P + a) * qH
    )
    BK = (
        6 * A0
        + 6 * P * (c0 + R0)
        - 3 * P * (P + a)
        - 15 * P * (P + a) * included
    )
    assert qH >= data["uH"]
    assert included >= data["uI"]
    assert BH <= data["BH"] and BK <= data["BK"]

    canonical = h_concentrated_row(R, T, Y)
    path = tuple(path_independence(S))
    d4 = coefficient(canonical, 4) - coefficient(path, 4)
    d5 = coefficient(canonical, 5) - coefficient(path, 5)
    d4_formula = Fraction(
        R * R
        + R * S * S
        - 9 * R * S
        + 17 * R
        - S * S
        - 2 * S * Y
        + 11 * S
        + 10 * Y
        - 28,
        2,
    )
    d5_formula = Fraction(
        3 * R * R * S
        - 18 * R * R
        + R * S**3
        - 18 * R * S * S
        + 98 * R * S
        - 6 * R * Y
        - 150 * R
        - S**3
        - 3 * S * S * Y
        + 21 * S * S
        + 39 * S * Y
        - 140 * S
        - 114 * Y
        + 288,
        6,
    )
    B = T - Y
    if B == 0:
        d4_formula -= 1
        d5_formula -= R + Y - 8
    elif B == 1:
        d5_formula += 1
    assert d4 == d4_formula and d5 == d5_formula

    sigma = sigma_floor(S, rank)
    Q = canonical_gap_row(R, T, Y)
    assert coefficient(Q, 4) >= sigma * coefficient(Q, 3)
    Hlower = (
        lead * (coefficient(path, 4) + coefficient(path, 6))
        + BH * coefficient(path, 5)
        + lead * d4
        + (BH + lead * sigma) * d5
    )
    rho = tangent_ratio(S, rank)
    assert rho == Fraction((S - 9) * (S - 10), 2 * (S - 8))
    graft_common = BH + lead * rho
    assert graft_common >= 0

    kmin5 = k_min_row(T, Y, 5)[5]
    J = Hlower + lead * kmin5
    G = J + BK * kmax4
    lower = J if BK >= 0 else G
    assert lower >= 0
    return {
        "lower": lower,
        "J": J,
        "G": G,
        "BK": BK,
        "graft_common": graft_common,
        "qH": qH,
        "qK": qK,
        "d4": d4,
        "d5": d5,
        "kmin5": kmin5,
        "kmax4": kmax4,
    }


def symbolic_cone_audit() -> dict[str, object]:
    groups = all_cone_groups()
    cone_count = numerator_terms = denominator_terms = 0
    minimum_numerator_coefficient = None
    minimum_denominator_origin = None
    stream = hashlib.sha256()
    summaries = {}
    for group_name, records in groups.items():
        group_terms = group_denominator_terms = 0
        group_minimum = None
        for cone_name, status in records:
            assert status["negative"] == 0
            assert status["denominator_negative"] == 0
            assert status["denominator_at_origin"] > 0
            coefficient_minimum = int(status["minimum_coefficient"])
            group_minimum = (
                coefficient_minimum
                if group_minimum is None
                else min(group_minimum, coefficient_minimum)
            )
            minimum_numerator_coefficient = (
                coefficient_minimum
                if minimum_numerator_coefficient is None
                else min(minimum_numerator_coefficient, coefficient_minimum)
            )
            denominator_origin = int(status["denominator_at_origin"])
            minimum_denominator_origin = (
                denominator_origin
                if minimum_denominator_origin is None
                else min(minimum_denominator_origin, denominator_origin)
            )
            group_terms += int(status["terms"])
            group_denominator_terms += int(status["denominator_terms"])
            stream.update(
                (
                    f"{group_name}:{cone_name}:{status['terms']}:"
                    f"{status['minimum_coefficient']}:"
                    f"{status['numerator_stream_sha256']}:"
                    f"{status['denominator_terms']}:"
                    f"{status['denominator_at_origin']}:"
                    f"{status['denominator_stream_sha256']}\n"
                ).encode()
            )
            cone_count += 1
        numerator_terms += group_terms
        denominator_terms += group_denominator_terms
        summaries[group_name] = {
            "cones": len(records),
            "numerator_terms": group_terms,
            "denominator_terms": group_denominator_terms,
            "minimum_numerator_coefficient": group_minimum,
        }
    assert cone_count == 253
    return {
        "groups": summaries,
        "exhaustive_shifted_cones": cone_count,
        "numerator_coefficient_references": numerator_terms,
        "denominator_coefficient_references": denominator_terms,
        "minimum_numerator_coefficient": minimum_numerator_coefficient,
        "minimum_denominator_at_cone_origin": minimum_denominator_origin,
        "ordered_cone_stream_sha256": stream.hexdigest().upper(),
    }


def bounded_literal_audit() -> dict[str, object]:
    checks = positives = zeros = 0
    minimum_positive = None
    stream = hashlib.sha256()
    for S in range(14, 36):
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                cell = exact_lowblock_cell(S, R, Y)
                value = cell["lower"]
                record = (value, S + 1, R, T, Y)
                if value > 0:
                    positives += 1
                    minimum_positive = (
                        record if minimum_positive is None else min(minimum_positive, record)
                    )
                else:
                    assert value == 0
                    zeros += 1
                stream.update(
                    (
                        f"{S}:{R}:{T}:{Y}:{cell['qH']}:{cell['qK']}:"
                        f"{cell['d4']}:{cell['d5']}:{cell['graft_common']}:"
                        f"{cell['kmin5']}:{cell['kmax4']}:{cell['J']}:"
                        f"{cell['G']}:{cell['BK']}:{value}\n"
                    ).encode()
                )
                checks += 1
    return {
        "box": {"S": [14, 35], "j": 5},
        "exact_cells": checks,
        "positive": positives,
        "zero": zeros,
        "minimum_positive": [str(value) for value in minimum_positive],
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(cones: dict[str, object], literal: dict[str, object]) -> str:
    return f"""# All-order terminal m=0 certificate for d=1, j=5

Date: 2026-08-29

## Scope

This closes only the one-centre/root-degree-one rank-five sector, conditional
on the pinned smaller-forest strong-induction inputs.  It does not close
arbitrary root degree, the variable-rank d=1 tail, all terminal m=0, the
terminal-payment theorem, or Erdos Problem 993.

Put `A=R-Y>=0`, `B=T-Y>=0`, `S=R+T>=14`.  The low-block theorem permits

```text
u_H <= q3(H),
u_I <= (4 q2(K)+R)/5.
```

The exact cancelled functional is

```text
L=lead(H_4+H_6+K_5)+BH H_5+BK K_4,  lead=6A0>0.       (1)
```

The H graft tangent has

```text
rho=(S-9)(S-10)/(2(S-8)).
```

An exhaustive shifted cone proves `BH+lead*rho>=0`, so the actual H row is
at least the concentrated row `C`.  Retaining the previous-rank gap gives

```text
Hfunctional >= Hlower
=pathH+lead*D4+(BH+lead*sigma)*D5,
sigma=P_(S-4)[4]/P_(S-4)[3].                          (2)
```

The exact polynomial formulas for `D4,D5` are replayed literally.  The
verifier separately applies the `B=0` corrections `D4-=1`,
`D5-=(R+Y-8)`, and the `B=1` correction `D5+=1`; no generalized-binomial
continuation is used at these short-path faces.

For K, the frozen path-graft theorem gives `K5>=Kmin5`.  The independently
frozen rank-four motif theorem gives the all-order ceiling

```text
K4 <= Kmax4=[x^4](1+x)^(Y-1)P_(T-Y+1).                (3)
```

The `B-Y=0` and `B-Y=1` corrections to the polynomial continuation of
`Kmin5` are handled as separate cones.  Therefore it suffices to prove

```text
J=Hlower+lead*Kmin5 >=0,
G=J+BK*Kmax4 >=0.                                     (4)
```

If `BK>=0`, (1) is at least J; if `BK<0`, it is at least G.  This retains
the positive `lead*Kmin5` term and does not use the invalid discarded
matching-ceiling scalarization.

The complete domain is split into `B>=Y`, `1<=B<Y`, `B=0`, and all twelve
unsupported-`K4` faces.  The all-order audit checks
{cones['exhaustive_shifted_cones']} shifted cones and
{cones['numerator_coefficient_references']} numerator coefficient references.
Every numerator and denominator coefficient is nonnegative and every
denominator has positive cone-origin value.  The independent literal replay
checks {literal['exact_cells']} cells through `S=35`; it is a guard, not the
basis of the unbounded sign proof.
"""


def main() -> None:
    for filename, expected in PINS.items():
        actual = sha256(ROOT / filename)
        assert actual == expected, (filename, actual, expected)
    cones = symbolic_cone_audit()
    literal = bounded_literal_audit()
    NOTE.write_text(note_text(cones, literal), encoding="utf-8")
    payload = {
        "schema": "terminal-q3-low-newton-m0-d1-j5-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M0_D1_J5_CONDITIONAL_INDUCTION",
        "theorem": {
            "domain": "d=1,j=5,N>=15,1<=Y<=min(R,T), conditional smaller-forest strong induction",
            "lowblock_caps": "uH<=q3(H), uI<=(4*q2(K)+R)/5",
            "actual_H_to_canonical": "BH+lead*(S-9)*(S-10)/(2*(S-8))>=0",
            "retained_Dprev": "Hfunctional>=pathH+lead*D4+(BH+lead*sigma)*D5",
            "K_extrema": "K5>=Kmin5 and K4<=Kmax4(one-long-component theorem)",
            "branch_signs": "J>=0 and G>=0 on exhaustive shifted coefficient cones",
        },
        "dependency_sha256": PINS,
        "symbolic_cone_audit": cones,
        "bounded_literal_audit": literal,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This closes only d=1,j=5 under pinned induction inputs; arbitrary "
            "root degree, d=1 variable ranks, terminal m=0, and Erdos 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic_cone_audit", cones)
    print("bounded_literal_audit", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
