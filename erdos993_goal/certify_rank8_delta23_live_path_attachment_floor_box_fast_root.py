#!/usr/bin/env python3
"""Provenance-pinned fast runner for the attachment-floor Delta2/3 boxes.

The mathematical source and mappings remain in the independently audited
agent certificate.  This runner replaces only its established dense Python
axis transform by the exact chunked FLINT-matrix implementation, and pins
both imported sources into every output report.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import certify_rank8_delta23_live_path_attachment_floor_box_agent as certificate
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
PINNED = {
    "certify_rank8_delta23_live_path_attachment_floor_box_agent.py":
        "F0024AEFEE3790D2FC5B77F61226DCD56E6C63C1F61358A8B4EB9ADE8B604669",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    certificate.EXPECTED_INPUTS = {
        **certificate.EXPECTED_INPUTS,
        **PINNED,
    }
    certificate.tensor_bernstein_from_flint = (
        lambda polynomial, dimension: tensor_bernstein_from_flint_matrix(
            polynomial, dimension, chunk_columns=4096
        )
    )
    # The imported main hashes its global __file__ for report provenance.
    certificate.__file__ = str(Path(__file__).resolve())
    return certificate.main()


if __name__ == "__main__":
    raise SystemExit(main())
