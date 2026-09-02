#!/usr/bin/env python3
"""Audit exactly what the alpha-14 matching boundary says about a shift."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
BOUNDARY = ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"
OUTPUT = ROOT / "rank8_alpha14_matching_shift_implication_audit_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    boundary = json.loads(BOUNDARY.read_text(encoding="utf-8"))
    alpha14 = [row for row in boundary["cells"] if row["alpha"] == 14]
    assert [row["order"] for row in alpha14] == list(range(19, 29))
    assert all(row["q_negative"] == 0 for row in alpha14)
    assert all(row["coupled_negative"] == 0 for row in alpha14)

    p7, p8, p9, d7, d8, d9 = sp.symbols("p7 p8 p9 d7 d8 d9")
    q8 = lambda a7, a8, a9: 16*a8**2-a7*a8-18*a7*a9
    first_difference = sp.expand(q8(p7+d7, p8+d8, p9+d9)-q8(p7,p8,p9))
    expected = sp.expand(
        16*(2*p8*d8+d8**2)
        -(p7*d8+p8*d7+d7*d8)
        -18*(p7*d9+p9*d7+d7*d9)
    )
    assert sp.expand(first_difference-expected) == 0
    witness = {p7: 1, p8: 1, p9: 0, d7: 1, d8: 0, d9: 1}
    q8_value = q8(p7,p8,p9).subs(witness)
    delta_value = first_difference.subs(witness)
    assert q8_value == 15 and delta_value == -37

    payload = {
        "schema": "rank8-alpha14-matching-shift-implication-audit-v1",
        "status": "PASS_EXACT_NONIMPLICATION_AUDIT",
        "matching_boundary_fact": "Q8(P)>=0 for every forest P with alpha(P)=14; q_negative=0 in every order 19..28 cell above the independent base",
        "terminal_threshold_consequence": "For P=G_t0 with t0=14-alpha(A), the certificate pays exactly C0=Q8(G_t0).",
        "one_sibling_recurrence": "p'_j=p_j+d_j, d_j=p_(j-1)-h_(j-2)",
        "first_shifted_coefficient": str(first_difference),
        "exact_relaxed_nonimplication_witness": {
            "p7_p8_p9_d7_d8_d9": [1,1,0,1,0,1],
            "Q8_at_threshold": int(q8_value),
            "C1": int(delta_value),
            "classification": "relaxed algebraic witness, not a graph or forest counterexample",
        },
        "stored_data_limit": "The assembled matching report stores aggregate counts and minima, not a same-family sequence of full/reduced jets at t0,t0+1,...; coupled PGC positivity is a different expression.",
        "conclusion": "The existing alpha-14 matching certificate does not by itself imply C1 or any later shifted literal terminal-Q8 coefficient.",
        "smallest_exact_followup": "enumerate the ten unresolved core (order,alpha) cells by maximum-matching quotient trees and every root; retain the two already-paid (21,13),(22,13) cells as conditional Q7 consequences",
        "hashes": {
            "boundary_report_sha256": digest(BOUNDARY),
            "script_sha256": digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
