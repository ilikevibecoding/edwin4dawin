#!/usr/bin/env python3
"""Exact lattice audit of the Euler-layer ratio and weighted-tail targets."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path

from probe_affine_bridge_euler_transfer_large_ray import targeted_outer
from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def homogeneous(poly, target, h):
    return sum(
        math.comb(h, p) * poly.get((target-p, target-h+p), 0)
        for p in range(h+1)
    )


def audit(package, parity, parameters, maximum_k, q_source, r_source):
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2*c_value + m_value + x_value - 3
        b_value = 2*m_value + parity - 4
        parameter_record = {"c": c_value, "m": m_value, "x": x_value}
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2*m_value + parity - 5
        parameter_record = {"m": m_value, "x": x_value}
    low = m_value + 4
    high = m_value + maximum_k + 5
    q_numeric = evaluate(q_source, c_value, m_value, x_value, high)
    r_numeric = evaluate(r_source, c_value, m_value, x_value, high)
    q_outer, _ = targeted_outer(q_numeric, a_value, b_value, low, high)
    r_outer, _ = targeted_outer(r_numeric, a_value, b_value, low, high)

    failures = []
    minimum_ratio = None
    maximum_sign_changes = 0
    reflection_pair_checks = 0
    reflection_outward_ratio_checks = 0
    reflection_factor_checks = 0
    for order in range(maximum_k+1):
        n = order+1
        target = m_value+order+5
        layers=[]
        for h in range(n+1):
            qh=homogeneous(q_outer,target,h)
            rh=homogeneous(r_outer,target,h)
            eh=qh+h*rh
            assert rh>=0
            layers.append((qh,rh,eh))
        signs=[-1 if e<0 else 1 if e>0 else 0 for _,_,e in layers]
        nz=[s for s in signs if s]
        changes=sum(a!=b for a,b in zip(nz,nz[1:]))
        maximum_sign_changes=max(maximum_sign_changes,changes)
        if changes>1 or (changes==1 and nz[0]>0):
            failures.append({"k":order,"kind":"single_crossing","signs":signs})
        negative_h = [h for h, (_, _, e) in enumerate(layers) if e < 0]
        if negative_h:
            crossing = max(negative_h)
            # Reflect the entire negative block two sites beyond its edge.
            # The images 2*crossing+2-h are distinct positive-tail indices.
            for h in negative_h:
                image = 2*crossing+2-h
                reflection_pair_checks += 1
                if image > n:
                    failures.append({
                        "k":order,"kind":"reflection_image_out_of_range",
                        "h":h,"crossing":crossing,"image":image,"n":n,
                    })
                    break
                pair_margin = (
                    math.comb(n,h)*layers[h][2]
                    + math.comb(n,image)*layers[image][2]
                )
                if pair_margin < 0:
                    failures.append({
                        "k":order,"kind":"reflection_pair_negative",
                        "h":h,"crossing":crossing,"image":image,
                        "pair_margin":pair_margin,
                    })
                    break
            # From the second reflected pair outward, the payment/debt
            # ratios empirically increase.  Cross-multiply exactly.
            for ell in range(1, crossing):
                h0 = crossing-ell
                h1 = h0-1
                j0 = crossing+2+ell
                j1 = j0+1
                reflection_outward_ratio_checks += 1
                if j1 > n:
                    failures.append({
                        "k":order,"kind":"reflection_ratio_out_of_range",
                        "ell":ell,"crossing":crossing,"j1":j1,"n":n,
                    })
                    break
                debt0 = -math.comb(n,h0)*layers[h0][2]
                debt1 = -math.comb(n,h1)*layers[h1][2]
                pay0 = math.comb(n,j0)*layers[j0][2]
                pay1 = math.comb(n,j1)*layers[j1][2]
                if pay1*debt0 < pay0*debt1:
                    failures.append({
                        "k":order,"kind":"reflection_ratio_not_outward",
                        "ell":ell,"crossing":crossing,
                    })
                    break
                rho_h1 = layers[h1][1]
                rho_h0 = layers[h0][1]
                rho_j0 = layers[j0][1]
                rho_j1 = layers[j1][1]
                if min(rho_h1,rho_h0,rho_j0,rho_j1) > 0:
                    reflection_factor_checks += 1
                    # The outward ratio factors into a reserve-shape part
                    # and an e/rho part.  The exact sufficient split seen in
                    # every hard record is reserve_factor>=2, g_factor>=1/2.
                    reserve_left = (
                        math.comb(n,j1)*rho_j1
                        * math.comb(n,h0)*rho_h0
                    )
                    reserve_right = (
                        math.comb(n,j0)*rho_j0
                        * math.comb(n,h1)*rho_h1
                    )
                    if reserve_left < 2*reserve_right:
                        failures.append({
                            "k":order,"kind":"reserve_factor_below_two",
                            "ell":ell,"crossing":crossing,
                        })
                        break
                    g_left = (
                        layers[j1][2]*rho_j0
                        * (-layers[h0][2])*rho_h1
                    )
                    g_right = (
                        layers[j0][2]*rho_j1
                        * (-layers[h1][2])*rho_h0
                    )
                    if 2*g_left < g_right:
                        failures.append({
                            "k":order,"kind":"g_factor_below_half",
                            "ell":ell,"crossing":crossing,
                        })
                        break
        for h in range(1,n):
            if layers[h][2]**2 < layers[h-1][2]*layers[h+1][2]:
                failures.append({"k":order,"kind":"raw_e_log_concavity","h":h})
                break
        for h in range(n):
            e0,r0=layers[h][2],layers[h][1]
            e1,r1=layers[h+1][2],layers[h+1][1]
            determinant=e1*r0-e0*r1
            if r0>0 and r1>0 and determinant<0 and not (e0>0 and e1>0):
                failures.append({
                    "k":order,"kind":"ratio_negative_outside_positive_block","h":h,
                    "determinant":determinant,"e_h":e0,"e_h_plus_1":e1,
                })
                break
        full=sum(math.comb(n,h)*layers[h][2] for h in range(n+1))
        reserve=sum(math.comb(n,h)*layers[h][1] for h in range(n+1))
        if full<=0:
            failures.append({"k":order,"kind":"full_nonpositive","value":full})
        if full < 2*reserve:
            failures.append({
                "k":order,"kind":"two_reserve_margin","full":full,"reserve":reserve,
            })
        if reserve>0:
            ratio=Fraction(full,reserve)
            if minimum_ratio is None or ratio<minimum_ratio[0]:
                minimum_ratio=(ratio,order,full,reserve)
    return {
        "package":package,"parity":parity,**parameter_record,
        "maximum_k":maximum_k,
        "maximum_sign_changes":maximum_sign_changes,
        "reflection_pair_checks":reflection_pair_checks,
        "reflection_outward_ratio_checks":reflection_outward_ratio_checks,
        "reflection_factor_checks":reflection_factor_checks,
        "failure_count":len(failures),"first_failures":failures[:5],
        "minimum_full_over_reserve":{
            "numerator":minimum_ratio[0].numerator,
            "denominator":minimum_ratio[0].denominator,
            "decimal":float(minimum_ratio[0]),
            "k":minimum_ratio[1],
        },
    }


def main():
    maximum_k=20
    records=[]
    for package in ("group","bottom"):
        for parity in (0,1):
            q_source,r_source=sources(package,parity)
            points=(
                [(c,m,x) for c in range(1,4) for m in range(3,9)
                 for x in (0,1,2,2*m)]
                if package=="group" else
                [(m,x) for m in range(3,11) for x in (0,1,2,2*m)]
            )
            for parameters in points:
                record=audit(
                    package,parity,parameters,maximum_k,q_source,r_source
                )
                records.append(record)
            print(package,parity,"done",len(points),flush=True)
    failures=[record for record in records if record["failure_count"]]
    global_min=min(
        records,
        key=lambda r: Fraction(
            r["minimum_full_over_reserve"]["numerator"],
            r["minimum_full_over_reserve"]["denominator"],
        ),
    )
    report={
        "status": (
            "NO_EXACT_COUNTEREXAMPLE_WEIGHTED_RATIO_LATTICE"
            if not failures else "WEIGHTED_RATIO_LATTICE_COUNTEREXAMPLE"
        ),
        "scope": (
            "group 1<=c<=3,3<=m<=8,x in {0,1,2,2m}; bottom "
            "3<=m<=10,x in {0,1,2,2m}; both parities; 0<=k<=20"
        ),
        "record_count":len(records),
        "reflection_pair_check_count":sum(
            record["reflection_pair_checks"] for record in records
        ),
        "reflection_outward_ratio_check_count":sum(
            record["reflection_outward_ratio_checks"] for record in records
        ),
        "reflection_factor_check_count":sum(
            record["reflection_factor_checks"] for record in records
        ),
        "failure_record_count":len(failures),
        "first_failure_records":failures[:10],
        "global_minimum_full_over_reserve":global_min,
        "records":records,
        "scope_warning":"Finite exact lattice, not an all-order proof.",
    }
    output=Path("affine_bridge_weighted_ratio_lattice_exact_20260812.json")
    output.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k!="records"},indent=2))


if __name__=="__main__":
    main()
