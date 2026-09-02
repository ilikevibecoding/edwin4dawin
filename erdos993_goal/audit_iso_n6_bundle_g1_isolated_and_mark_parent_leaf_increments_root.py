#!/usr/bin/env python3
"""Independent exact audit of isolated and marked-parent rank-six G1 leaf modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_audit_root_20260831.json"
MARKER = "AUDIT_EXACT_ISO_N6_BUNDLE_G1_ISOLATED_AND_MARK_PARENT_LEAF_INCREMENTS_ROOT"
PINS = {
    "derive_iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_agent.py":
        "9BA12AC476425CCF6BB9252DDA58F0CC8E914E6BB2CAE256E0A95DA4CBE6DB4A",
    "iso_n6_bundle_g1_isolated_and_mark_parent_leaf_increments_exact_agent_20260831.json":
        "1C881A5DFABC76D7270D570F38C19D50971CFD800035293A97FBD354AA38FBBC",
    "audit_iso_n6_bundle_g6_g2_transfer_audit.py":
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def add_mark_leaf(rowset, endpoint: str):
    e, u, v, w = rowset
    sources = (u, u, w, w) if endpoint == "u" else (v, w, v, w)
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(rowset, sources))


def expression_hash(expression) -> str:
    return hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper()


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")

    g1, g2 = reconstruct(1), reconstruct(2)
    arows, brows = rows("A"), rows("B")
    base = substitute(g1, arows, brows)

    isolated_c = isolate_multiply(arows, 1)
    isolated_d = isolate_multiply(brows, 1)
    delta_isolated_deleted = sp.expand(substitute(g1, isolated_c, brows) - base)
    delta_isolated_retained = sp.expand(substitute(g1, isolated_c, isolated_d) - base)
    frozen_g2 = sp.expand(substitute(g2, arows, brows))
    require(sp.expand(delta_isolated_deleted - frozen_g2) == 0,
            "isolated-deleted increment is not G2")
    retained_residual = sp.expand(delta_isolated_retained - frozen_g2)
    require(retained_residual != 0, "isolated-retained residual unexpectedly vanished")

    mark_cases = {}
    for endpoint in ("u", "v"):
        crows = add_mark_leaf(arows, endpoint)
        drows = add_mark_leaf(brows, endpoint)
        deleted = sp.expand(substitute(g1, crows, brows) - base)
        retained = sp.expand(substitute(g1, crows, drows) - base)
        response = sp.expand(substitute(g1, crows, drows) - substitute(g1, crows, brows))
        require(sp.expand(retained - deleted - response) == 0,
                f"mark-parent retention split failed for {endpoint}")
        mark_cases[endpoint] = (deleted, retained, response)

    swap = {}
    for rowset in (arows, brows):
        for rank in range(8):
            swap[rowset[1][rank]] = rowset[2][rank]
            swap[rowset[2][rank]] = rowset[1][rank]
    for index, label in enumerate(("deleted", "retained", "response")):
        require(sp.expand(mark_cases["u"][index].xreplace(swap) - mark_cases["v"][index]) == 0,
                f"u/v mark swap failed for {label}")

    report = {
        "marker": MARKER,
        "checks": {
            "isolated_deleted_equals_frozen_G2": True,
            "isolated_retained_residual_nonzero": True,
            "mark_parent_retention_split": True,
            "mark_parent_u_v_swap": True,
        },
        "expression_sha256": {
            "isolated_deleted": expression_hash(delta_isolated_deleted),
            "isolated_retained": expression_hash(delta_isolated_retained),
            "isolated_retained_post_G2_residual": expression_hash(retained_residual),
            "mark_parent_u_deleted": expression_hash(mark_cases["u"][0]),
            "mark_parent_u_retained": expression_hash(mark_cases["u"][1]),
            "mark_parent_u_response": expression_hash(mark_cases["u"][2]),
        },
        "closed_submode": (
            "For an isolated unmarked vertex ell excluded from D, the G1 leaf-deletion "
            "increment equals the completed universal rank-six G2 coefficient."
        ),
        "open_submodes": [
            "isolated unmarked vertex retained in D",
            "leaf attached to either distinguished mark, leaf excluded from D",
            "leaf attached to either distinguished mark, leaf retained in D",
        ],
        "dependencies_sha256": PINS,
        "scope_guard": (
            "Only the isolated-deleted submode reduces to the frozen G2 theorem.  This "
            "audit proves no sign for the other three submodes, no universal leaf theorem, "
            "and no universal rank-six g1 theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
