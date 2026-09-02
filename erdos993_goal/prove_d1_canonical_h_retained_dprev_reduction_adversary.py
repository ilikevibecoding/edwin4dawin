#!/usr/bin/env python3
"""All-order retained-Dprev reduction for the canonical d=1 H row.

The row decomposition and inequality are all-order.  The final sign audit is
bounded and is explicitly not promoted to an unbounded terminal-m0 theorem.
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
from prove_d1_spider_one_edge_decomposition_adversary import (
    path_independence,
    product,
)
from prove_d1_spider_quantitative_qgap_cap_adversary import (
    h_concentrated_row,
    k_coefficient_ceiling,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_canonical_h_retained_dprev_reduction_exact_adversary_20260829.json"
NOTE = ROOT / "D1_CANONICAL_H_RETAINED_DPREV_REDUCTION_2026-08-29.md"
PINS = {
    "audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary.py": "93B3B2438FCFB37BFF6567A0FAA2729FC2FB3F1DC90A115066597F98888C9171",
    "terminal_q3_m0_d1_lowblock_tangent_reduction_exact_adversary_20260829.json": "3E770AF53F614654C515F6856EB85BDA12CCFED9825C88DE394FDFC11796D25A",
    "prove_balanced_subdivided_star_h_graft_residual_tangent_adversary.py": "EBB9BE9DD2394138685E462F2366E4E528473ED9AF9E2CA7141B5558201655AD",
    "balanced_subdivided_star_h_graft_residual_tangent_exact_adversary_20260829.json": "7800EDFB4FFED3D5B81B16069CF0921DFB39B2EA9938582FDB1270DCD5689042",
    "prove_d1_kz_one_step_ratio_crossing_adversary.py": "5C87354C12BF5E97B4DBC7071D8BB57C383DA9B8E1E51675E47BEF3DDC18DA92",
    "d1_kz_one_step_ratio_crossing_exact_adversary_20260829.json": "BE51E59D9916948985C5ACBCDF9B759664C7372D1E9E059C6D61B374461D05C1",
    "prove_balanced_subdivided_star_m0_row_correlation_adversary.py": "D9D4F8F7B7F3609C886B8FF354862DE9A5E15FBD7550A693ED3B3121B1BBD73E",
    "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json": "A7F2CD73425A74B26ADB20847DDDB2E87F44100D6438D62D0F612D21727164C7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def add(*rows: tuple[int, ...] | list[int]) -> tuple[int, ...]:
    length = max((len(row) for row in rows), default=0)
    output = tuple(
        sum(row[k] if k < len(row) else 0 for row in rows) for k in range(length)
    )
    while len(output) > 1 and output[-1] == 0:
        output = output[:-1]
    return output


def shift(row: tuple[int, ...] | list[int], amount: int) -> tuple[int, ...]:
    if not any(row):
        return (0,)
    return (0,) * amount + tuple(row)


def power(row: tuple[int, ...], exponent: int) -> tuple[int, ...]:
    return product([row] * exponent)


P1 = tuple(path_independence(1))
P2 = tuple(path_independence(2))


def canonical_gap_terms(R: int, T: int, Y: int) -> list[tuple[int, tuple[int, ...]]]:
    """Return (linear-forest order,row) terms whose sum is Q=(Hc-P_S)/x^2."""
    assert 1 <= Y <= min(R, T)
    u = R - Y
    g = T - Y
    edge_count = Y - 1
    terms: list[tuple[int, tuple[int, ...]]] = []

    # First join the Y-1 copies of P2 to P_(g+2).
    for r in range(edge_count):
        row = product(
            [tuple(path_independence(g + 2 * r))]
            + [P2] * (edge_count - 1 - r)
            + [P1] * u
        )
        terms.append((R + T - 4, tuple(row)))

    # Then join the u copies of P1.  The P_-1 boundary in the local identity
    # is the constant row and leaves these residual forests on S-3 vertices.
    joined_order = g + 2 + 2 * edge_count
    for s in range(u):
        row = product(
            [tuple(path_independence(joined_order + s - 2))]
            + [P1] * (u - 1 - s)
        )
        terms.append((R + T - 3, tuple(row)))
    return terms


def canonical_gap_row(R: int, T: int, Y: int) -> tuple[int, ...]:
    terms = canonical_gap_terms(R, T, Y)
    return add(*(row for _, row in terms)) if terms else (0,)


def sigma_floor(S: int, rank: int) -> Fraction:
    """P_(S-4)[j-1]/P_(S-4)[j-2], or zero off its support."""
    denominator = C(S - rank - 1, rank - 2)
    numerator = C(S - rank - 2, rank - 1)
    return Fraction(numerator, denominator) if denominator else Fraction(0)


def canonical_h_lower(
    R: int,
    T: int,
    Y: int,
    rank: int,
    lead: Fraction,
    BH: Fraction,
) -> tuple[Fraction, dict[str, object]]:
    S = R + T
    canonical = h_concentrated_row(R, T, Y)
    path = tuple(path_independence(S))
    d_previous = coefficient(canonical, rank - 1) - coefficient(path, rank - 1)
    d_current = coefficient(canonical, rank) - coefficient(path, rank)
    assert d_previous >= 0 and d_current >= 0
    sigma = sigma_floor(S, rank)
    path_value = (
        lead * (coefficient(path, rank - 1) + coefficient(path, rank + 1))
        + BH * coefficient(path, rank)
    )
    lower = (
        path_value
        + lead * d_previous
        + (BH + lead * sigma) * d_current
    )
    exact = (
        lead
        * (coefficient(canonical, rank - 1) + coefficient(canonical, rank + 1))
        + BH * coefficient(canonical, rank)
    )
    assert exact >= lower
    return lower, {
        "path_value": path_value,
        "D_(j-1)": d_previous,
        "D_j": d_current,
        "sigma": sigma,
        "exact_H_value": exact,
        "lower_slack": exact - lower,
    }


def exact_k_lower(T: int, Y: int, rank: int, lead: Fraction, BK: Fraction):
    if T == Y:
        value = lead * C(Y, rank) + BK * C(Y, rank - 1)
        return value, 0
    rho = tangent_ratio(T, rank - 1)
    common = lead * rho + BK
    ceiling = k_coefficient_ceiling(T, Y, rank - 1)[0]
    candidates = []
    for Z in range(1, min(Y, T - Y) + 1):
        canonical = h_concentrated_row(Y, T - Y, Z)
        previous = coefficient(canonical, rank - 1)
        current = coefficient(canonical, rank)
        if common >= 0:
            value = lead * current + BK * previous
        else:
            value = lead * (current - rho * previous) + common * ceiling
        candidates.append((value, Z))
    assert candidates
    return min(candidates)


def bounded_row_theorem_audit() -> dict[str, object]:
    identities = ratio_checks = 0
    minimum_ratio_slack = None
    stream = hashlib.sha256()
    for R in range(1, 7):
        for T in range(1, 13):
            for Y in range(1, min(R, T) + 1):
                S = R + T
                canonical = tuple(h_concentrated_row(R, T, Y))
                path = tuple(path_independence(S))
                Q = canonical_gap_row(R, T, Y)
                assert add(path, shift(Q, 2)) == canonical
                identities += 1
                for rank in range(5, len(canonical) + 3):
                    sigma = sigma_floor(S, rank)
                    left = coefficient(Q, rank - 1)
                    right = sigma * coefficient(Q, rank - 2)
                    slack = left - right
                    assert slack >= 0
                    minimum_ratio_slack = (
                        slack
                        if minimum_ratio_slack is None
                        else min(minimum_ratio_slack, slack)
                    )
                    stream.update(f"{R}:{T}:{Y}:{rank}:{left}:{right}\n".encode())
                    ratio_checks += 1
    return {
        "canonical_gap_identities": identities,
        "forward_ratio_checks": ratio_checks,
        "minimum_forward_ratio_slack": str(minimum_ratio_slack),
        "ordered_row_stream_sha256": stream.hexdigest().upper(),
    }


def finite_sign_audit() -> dict[str, object]:
    checks = positives = zeros = negatives = 0
    first_negative = []
    minimum_positive = None
    stream = hashlib.sha256()
    for S in range(14, 41):
        N = S + 1
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(5, min(28, S) + 1):
                    data = block_data(N, rank, R, T, Y)
                    Hlower, details = canonical_h_lower(
                        R, T, Y, rank, data["lead"], data["BH"]
                    )
                    Klower, Z = exact_k_lower(
                        T, Y, rank, data["lead"], data["BK"]
                    )
                    total = Hlower + Klower
                    record = (total, N, rank, R, T, Y, Hlower, Klower, Z)
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
                    assert details["lower_slack"] >= 0
                    stream.update(
                        f"{N}:{rank}:{R}:{T}:{Y}:{Hlower}:{Klower}:{Z}:{total}\n".encode()
                    )
                    checks += 1
    assert negatives == 0
    return {
        "box": {"N": [15, 41], "j": [5, 28]},
        "exact_cells": checks,
        "positive": positives,
        "zero": zeros,
        "negative": negatives,
        "minimum_positive": [str(value) for value in minimum_positive],
        "first_negative": [[str(value) for value in row] for row in first_negative],
        "ordered_sign_stream_sha256": stream.hexdigest().upper(),
    }


def guard_replays() -> dict[str, object]:
    records = {}
    for name, N, rank, R, T, Y in (
        ("first_global_path_failure", 31, 5, 29, 1, 1),
        ("first_central_path_failure", 73, 33, 23, 49, 23),
        ("first_top_Dj_zero_failure", 43, 22, 18, 24, 18),
    ):
        data = block_data(N, rank, R, T, Y)
        Hlower, details = canonical_h_lower(
            R, T, Y, rank, data["lead"], data["BH"]
        )
        Klower, Z = exact_k_lower(T, Y, rank, data["lead"], data["BK"])
        total = Hlower + Klower
        assert total > 0
        records[name] = {
            "parameters": {"N": N, "j": rank, "R": R, "T": T, "Y": Y},
            "Hlower": str(Hlower),
            "Klower": str(Klower),
            "critical_Z": Z,
            "total": str(total),
            "D_(j-1)": details["D_(j-1)"],
            "D_j": details["D_j"],
            "sigma": str(details["sigma"]),
        }
    return records


def note_text() -> str:
    return """# Canonical-H retained-Dprev reduction for d=1 terminal m=0

