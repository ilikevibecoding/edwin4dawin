#!/usr/bin/env python3
"""Exact all-order leaf base for the stable-B canonical-J recurrence.

The theorem is deliberately narrow: A=0,Y=1, N>=15, target rank j>=4,
and only the J branch of the conditional d=1 terminal-m0 lower.  The A/Y
lifts, the negative-BK G branch, the nonstable B band, arbitrary root degree,
and Erdos Problem 993 remain separate obligations.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import comb
from pathlib import Path

import sympy as sp

from derive_d1_stable_B_J_recurrence_leaf_base_adversary import (
    derive_cases,
    leaf_R_literal,
    leaf_R_normalized,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_stable_B_J_recurrence_leaf_base_exact_adversary_20260829.json"
NOTE = ROOT / "D1_STABLE_B_J_RECURRENCE_LEAF_BASE_2026-08-29.md"
PINS = {
    "derive_d1_stable_B_J_recurrence_leaf_base_adversary.py": "0739870F9DC30F1B1DB5196D9C8831D45BE4290E2F7A4F6CC8246BF47356F1E8",
    "prove_d1_canonical_h_retained_dprev_reduction_adversary.py": "05732280B99B74FE8E597AA223704A98D9108126748D0B87E67939F06766ACF8",
    "d1_canonical_h_retained_dprev_reduction_exact_adversary_20260829.json": "F08FC31D7127A47D99AE03D7D9C17ABF58139C4D4D5DB2C34D92EBBE14005C3B",
    "prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py": "25892589FA0312EC739AD1AC0A0C29CD2B5941CFC8A4C55EDDBC34F69D326D6F",
    "d1_spider_inductive_lowblock_qgap_mass_floor_exact_adversary_20260829.json": "A67530B1FE0E62B89BC02C3F97F3DB48D9BB36AE3F87C225D1A9114CFB61E741",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_stream(expression) -> str:
    stream = hashlib.sha256()
    symbols = tuple(sorted(expression.free_symbols, key=str))
    terms = sp.Poly(expression, *symbols).terms() if symbols else [((), expression)]
    for monomial, coefficient in terms:
        stream.update(f"{monomial}:{coefficient}\n".encode())
    return stream.hexdigest().upper()


def symbolic_audit() -> dict[str, object]:
    cases, top = derive_cases()
    summaries = {}
    combined = hashlib.sha256()
    numerator_terms = denominator_terms = 0
    minimum_numerator = minimum_denominator = None
    for name, status in cases.items():
        assert not status["negative_numerator"], (name, status["negative_numerator"])
        assert not status["negative_denominator"], (name, status["negative_denominator"])
        assert status["denominator_at_origin"] > 0
        numerator_sha = expression_stream(status["numerator"])
        denominator_sha = expression_stream(status["denominator"])
        combined.update(
            (
                f"{name}:{numerator_sha}:{denominator_sha}:"
                f"{status['numerator_terms']}:{status['denominator_terms']}:"
                f"{status['minimum_numerator_coefficient']}:"
                f"{status['minimum_denominator_coefficient']}:"
                f"{status['denominator_at_origin']}\n"
            ).encode()
        )
        numerator_terms += int(status["numerator_terms"])
        denominator_terms += int(status["denominator_terms"])
        nmin = int(status["minimum_numerator_coefficient"])
        dmin = int(status["minimum_denominator_coefficient"])
        minimum_numerator = nmin if minimum_numerator is None else min(minimum_numerator, nmin)
        minimum_denominator = dmin if minimum_denominator is None else min(minimum_denominator, dmin)
        summaries[name] = {
            "numerator_terms": int(status["numerator_terms"]),
            "denominator_terms": int(status["denominator_terms"]),
            "minimum_numerator_coefficient": nmin,
            "minimum_denominator_coefficient": dmin,
            "denominator_at_origin": str(status["denominator_at_origin"]),
            "numerator_stream_sha256": numerator_sha,
            "denominator_stream_sha256": denominator_sha,
        }

    j = next(iter(top["top_w_minus_2"].free_symbols))
    expected_minus_2 = (
        (j - 1)
        * (2 * j - 3)
        * (24 * j**4 - 44 * j**3 - 28 * j**2 + 67 * j - 36)
        / 3
    )
    expected_minus_3 = (
        2
        * (j - 2)
        * (24 * j**4 - 92 * j**3 + 44 * j**2 + 105 * j - 27)
        / 3
    )
    assert sp.cancel(top["top_w_minus_2"] - expected_minus_2) == 0
    assert sp.cancel(top["top_w_minus_3"] - expected_minus_3) == 0
    return {
        "cases": summaries,
        "symbolic_cases": len(summaries),
        "numerator_coefficient_references": numerator_terms,
        "denominator_coefficient_references": denominator_terms,
        "minimum_numerator_coefficient": minimum_numerator,
        "minimum_denominator_coefficient": minimum_denominator,
        "ordered_case_stream_sha256": combined.hexdigest().upper(),
        "top_face_factorizations": {
            "w=-2": str(sp.factor(expected_minus_2)),
            "w=-3": str(sp.factor(expected_minus_3)),
        },
    }


def literal_audit() -> dict[str, object]:
    checks = positive = zero = 0
    minimum_positive = None
    stream = hashlib.sha256()
    for S in range(14, 121):
        # j beyond this range has w<=-4 and all three recurrence terms vanish.
        for j in range(4, S + 4):
            w = S - 2 * j
            value = sp.cancel(leaf_R_literal(S, j))
            if w >= -1:
                base = comb(S + 1 - j, j)
                normalized = leaf_R_normalized(sp.Integer(S), sp.Integer(j))
                assert sp.cancel(value - base * normalized) == 0
            elif w <= -4:
                assert value == 0
            assert value >= 0, (S, j, w, value)
            if value > 0:
                positive += 1
                record = (value, S + 1, j, w)
                minimum_positive = record if minimum_positive is None else min(minimum_positive, record)
            else:
                zero += 1
            stream.update(f"{S}:{j}:{w}:{value}\n".encode())
            checks += 1
    return {
        "box": {"S": [14, 120], "j": [4, "S+3"]},
        "literal_recurrence_checks": checks,
        "positive": positive,
        "zero": zero,
        "minimum_positive": [str(value) for value in minimum_positive],
        "ordered_literal_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(symbolic: dict[str, object], literal: dict[str, object]) -> str:
    return f"""# Stable-B canonical-J recurrence: exact leaf base

