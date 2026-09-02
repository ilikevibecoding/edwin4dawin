#!/usr/bin/env python3
"""Exact continuous n=28 Delta2 cell for nonstar surplus 40<=e<=300."""

import hashlib
import json
from pathlib import Path

import sympy as sp

import certify_rank8_delta2_lcross_k1_finite_surplus_batch_root as batch


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_n28_high_surplus_assembly_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    actual = {name: sha256(HERE / name) for name in batch.PINNED}
    assert actual == batch.PINNED
    terms, maxima, denominator = batch.load_sparse_source()
    payload, cell_output = batch.certify_cell(
        28,
        sp.Integer(40),
        sp.Integer(300),
        "cauchy",
        terms,
        maxima,
    )
    assert payload["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_FINITE_SURPLUS_CELL"
    assert payload["degree_surplus_interval"] == ["40", "300"]
    assembly = {
        "schema": "rank8-delta2-n28-high-surplus-assembly-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_N28_SURPLUS_40_TO_300",
        "theorem": (
            "The k=1 lower-cross Delta2 source is nonnegative at order 28 "
            "on the complete continuous nonstar surplus interval 40<=e<=300."
        ),
        "cell_report": cell_output.name,
        "cell_report_sha256": sha256(cell_output),
        "source_denominator_factor": denominator,
        "cell_summary": {
            "degree_surplus_interval": payload["degree_surplus_interval"],
            "mapped_degrees": payload["mapped_degrees"],
            "Bernstein_coefficients": payload["bernstein_coefficients"],
            "minimum": payload["minimum"],
            "sign_counts": payload["coefficient_sign_counts"],
        },
        "dependencies": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Surpluses below 40, the star, and the other live tensors are "
            "separate proof components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(assembly, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(assembly["status"])
    print("SOURCE", assembly["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
