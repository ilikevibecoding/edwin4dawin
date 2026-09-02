#!/usr/bin/env python3
"""Fail-closed d=1 low-block/HK-tangent reduction with a finite sign audit.

The algebraic cancellation and the H/K tangent reduction are all-order.  The
final sign is audited only in the finite parameter box stated in the report;
this file deliberately does not claim the unbounded terminal-m0 theorem.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from prove_balanced_subdivided_star_m0_row_correlation_adversary import (
    h_max_row,
)
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    inductive_lowblock_mass_floor,
)
from prove_d1_spider_quantitative_qgap_cap_adversary import h_concentrated_row
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    exact_coefficients,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_m0_d1_lowblock_tangent_reduction_exact_adversary_20260829.json"
NOTE = ROOT / "TERMINAL_Q3_M0_D1_LOWBLOCK_TANGENT_REDUCTION_2026-08-29.md"
PINS = {
    "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py": "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA",
    "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json": "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11",
    "prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary.py": "25892589FA0312EC739AD1AC0A0C29CD2B5941CFC8A4C55EDDBC34F69D326D6F",
    "d1_spider_inductive_lowblock_qgap_mass_floor_exact_adversary_20260829.json": "A67530B1FE0E62B89BC02C3F97F3DB48D9BB36AE3F87C225D1A9114CFB61E741",
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


def tangent_ratio(total_vertices: int, target_rank: int) -> Fraction:
    vertices = max(0, total_vertices - 8)
    residual_rank = target_rank - 4
    denominator = C(vertices + 1 - residual_rank, residual_rank)
    numerator = C(vertices - residual_rank, residual_rank + 1)
    return Fraction(numerator, denominator) if denominator else Fraction(0)


def symbolic_cancellation() -> dict[str, str]:
    a, f3, P, A0, c0, R0, z3, j = sp.symbols(
        "a f3 P A0 c0 R0 z3 j", positive=True
    )
    uH, uI = sp.symbols("uH uI", nonnegative=True)
    q3 = z3 / (3 * f3)
    lead = (j + 1) * A0
    Cb = (
        f3
        * (
            (j + 1) * a * A0
            + a * P * ((j + 1) * (c0 + R0) - 3 * (P + a))
        )
        - a * P * (P + a) * j * z3
    )
    Ch = f3 * ((j + 1) * a * A0 - 3 * a * P * (P + a))
    D = 3 * j * a * P * (P + a) * f3
    BH = sp.expand(
        2 * (j + 1) * A0
        + P * (j + 1) * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * j * P * (P + a) * uH
    )
    BK = sp.expand(
        (j + 1) * A0
        + P * (j + 1) * (c0 + R0)
        - 3 * P * (P + a)
        - 3 * j * P * (P + a) * uI
    )
    assert sp.expand((Cb + Ch + D * (q3 - uH)) / (a * f3) - BH) == 0
    assert sp.expand((Cb + D * (q3 - uI)) / (a * f3) - BK) == 0
    return {
        "lead": str(lead),
        "BH": str(BH),
        "BK": str(BK),
        "cancelled_target": (
            "L=(j+1)A0(H_(j-1)+H_(j+1)+K_j)+BH*H_j+BK*K_(j-1)"
        ),
    }


def block_data(N: int, rank: int, R: int, T: int, Y: int) -> dict[str, object]:
    assert N == 1 + R + T
    B2 = C(R, 2)
    tau = C(R, 3) + (R - 1) * (Y - 1)
    data = exact_coefficients(N, rank, 1, R, T, Y, B2, B2, tau)
    q3 = Fraction(int(data["z3"]), 3 * int(data["f3"]))
    floor = inductive_lowblock_mass_floor(R, T, Y, rank, q3)
    a, P, A0, R0 = (
        int(data[name]) for name in ("a", "p0", "A0", "R0")
    )
    c0_numerator = A0 + a * R0
    assert c0_numerator % P == 0
    c0 = c0_numerator // P
    uH = Fraction(floor["q_H_cap"])
    uI = Fraction(floor["included_block_cap"])
    lead = Fraction((rank + 1) * A0)
    BH = (
        2 * (rank + 1) * A0
        + P * (rank + 1) * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * rank * P * (P + a) * uH
    )
    BK = (
        (rank + 1) * A0
        + P * (rank + 1) * (c0 + R0)
        - 3 * P * (P + a)
        - 3 * rank * P * (P + a) * uI
    )
    D = 3 * rank * a * P * (P + a) * int(data["f3"])
    assert Fraction(int(data["Cb"]) + int(data["Ch"]), a * int(data["f3"])) + Fraction(D, a * int(data["f3"])) * (q3 - uH) == BH
    assert Fraction(int(data["Cb"]), a * int(data["f3"])) + Fraction(D, a * int(data["f3"])) * (q3 - uI) == BK
    return {
        **data,
        "q3": q3,
        "uH": uH,
        "uI": uI,
        "lead": lead,
        "BH": BH,
        "BK": BK,
        "H_cap_branch": (
            "q3" if floor["H_q3_upper"] <= floor["q_H_empty_component_cap"] else "empty"
        ),
        "K_cap_branch": (
            "q2" if floor["K_q2_upper"] <= floor["q_K_empty_component_cap"] else "empty"
        ),
    }


def h_lower(R: int, T: int, Y: int, rank: int, lead: Fraction, BH: Fraction):
    canonical = h_concentrated_row(R, T, Y)
    cprev = coefficient(canonical, rank - 1)
    current = coefficient(canonical, rank)
    cnext = coefficient(canonical, rank + 1)
    ceiling = h_max_row(R, T, Y, rank)[rank]
    rho = tangent_ratio(R + T, rank)
    common = lead * rho + BH
    endpoint = current if common >= 0 else ceiling
    lower = lead * cprev + lead * (cnext - rho * current) + common * endpoint
    return lower, common


def k_lower(T: int, Y: int, rank: int, lead: Fraction, BK: Fraction):
    if T == Y:
        return lead * C(Y, rank) + BK * C(Y, rank - 1), 0, Fraction(0)
    rho = tangent_ratio(T, rank - 1)
    common = lead * rho + BK
    candidates = []
    for Z in range(1, min(Y, T - Y) + 1):
        canonical = h_concentrated_row(Y, T - Y, Z)
        previous = coefficient(canonical, rank - 1)
        current = coefficient(canonical, rank)
        ceiling = h_max_row(Y, T - Y, Z, rank - 1)[rank - 1]
        endpoint = previous if common >= 0 else ceiling
        value = lead * (current - rho * previous) + common * endpoint
        candidates.append((value, Z))
    value, Z = min(candidates) if candidates else (Fraction(0), -1)
    return value, Z, common


def finite_sign_audit() -> dict[str, object]:
    checks = positives = zeros = negatives = 0
    minimum = None
    minimum_positive = None
    first_negative = []
    branch_counts: dict[str, int] = {}
    z_counts: dict[str, int] = {}
    stream = hashlib.sha256()
    for N in range(15, 41):
        for R in range(1, min(15, N - 2) + 1):
            T = N - 1 - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(4, min(28, N) + 1):
                    data = block_data(N, rank, R, T, Y)
                    Hlower, Hcommon = h_lower(
                        R, T, Y, rank, data["lead"], data["BH"]
                    )
                    Klower, Z, Kcommon = k_lower(
                        T, Y, rank, data["lead"], data["BK"]
                    )
                    total = Hlower + Klower
                    record = (total, N, rank, R, T, Y, Hlower, Klower, Z)
                    minimum = record if minimum is None else min(minimum, record)
                    if total > 0:
                        positives += 1
                        minimum_positive = (
                            record
                            if minimum_positive is None
                            else min(minimum_positive, record)
                        )
                    elif total == 0:
                        zeros += 1
                    else:
                        negatives += 1
                        if len(first_negative) < 20:
                            first_negative.append(record)
                    key = (
                        f"Hcap_{data['H_cap_branch']}_Kcap_{data['K_cap_branch']}_"
                        f"Hcommon_{'plus' if Hcommon >= 0 else 'minus'}_"
                        f"Kcommon_{'plus' if Kcommon >= 0 else 'minus'}"
                    )
                    branch_counts[key] = branch_counts.get(key, 0) + 1
                    zmax = min(Y, T - Y) if T > Y else 0
                    if Z == 0:
                        position = "all_isolates"
                    elif Z == 1:
                        position = "one"
                    elif Z == zmax:
                        position = "maximum"
                    else:
                        position = "interior"
                    z_counts[position] = z_counts.get(position, 0) + 1
                    stream.update(f"{N}:{rank}:{R}:{T}:{Y}:{total}:{Z}\n".encode())
                    checks += 1
    assert checks == 60_052
    assert negatives == 0
    assert minimum_positive[:6] == (Fraction(606_730), 15, 9, 2, 12, 1)
    assert all("Hcommon_plus" in key for key in branch_counts)
    return {
        "box": {"N": [15, 40], "R_max": 15, "rank": [4, 28]},
        "exact_parameter_rank_checks": checks,
        "positive_checks": positives,
        "zero_checks": zeros,
        "negative_checks": negatives,
        "minimum_lower": [str(value) for value in minimum],
        "minimum_strictly_positive_lower": [str(value) for value in minimum_positive],
        "first_negative": [[str(value) for value in row] for row in first_negative],
        "branch_counts": branch_counts,
        "K_minimizer_position_counts": z_counts,
        "ordered_value_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(audit: dict[str, object]) -> str:
    return f"""# d=1 low-block H/K tangent reduction for terminal m=0

