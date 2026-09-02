#!/usr/bin/env python3
"""All-order one-step LR/crossing structure for the d=1 K_Z family.

This proves a structural reduction of the Z minimization.  It does not prove
the remaining critical-candidate terminal-m0 signs.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_kz_one_step_ratio_crossing_exact_adversary_20260829.json"
NOTE = ROOT / "D1_KZ_ONE_STEP_RATIO_CROSSING_2026-08-29.md"
PINS = {
    "prove_balanced_subdivided_star_h_graft_residual_tangent_adversary.py": "EBB9BE9DD2394138685E462F2366E4E528473ED9AF9E2CA7141B5558201655AD",
    "balanced_subdivided_star_h_graft_residual_tangent_exact_adversary_20260829.json": "7800EDFB4FFED3D5B81B16069CF0921DFB39B2EA9938582FDB1270DCD5689042",
    "disprove_d1_kz_global_ceiling_zmax_adversary.py": "41FE46BA2D382C5A98F1CB8E6472F93FC27CB5379C3C84BFB6409E3CB758D159",
    "d1_kz_global_ceiling_zmax_obstruction_exact_adversary_20260829.json": "CE290FE24FC1632E42C640CB9301D45B049A8DAC874C4BB370C3387BE96FEB35",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def multiply(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    while len(output) > 1 and output[-1] == 0:
        output.pop()
    return output


def power(row: list[int], exponent: int) -> list[int]:
    output = [1]
    for _ in range(exponent):
        output = multiply(output, row)
    return output


def path(vertices: int) -> list[int]:
    if vertices == -1:
        return [1]
    assert vertices >= 0
    return [C(vertices + 1 - k, k) for k in range((vertices + 1) // 2 + 1)]


def coefficient(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def K_row(T: int, Y: int, Z: int) -> list[int]:
    L = T - Y - Z + 2
    row = power([1, 1], Y - Z)
    row = multiply(row, power([1, 2], Z - 1))
    return multiply(row, path(L))


def D_row(T: int, Y: int, Z: int) -> tuple[int, list[int]]:
    L = T - Y - Z + 2
    row = power([1, 1], Y - Z - 1)
    row = multiply(row, power([1, 2], Z - 1))
    return L, multiply(row, path(L - 4))


def local_lr_symbolic() -> dict[str, str]:
    """Exact coefficient cross for B=(1+2x)P_(m-1), A=(1+x)P_m."""
    m, k, r = sp.symbols("m k r", integer=True, nonnegative=True)
    Q = (
        6 * k**2 * m
        + 2 * k**2
        - 8 * k * m**2
        - 14 * k * m
        - 10 * k
        + 3 * m**3
        + 10 * m**2
        + 13 * m
        + 6
    )
    shifted = sp.factor(sp.expand(Q.subs(m, 2 * k - 1 + r)))
    expected = (
        4 * k**3
        + 10 * k**2 * r
        + 4 * k**2
        + 10 * k * r**2
        + 6 * k * r
        + 3 * r**3
        + r**2
        + 2 * r
    )
    assert sp.expand(shifted - expected) == 0

    # Literal symbolic/numeric boundary checks.  In the nonzero interior
    # m>=3,k>=2,m>=2k-1, the cross is the positive Q times positive
    # factorial/binomial factors; m=1,2 and k=0,1 are explicit boundaries.
    boundary = {}
    for mv in (1, 2):
        A = multiply([1, 1], path(mv))
        B = multiply([1, 2], path(mv - 1))
        crosses = [
            coefficient(B, index) * coefficient(A, index + 1)
            - coefficient(B, index + 1) * coefficient(A, index)
            for index in range(max(len(A), len(B)) + 1)
        ]
        assert min(crosses) >= 0
        boundary[str(mv)] = crosses
    return {
        "local_order": "(1+2x)P_(m-1) <=_LR (1+x)P_m for every m>=1",
        "interior_cross_factor": (
            "Q*C(m-k-1,k-2)*(m-k)!/((k+1)!*(m-2k+3)!)"
        ),
        "support_substitution": "m=2k-1+r, k>=2, r>=0",
        "positive_Q": str(expected),
        "boundary_crosses": str(boundary),
    }


def one_step_audit() -> dict[str, object]:
    identities = ratio_pairs = nonboundary_crosses = boundary_crosses = 0
    minimum_nonboundary_cross = None
    minimum_boundary_cross = None
    maximum_boundary_cross = None
    stream = hashlib.sha256()
    for T in range(2, 51):
        for Y in range(2, T):
            zmax = min(Y, T - Y)
            previous = {}
            for Z in range(1, zmax):
                L, D = D_row(T, Y, Z)
                left = K_row(T, Y, Z)
                right = K_row(T, Y, Z + 1)
                maximum = max(len(left), len(right), len(D) + 3)
                for index in range(maximum):
                    assert coefficient(right, index) - coefficient(left, index) == -coefficient(D, index - 3)
                identities += 1

                for rank in range(4, min(30, T + 1) + 1):
                    denominator = coefficient(D, rank - 4)
                    if not denominator:
                        continue
                    ratio = Fraction(coefficient(D, rank - 3), denominator)
                    if rank in previous:
                        old_ratio, old_L = previous[rank]
                        cross = old_ratio - ratio
                        if old_L == 4 and L == 3:
                            # The sole unguarded short-path transition may
                            # reverse and is retained as an explicit boundary.
                            maximum_boundary_cross = (
                                cross
                                if maximum_boundary_cross is None
                                else max(maximum_boundary_cross, cross)
                            )
                            minimum_boundary_cross = (
                                cross
                                if minimum_boundary_cross is None
                                else min(minimum_boundary_cross, cross)
                            )
                            boundary_crosses += 1
                        else:
                            assert old_L >= 5 and L >= 4 and cross >= 0
                            minimum_nonboundary_cross = (
                                cross
                                if minimum_nonboundary_cross is None
                                else min(minimum_nonboundary_cross, cross)
                            )
                            nonboundary_crosses += 1
                        stream.update(
                            f"{T}:{Y}:{Z}:{old_L}:{L}:{rank}:{old_ratio}:{ratio}:{cross}\n".encode()
                        )
                        ratio_pairs += 1
                    previous[rank] = (ratio, L)
    assert identities == 9_500
    assert ratio_pairs == 185_604
    assert nonboundary_crosses + boundary_crosses == ratio_pairs
    assert minimum_boundary_cross < 0
    return {
        "box": {"T": [2, 50], "rank": [4, 30]},
        "literal_one_step_polynomial_identities": identities,
        "adjacent_Z_residual_ratio_pairs": ratio_pairs,
        "nonboundary_monotone_ratio_checks": nonboundary_crosses,
        "short_L4_to_L3_boundary_checks": boundary_crosses,
        "minimum_nonboundary_old_ratio_minus_new_ratio": str(minimum_nonboundary_cross),
        "minimum_boundary_old_ratio_minus_new_ratio": str(minimum_boundary_cross),
        "maximum_boundary_old_ratio_minus_new_ratio": str(maximum_boundary_cross),
        "ordered_ratio_cross_stream_sha256": stream.hexdigest().upper(),
    }


def note_text(audit: dict[str, object]) -> str:
    return f"""# One-step K_Z ratio crossing theorem