Date: 2026-08-29

## Scope

This is the exact `A=0,Y=1` base only.  It proves neither the `A/Y` lifts,
the `G` branch needed when `BK<0`, the nonstable band `B<=Y+1`, arbitrary
root degree, terminal `m=0`, nor Erdos Problem #993.

On this face `S=B+2`, `H=P_S`, and `Kmin=P_(S-1)`.  Let `J_S(j)` denote
the canonical conditional lower

```text
J_S(j)=(j+1)A0(S)(P_S[j-1]+P_S[j+1]+P_(S-1)[j])
       +BH(S,j)P_S[j],
```

where `BH` uses the legitimate smaller-forest input `q_j<=q3`.  The theorem
is

```text
RJ(S,j)=J_S(j)-J_(S-1)(j)-J_(S-2)(j-1) >= 0          (1)
```

for `S>=14`, `j>=4`.  Equivalently, the leaf row satisfies the stable path
recurrence coefficientwise from rank four onward.

For `w=S-2j>=-1`, divide (1) by the positive path coefficient `P_S[j]` and
write every adjacent row ratio explicitly.  The unbounded domain splits as

```text
j>=7,w>=0; j=6,w>=2; j=5,w>=4; j=4,w>=6; w=-1,j>=8.
```

After the indicated shifts, every numerator and denominator coefficient is
nonnegative and each denominator is positive at the cone origin.  The audit
contains {symbolic['symbolic_cases']} exact cones,
{symbolic['numerator_coefficient_references']} numerator coefficient
references, and minimum numerator coefficient
{symbolic['minimum_numerator_coefficient']}.

The remaining supported faces are literal, not generalized-binomial:

```text
w=-2: (j-1)(2j-3)(24j^4-44j^3-28j^2+67j-36)/3,
w=-3: 2(j-2)(24j^4-92j^3+44j^2+105j-27)/3.
```

Their shifts `j=8+u` and `j=9+u` are coefficient-positive.  For `w<=-4`
all three terms in (1) vanish.  The independent literal replay checked
{literal['literal_recurrence_checks']} cells through `S=120`; it guards the
formulas but is not the basis of the unbounded proof.
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    symbolic = symbolic_audit()
    literal = literal_audit()
    NOTE.write_text(note_text(symbolic, literal), encoding="utf-8")
    payload = {
        "schema": "d1-stable-B-J-recurrence-leaf-base-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_STABLE_B_J_RECURRENCE_LEAF_BASE_CONDITIONAL_INDUCTION",
        "theorem": {
            "domain": "A=0,Y=1,S=B+2>=14,j>=4",
            "recurrence": "J_S(j)-J_(S-1)(j)-J_(S-2)(j-1)>=0",
            "induction_input": "smaller-forest q_j<=q3 used in BH",
            "central_proof": "normalized exact path-row ratios and shifted coefficient-positive cones",
            "top_support": "literal w=-1,-2,-3 faces; w<=-4 identically zero",
        },
        "dependency_sha256": observed,
        "symbolic_audit": symbolic,
        "bounded_literal_audit": literal,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "Only the A=0,Y=1 canonical-J recurrence base is closed. The A/Y "
            "lifts, G branch, nonstable band, all d=1 m=0, and Erdos 993 remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic_audit", symbolic)
    print("literal_audit", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
