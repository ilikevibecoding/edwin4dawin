#!/usr/bin/env python3
"""Materialize the exact Delta1/Q7/lower-cross source as transparent JSON.

The local pickle only avoids repeating a costly SymPy cancellation.  This
extractor verifies the builder identity stored in that cache, converts the
source numerator to explicit rational sparse terms, and emits a hash-pinned
JSON artifact suitable for the tail tensor.  A later independent audit must
rebuild the source from the symbolic builder before final assembly.
"""

from __future__ import annotations

import hashlib
import json
import pickle
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
BUILDER = HERE / "probe_rank8_delta01_source_curvatures_root.py"
BUILDER_SHA256 = "C67587B658BA75E9A2DF0E42631E03A8746DA4D86420729C40D28296FE6682FF"
CACHE = HERE / "_cache_rank8_delta1_q7_lcross_source_root.pkl"
CACHE_SHA256 = "72D3CA7B7E609EDBFB292666BCF3962F4BD1B55A6121C4FFD44AC2DC14440246"
OUTPUT = HERE / "rank8_delta1_q7_lcross_source_sparse_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(BUILDER) == BUILDER_SHA256
    assert sha256(CACHE) == CACHE_SHA256
    cached = pickle.loads(CACHE.read_bytes())
    assert cached["builder_sha256"] == BUILDER_SHA256
    value = cached["value"]
    variables = cached["variables"]
    assert tuple(map(str, variables)) == ("n", "w", "x", "U", "K", "V", "Z")
    numerator, denominator = sp.fraction(value)
    polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    terms = [
        [list(monomial), str(coefficient)]
        for monomial, coefficient in polynomial.terms()
    ]
    assert len(terms) == 23_565
    assert polynomial.degree_list() == (2, 0, 13, 13, 5, 9, 2)
    payload = {
        "schema": "rank8-delta1-q7-lcross-source-sparse-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA1_Q7_LCROSS_SOURCE_SPARSE",
        "case": {"Delta": 1, "c8_endpoint": "q7", "capacity_piece": "lcross"},
        "variables": list(map(str, variables)),
        "numerator_terms": terms,
        "numerator_term_count": len(terms),
        "numerator_degrees": list(polynomial.degree_list()),
        "positive_denominator_factor": str(sp.factor(denominator)),
        "provenance": {
            BUILDER.name: BUILDER_SHA256,
            CACHE.name: CACHE_SHA256,
            "cache_role": "performance-only exact SymPy serialization",
        },
        "source_sha256": sha256(Path(__file__)),
        "audit_boundary": (
            "Final assembly requires an independent fresh symbolic rebuild that "
            "matches these sparse terms and the displayed denominator."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "DEGREES", polynomial.degree_list())
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
