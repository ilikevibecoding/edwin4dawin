"""Exact dependency check for the all-source-branch outer consequence.

The Riccati supersolution and orientation certificates do not require the
source point to be on the far-left Weyl branch.  This verifier replays the
generic derivative identity and checks the two dependency reports.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_outer_all_branch_consequence_exact_20260807.json"


def main():
    supersolution = json.loads(
        (HERE / "pf_length3_outer_riccati_supersolutions_exact_20260807.json").read_text()
    )
    orientation = json.loads(
        (HERE / "pf_length3_outer_orientation_dichotomy_exact_20260807.json").read_text()
    )
    assert supersolution["status"] == "PASS_EXACT_PF_LENGTH3_OUTER_RICCATI_SUPERSOLUTIONS"
    assert orientation["status"] == "PASS_EXACT_PF_LENGTH3_OUTER_ORIENTATION_DICHOTOMY"

    X, P, Q, Pz, Qz, F, denominator = sp.symbols(
        "X P Q Pz Qz F R", nonzero=True
    )
    star = -P / Q
    star_z = sp.simplify(-(Pz * Q - P * Qz) / Q**2)
    row_z_at_collision = sp.simplify(Pz + Qz * star + Q * F)
    derivative_at_collision = sp.simplify(-X * row_z_at_collision / denominator)
    expected = sp.simplify(-X * Q / denominator * (F - star_z))
    assert sp.simplify(derivative_at_collision - expected) == 0

    payload = sp.srepr(expected)
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_OUTER_ALL_BRANCH_CONSEQUENCE",
        "dependencies": [supersolution["status"], orientation["status"]],
        "generic_derivative_identity": (
            "At L=P+QT=0, d_x[X L/R]=-(XQ/R)(F-d_z T*)."
        ),
        "identity_sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "source_pole_case": (
            "If X=0, simplicity gives xX_1 nonzero.  A common row zero would "
            "force Q_0=Q_1=0, excluded by the orientation dichotomy: either "
            "the affine determinant is positive or both Q_m are negative."
        ),
        "theorem": (
            "Every positive-PF common collision with z>=r+5, on any source "
            "Weyl branch, has positive derivative product AB."
        ),
        "remaining_gap": (
            "Exclude positive-PF common collisions in 0<z<r+5.  Far-left "
            "localization is neither required nor true."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
