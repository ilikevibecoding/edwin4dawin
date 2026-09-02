#!/usr/bin/env python3
"""Sign audit for a generic positive coefficient increment of (c,h)."""
from __future__ import annotations
import sympy as sp
from verify_rank7_terminal_broom_reduction import c,h,exact_decomposition,newton_coefficients


def main()->None:
    raw=newton_coefficients(exact_decomposition())
    u=sp.symbols("u0:8",nonnegative=True);v=sp.symbols("v0:8",nonnegative=True)
    for rank in range(7):
        changed=raw[rank].subs({**{c[k]:c[k]+u[k] for k in range(8)},**{h[k]:h[k]+v[k] for k in range(8)}},simultaneous=True)
        poly=sp.Poly(sp.expand(changed-raw[rank]));terms=poly.terms();negative=[item for item in terms if item[1]<0]
        print(rank,len(terms),len(negative),min(coefficient for _,coefficient in terms),negative[0] if negative else None,flush=True)


if __name__=="__main__":main()
