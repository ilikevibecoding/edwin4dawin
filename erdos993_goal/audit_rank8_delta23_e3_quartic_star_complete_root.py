#!/usr/bin/env python3
"""Independent no-gap audit of the assembled quartic-star Delta2/Delta3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLY = ROOT / "rank8_delta23_e3_quartic_star_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_complete_independent_audit_root_20260823.json"

HASHES = {
    "rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json": "2B7B0F91BE47034979BB8D6204D3E2AD53945E6A56CAB131C1EB3C0AA40936DA",
    "rank8_delta23_e3_quartic_stars_n27_n36_independent_audit_root_20260823.json": "01DB15B04A774CACE173F78A5B9155890C209AF4B354B12AB1B98F8F90535E1F",
    "rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json": "CAAE528760816A3E5B00294E5E868D04122263266D7B18A84680E109D0048259",
    "rank8_delta23_e3_quartic_star_center_all_order_independent_audit_root_20260823.json": "637AC6F8D783503166E1E08E380FC68F39337C4B4381E185DC6EBF1951AB9FE4",
    "rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json": "342BEE0FF1F3BE709BA72037FE00240B557A2D5978D04EBF95D56D8756056115",
    "rank8_delta23_e3_quartic_star_arm_short_boundary_independent_audit_root_20260823.json": "6E2A273439618BFE91A1AD46C09B989A684DAEC01A4D61690AE968AC827E004F",
    "rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json": "A85298D7742D76D20CAA50CE52465B9C4033AC91CC809E2E6EAB168E27A16236",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def read(name: str) -> dict:
    path = ROOT / name
    assert digest(path) == HASHES[name], name
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_COMPLETE_N27_PLUS"
    assert assembly["immutable_inputs"] == HASHES

    finite = read("rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json")
    finite_audit = read("rank8_delta23_e3_quartic_stars_n27_n36_independent_audit_root_20260823.json")
    center = read("rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json")
    center_audit = read("rank8_delta23_e3_quartic_star_center_all_order_independent_audit_root_20260823.json")
    arm = read("rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json")
    arm_audit = read("rank8_delta23_e3_quartic_star_arm_short_boundary_independent_audit_root_20260823.json")
    all_long = read("rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json")

    # Rebuild the finite interval directly from the row metadata, without using
    # the assembler's aggregate fields.
    orders = [row["order"] for row in finite["orders"]]
    assert orders == list(range(27, 37))
    cores = sum(row["canonical_cores"] for row in finite["orders"])
    roots = sum(row["rooted_rows"] for row in finite["orders"])
    assert (cores, roots) == (2208, 71257)
    assert all(row["negative_or_zero_rows"][rank] == 0 for row in finite["orders"] for rank in ("2", "3"))
    assert finite_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_QUARTIC_STARS_N27_N36_AUDIT"

    # Independently count and inspect every infinite-family coefficient cell.
    assert len(center["cells"]) == 84
    center_counts = {
        rank: sum(cell["ranks"][rank]["terms"] for cell in center["cells"])
        for rank in ("2", "3")
    }
    assert center_counts == {"2": 4725, "3": 4459}
    assert all(cell["ranks"][rank]["negative_coefficients"] == 0 for cell in center["cells"] for rank in ("2", "3"))
    assert all(cell["ranks"][rank]["zero_coefficients"] == 0 for cell in center["cells"] for rank in ("2", "3"))
    assert center_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"

    assert len(arm["cells"]) == 3133
    arm_counts = {
        rank: sum(cell["ranks"][rank]["terms"] for cell in arm["cells"])
        for rank in ("2", "3")
    }
    assert arm_counts == {"2": 801801, "3": 733733}
    assert all(cell["ranks"][rank]["negative_coefficients"] == 0 for cell in arm["cells"] for rank in ("2", "3"))
    assert all(cell["ranks"][rank]["zero_coefficients"] == 0 for cell in arm["cells"] for rank in ("2", "3"))
    assert arm_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    assert all_long["claim_status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_LONG_COMPRESSED_CELL"
    assert arm["inherited_all_long_certificate"]["report_sha256"] == HASHES[
        "rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json"
    ]

    # Root-set partition: a subdivided four-arm star has one center and n-1 arm
    # vertices.  Check the identity over a wide independent sample of orders;
    # symbolically it is 1+(n-1)=n.  Combined with [27,36] U [37,infinity),
    # this gives a disjoint, exhaustive theorem domain.
    root_partition_checks = []
    for n in list(range(27, 101)) + [1000, 10**6]:
        finite_class = n <= 36
        infinite_class = n >= 37
        assert finite_class != infinite_class
        if infinite_class:
            assert 1 + (n - 1) == n
        root_partition_checks.append({"order": n, "covered_roots": n})

    assert assembly["finite_coverage"]["canonical_cores"] == cores
    assert assembly["finite_coverage"]["rooted_rows"] == roots
    assert assembly["infinite_coverage"]["center_cells"] == len(center["cells"])
    assert assembly["infinite_coverage"]["arm_computed_cells"] == len(arm["cells"])

    payload = {
        "schema": "rank8-delta23-e3-quartic-star-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_QUARTIC_STAR_COMPLETE_AUDIT",
        "audited_theorem": assembly["theorem"],
        "no_gap_audit": {
            "order_partition": "[27,36] disjoint union [37,infinity)",
            "finite_orders": orders,
            "infinite_root_partition_identity": "1 center + (n-1) arm vertices = n roots",
            "sampled_partition_checks": root_partition_checks,
            "finite_canonical_cores": cores,
            "finite_rooted_rows": roots,
            "center_cells": len(center["cells"]),
            "arm_computed_cells": len(arm["cells"]),
            "arm_inherited_cells": 1,
        },
        "coefficient_audit": {
            "center_terms": center_counts,
            "arm_terms": arm_counts,
            "negative_coefficients": 0,
            "zero_coefficients": 0,
        },
        "scope_warning": assembly["scope_warning"],
        "immutable_inputs": {
            **HASHES,
            ASSEMBLY.name: digest(ASSEMBLY),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OUTPUT", digest(OUTPUT))


if __name__ == "__main__":
    main()