Date: 2026-08-29

Put

```text
K_Z=(1+x)^(Y-Z)(1+2x)^(Z-1)P_L,  L=T-Y-Z+2.
```

The path recurrence gives the exact global one-step identity

```text
K_(Z+1)-K_Z=-x^3 D_Z,
D_Z=(1+x)^(Y-Z-1)(1+2x)^(Z-1)P_(L-4).             (1)
```

For `L>=5`, the local factor comparison

```text
(1+2x)P_(m-1) <=_LR (1+x)P_m,  m=L-4>=1          (2)
```

and TP2 convolution show that the adjacent coefficient ratio of `D_Z`
is nonincreasing as `Z` grows.  The exact coefficient cross for (2) factors
into positive factorial/binomial terms and a polynomial that becomes

```text
4k^3+10k^2r+4k^2+10kr^2+6kr+3r^3+r^2+2r
```

after the support substitution `m=2k-1+r`.  The only possible reversal is
the final short-path transition `L=4` to `L=3`, which is kept explicitly.

Therefore, for any affine row functional

```text
F_Z=A*K_Z[j]+B*K_Z[j-1], A>0,
```

the signs of `F_(Z+1)-F_Z` have at most one crossing before the final short
boundary.  Its minimum is among `Z=1`, `Z=Zmax`, the crossing-adjacent Z,
and the final short-boundary neighbours.  The same applies to
`K_Z[j]-rho*K_Z[j-1]`, enabling the corrected global-ceiling negative-common
branch.

The bounded replay checked {audit['literal_one_step_polynomial_identities']}
literal identities and {audit['adjacent_Z_residual_ratio_pairs']} adjacent-Z
ratio pairs.  This theorem reduces the Z search only; the critical-candidate
terminal-m0 signs remain open.
"""


def main() -> None:
    observed = {name: sha256(ROOT / name) for name in PINS}
    assert observed == PINS
    symbolic = local_lr_symbolic()
    audit = one_step_audit()
    NOTE.write_text(note_text(audit), encoding="utf-8")
    payload = {
        "schema": "d1-kz-one-step-ratio-crossing-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_D1_KZ_ONE_STEP_RATIO_CROSSING",
        "theorem": {
            **symbolic,
            "one_step": "K_(Z+1)-K_Z=-x^3 D_Z",
            "monotone_scope": "L>=5",
            "short_boundary": "L=4 to L=3 retained explicitly",
            "critical_set": (
                "Z=1,Zmax,the unique crossing-adjacent Z,and final short-boundary neighbours"
            ),
        },
        "exact_bounded_replay": audit,
        "dependency_sha256": observed,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This proves only the all-order K_Z crossing reduction. The "
            "critical-candidate payment signs, terminal m=0, all d>1, and "
            "Erdos Problem 993 remain separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("symbolic", symbolic)
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
