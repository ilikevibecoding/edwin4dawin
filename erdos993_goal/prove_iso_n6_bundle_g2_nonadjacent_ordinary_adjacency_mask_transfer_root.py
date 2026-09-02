#!/usr/bin/env python3
"""Exact transfer of the u0_v0 safe lower to all parent-adjacency masks."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
LOSS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_SHA256 = (
    "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
)
PRODUCER = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py"
)
PRODUCER_SHA256 = (
    "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_adjacency_mask_transfer_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "ADJACENCY_MASK_TRANSFER_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(LOSS) == LOSS_SHA256
    assert sha256(PRODUCER) == PRODUCER_SHA256
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    masks = loss["adjacency_masks"]
    assert set(masks) == {"u0_v0", "u0_v1", "u1_v0", "u1_v1"}
    all_variables = set(loss["active_parent_loss_variables"])
    assert len(all_variables) == 16

    beneficial = {"PA3", "PA6", "PB3", "PB6", "PW2", "PW5", "PW6", "PZ4", "PZ6"}
    harmful = {"PA4", "PA5", "PB4", "PB5", "PW4", "PZ5"}
    split = {"PW3"}
    assert beneficial | harmful | split == all_variables
    assert not (beneficial & harmful or beneficial & split or harmful & split)

    # Universal scalar lemmas used coordinate-by-coordinate by the producer.
    c, h, p, cap, pos, neg = sp.symbols(
        "c h p cap pos neg", nonnegative=True
    )
    active_differences = {
        "beneficial_drop": c * p,
        "harmful_cap": h * (cap - p),
        "split_pw3": pos * p + neg * (cap - p),
    }
    inactive_differences = {
        "beneficial_drop": sp.Integer(0),
        "harmful_cap": h * cap,
        "split_pw3": neg * cap,
    }
    assert sp.expand((c * p) - active_differences["beneficial_drop"]) == 0
    assert sp.expand(
        ((-h * p) - (-h * cap)) - active_differences["harmful_cap"]
    ) == 0
    assert sp.expand(
        (((pos - neg) * p) - (-neg * cap))
        - active_differences["split_pw3"]
    ) == 0
    assert sp.expand(
        (0 - (-h * cap)) - inactive_differences["harmful_cap"]
    ) == 0

    forced_zero_expected = {
        "u0_v0": set(),
        "u0_v1": {name for name in all_variables if name.startswith("PA") or name.startswith("PZ")},
        "u1_v0": {name for name in all_variables if name.startswith("PB") or name.startswith("PZ")},
        "u1_v1": {name for name in all_variables if name.startswith("PA") or name.startswith("PB") or name.startswith("PZ")},
    }
    rows = {}
    for label, row in sorted(masks.items()):
        active = set(row["active_parent_loss_variables"])
        forced_zero = all_variables - active
        assert forced_zero == forced_zero_expected[label]
        # W is never forced out: p remains an ordinary vertex distinct from u,v.
        assert all(name.startswith("PW") for name in active if name.startswith("PW"))
        assert {name for name in all_variables if name.startswith("PW")} <= active
        rows[label] = {
            "active": sorted(active),
            "forced_zero": sorted(forced_zero),
            "safe_lower_transfer": (
                "Every positive contribution is discarded. Every negative "
                "contribution is paid at its cap even if its coordinate is "
                "forced to zero; forcing it to zero therefore only increases "
                "actual-minus-lower by h*cap."
            ),
        }

    report = {
        "marker": MARKER,
        "status": "PASS exact safe-lower transfer to all four adjacency masks",
        "identity": (
            "The pinned parent-loss report states that u0_v1, u1_v0, and "
            "u1_v1 are obtained from u0_v0 solely by forcing A/B/Z loss "
            "coordinates to zero; coefficient and no-parent terms are unchanged."
        ),
        "scalar_lemmas": {
            "beneficial_active": "cP-0=cP>=0",
            "beneficial_inactive": "0-0=0",
            "harmful_active": "(-hP)-(-hU)=h(U-P)>=0",
            "harmful_inactive": "0-(-hU)=hU>=0",
            "split_pw3": (
                "((pos-neg)P)-(-neg U)=pos P+neg(U-P)>=0; W remains active"
            ),
        },
        "assumptions_certified_per_shard": (
            "c,h,pos,neg,P,U are nonnegative and P<=U. The producer's sign "
            "certificates establish coefficient signs; its subset ceilings "
            "establish P<=U."
        ),
        "coordinate_partition": {
            "beneficial_dropped": sorted(beneficial),
            "harmful_paid": sorted(harmful),
            "split": sorted(split),
        },
        "masks": rows,
        "conclusion": (
            "Any nonnegative u0_v0 producer lower is simultaneously a lower "
            "bound for the exact ordinary-parent correction in all four masks."
        ),
        "dependencies": {
            "parent_loss": {"file": LOSS.name, "sha256": LOSS_SHA256},
            "producer": {"file": PRODUCER.name, "sha256": PRODUCER_SHA256},
        },
        "scope_guard": (
            "This transfers a proved shard lower across adjacency masks; it does "
            "not establish positivity of any shard by itself."
        ),
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "masks": len(rows),
        "coordinates": len(all_variables),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
