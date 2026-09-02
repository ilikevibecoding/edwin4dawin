#!/usr/bin/env python3
"""All-rank R=Y=1 boundary theorem for d=1 terminal m=0."""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import (
    block_data,
    coefficient,
)
from derive_d1_j5_lowblock_symbolic_cones_adversary import (
    linear_q2_symbolic,
    linear_q3_symbolic,
    polynomial_status,
)
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    linear_q2,
    linear_q3,
)
from prove_d1_spider_one_edge_decomposition_adversary import path_independence


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_low_newton_m0_d1_r1_allrank_exact_adversary_20260829.json"
NOTE = ROOT / "TERMINAL_Q3_LOW_NEWTON_M0_D1_R1_ALLRANK_2026-08-29.md"
PINS = {
    "prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py": "25892589FA0312EC739AD1AC0A0C29CD2B5941CFC8A4C55EDDBC34F69D326D6F",
    "d1_spider_inductive_lowblock_qgap_mass_floor_exact_adversary_20260829.json": "A67530B1FE0E62B89BC02C3F97F3DB48D9BB36AE3F87C225D1A9114CFB61E741",
    "prove_d1_spider_one_edge_decomposition_adversary.py": "D97B51A3DDE990F1A8675815F5172AF7B32A41CA0B2DD69C0E4A5A0F8FEE8C21",
    "d1_spider_one_edge_decomposition_exact_adversary_20260829.json": "F922735746F2D384F545F74321FC15F23A94B26DCA6FAAC947090A2F059A5420",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def symbolic_margin():
    """Return the normalized central-support scalar with S=2j+w."""
    j, w = sp.symbols("j w", integer=True, nonnegative=True)
    S = 2 * j + w
    R = sp.Integer(1)
    T = S - 1
    Y = sp.Integer(1)
    a = S * (S - 1) / 2
    P = (S**3 + 5 * S) / 6
    c0 = 3 + 2 * S**2 - 5 * S
    R0 = (
        R**3
        - 2 * R**2 * S
        + 2 * R**2
        + 2 * R * S
        + 6 * R * Y
        - 9 * R
        + S**3
        - 4 * S**2
        + 9 * S
        - 6 * Y
    ) / 2
    A0 = sp.expand(P * c0 - a * R0)
    U = P * (c0 + R0)
    V = P * (P + a)
    qH = linear_q3_symbolic(S, R, T, Y, 1)
    qK = linear_q2_symbolic(T, Y, 1)
    lead = (j + 1) * A0
    BH = 2 * lead + (j + 1) * U - 6 * V - 3 * j * V * qH
    BK = lead + (j + 1) * U - 3 * V - 3 * V * ((j - 1) * qK + 1)

    # Divide the exact path-row functional by P_S[j]>0.  These four ratios
    # follow directly from adjacent binomial coefficients.
    p_previous = j * (j + w + 2) / ((w + 2) * (w + 3))
    p_next = w * (w + 1) / ((j + w + 1) * (j + 1))
    k_current = (w + 1) / (j + w + 1)
    k_previous = j / (w + 2)
    margin = sp.together(
        lead * (p_previous + p_next + k_current) + BH + BK * k_previous
    )
    return j, w, margin


def symbolic_cone_audit() -> dict[str, object]:
    j, w, margin = symbolic_margin()
    k, q = sp.symbols("k q", integer=True, nonnegative=True)
    cases = {
        # j>=7 and w>=0 automatically imply S>=14.
        "central_j7plus": polynomial_status(
            sp.together(margin.subs(j, 7 + k)), (k, w)
        ),
        # The only remaining central rank is j=6, where S>=14 means w>=2.
        "central_j6": polynomial_status(
            sp.together(margin.subs({j: 6, w: 2 + q})), (q,)
        ),
        # Odd top support S=2j-1.
        "top_w_minus1": polynomial_status(
            sp.together(margin.subs({j: 8 + k, w: -1})), (k,)
        ),
    }

    # Even top support S=2j-2 has P_S[j]=0, so it must be rebuilt before
    # normalization.  Here H_(j-1)=j and K_(j-1)=1; all other displayed rows
    # vanish.
    j2 = 8 + k
    S2 = 2 * j2 - 2
    R = sp.Integer(1)
    Y = sp.Integer(1)
    T2 = S2 - 1
    a2 = S2 * (S2 - 1) / 2
    P2 = (S2**3 + 5 * S2) / 6
    c02 = 3 + 2 * S2**2 - 5 * S2
    R02 = (
        R**3
        - 2 * R**2 * S2
        + 2 * R**2
        + 2 * R * S2
        + 6 * R * Y
        - 9 * R
        + S2**3
        - 4 * S2**2
        + 9 * S2
        - 6 * Y
    ) / 2
    A02 = sp.expand(P2 * c02 - a2 * R02)
    U2 = P2 * (c02 + R02)
    V2 = P2 * (P2 + a2)
    qK2 = linear_q2_symbolic(T2, Y, 1)
    lead2 = (j2 + 1) * A02
    BK2 = (
        lead2
        + (j2 + 1) * U2
        - 3 * V2
        - 3 * V2 * ((j2 - 1) * qK2 + 1)
    )
    cases["top_w_minus2"] = polynomial_status(
        sp.together(lead2 * j2 + BK2), (k,)
    )

    stream = hashlib.sha256()
    for name, status in cases.items():
        assert status["negative"] == 0
        assert status["denominator_negative"] == 0
        assert status["denominator_at_origin"] > 0
        stream.update(
            (
                f"{name}:{status['terms']}:{status['minimum_coefficient']}:"
                f"{status['numerator_stream_sha256']}:"
                f"{status['denominator_terms']}:{status['denominator_at_origin']}:"
                f"{status['denominator_stream_sha256']}\n"
            ).encode()
        )
    serializable_cases = {
        name: {
            "terms": int(status["terms"]),
            "negative": int(status["negative"]),
            "minimum_coefficient": int(status["minimum_coefficient"]),
            "numerator_stream_sha256": status["numerator_stream_sha256"],
            "denominator_terms": int(status["denominator_terms"]),
            "denominator_negative": int(status["denominator_negative"]),
            "denominator_at_origin": int(status["denominator_at_origin"]),
            "denominator_stream_sha256": status["denominator_stream_sha256"],
        }
        for name, status in cases.items()
    }
    return {
        "cases": serializable_cases,
        "minimum_numerator_coefficient": min(
            int(status["minimum_coefficient"]) for status in cases.values()
        ),
        "ordered_case_stream_sha256": stream.hexdigest().upper(),
    }


def exact_cell(S: int, rank: int) -> Fraction:
    R = Y = 1
    T = S - 1
    data = block_data(S + 1, rank, R, T, Y)
    a, P, A0, R0 = (int(data[name]) for name in ("a", "p0", "A0", "R0"))
    c0 = (A0 + a * R0) // P
    qH = linear_q3(S, R, Y, 1)
    H = tuple(path_independence(S))
    K = tuple(path_independence(S - 1))
    k_previous = coefficient(K, rank - 1)
    if k_previous:
        qK = linear_q2(T, Y, 1)
        included = ((rank - 1) * qK + 1) / rank
    else:
        qK = Fraction(0)
        included = Fraction(0)
    lead = Fraction((rank + 1) * A0)
    BH = (
        2 * (rank + 1) * A0
        + (rank + 1) * P * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * rank * P * (P + a) * qH
    )
    BK = (
        (rank + 1) * A0
        + (rank + 1) * P * (c0 + R0)
        - 3 * P * (P + a)
        - 3 * rank * P * (P + a) * included
    )
    assert qH >= data["uH"] and included >= data["uI"]
    assert BH <= data["BH"] and BK <= data["BK"]
    lower = (
        lead
        * (
            coefficient(H, rank - 1)
            + coefficient(H, rank + 1)
            + coefficient(K, rank)
        )
        + BH * coefficient(H, rank)
        + BK * coefficient(K, rank - 1)
    )
    assert lower > 0
    return lower


def bounded_literal_audit() -> dict[str, object]:
    checks = 0
    minimum = None
    stream = hashlib.sha256()
    for S in range(14, 121):
        # F=H+xK is supported exactly through floor((S+2)/2).
        for rank in range(6, (S + 2) // 2 + 1):
            value = exact_cell(S, rank)
            record = (value, S + 1, rank)
            minimum = record if minimum is None else min(minimum, record)
            stream.update(f"{S}:{rank}:{value}\n".encode())
            checks += 1
    return {
        "box": {"S": [14, 120], "rank": "all supported j>=6"},
        "exact_cells": checks,
        "positive": checks,
        "minimum_positive": [str(value) for value in minimum],
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(literal: dict[str, object]) -> str:
    return f"""# All-rank R=Y=1 boundary for d=1 terminal m=0

Date: 2026-08-29

## Scope

This theorem covers only `d=1,R=Y=1,N>=15` and every supported target rank
`j>=6`, conditional on the pinned smaller-forest induction inputs.  The
already frozen `d=1,j=4` and `d=1,j=5` theorems cover those two ranks.  This
does not cover `R>1`, the whole `d=1` sector, arbitrary root degree, all
terminal m=0, or Erdos Problem 993.

On this boundary the two exact rows are simply

```text
H=P_S,  K=P_(S-1).
```

The low-block caps are `u_H<=q3(P_S)` and
`u_I<=((j-1)q2(P_(S-1))+1)/j`.  Put `S=2j+w`.  For `w>=-1`, divide the
cancelled terminal lower by `P_S[j]>0` and use

```text
P_S[j-1]/P_S[j]=j(j+w+2)/((w+2)(w+3)),
P_S[j+1]/P_S[j]=w(w+1)/((j+w+1)(j+1)),
P_(S-1)[j]/P_S[j]=(w+1)/(j+w+1),
P_(S-1)[j-1]/P_S[j]=j/(w+2).                         (1)
```

After substituting the exact low-block constants, four disjoint cones cover
all supported `j>=6,S>=14`:

```text
j>=7,w>=0;  j=6,w>=2;  w=-1,j>=8;  w=-2,j>=8.
```

The last face has `P_S[j]=0` and is rebuilt literally before normalization:
`H_(j-1)=j`, `K_(j-1)=1`, and the other displayed rows vanish.  Every
cleared numerator and denominator coefficient in all four cones is
nonnegative, and each denominator has positive origin.  This is the
all-order sign proof.  The independent literal replay checks
{literal['exact_cells']} supported cells through `S=120`; it is a guard, not
finite extrapolation.
"""


def main() -> None:
    for filename, expected in PINS.items():
        assert sha256(ROOT / filename) == expected, filename
    symbolic = symbolic_cone_audit()
    literal = bounded_literal_audit()
    NOTE.write_text(note_text(literal), encoding="utf-8")
    payload = {
        "schema": "terminal-q3-low-newton-m0-d1-r1-allrank-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M0_D1_R1_ALL_SUPPORTED_RANKS_CONDITIONAL_INDUCTION",
        "theorem": {
            "domain": "d=1,R=Y=1,N>=15, every supported j>=6",
            "rows": "H=P_S,K=P_(S-1)",
            "cones": "j>=7,w>=0; j=6,w>=2; w=-1,j>=8; w=-2,j>=8",
            "conclusion": "the exact q3/q2-capped terminal m0 lower is positive",
        },
        "dependency_sha256": PINS,
        "symbolic_cone_audit": symbolic,
        "bounded_literal_audit": literal,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This closes only the R=Y=1 boundary for supported j>=6 under "
            "pinned induction; R>1, full d=1, terminal m=0, and Erdos 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic_cone_audit", symbolic)
    print("bounded_literal_audit", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
