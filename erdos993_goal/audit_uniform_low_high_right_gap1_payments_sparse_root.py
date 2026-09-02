#!/usr/bin/env python3
"""Independent sparse payment replay for the right gap-1 theorem.

The 24 cached rational rows are not trusted by themselves: their exact
identity with a separate Fraction-arithmetic convolution is pinned to the
deterministic tensor-interpolation audit.  This wrapper then replays every
sparse, discriminant, projective, and Bernstein payment certificate using the
memory-lean chart implementation.
"""

from __future__ import annotations

import hashlib
import json
import os
import pickle
from pathlib import Path

import audit_uniform_low_high_right_gap1_slack_independent_sparse_root as sparse


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json"
DEPENDENCIES = {
    "audit_uniform_low_high_right_gap1_rows_interpolation_root.py":
        "2D406C3263ABCE5E452B9616A7E7CB6C4CAF00378F08DC2D1ADFCAAAC1D86EFC",
    "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json":
        "598A179F63D5CB1354B79EDAB1469B57FEBD2E8A2571B28163FA29AC450E9088",
    "audit_uniform_low_high_right_gap1_slack_independent_sparse_root.py":
        "32C9D860AB96222E491EE83D2DE2FD61ED4010217DF58201E9AC574A98123E93",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_interpolation_identified_rows(k, x, y, unused_s):
    rows = {}
    target = {"k": k, "x": x, "y": y}
    for label, (name, expected) in sparse.audit.CACHES.items():
        path = HERE / name
        assert sha256(path) == expected
        with path.open("rb") as stream:
            cached = pickle.load(stream)
        rows[label] = {}
        for product, expression in cached.items():
            replacements = {
                symbol: target[str(symbol)]
                for symbol in expression.free_symbols
                if str(symbol) in target
            }
            rows[label][product] = expression.xreplace(replacements)
    return rows


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    interpolation = json.loads(
        (HERE / "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert interpolation["status"] == (
        "PASS_INDEPENDENT_EXACT_RIGHT_GAP1_ROWS_TENSOR_INTERPOLATION_AUDIT"
    )
    assert interpolation["rows"] == 24
    assert interpolation["exact_comparisons"] == 653400
    assert interpolation["identity_argument"][
        "mechanically_propagated_cross_difference_degree_bound"
    ] == [20, 10, 17]
    assert interpolation["identity_argument"]["audited_degree_envelope"] == [32, 24, 32]

    sparse.convolution.build_rows_by_convolution = load_interpolation_identified_rows
    sparse.OUTPUT = OUTPUT
    result = sparse.main()
    payload = json.loads(OUTPUT.read_text(encoding="utf-8"))
    payload["schema"] = "uniform-low-high-right-gap1-payments-sparse-audit-root-v1"
    payload["status"] = "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP1_PAYMENTS_SPARSE_AUDIT"
    payload["independent_reconstruction"] = {
        "method": (
            "24 rational product rows independently identified by exact "
            "degree-determining tensor interpolation, followed by a separate "
            "sparse projective and Bernstein payment replay"
        ),
        "row_identity_dependency": interpolation["status"],
        "exact_row_comparisons": interpolation["exact_comparisons"],
        "mechanical_degree_bound": interpolation["identity_argument"][
            "mechanically_propagated_cross_difference_degree_bound"
        ],
        "audited_degree_envelope": interpolation["identity_argument"][
            "audited_degree_envelope"
        ],
        "constant_term": "pinned independent two-parameter zero-slack audit",
    }
    payload["wrapper_dependencies_sha256"] = dependency_hashes
    payload["payment_engine_source_sha256"] = DEPENDENCIES[
        "audit_uniform_low_high_right_gap1_slack_independent_sparse_root.py"
    ]
    payload["source_sha256"] = sha256(Path(__file__))
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
