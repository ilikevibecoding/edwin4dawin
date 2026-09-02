#!/usr/bin/env python3
"""Independent exact replay of the a3456 direct-H multinomial lift."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "rank8_low_high_strong_a3456_prefix_multinomial_lift_independent_audit_20260820.json"
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "tb", "b0", "b1", "b2")
PINS = {
    "verify_rank8_low_high_strong_a3456_prefix_multinomial_lift.py":
        "BC1B0A15CE46B8CC8E732E9A0A043A2CC3399AF67FA0FA5F870DD1CB89AED6C1",
    "rank8_low_high_strong_a3456_prefix_multinomial_lift_exact_20260820.json":
        "CE5689935F344888352521E84F51C9B8EADBCF7457FAB88FA7DEC546A83A90F8",
    "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json":
        "795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def digest_map(values):
    wire = [[list(key), values[key]] for key in sorted(values)]
    return hashlib.sha256(json.dumps(wire, separators=(",", ":")).encode()).hexdigest().upper()


def row(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for i in range(7, -1, -1):
        ratios[i] = ratios[i + 1] + gaps[i]
    products = [one]
    for ratio in ratios:
        products.append(products[-1] * ratio)
    return ratios, products


def conv(left, right, rank, zero):
    return sum((math.comb(rank, i) * left[i] * right[rank-i]
                for i in range(rank + 1)), zero)


def rebuild():
    ctx = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    x = dict(zip(NAMES, ctx.gens()))
    zero, one, h = ctx.constant(0), ctx.constant(1), x["h"]
    ratios, left = row(x["ta"], [2*h, h, h, h+x["a3"], h+x["a4"],
                                  h+x["a5"], h+x["a6"], h], one)
    _, right = row(x["tb"], [2*h+x["b0"], h+x["b1"], h+x["b2"],
                               h, h, h, h, h], one)
    selected = [zero] * 3 + left[3:]
    c = {r: conv(left, right, r, zero) for r in (7, 8, 9)}
    v = {r: conv(selected, right, r, zero) for r in (7, 8, 9)}
    m = c[8]**2-c[7]*c[9]-h*c[7]*c[8]
    d = 2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8])
    return ratios[2]*m+h*d


def lift(monomial, coefficient, output):
    degree = monomial[1]
    for e5 in range(degree + 1):
        for e6 in range(degree-e5+1):
            eta = degree-e5-e6
            old = list(monomial)
            old[1] = eta
            key = tuple(old[:4]+[e5,e6]+old[4:])
            mult = math.factorial(degree)//math.factorial(eta)//math.factorial(e5)//math.factorial(e6)
            output[key] = output.get(key, 0)+coefficient*mult


def main():
    pins = {name: sha256(ROOT/name) for name in PINS}
    assert pins == PINS
    theorem = json.loads((ROOT/"rank8_low_high_strong_a3456_prefix_multinomial_lift_exact_20260820.json").read_text())
    upstream = json.loads((ROOT/"rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json").read_text())
    terms = {tuple(map(int, m)): int(c) for m, c in rebuild().terms()}
    positive = {m:c for m,c in terms.items() if c>0}
    negative = {m:-c for m,c in terms.items() if c<0}
    assert len(terms)==theorem["terms"]==1_636_946
    assert len(negative)==theorem["negative_terms"]==7_124
    needed, used = {}, {}
    for allocation in upstream["allocations"]:
        target=tuple(allocation["negative_monomial"])
        low=tuple(allocation["source_low"]["monomial"])
        high=tuple(allocation["source_high"]["monomial"])
        demand=int(allocation["demand"])
        u=int(allocation["source_low"]["allocated"])
        v=int(allocation["source_high"]["allocated"])
        assert all(low[i]+high[i]==2*target[i] for i in range(8))
        assert 4*u*v>=demand*demand
        lift(target,demand,needed); lift(low,u,used); lift(high,v,used)
    assert needed==negative
    assert len(used)==theorem["lifted_used_positive_sources"]==13_487
    assert digest_map(negative)==theorem["negative_map_sha256"]
    assert digest_map(used)==theorem["lifted_used_map_sha256"]
    assert all(amount<=positive.get(key,0) for key,amount in used.items())
    remainder={key:positive[key]-used.get(key,0) for key in positive}
    assert min(remainder.values())==theorem["minimum_full_positive_remainder"]
    payload={
        "schema":"rank8-low-high-strong-a3456-prefix-multinomial-lift-audit-v1",
        "status":"PASS_INDEPENDENT_AUDIT_STRONG_A3456_PREFIX_MULTINOMIAL_LIFT",
        "pinned_inputs":pins,
        "terms":len(terms),"negative_terms":len(negative),
        "upstream_rows_replayed":len(upstream["allocations"]),
        "lifted_used_positive_sources":len(used),
        "negative_map_sha256":digest_map(negative),
        "lifted_used_map_sha256":digest_map(used),
        "scope_warning":theorem["scope_warning"],
        "source_sha256":sha256(Path(__file__)),
    }
    OUT.write_text(json.dumps(payload,indent=2)+"\n")
    print(payload["status"]); print("SOURCE",payload["source_sha256"]); print("REPORT",sha256(OUT))


if __name__ == "__main__":
    main()
