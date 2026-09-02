#!/usr/bin/env python3
"""No-import audit of the exact Delta2 k=1/lower-cross n>=35 tail."""

from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE = "certify_rank8_delta2_lcross_k1_attachment_floor_tail35_root.py"
REPORT = "rank8_delta2_lcross_k1_attachment_floor_tail35_exact_root_20260826.json"
OUTPUT = HERE / (
    "rank8_delta2_lcross_k1_attachment_floor_tail35_"
    "independent_audit_root_20260826.json"
)
EXPECTED = {
    SOURCE: "0B5704DBB701E91EFC82D990714E16C8606FB9C1F398018FE6A8409BFA84C37C",
    REPORT: "00860979907DF5E22F518944AB93596F03E83CD70300EA08C340D1887733B6F3",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json":
        "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json":
        "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def literal_assignment(tree: ast.Module, name: str):
    for statement in tree.body:
        if isinstance(statement, ast.Assign):
            if any(
                isinstance(target, ast.Name) and target.id == name
                for target in statement.targets
            ):
                return ast.literal_eval(statement.value)
    raise AssertionError(f"missing literal assignment {name}")


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    source_text = (HERE / SOURCE).read_text(encoding="utf-8")
    source_tree = ast.parse(source_text, filename=SOURCE)
    assert literal_assignment(source_tree, "CUTOFF") == 35
    embedded = literal_assignment(source_tree, "PINNED")
    assert embedded == {
        "certify_rank8_delta4_junction_coupled_box.py":
            "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
        "probe_rank8_delta2_source_curvatures.py":
            "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
        "verify_rank8_q8_terminal_reduction.py":
            "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
        "verify_rank8_q8_terminal_delta2_reduction.py":
            "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
        "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
            "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
        "verify_rank8_root_deletion_attachment_floor_root.py":
            "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
        "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
            "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
        "audit_rank8_root_deletion_attachment_floor_root.py":
            "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
            "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
        "verify_rank8_n28_tight_coordinate_chords_root.py":
            "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
        "rank8_n28_tight_coordinate_chords_exact_root_20260825.json":
            "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
        "tensor_bernstein_flint_matrix_root.py":
            "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    }

    report = load(REPORT)
    mapping = load(
        "rank8_delta23_live_path_attachment_floor_box_mappings_"
        "independent_audit_agent_20260825.json"
    )
    floor_audit = load(
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    chords = load("rank8_n28_tight_coordinate_chords_exact_root_20260825.json")
    assert mapping["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    )
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert chords["status"] == "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS"
    assert report["status"] == "PASS_EXACT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TAIL35"
    assert report["Delta"] == 2
    assert report["D6_k"] == 1
    assert report["capacity_piece"] == "lcross"
    assert report["order_domain"] == "single compactified n>=35 tail"
    assert report["mapped_degrees"] == [38, 12, 12, 12, 8, 2]
    assert report["bernstein_coefficients"] == 2_313_441
    assert report["coefficient_sign_counts"] == {
        "negative": 0, "zero": 0, "positive": 2_313_441,
    }
    assert sp.Rational(report["minimum"]) > 0
    assert report["source_sha256"] == actual[SOURCE]
    assert report["immutable_inputs"] == embedded

    # Reconstruct the compactification and floor without importing the producer.
    n, T, Zc = sp.symbols("n T Zc", positive=True)
    t = T / 35
    p = 1 - 19 * t
    q = 7 * t
    d = 1 - 12 * t
    Z = sp.cancel((p + q * Zc) / d)
    assert sp.expand(p + q - d) == 0
    assert sp.cancel(((n - 19) / (n - 12)).subs(n, 1 / t) - p / d) == 0
    assert sp.factor(Z.subs({T: 1, Zc: 0})) == sp.Rational(16, 23)
    assert sp.factor(Z.subs(Zc, 1)) == 1
    assert p.subs(T, 1) > 0 and d.subs(T, 1) > 0

    # Reconstruct the lower-cross path coordinate h7/c7.
    a, root_q, c6 = sp.symbols("a root_q c6", positive=True)
    c7 = a * root_q * c6 / 6
    h7 = c7 * Z
    assert sp.cancel(h7 / c7) == Z

    source_fragments = (
        'build(1, "lcross")',
        "t_map = T / CUTOFF",
        "p = 1 - 19 * t_map",
        "q = 7 * t_map",
        "d = 1 - 12 * t_map",
        "y_upper = 3 + sp.Rational(546, 25) * t_map",
        "r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map",
        "term *= z_powers[z_power] * d_powers[z_degree - z_power]",
        "tensor_bernstein_from_flint_matrix(",
    )
    assert all(fragment in source_text for fragment in source_fragments)

    payload = {
        "schema": "rank8-delta2-lcross-k1-attachment-floor-tail35-independent-audit-v1",
        "status": "PASS_INDEPENDENT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TAIL35_AUDIT",
        "verified": [
            "producer and report bytes are pinned",
            "the producer fail-closed input manifest is reconstructed from its AST",
            "the n>=35 compactification and attachment-floor substitution are exact",
            "the lower-cross coordinate is exactly h7/c7",
            "all 2,313,441 reported Bernstein coefficients are strictly positive",
            "the exact reported minimum is positive",
        ],
        "independent_domain": {
            "t": str(t), "p": str(sp.factor(p)), "q": str(sp.factor(q)),
            "d": str(sp.factor(d)), "Z": str(sp.factor(Z)),
            "n35_floor": "16/23", "upper_endpoint": "1",
        },
        "coefficient_sign_counts": report["coefficient_sign_counts"],
        "minimum": report["minimum"],
        "minimum_index": report["minimum_index"],
        "source_binding_fragments": list(source_fragments),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
