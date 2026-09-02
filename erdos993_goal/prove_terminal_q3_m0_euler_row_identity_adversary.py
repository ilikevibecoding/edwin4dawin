#!/usr/bin/env python3
"""Exact Euler-operator packaging of every retained-hprev m=0 rank.

This freezes a coefficient-extraction identity only.  It deliberately makes
no sign claim about the resulting polynomial M.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "terminal_q3_m0_euler_row_identity_exact_adversary_20260829.json"
NOTE = ROOT / "TERMINAL_Q3_M0_EULER_ROW_IDENTITY_2026-08-29.md"
DEPENDENCY = ROOT / "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_rank_checks() -> dict[str, object]:
    x = sp.symbols("x")
    f3, a, A, P, c, R, z3 = sp.symbols("f3 a A P c R z3")
    D = 3 * P * (P + a)
    L = A + P * (c + R)
    Q = P * (P + a) * z3
    maximum = 13
    f = sp.symbols(f"f0:{maximum + 1}")
    h = sp.symbols(f"h0:{maximum + 1}")
    F = sum(f[k] * x**k for k in range(maximum + 1))
    H = sum(h[k] * x**k for k in range(maximum + 1))
    theta = lambda polynomial: sp.expand(x * sp.diff(polynomial, x))
    M = sp.expand(
        f3 * A * theta(F + x * F + x * H + x**2 * H)
        + f3 * P * (c + R) * theta(x * F)
        - f3 * D * x * (F + H)
        - Q * x * theta(F)
    )
    coefficient_hash = hashlib.sha256(
        sp.srepr(M).encode("utf-8")
    ).hexdigest().upper()
    checks = []
    for j in range(0, maximum - 1):
        Cf = f3 * (j + 1) * A
        Cb = f3 * ((j + 1) * L - D) - j * Q
        Ch = f3 * ((j + 1) * A - D)
        direct = sp.expand(Cf * (f[j + 1] + h[j - 1] if j else f[j + 1]) + Cb * f[j] + Ch * h[j])
        extracted = sp.expand(M).coeff(x, j + 1)
        assert sp.expand(direct - extracted) == 0
        checks.append(j)
    return {
        "checked_ranks": checks,
        "formal_polynomial_degree": sp.Poly(M, x).degree(),
        "ordered_expression_sha256": coefficient_hash,
        "definitions": {
            "D": "3P(P+a)",
            "L": "A+P(c+R)",
            "Q": "P(P+a)z3",
            "theta": "x*d/dx",
        },
        "operator": (
            "M=f3*A*theta(F+xF+xH+x^2H)+f3*P(c+R)*theta(xF)"
            "-f3*D*x(F+H)-Q*x*theta(F)"
        ),
        "coefficient_identity": (
            "C_repaired(j)/a=[x^(j+1)]M for every j>=1"
        ),
    }


def theorem_note() -> str:
    return """# Terminal q3 m=0 Euler row identity

Date: 2026-08-29

Let `F=sum f_k x^k`, `H=sum h_k x^k`, `theta=x d/dx`, and put

```text
P=p0, A=A0, D=3P(P+a),
L=A+P(c0+R0), Q=P(P+a)z3.
```

After dividing the retained-`h_(j-1)` certificate by the positive factor
`a`, define

```text
M=f3*A*theta(F+xF+xH+x^2H)
 +f3*P(c0+R0)*theta(xF)
 -f3*D*x(F+H)
 -Q*x*theta(F).                                     (1)
```

The coefficient rule `[x^n]theta(G)=n[x^n]G` gives, for every `j>=1`,

```text
[x^(j+1)]M
=f3(j+1)A(f_(j+1)+h_(j-1))
 +{f3[(j+1)L-D]-jQ}f_j
 +f3[(j+1)A-D]h_j
=C_repaired(j)/a.                                  (2)
```

This packages all ranks into one exact row-correlated polynomial.  It is a
coefficient-extraction identity only: no coefficientwise sign of `M`, no
terminal Newton `m=0` theorem, and no claim about Erdos Problem 993 follows
without a separate cone proof.

Provenance correction: an exploratory message written before this artifact
omitted the `xF` summand inside the first theta.  That formula was retracted.
Only equations (1)-(2), with `theta(F+xF+xH+x^2H)`, are valid and frozen.

Replay:

```powershell
python .\\prove_terminal_q3_m0_euler_row_identity_adversary.py
```

Required marker:

```text
PASS_EXACT_TERMINAL_Q3_M0_EULER_ROW_IDENTITY
```
"""


def main() -> None:
    symbolic = symbolic_rank_checks()
    NOTE.write_text(theorem_note(), encoding="utf-8")
    payload = {
        "schema": "terminal-q3-m0-euler-row-identity-exact-adversary-v1",
        "status": "PASS_EXACT_TERMINAL_Q3_M0_EULER_ROW_IDENTITY",
        "theorem": symbolic,
        "provenance_correction": (
            "A pre-freeze exploratory message omitted xF from the first theta. "
            "It is retracted; only theta(F+xF+xH+x^2H) is valid."
        ),
        "dependency_sha256": {DEPENDENCY.name: sha256(DEPENDENCY)},
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This is an exact all-rank coefficient identity, not a sign "
            "certificate, terminal m=0 proof, or proof of Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("theorem", symbolic)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
