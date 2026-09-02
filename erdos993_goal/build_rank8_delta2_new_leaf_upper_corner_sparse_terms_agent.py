#!/usr/bin/env python3
"""Materialize the pinned 281-term Delta2 upper/upper numerator once.

Downstream bounded transition scans load this deterministic sparse artifact so
they do not repeat the comparatively expensive symbolic endpoint derivation.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_FINGERPRINT = "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    numerator, metadata = corner.new_leaf_corner(2, 3)
    assert metadata["endpoint_mask"] == 3
    generators = (
        leaf.d[3], leaf.d[4], leaf.d[5], leaf.d[6],
        leaf.f[3], leaf.f[4], leaf.f[5], leaf.f[6],
    )
    terms = sp.Poly(numerator, *generators).terms()
    sparse = {
        "generators": [str(value) for value in generators],
        "terms": [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
    }
    serial = json.dumps(sparse, sort_keys=True, separators=(",", ":")).encode()
    assert len(terms) == 281
    assert hashlib.sha256(serial).hexdigest().upper() == EXPECTED_FINGERPRINT
    payload = {
        "schema": "rank8-delta2-new-leaf-upper-corner-sparse-terms-v1",
        "status": "PASS_EXACT_SPARSE_SERIALIZATION",
        "endpoint_mask": 3,
        "positive_denominator": metadata["positive_denominator"],
        "polynomial_fingerprint": EXPECTED_FINGERPRINT,
        **sparse,
        "input_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"),
        },
        "proof_boundary": "This is a deterministic serialization of the already-derived corner numerator, not a sign certificate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