Date: 2026-08-29

For a one-centre spider write `F=H+xK`, put `P=p0`, and use the exact
retained-`h_(j-1)` decomposition.  The frozen smaller-forest low-block lemma
gives caps `u_H` and `u_I` with

```text
f_j(q3-q_j) >= H_j(q3-u_H)+K_(j-1)(q3-u_I).
```

Adding this reserve before choosing row endpoints cancels every `z3` term.
After division by the positive factor `a*f3`, the remaining sufficient target
is exactly

```text
L=(j+1)A0(H_(j-1)+H_(j+1)+K_j)+B_H H_j+B_K K_(j-1),
```

with the explicit `B_H,B_K` in the JSON report.  Apply the frozen graft
residual tangent to `H`.  For `K`, condition on the literal number `Z` of
paths of length at least two and apply the same theorem with parameters
`(R,T,Y,j)=(Y,T-Y,Z,j-1)`.  The resulting all-order lower is
`Hlower+min_Z Klower`.

The exact finite sign audit checked {audit['exact_parameter_rank_checks']}
parameter-rank cells in its stated box and found zero negatives.  This does
not prove the lower nonnegative outside that box: interior `Z` minimizers
occur, so an unbounded sign cone is still required.

Replay:

```powershell
python .\\audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary.py
```

Required marker:

```text
PASS_EXACT_D1_LOWBLOCK_HK_TANGENT_REDUCTION_FINITE_SIGN_AUDIT
```
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    symbolic = symbolic_cancellation()
    audit = finite_sign_audit()
    NOTE.write_text(note_text(audit), encoding="utf-8")
    payload = {
        "schema": "terminal-q3-m0-d1-lowblock-tangent-reduction-exact-adversary-v1",
        "status": "PASS_EXACT_D1_LOWBLOCK_HK_TANGENT_REDUCTION_FINITE_SIGN_AUDIT",
        "all_order_reduction": symbolic,
        "finite_sign_audit": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "The q3 cancellation and H/K tangent reduction are all-order. "
            "Nonnegativity is only audited in the stated finite box; the "
            "unbounded d=1 sign cone, all d>1 sectors, terminal m=0, and "
            "Erdos Problem 993 remain separate obligations."
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
