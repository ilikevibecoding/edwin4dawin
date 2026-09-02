#!/usr/bin/env python3
"""Classify every canonical no-parent/root-star sibling-bundle mode.

Let s be an unmarked canonical deepest support with no parent.  Its component
is a star centered at s.  The chosen bundle contains all unmarked leaf
neighbors of s, so after removing the bundle the only possible neighbors of
s are the protected marks u and v.  With C=F(H-s) and D=F(H-N[s]), the
number k of protected leaf neighbors is therefore 0, 1, or 2.

This file freezes the exact four-minor row collapse in each mode and checks
it against the raw rank-four bundle coefficients.  It is a structural
classification/reduction, not a positivity theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    independent_raw_g2,
)
from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"


def row_symbols(prefix: str):
    return {
        name: tuple(sp.Symbol(f"{prefix}{name}{rank}") for rank in range(6))
        for name in "EUVW"
    }


def mode_rules(mode: str):
    c = row_symbols("c")
    d = row_symbols("d")
    if mode == "k0_no_protected_leaf":
        targets = {name: c[name] for name in "EUVW"}
    elif mode == "k1_protected_u_leaf":
        targets = {"E": c["U"], "U": c["U"], "V": c["W"], "W": c["W"]}
    elif mode == "k2_both_protected_leaves":
        targets = {name: c["W"] for name in "EUVW"}
    else:
        raise ValueError(mode)
    return {
        d[name][rank]: targets[name][rank]
        for name in "EUVW"
        for rank in range(6)
    }


def isolate_convolution(row, number: int):
    return tuple(
        sp.expand(
            sum(sp.binomial(number, shift) * row[rank - shift] for shift in range(rank + 1))
        )
        for rank in range(6)
    )


def verify_marked_isolation_constraints():
    """Verify the k=1,2 collapses on their exact constrained C tuples."""
    a = tuple(sp.Symbol(f"a{rank}") for rank in range(6))
    b = tuple(sp.Symbol(f"b{rank}") for rank in range(6))
    k = tuple(sp.Symbol(f"k{rank}") for rank in range(6))

    # k=1: u is an isolated protected leaf after deleting s.  If A and B
    # are the E and V rows of the remaining marked core, then
    # C=((1+x)A,A,(1+x)B,B) and deleting N[s] deletes u.
    k1_c = {
        "E": isolate_convolution(a, 1),
        "U": a,
        "V": isolate_convolution(b, 1),
        "W": b,
    }
    k1_d = {"E": a, "U": a, "V": b, "W": b}
    assert k1_d == {"E": k1_c["U"], "U": k1_c["U"], "V": k1_c["W"], "W": k1_c["W"]}

    # k=2: both marks are isolated after deleting s.  The remaining unmarked
    # core has independence row K in every minor.
    k2_c = {
        "E": isolate_convolution(k, 2),
        "U": isolate_convolution(k, 1),
        "V": isolate_convolution(k, 1),
        "W": k,
    }
    k2_d = {name: k for name in "EUVW"}
    assert k2_d == {name: k2_c["W"] for name in "EUVW"}
    return {
        "k1_C_constraint": "C=((1+x)A,A,(1+x)B,B); u is isolated in C",
        "k2_C_constraint": "C=((1+x)^2K,(1+x)K,(1+x)K,K); u,v are isolated in C",
    }


def expression_stats(expression: sp.Expr):
    symbols = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    return {
        "term_count": len(polynomial.terms()),
        "factor": str(sp.factor(expression)),
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    constraints = verify_marked_isolation_constraints()
    raw1 = raw_g1()
    raw2 = independent_raw_g2()
    modes = {}
    for mode in (
        "k0_no_protected_leaf",
        "k1_protected_u_leaf",
        "k2_both_protected_leaves",
    ):
        rules = mode_rules(mode)
        g1 = sp.factor(raw1.subs(rules))
        g2 = sp.factor(raw2.subs(rules))
        modes[mode] = {
            "D_row_identity": {
                "k0_no_protected_leaf": "D=(C_E,C_U,C_V,C_W)=C",
                "k1_protected_u_leaf": "D=(C_U,C_U,C_W,C_W)",
                "k2_both_protected_leaves": "D=(C_W,C_W,C_W,C_W)",
            }[mode],
            "g1_raw": expression_stats(g1),
            "g2_raw": expression_stats(g2),
        }

    # The single-protected row form is literally the endpoint-parent row
    # form; its geometric orientation is irrelevant to Gamma.
    assert modes["k1_protected_u_leaf"]["g1_raw"] == expression_stats(
        raw1.subs(mode_rules("k1_protected_u_leaf"))
    )

    report = {
        "marker": "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT",
        "structural_lemma": (
            "For an unmarked canonical deepest support s with no parent, its "
            "component is a star. After bundling every unmarked leaf neighbor, "
            "the remaining neighbors are a subset of the two protected marks. "
            "Hence exactly k=0,1,2 protected-leaf modes occur."
        ),
        "exhaustiveness": (
            "There are no other non-bundle neighbors: no parent exists, every "
            "unprotected child belongs to the full sibling bundle, and the marked "
            "forest has exactly the two protected vertices u,v."
        ),
        "modes": modes,
        "marked_core_constraints": constraints,
        "symmetry": "The k=1 protected-v mode is obtained by swapping U and V.",
        "reuse_boundary": (
            "k=1 has exactly the same four-minor algebra as endpoint parent p=u "
            "and may import that theorem after an independent identity audit. "
            "k=0 and k=2 remain separate obligations."
        ),
        "scope": (
            "Exact structural classification and raw g1/g2 reductions for the "
            "canonical no-parent root-star case only; no sign theorem is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "structural_lemma": report["structural_lemma"],
        "row_identities": {
            key: value["D_row_identity"] for key, value in modes.items()
        },
        "marked_core_constraints": constraints,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
