#!/usr/bin/env python3
"""Exact degree-26 Newton scan of every mixed pendant-root e=2 Delta3 ray."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta3
from scan_rank8_delta01_e2_branch_mixed_newton_agent import differences
from scan_rank8_delta01_e2_pendant_mixed_newton_agent import (
    keys, literal_graph, pendant_polys, resolved,
)
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta3_e2_pendant_mixed_newton_exact_root_20260823.json"
SAMPLES = 27
EXPECTED = {
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json":
        "8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "scan_rank8_delta01_e2_branch_mixed_newton_agent.py":
        "672267A98E3575CB75ACF2492BBEA922F5CE402BA35BC5B42CA231F2481D4641",
    "scan_rank8_delta01_e2_pendant_mixed_newton_agent.py":
        "B2EDE9AD295508AB93A0C591C53721FE840FAD32465C796504E53FF794C334B4",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {
        "d0": None, "d1": None, "higher": None,
        "d0_witness": None, "d1_witness": None, "higher_witness": None,
    }
    count = 0
    zero_coefficients = 0
    self_checks = 0
    lines = []

    for key, flat, flags in keys():
        baseline = 2 + sum(
            8 if index == 5 and value == "L"
            else 7 if value == "L"
            else value
            for index, value in enumerate(flat)
        )
        shift = max(0, 31 - baseline)
        sampled = []
        for sample in range(SAMPLES):
            values = resolved(flat, flags, shift + sample)
            core, deleted = pendant_polys(values)
            sampled.append(delta3(core, deleted))
            if self_checks < 64 and sample in (0, 11, 26):
                adjacency, root = literal_graph(values)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                self_checks += 1
        coefficients = differences(sampled)
        assert coefficients[0] > 0 and min(coefficients[1:]) >= 0, (key, coefficients)

        candidates = (
            ("d0", coefficients[0], "d0_witness", 0),
            ("d1", coefficients[1], "d1_witness", 1),
            (
                "higher", min(coefficients[2:]), "higher_witness",
                2 + coefficients[2:].index(min(coefficients[2:])),
            ),
        )
        for field, value, witness_field, power in candidates:
            if minima[field] is None or value < minima[field]:
                minima[field] = value
                minima[witness_field] = {
                    "key": key,
                    "baseline_order": baseline,
                    "order_shift": shift,
                    "power": power,
                    "coefficient": value,
                }
        zero_coefficients += sum(value == 0 for value in coefficients[1:])
        lines.append(json.dumps(
            [key, baseline, shift, coefficients], separators=(",", ":")
        ))
        count += 1
        if count % 10000 == 0:
            print("PROGRESS", count, flush=True)

    assert count == 57133
    stream = hashlib.sha256(
        ("\n".join(sorted(lines)) + "\n").encode()
    ).hexdigest().upper()
    payload = {
        "schema": "rank8-delta3-e2-pendant-mixed-newton-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA3_E2_PENDANT_MIXED_ALL_RAYS",
        "theorem": "For every mixed short/long pendant-root e=2 quotient key and every total long offset giving order n>=31, Delta3>0.",
        "rays": count,
        "samples_per_ray": SAMPLES,
        "literal_values": count * SAMPLES,
        "newton_degree_bound": 26,
        "sign_gate": "d0>0 and d1..d26>=0",
        "minimum_coefficients": minima,
        "zero_nonconstant_coefficients": zero_coefficients,
        "literal_formula_self_checks": self_checks,
        "coefficient_stream_order": "sorted canonical JSON lines, one per quotient ray",
        "coefficient_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Pendant-root mixed e=2 Delta3 only; all-short and all-long pendant sectors and other root types remain separately gated.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", count, "VALUES", payload["literal_values"], "ZEROS", zero_coefficients)
    print("MINIMA", json.dumps(minima, indent=2))
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
