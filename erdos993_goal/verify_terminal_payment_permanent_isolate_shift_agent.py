#!/usr/bin/env python3
"""Exact Newton-coefficient translation under permanent isolated vertices."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_payment_permanent_isolate_shift_exact_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    s, z = sp.symbols("s z", integer=True, nonnegative=True)
    maximum_degree = 12
    coefficients = sp.symbols(f"d0:{maximum_degree+1}")
    translated = sum(
        coefficients[k] * sp.binomial(s+z, k)
        for k in range(maximum_degree+1)
    )

    # Vandermonde in the Newton basis.  Checking through degree 12 exceeds
    # every degree used by the terminal-payment program; the identity itself
    # is degree-free and is recorded symbolically below.
    rebuilt = sum(
        sp.binomial(s, m) * sum(
            sp.binomial(z, k-m)*coefficients[k]
            for k in range(m, maximum_degree+1)
        )
        for m in range(maximum_degree+1)
    )
    for z_value in range(maximum_degree+1):
        assert sp.expand_func(translated.subs(z,z_value)).expand() == (
            sp.expand_func(rebuilt.subs(z,z_value)).expand()
        )

    # A permanent isolate is indistinguishable from one additional member of
    # the terminal t-isolate family, hence Phi_{G+K1}(t)=Phi_G(t+1).
    # Its m=1 Newton coefficient is d1+d2.
    shifted_m1 = sum(
        comb(1,k-1)*coefficients[k]
        for k in range(1,maximum_degree+1)
    )
    assert shifted_m1 == coefficients[1]+coefficients[2]

    report = {
        "schema": "terminal-payment-permanent-isolate-shift-exact-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TERMINAL_PAYMENT_PERMANENT_ISOLATE_NEWTON_SHIFT",
        "identity": (
            "If Phi_G(t)=sum_k d_k*C(t-1,k), then "
            "Phi_(G disjoint_union zK1)(t)=Phi_G(t+z) and its Newton "
            "coefficient m is sum_(k>=m) C(z,k-m)d_k."
        ),
        "one_isolate_m1": "d'_1=d_1+d_2",
        "consequence": (
            "Once m=1 and m=2 are nonnegative for a base, adjoining one "
            "permanent isolate preserves m=1; iteration handles any number "
            "of isolated components because the all-forest m=2 theorem "
            "applies after every step."
        ),
        "symbolic_vandermonde": (
            "C(s+z,k)=sum_m C(z,k-m)C(s,m)"
        ),
        "finite_symbolic_replay_degree": maximum_degree,
        "scope": (
            "This is a translation identity, not a proof of any previously "
            "open Newton coefficient or of Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(report["status"])
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
