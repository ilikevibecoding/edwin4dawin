#!/usr/bin/env python3
"""Diagnose the deterministic grade-10 FLINT term-order failure.

This deliberately builds only face 01 / outer exponent 0.  It does not emit
producer chunks and never writes any of the canonical producer artifacts.
The report filename is unique to the grade-10 repair investigation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from flint import __FLINT_VERSION__, __version__ as PYTHON_FLINT_VERSION
from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent as core


HERE = Path(__file__).resolve().parent
NAMES = core.NAMES
KNOWN_NEXT_INDICES = (6_329_475, 4_027_387, 2_340_068)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


def read_term(poly, index: int, expected_base_degree: int) -> dict:
    monomial_reads = [tuple(map(int, poly.monomial(index))) for _ in range(8)]
    coefficients = [int(poly.coefficient(index)) for _ in range(3)]
    monomial = monomial_reads[0]
    corrected = list(monomial)
    corrected[0] = expected_base_degree - sum(corrected[1 : len(core.BASE)])
    corrected_tuple = tuple(corrected)
    return {
        "index": index,
        "monomial_reads": [list(item) for item in monomial_reads],
        "monomial_reads_identical": len(set(monomial_reads)) == 1,
        "coefficient_reads": coefficients,
        "coefficient_reads_identical": len(set(coefficients)) == 1,
        "total_degree": sum(monomial),
        "base_degree": sum(monomial[: len(core.BASE)]),
        "remaining_slack_degree": sum(monomial[len(core.BASE) :]),
        "native_mapped_order": [
            -sum(monomial), list(reversed(monomial)),
        ],
        "coefficient_at_decoded_monomial": int(poly[monomial]),
        "base_homogeneity_corrected_monomial": corrected,
        "coefficient_at_base_homogeneity_corrected_monomial": (
            int(poly[corrected_tuple]) if corrected[0] >= 0 else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="rank8_strong_grade10_flint_term_order_diagnostic_agent_grade10_repair.json",
    )
    parser.add_argument("--private-limit", type=int, default=10_000_000_000)
    args = parser.parse_args()

    target = 17 - 10
    peak = [0]
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    raw, h, capacity, c, v, dc, dv = core.build(
        (0, 1), "strong", target, context, peak, args.private_limit,
    )
    polys = core.make_pieces(
        "strong", raw, h, capacity, c, v, dc, dv, 0, target, peak,
        args.private_limit,
    )

    records = []
    for piece, (poly, next_index) in enumerate(zip(polys, KNOWN_NEXT_INDICES)):
        sample_indices = sorted({
            index
            for index in (
                0, 1, next_index - 2, next_index - 1, next_index,
                next_index + 1, len(poly) - 2, len(poly) - 1,
            )
            if 0 <= index < len(poly)
        })
        samples = [read_term(poly, index, target) for index in sample_indices]
        records.append({
            "piece": piece,
            "length": len(poly),
            "reported_total_degree": int(poly.total_degree()),
            "reported_variable_degrees": list(map(int, poly.degrees())),
            "known_failure_next_index": next_index,
            "samples": samples,
        })

    payload = {
        "schema": "rank8-strong-grade10-flint-term-order-diagnostic-agent-grade10-repair-v1",
        "status": "PASS_DIAGNOSTIC_COMPLETED",
        "family": "strong",
        "grade": 10,
        "exact_base_degree": target,
        "face": [0, 1],
        "outer_exponent": 0,
        "python_flint_version": PYTHON_FLINT_VERSION,
        "flint_version": __FLINT_VERSION__,
        "source_sha256": sha256(Path(__file__)),
        "canonical_producer_source_sha256": sha256(Path(core.__file__)),
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "pieces": records,
    }
    output = Path(args.output).resolve()
    digest = atomic_json(output, payload)
    print("DIAGNOSTIC", output, digest, flush=True)


if __name__ == "__main__":
    main()
