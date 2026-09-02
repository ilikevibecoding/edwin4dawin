"""Exact certified counterexample to forest-cone K_c root coherence.

This does not refute real-rootedness of H_c=(1/2) dK_c/dc.  It only shows
that H_c need not interlace K_c and that K_c's ordered roots can move in
different directions at the same parameter value.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from audit_endpoint_kc_forest_root_coherence_exact import cell_signs, rays


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_forest_root_coherence_counterexample_exact_20260813.json"


def main() -> None:
    witnesses = [
        (13, 4, Fraction(1), Fraction(6, 5), [-1, 1]),
        (17, 6, Fraction(1), Fraction(119, 100), [-1, -1, 1]),
        (21, 8, Fraction(1), Fraction(6, 5), [-1, -1, 1, 1]),
    ]
    records = []
    for N, s, u, c, expected in witnesses:
        assert N == 2 * s + 5
        signs = cell_signs(N, s, u, c)
        assert signs == expected
        E, F, G = rays(N, s, u)
        records.append(
            {
                "N": N,
                "s": s,
                "forest_excess": N - (2 * s + 5),
                "u": str(u),
                "c": str(c),
                "certified_velocity_signs": signs,
                "degrees": {
                    "E": len(E) - 1,
                    "F": len(F) - 1,
                    "G": len(G) - 1,
                },
            }
        )

    payload = {
        "status": "PASS_EXACT_FOREST_ROOT_COHERENCE_COUNTEREXAMPLE",
        "records": records,
        "conclusion": (
            "Even under N>=2s+5, the ordered roots of "
            "K_c=E+2cF+c^2G need not have one common velocity sign. "
            "This refutes only the K_c/partial_cK_c proper-position route; "
            "it does not refute negative-rootedness of partial_cK_c/2=F+cG."
        ),
        "method": (
            "FLINT certified complex-root balls for K_c, with all imaginary "
            "balls containing zero, simple multiplicity, and interval "
            "evaluation of -(F+cG)/partial_t K_c excluding zero."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(json.dumps(payload, indent=2))
    print("source_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
