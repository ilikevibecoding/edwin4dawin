#!/usr/bin/env python3
"""Independent numerator-level audit of the all-rank PGC decomposition."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import sympy as sp


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument(
        "--output",
        default="general_pgc_qv_decomposition_independent_audit_root_20260826.json",
    )
    args = parser.parse_args()
    primary_path = Path(args.primary).resolve()
    assert sha256(primary_path) == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_ALL_RANK_PENDANT_PGC_Q_V_DECOMPOSITION"

    k = sp.symbols("k", integer=True, positive=True)
    bm2, bm1, b0, cm1, pm1, pp1 = sp.symbols(
        "bm2 bm1 b0 cm1 pm1 pp1", nonzero=True
    )
    p0 = b0 + bm1 + cm1
    qk = 2 * k * p0**2 - pm1 * p0 - 2 * (k + 1) * pm1 * pp1
    vk = (
        (k + 2) * bm2 * bm1
        + k * (2 * k + 1) * bm2 * b0
        - 2 * (k - 1) ** 2 * bm1**2
    )
    hk = k**2 * (p0**2 - pm1 * pp1) / pm1 + k * (p0 - pp1)
    hprev = (
        (k - 1) ** 2 * (bm1**2 - bm2 * b0) / bm2
        + (k - 1) * (bm1 - b0)
    )
    rhs = k * qk / (2 * pm1) + 3 * k * cm1 / 2 + vk / (2 * bm2)
    cleared = sp.factor(2 * pm1 * bm2 * (hk - hprev - rhs))
    assert cleared == 0

    rank8 = sp.expand(vk.subs(k, 8))
    expected_rank8 = 10 * bm2 * bm1 + 136 * bm2 * b0 - 98 * bm1**2
    assert sp.expand(rank8 - expected_rank8) == 0
    assert primary["rank8_specialization"] == {
        "identity": "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)",
        "V8": "10*b6*b7+136*b6*b8-98*b7^2",
        "coefficients": [10, 136, -98],
    }

    payload = {
        "schema": "general-pgc-qv-decomposition-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_CLEARED_NUMERATOR_ALL_RANK_PGC_Q_V_IDENTITY_AUDIT",
        "primary": primary_path.name,
        "primary_sha256": args.expected_primary_sha256.upper(),
        "checks": {
            "generic_cleared_numerator": "0",
            "rank8_specialization": True,
            "imports_primary_source": False,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    print(payload["status"])
    print("REPORT", output, atomic_json(output, payload))


if __name__ == "__main__":
    main()
