#!/usr/bin/env python3
"""Replay the exact pairing and diagonalization of affine path layers."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


def formal_pairing(maximum_degree: int) -> dict:
    """Check [z^D w^D]s^n H=2[z^D w^(D-1)]s^(n-1)H.

    H is represented by independent symmetric coefficient labels on a large
    box.  Equality of the resulting integer coefficient vectors is a formal
    polynomial identity check, not a numerical specialization.
    """
    canonical = []
    checks = 0
    for degree in range(1, maximum_degree + 1):
        for order in range(1, degree + 1):
            left = {}
            right = {}
            for z_steps in range(order + 1):
                key = tuple(sorted((
                    degree - z_steps,
                    degree - (order - z_steps),
                )))
                left[key] = left.get(key, 0) + math.comb(order, z_steps)
            for z_steps in range(order):
                key = tuple(sorted((
                    degree - z_steps,
                    degree - 1 - (order - 1 - z_steps),
                )))
                right[key] = right.get(key, 0) + 2 * math.comb(order - 1, z_steps)
            left = {key: value for key, value in left.items() if value}
            right = {key: value for key, value in right.items() if value}
            assert left == right
            checks += 1
            canonical.append(f"{degree},{order}:{sorted(left.items())}")
    return {
        "formal_vector_checks": checks,
        "maximum_degree": maximum_degree,
        "sha256": hashlib.sha256(
            "\n".join(canonical).encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    formal = formal_pairing(64)

    # The binomial assembly after pairing is Pascal's identity.
    assembly_checks = 0
    for order in range(65):
        for layer in range(1, order + 1):
            assert (
                math.comb(order, layer)
                + math.comb(order, layer - 1)
                == math.comb(order + 1, layer)
            )
            assembly_checks += 1

    report = {
        "status": "PASS_AFFINE_BRIDGE_LAYER_PAIRING_RECURRENCE",
        "notation": {
            "U_r_j": (
                "[z^(L+r+1)w^(L+r)](z+w)^(r-j)H_r"
            ),
            "Z_r_j": (
                "[z^(L+r+1)w^(L+r+1)](z+w)^(r-j)H_r"
            ),
            "H_r": "A^a T^b(B+rP)",
        },
        "pairing": "Z_(r,j)=2U_(r,j+1), 0<=j<r",
        "reason": (
            "For symmetric F, [z^D w^D](z+w)F="
            "2[z^D w^(D-1)]F."
        ),
        "boundary_assembly": (
            "2U_r+Z_r=2*sum_(j=0)^r C(r+1,j)U_(r,j)+Z_(r,r)"
        ),
        "diagonal_layers": (
            "D_(r,h)=[z^(L+r+1)w^(L+r+1)](z+w)^hH_r; "
            "D_(r,0)=Z_(r,r), D_(r,h)=2U_(r,r+1-h) for 1<=h<=r+1"
        ),
        "diagonal_assembly": (
            "2U_r+Z_r=sum_(h=0)^(r+1) C(r+1,h)D_(r,h)"
        ),
        "formal_pairing_replay": formal,
        "pascal_assembly_checks": assembly_checks,
        "remaining_sufficient_lemma": (
            "D_(r,h)>=0 for all allowed parameters, r>=0, 0<=h<=r+1"
        ),
        "scope_warning": (
            "The identities are proved exactly. Positivity of the diagonal "
            "layers is the remaining unproved kernel-specific statement."
        ),
    }
    output = Path("affine_bridge_layer_pairing_recurrence_exact_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "formal_pairing_checks": formal["formal_vector_checks"],
        "pascal_assembly_checks": assembly_checks,
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
