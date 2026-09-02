#!/usr/bin/env python3
"""Persist the exact all-rank pendant PGC Q+V decomposition."""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "general_pgc_qv_decomposition_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def h(j, previous, current, following):
    return j**2 * (current**2 - previous * following) / previous + j * (
        current - following
    )


def main() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    bm2, bm1, b0, bp1, cm1 = sp.symbols(
        "b_(k-2) b_(k-1) b_k b_(k+1) c_(k-1)", nonzero=True
    )
    pm1, pp1 = sp.symbols("p_(k-1) p_(k+1)", nonzero=True)
    p0 = b0 + bm1 + cm1
    qk = 2 * k * p0**2 - pm1 * p0 - 2 * (k + 1) * pm1 * pp1
    vk = (
        (k + 2) * bm2 * bm1
        + k * (2 * k + 1) * bm2 * b0
        - 2 * (k - 1) ** 2 * bm1**2
    )
    lhs = h(k, pm1, p0, pp1) - h(k - 1, bm2, bm1, b0)
    rhs = k * qk / (2 * pm1) + 3 * k * cm1 / 2 + vk / (2 * bm2)
    assert sp.factor(lhs - rhs) == 0

    u, v = sp.symbols("u v")
    normalized = sp.factor(vk / (bm2 * bm1))
    normalized = sp.factor(
        normalized.subs(b0, v * bm1 / k).subs(bm1, u * bm2 / (k - 1))
    )
    target = (k + 2) + (2 * k + 1) * v - 2 * (k - 1) * u
    assert sp.factor(normalized - target) == 0

    rank8_v = sp.expand(vk.subs(k, 8))
    assert rank8_v == 10 * bm2 * bm1 + 136 * bm2 * b0 - 98 * bm1**2
    rank8_identity = (
        "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)"
    )
    payload = {
        "schema": "general-pgc-qv-decomposition-exact-root-v1",
        "status": "PASS_EXACT_ALL_RANK_PENDANT_PGC_Q_V_DECOMPOSITION",
        "theorem": (
            "For every k>=2 and pendant decomposition P=(1+x)B+xC, "
            "H_k(P)-H_(k-1)(B)=kQ_k(P)/(2p_(k-1))+3k c_(k-1)/2+"
            "V_k(B)/(2b_(k-2))."
        ),
        "definitions": {
            "H_k": "k^2*(p_k^2-p_(k-1)*p_(k+1))/p_(k-1)+k*(p_k-p_(k+1))",
            "Q_k": "2k*p_k^2-p_(k-1)*p_k-2(k+1)*p_(k-1)*p_(k+1)",
            "V_k": (
                "(k+2)b_(k-2)b_(k-1)+k(2k+1)b_(k-2)b_k-"
                "2(k-1)^2*b_(k-1)^2"
            ),
        },
        "normalized_V_identity": (
            "V_k/(b_(k-2)b_(k-1))=(k+2)+(2k+1)mu_(k-1)-"
            "2(k-1)mu_(k-2)"
        ),
        "rank8_specialization": {
            "identity": rank8_identity,
            "V8": "10*b6*b7+136*b6*b8-98*b7^2",
            "coefficients": [10, 136, -98],
        },
        "symbolic_remainder": "0",
        "software": {"python": platform.python_version(), "sympy": sp.__version__},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is an exact algebraic identity. Sign inputs Q_k>=0 and "
            "V_k>=0 must be supplied separately at each theorem application."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
