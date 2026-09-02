#!/usr/bin/env python3
"""Seal the rooted-star equality branch of the Delta0 new-leaf gate.

Let A be a tree of order n>=27, attach the prospective new leaf at v, and
write D=A-v, R=N_A(v), F=D-R.  This script records the exact structural
classification when both d5=f5 and the size-five upper-shadow inequality of
F is sharp, and substitutes that classified motif into the *actual* Delta0
gate (not an endpoint relaxation).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_rooted_star_equality_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    M, A5 = sp.symbols("M A5", integer=True, positive=True)
    gate = leaf.build_gates()["new_leaf_root_structural"][0]

    # For D=K_(1,M) rooted at its center and F=D-center=E_M, all coefficients
    # of degrees 5 through 8 agree with those of E_M.  Express them relative
    # to A5=C(M,5) so the final sign factor is a polynomial in M.
    star = {
        5: A5,
        6: A5 * (M - 5) / 6,
        7: A5 * (M - 5) * (M - 6) / 42,
        8: A5 * (M - 5) * (M - 6) * (M - 7) / 336,
    }
    substitution = {leaf.d[index]: star[index] for index in range(5, 9)}
    substitution.update({leaf.f[index]: star[index] for index in range(5, 8)})
    actual = sp.factor(gate.subs(substitution, simultaneous=True))
    expected = (
        A5**4
        * (M - 5) ** 2
        * (M + 1) ** 2
        * (15 * M**3 + 319 * M**2 + 3064 * M + 8640)
        / sp.Integer(444528)
    )
    assert sp.factor(actual - expected) == 0

    # The smallest-component argument excluding 2<=r<=4 uses only these
    # exact lower bounds on the number of non-root vertices outside it.
    smallest_component_bounds = {
        r: 26 - (26 // r) - (r - 1) for r in range(2, 5)
    }
    assert smallest_component_bounds == {2: 12, 3: 16, 4: 17}
    assert all((vertices + 1) // 2 >= 4 for vertices in smallest_component_bounds.values())

    payload = {
        "schema": "rank8-delta0-new-leaf-rooted-star-equality-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_ROOTED_STAR_EQUALITY_BRANCH",
        "setup": {
            "source_order": "n>=27",
            "D": "A-v, order N=n-1>=26",
            "R": "N_A(v), an independent transversal containing one vertex per component of D",
            "F": "D-R=A-N_A[v]",
        },
        "classification": [
            "d5-f5>=binom(r,5), because every five-subset of R is independent in D and absent from F",
            "if 2<=r<=4, choosing a root in a smallest component and four independent vertices outside it gives a D-only independent five-set",
            "therefore d5=f5 forces r=1; for its unique root u, d5-f5=i4(D-N_D[u]), so equality is equivalent to alpha(D-N_D[u])<=3",
            "for |F|>=10, equality 6*f6=(|F|-5)*f5 in the extension double count holds iff F is edgeless",
            "hence simultaneous d5=f5 and sharp F shadow force D to be the star K_(1,M) centered at u, with F=E_M and M=|F|>=25",
        ],
        "smallest_component_nonroot_lower_bounds_at_N26": smallest_component_bounds,
        "actual_gate_factor": str(expected),
        "positivity": (
            "A5=binom(M,5)>0 and every displayed factor is positive for M>=25"
        ),
        "source_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                HERE / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "proof_boundary": (
            "This seals only the simultaneous equality/sharp-shadow rooted-star branch "
            "of the actual Delta0 new-leaf-root gate.  The strict d5>f5 branch, "
            "non-sharp F shadow, q=v, Delta1..3, connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