Date: 2026-08-29

Put `S=R+T`, `u=R-Y`, `g=T-Y`, and

```text
Hc=(1+x)^u P_(g+2)(1+2x)^(Y-1),  P=P_S.
```

Repeated endpoint joining gives the exact all-order identity

```text
Hc-P=x^2 Q,
Q=sum_(r=0)^(Y-2) P_(g+2r)(1+2x)^(Y-2-r)(1+x)^u
  +sum_(s=0)^(u-1) P_(g+2Y+s-2)(1+x)^(u-1-s).       (1)
```

Every first-sum term is a linear-forest row on `S-4` vertices; every
second-sum term is one on `S-3` vertices.  The frozen path-joining theorem
says every linear-forest row likelihood-ratio dominates the path of the same
order, and the path adjacent ratio increases with order.  Hence, for `j>=5`,

```text
D_(j+1) >= sigma D_j,  D=Hc-P,
sigma=[x^(j-1)]P_(S-4)/[x^(j-2)]P_(S-4),             (2)
```

with `sigma=0` when the denominator is unsupported.  Therefore, for every
`lead>=0` and every real `BH`,

```text
lead(Hc_(j-1)+Hc_(j+1))+BH Hc_j
 >= pathH + lead D_(j-1)+(BH+lead sigma)D_j.          (3)
```

