#!/usr/bin/env python3
"""Bounded exact first-atom smoke for the strong grade-14 triple producer."""

from __future__ import annotations

import gc
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_stream_agent as producer


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_low_low_a23_mixed_cross_strong_grade14_first_triple_smoke_agent_20260823.json"
EXPECTED = {
    "probe_rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_stream_agent.py": "C742B0EE941D69542BFCEFAA22F38C92D67BC1DFA1B614DB1FC03C257C7903BB",
    "audit_rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_agent.py": "AB4619C11542B5AA81C40282F191148BDB2E1C8ADE7F37E149C02B47AA0B74E2",
    "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_audit_agent_20260823.json": "0313F4DE9B6C558AD2E2417D1D2E4C85BDC97C41F1BBDA8049EA01E1F9A32704",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    face = (0, 1)
    triple = producer.BASE_TRIPLES[0]
    assert triple == (0, 0, 0)
    assert producer.base_monomial(triple) == (3, 0, 0, 0, 0)
    context = fmpz_mpoly_ctx.get(producer.SLACK, "degrevlex")
    zero = context.constant(0)
    peak = [0]
    h, capacity, c, v, dc, dv, target = producer.build(
        face, triple, context, peak, producer.LIMIT
    )
    assert target == (3,)
    polys = producer.pieces(
        h, capacity, c, v, dc, dv, 0, zero, target, peak, producer.LIMIT
    )
    complete = {label: hashlib.sha256() for label, _ in producer.LABELS}
    outer_complete = {label: hashlib.sha256() for label, _ in producer.LABELS}
    stats = producer.merge_atom(
        (producer.base_monomial(triple), polys),
        0,
        complete,
        outer_complete,
        peak,
        producer.LIMIT,
    )
    del h, capacity, c, v, dc, dv, polys
    gc.collect()
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade14-first-triple-smoke-agent-v1",
        "status": (
            "PASS_EXACT_BOUNDED_STRONG_GRADE14_FIRST_TRIPLE_BOTH_ROWS_NONNEGATIVE"
            if all(row["negative_terms"] == 0 for row in stats.values())
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "scope": {
            "face": list(face),
            "outer_exponent": 0,
            "base_triple_index": 0,
            "base_triple": list(triple),
            "base_exponent": list(producer.base_monomial(triple)),
            "exact_base_degree": 3,
            "total_ordinary_slack_degree": 14,
        },
        "rows": stats,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "One bounded atom only; this supplies no grade-14 registry credit. All 210 face-outer-triple atoms and an independently written replay remain required.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], flush=True)
    for label, row in stats.items():
        print(label, row["mixed_support_terms"], row["negative_terms"], row["minimum"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    if not payload["status"].startswith("PASS_"):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
