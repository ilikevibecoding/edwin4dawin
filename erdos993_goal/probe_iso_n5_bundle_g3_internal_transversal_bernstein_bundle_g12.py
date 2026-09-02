#!/usr/bin/env python3
"""Exact Bernstein probe for both rank-five g3 internal-spine modes."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import bernstein_certificate


HERE = Path(__file__).resolve().parent


def base_residual():
    report = json.loads((HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json").read_text())
    raw = sp.sympify(report["generic_forest_invariant"]["residual_without_high_motifs"])
    n = sp.Symbol("n")
    e = sp.Symbol("C_edges")
    du, dv = sp.symbols("C_degree_u C_degree_v")
    W, xu, xv = sp.symbols("C_wedges C_neighbor_excess_u C_neighbor_excess_v")
    da, dp, xa, xp = sp.symbols("degree_a degree_p excess_a excess_p")
    hu, hv, cu, cv = sp.symbols("hit_u hit_v common_ua common_vp")
    eu, ev = sp.symbols("epsilon_u epsilon_v")
    substitution = {
        sp.Symbol("q"): n - 2,
        sp.Symbol("C_adjacent"): 0,
        sp.Symbol("C_common_neighbor"): 0,
        sp.Symbol("D_edges"): e - da - dp,
        sp.Symbol("D_degree_u"): eu * (du - hu),
        sp.Symbol("D_degree_v"): ev * (dv - hv),
        sp.Symbol("D_adjacent"): 0,
        sp.Symbol("D_wedges"): W - da * (da - 1) / 2 - xa - dp * (dp - 1) / 2 - xp,
        sp.Symbol("D_neighbor_excess_u"): eu * (xu - hu * (da - 1) - cu),
        sp.Symbol("D_neighbor_excess_v"): ev * (xv - hv * (dp - 1) - cv),
        sp.Symbol("D_common_neighbor"): 0,
    }
    return sp.factor(raw.subs(substitution)), locals()


def certify(expression, simplex, m):
    return bernstein_certificate(sp.expand(expression), simplex, m)


def main():
    residual, L = base_residual()
    n, e, du, dv = L["n"], L["e"], L["du"], L["dv"]
    W, xu, xv = L["W"], L["xu"], L["xv"]
    da, dp, xa, xp = L["da"], L["dp"], L["xa"], L["xp"]
    hu, hv, cu, cv, eu, ev = L["hu"], L["hv"], L["cu"], L["cv"], L["eu"], L["ev"]
    m = sp.Symbol("m", nonnegative=True)
    s = sp.symbols("s0:5", nonnegative=True)
    for cutoff in range(8, 41):
        passed = True
        failure = None
        branch_count = 0
        # ell>=2, p!=v: four distinct selected vertices u,v,a,p.
        for hitu, hitv in itertools.product((0, 1), repeat=2):
          for zu, zv, za, zp in itertools.product((0, 1), repeat=4):
            if not (zu and zv and za and zp):
                continue  # distinct pairs u--a and v--p lie in nontrivial components
            if hitu and not (zu and za):
                continue
            if hitv and not (zv and zp):
                continue
            branch_count += 1
            # C has two nontrivial marked components, so its total positive
            # degree excess is e-2 and e<=n-2.
            length = cutoff + m - 4
            x, y, aa, pp, r = zu*length*s[0], zv*length*s[1], za*length*s[2], zp*length*s[3], length*s[4]
            structural = {
                n: cutoff+m, eu: 1, ev: 1, hu: hitu, hv: hitv,
                du: zu+x, dv: zv+y, da: za+aa, dp: zp+pp,
                e: 2+x+y+aa+pp+r,
            }
            cap = sum(d*(d-1)/2 for d in (zu+x,zv+y,za+aa,zp+pp)) + r*(r+1)/2
            expr = sp.expand(residual.subs({
                W: cap, xu: 0, xv: 0,
                xa: 0, xp: n-2-da-dp,
                cu: (1-hitu)*zu*za, cv: (1-hitv)*zv*zp,
            }).subs(structural))
            signs = {W:-1,xu:1,xv:1,xa:-1,xp:-1,cu:-1,cv:-1}
            try:
                for var, sign in signs.items():
                    try:
                        certify(sign*sp.diff(residual,var).subs(structural),s,m)
                    except (AssertionError, TypeError):
                        raise RuntimeError(f"sign:{var}")
                try:
                    certify(expr,s,m)
                except (AssertionError, TypeError):
                    raise RuntimeError("lower")
            except RuntimeError as error:
                passed=False; failure=("ordinary_distinct",str(error),hitu,hitv,zu,zv,za,zp); break
          if not passed: break
        if passed:
          # ell=1, p!=v: a=u, so selected vertices are u,v,p.
          for hitv in (0,1):
            for zu,zv,zp in itertools.product((0,1),repeat=3):
              if not (zv and zp): continue  # p and v are distinct and connected
              if hitv and not(zv and zp): continue
              baseline=1+zu  # parent component nontrivial; u-component iff zu=1
              branch_count+=1; length=cutoff+m-2-baseline
              x,y,pp,r=zu*length*s[0],zv*length*s[1],zp*length*s[2],length*s[3]
              specialized=sp.expand(residual.subs({eu:0,ev:1,da:du,xa:xu,hu:0,cu:0,hv:hitv}))
              structural={n:cutoff+m,du:zu+x,dv:zv+y,dp:zp+pp,e:baseline+x+y+pp+r}
              cap=sum(d*(d-1)/2 for d in (zu+x,zv+y,zp+pp))+r*(r+1)/2
              expr=sp.expand(specialized.subs({W:cap,xu:0,xv:0,xp:zp*(n-2-du-dp),cv:(1-hitv)*zv*zp}).subs(structural))
              signs={W:-1,xu:1,xv:1,xp:-1,cv:-1}
              try:
                for var,sign in signs.items(): certify(sign*sp.diff(specialized,var).subs(structural),s,m)
                certify(expr,s,m)
              except (AssertionError,TypeError): passed=False;failure=("ordinary_collision",hitv,zu,zv,zp);break
            if not passed:break
        if passed:
          # ell>=2, p=v: selected vertices u,v,a.
          for hitu in (0,1):
            for zu,zv,za in itertools.product((0,1),repeat=3):
              if not (zu and za): continue  # a and u are distinct and connected
              if hitu and not(zu and za):continue
              baseline=1+zv  # child component nontrivial; v-component iff zv=1
              branch_count+=1;length=cutoff+m-2-baseline
              x,y,aa,r=zu*length*s[0],zv*length*s[1],za*length*s[2],length*s[3]
              specialized=sp.expand(residual.subs({eu:1,ev:0,dp:dv,xp:xv,hv:0,cv:0,hu:hitu}))
              structural={n:cutoff+m,du:zu+x,dv:zv+y,da:za+aa,e:baseline+x+y+aa+r}
              cap=sum(d*(d-1)/2 for d in(zu+x,zv+y,za+aa))+r*(r+1)/2
              expr=sp.expand(specialized.subs({W:cap,xu:0,xv:0,xa:za*(n-2-dv-da),cu:(1-hitu)*zu*za}).subs(structural))
              signs={W:-1,xu:1,xv:1,xa:-1,cu:-1}
              try:
                for var,sign in signs.items():certify(sign*sp.diff(specialized,var).subs(structural),s,m)
                certify(expr,s,m)
              except (AssertionError,TypeError):passed=False;failure=("endpoint_distinct",hitu,zu,zv,za);break
            if not passed:break
        if passed:
          # ell=1,p=v: a=u and p=v, only u,v selected, both deleted.
          for zu,zv in itertools.product((0,1),repeat=2):
            baseline=max(1,zu+zv)
            branch_count+=1;length=cutoff+m-2-baseline
            x,y,r=zu*length*s[0],zv*length*s[1],length*s[2]
            specialized=sp.expand(residual.subs({eu:0,ev:0,da:du,xa:xu,dp:dv,xp:xv,hu:0,hv:0,cu:0,cv:0}))
            structural={n:cutoff+m,du:zu+x,dv:zv+y,e:baseline+x+y+r}
            cap=sum(d*(d-1)/2 for d in(zu+x,zv+y))+r*(r+1)/2
            expr=sp.expand(specialized.subs({W:cap,xu:0,xv:0}).subs(structural))
            signs={W:-1,xu:1,xv:1}
            try:
              for var,sign in signs.items():certify(sign*sp.diff(specialized,var).subs(structural),s,m)
              certify(expr,s,m)
            except (AssertionError,TypeError):passed=False;failure=("endpoint_collision",zu,zv);break
        if passed:
            print("PASS_CUTOFF",cutoff,"branches",branch_count);return
        if cutoff in (8,12,16,20,30,40):print("FAIL",cutoff,failure,"branches",branch_count)


if __name__ == "__main__":main()