The previous-rank gap is retained exactly.  This is essential: the former
reverse-only relaxation fails on top-support cells with `D_j=0` but
`D_(j-1)>0`.

The finite sign audit combines (3) with the exact critical-`Z` K lower from
the frozen one-step crossing theorem.  Its zero-negative result is bounded
evidence only.  Equations (1)-(3) are the all-order theorem; a separate
unbounded sign cone is still required before terminal Newton `m=0`, the full
terminal-payment theorem, or Erdős Problem #993 can be claimed.
"""


def main() -> None:
    for filename, expected in PINS.items():
        actual = sha256(ROOT / filename)
        assert actual == expected, (filename, actual, expected)
    row_audit = bounded_row_theorem_audit()
    sign_audit = finite_sign_audit()
    guards = guard_replays()
    NOTE.write_text(note_text(), encoding="utf-8")
    payload = {
        "schema": "d1-canonical-h-retained-dprev-reduction-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_CANONICAL_H_RETAINED_DPREV_REDUCTION_FINITE_SIGN_AUDIT",
        "theorem": {
            "canonical_gap_identity": "Hc-P_S=x^2 Q with Q given by the two telescoping sums",
            "term_orders": "first sum S-4 vertices; second sum S-3 vertices",
            "forward_ratio": "D_(j+1)>=sigma*D_j for j>=5",
            "sigma": "[x^(j-1)]P_(S-4)/[x^(j-2)]P_(S-4), zero off support",
            "retained_Dprev_lower": (
                "Hfunctional>=pathH+lead*D_(j-1)+(BH+lead*sigma)*D_j"
            ),
        },
        "dependency_sha256": PINS,
        "bounded_row_audit": row_audit,
        "finite_sign_audit": sign_audit,
        "mandatory_guard_replays": guards,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "The decomposition is all-order; the displayed final sign audit is "
            "finite and does not prove terminal m=0 or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("row_audit", row_audit)
    print("sign_audit", sign_audit)
    print("guards", guards)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
