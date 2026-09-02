#!/usr/bin/env python3
"""Materialize the exact sparse source polynomial for repeated finite cells."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_source_curvatures import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json"
PINNED = {
    "probe_rank8_delta2_source_curvatures.py":
        "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "verify_rank8_q8_terminal_delta2_reduction.py":
        "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    value, variables = build(1, "lcross")
    numerator, denominator = sp.fraction(sp.cancel(value))
    polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
    terms = polynomial.terms()
    degrees = polynomial.degree_list()
    assert len(terms) == 5703
    assert degrees == (2, 0, 12, 12, 8, 2)
    payload = {
        "schema": "rank8-delta2-lcross-k1-source-sparse-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_LCROSS_K1_SOURCE_SPARSE",
        "variables": [str(variable) for variable in variables],
        "numerator_terms": [
            [list(monomial), str(coefficient)]
            for monomial, coefficient in terms
        ],
        "numerator_term_count": len(terms),
        "numerator_degrees": [int(value) for value in degrees],
        "positive_denominator_factor": str(sp.factor(denominator)),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("TERMS", len(terms), "DEGREES", degrees)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
