#!/usr/bin/env python3
"""Independent exact replay of the four-gap x>=y tight-ratio certificate.

This auditor imports neither the producer nor its row-loader.  It parses the
pinned exact rational cache directly, reconstructs the high chart over QQ,
rechecks every sign split and reserve, and compares the result with all three
producer shards.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import math
import os
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
CACHE = HERE / "uniform_low_high_four_gap_symbolic_rows_cache_root_20260827.json.gz"
OUTPUT = HERE / "uniform_low_high_four_gap_high_tight_ratio_independent_audit_root_20260827.json"
EXPECTED = {
    "uniform_low_high_four_gap_symbolic_rows_cache_root_20260827.json.gz":
        "575B666783CF8A41D787B6685AE993DA13002B2C392321D9250E7873C3BE7258",
    "prove_uniform_low_high_four_gap_high_tight_ratio_root.py":
        "268B66915C41119B84F0C99800C3155021D7C750478E0674BF53C983AA5AD5DD",
    "uniform_low_high_four_gap_high_tight_ratio_root_20260827_001_045.json":
        "E8ED8BAB20DA20332C2F914878B281B8619D738525A71A9BE89614AF05BDC657",
    "uniform_low_high_four_gap_high_tight_ratio_root_20260827_046_090.json":
        "14A5E79F4803780E16F52E18109F9B047EA6C82F9ABF1659438D0BEF0567888A",
    "uniform_low_high_four_gap_high_tight_ratio_root_20260827_091_135.json":
        "113BCD220226D8B38E97DF7E77CCF6890880D6905BE9AC612866798E1FF90E40",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def decode_polynomial(entries, rational_field):
    return rational_field.ring.from_dict({
        tuple(monomial): QQ(numerator, denominator)
        for monomial, numerator, denominator in entries
    })


def load_selected_rows(rational_field):
    with gzip.open(CACHE, "rt", encoding="utf-8") as stream:
        payload = json.load(stream)
    assert payload["schema"] == "uniform-low-high-four-gap-symbolic-rows-cache-root-v1"
    selected = {}
    for label in ("T*R", "L*R", "R*R"):
        selected[label] = {}
        for entry in payload["products"][label]:
            key = tuple(entry["key"])
            numerator = decode_polynomial(entry["numerator"], rational_field)
            denominator = decode_polynomial(entry["denominator"], rational_field)
            selected[label][key] = rational_field.new(numerator, denominator)
    all_keys = sorted({key for row in selected.values() for key in row if key[0] >= 1})
    assert len(all_keys) == 135
    return selected, all_keys


def certificate(value):
    if value == 0:
        return {"status": "zero", "numerator_terms": 0, "denominator_terms": 0}
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    origin = value.numer.to_dict().get((0, 0, 0), QQ.zero)
    denominator_origin = value.denom.to_dict().get((0, 0, 0), QQ.zero)
    assert denominator_origin > 0 and all(coefficient > 0 for coefficient in denominator)
    if all(coefficient > 0 for coefficient in numerator):
        status = "positive" if origin > 0 else "nonnegative"
    else:
        status = "mixed"
    return {
        "status": status,
        "numerator_terms": len(numerator),
        "numerator_minimum": str(min(numerator)),
        "numerator_origin": str(origin),
        "numerator_ordered_sha256": ordered_hash(numerator),
        "denominator_terms": len(denominator),
        "denominator_minimum": str(min(denominator)),
        "denominator_ordered_sha256": ordered_hash(denominator),
    }


def main() -> int:
    observed_hashes = {}
    for name, expected in EXPECTED.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        observed_hashes[name] = actual

    producer_rows = []
    for name in (
        "uniform_low_high_four_gap_high_tight_ratio_root_20260827_001_045.json",
        "uniform_low_high_four_gap_high_tight_ratio_root_20260827_046_090.json",
        "uniform_low_high_four_gap_high_tight_ratio_root_20260827_091_135.json",
    ):
        report = json.loads((HERE / name).read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_SHARD"
        assert report["failure_count"] == 0
        producer_rows.extend(report["results"])
    assert [row["index"] for row in producer_rows] == list(range(1, 136))

    F, k, x, y = field("k,x,y", QQ)
    rows, keys = load_selected_rows(F)
    H, u, base, gap = field("u,y,z", QQ)

    def lift(value):
        return H.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): base.as_expr() + gap.as_expr(),
            y.as_expr(): base.as_expr(),
        }))

    N, M = k + x, k + y
    lower = lift(sum(
        math.prod(k - 1 - offset for offset in range(degree))
        * (M / N) ** degree / math.factorial(degree)
        for degree in range(4)
    ))
    ratio7 = lift((M / N) ** 7)
    assert certificate(lower)["status"] == "positive"
    assert certificate(ratio7)["status"] == "positive"

    nonnegative = {"positive", "nonnegative"}
    audit_rows = []
    for index, key in enumerate(keys, 1):
        beta = lift(rows["T*R"].get(key, F.zero))
        gamma = lift(-rows["L*R"].get(key, F.zero))
        delta = lift(-rows["R*R"].get(key, F.zero))
        signs = {
            "beta": certificate(beta),
            "gamma": certificate(gamma),
            "minus_gamma": certificate(-gamma),
            "delta": certificate(delta),
            "minus_delta": certificate(-delta),
        }
        gamma_nonnegative = signs["minus_gamma"]["status"] not in nonnegative
        gamma_negative = signs["gamma"]["status"] not in nonnegative
        delta_nonnegative = signs["minus_delta"]["status"] not in nonnegative
        delta_negative = signs["delta"]["status"] not in nonnegative
        beta_lower = beta * lower
        reserves = {
            "gamma_nonnegative_delta_nonnegative": certificate(
                beta_lower - gamma - delta * ratio7
            ),
            "gamma_negative_delta_nonnegative": certificate(
                beta_lower - delta * ratio7
            ),
            "gamma_nonnegative_delta_negative": certificate(beta_lower - gamma),
            "gamma_negative_delta_negative": certificate(beta_lower),
        }
        needed = {
            "gamma_nonnegative_delta_nonnegative": gamma_nonnegative and delta_nonnegative,
            "gamma_negative_delta_nonnegative": gamma_negative and delta_nonnegative,
            "gamma_nonnegative_delta_negative": gamma_nonnegative and delta_negative,
            "gamma_negative_delta_negative": gamma_negative and delta_negative,
        }
        assert signs["beta"]["status"] in nonnegative
        assert all(
            not needed[name] or reserve["status"] in nonnegative
            for name, reserve in reserves.items()
        ), (index, key)

        producer = producer_rows[index - 1]
        assert tuple(producer["key"]) == key and producer["passed"] is True
        assert producer["checks"]["beta"]["status"] == signs["beta"]["status"]
        for name, required in needed.items():
            assert producer["cases"][name] is True
            producer_name = name + "_reserve"
            assert producer["checks"][producer_name]["status"] == reserves[name]["status"]
        audit_rows.append({
            "index": index,
            "key": list(key),
            "needed_cases": [name for name, required in needed.items() if required],
            "beta": signs["beta"],
            "reserves": reserves,
        })
        print("AUDIT_ROW", index, key, "PASS", flush=True)

    payload = {
        "schema": "uniform-low-high-four-gap-high-tight-ratio-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_FOUR_GAP_HIGH_TIGHT_RATIO_AUDIT",
        "scope": "All 135 nonzero b>=1 coefficient rows in the x>=y chart for every k>=8.",
        "proof": {
            "chart": "k=8+u, x=y+z with u,y,z>=0",
            "T_over_L_lower": "sum_{j=0}^3 falling(k-1,j)/j!*(M/N)^j",
            "R_over_L_upper": "(M/N)^7",
            "sign_split": [
                "gamma>=0,delta>=0",
                "gamma<0,delta>=0",
                "gamma>=0,delta<0",
                "gamma<0,delta<0",
            ],
        },
        "row_count": len(audit_rows),
        "dependencies_sha256": observed_hashes,
        "rows": audit_rows,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
