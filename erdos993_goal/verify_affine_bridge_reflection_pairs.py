#!/usr/bin/env python3
"""Exact replay of offset-two reflection pairs on the hard affine records."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path


SOURCE = Path("affine_bridge_euler_transfer_blocks_probe_20260812.json")
OUTPUT = Path("affine_bridge_reflection_pairs_exact_20260812.json")


def main():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    pair_checks = 0
    offset_one_failures = 0
    outward_checks = 0
    factor_checks = 0
    split_g_checks = 0
    negative_g_convexity_checks = 0
    minimum_payment = None
    failures = []
    for record in source["records"]:
        parameter = {key: value for key, value in record.items()
                     if key not in ("orders",)}
        for order in record["orders"]:
            n = order["r"] + 1
            layers = order["layers"]
            negative = [item["h"] for item in layers if item["e_h"] < 0]
            if not negative:
                continue
            t = max(negative)
            if negative != list(range(t+1)):
                failures.append({"kind":"single_crossing",**parameter,
                                 "k":order["r"],"negative":negative})
                continue
            for h in range(1,t):
                negative_g_convexity_checks += 1
                rm,r0,rp=(layers[h-1]["rho_h"],layers[h]["rho_h"],
                          layers[h+1]["rho_h"])
                # g_(h+1)-2g_h+g_(h-1) >= 0, cross-multiplied.
                curvature=(layers[h+1]["e_h"]*r0*rm
                           -2*layers[h]["e_h"]*rm*rp
                           +layers[h-1]["e_h"]*r0*rp)
                if curvature < 0:
                    failures.append({"kind":"negative_g_not_convex",
                                     **parameter,"k":order["r"],"t":t,
                                     "h":h,"curvature":curvature})
            for h in negative:
                image = 2*t+2-h
                pair_checks += 1
                if image > n:
                    failures.append({"kind":"image_out_of_range",**parameter,
                                     "k":order["r"],"t":t,"h":h,
                                     "image":image,"n":n})
                    continue
                debt = -math.comb(n,h)*layers[h]["e_h"]
                payment = math.comb(n,image)*layers[image]["e_h"]
                if payment < debt:
                    failures.append({"kind":"pair_negative",**parameter,
                                     "k":order["r"],"t":t,"h":h,
                                     "image":image,"margin":payment-debt})
                if debt > 0:
                    ratio = Fraction(payment,debt)
                    if minimum_payment is None or ratio < minimum_payment[0]:
                        minimum_payment=(ratio,parameter,order["r"],t,h,image)
                image_one = 2*t+1-h
                if image_one > n or (
                    math.comb(n,h)*layers[h]["e_h"]
                    + math.comb(n,image_one)*layers[image_one]["e_h"] < 0
                ):
                    offset_one_failures += 1
            for ell in range(1,t):
                h0,h1=t-ell,t-ell-1
                j0,j1=t+2+ell,t+3+ell
                outward_checks += 1
                if j1 > n:
                    failures.append({"kind":"outward_out_of_range",**parameter,
                                     "k":order["r"],"t":t,"ell":ell})
                    continue
                debt0=-math.comb(n,h0)*layers[h0]["e_h"]
                debt1=-math.comb(n,h1)*layers[h1]["e_h"]
                pay0=math.comb(n,j0)*layers[j0]["e_h"]
                pay1=math.comb(n,j1)*layers[j1]["e_h"]
                if pay1*debt0 < pay0*debt1:
                    failures.append({"kind":"outward_ratio",**parameter,
                                     "k":order["r"],"t":t,"ell":ell})
                rh1,rh0=layers[h1]["rho_h"],layers[h0]["rho_h"]
                rj0,rj1=layers[j0]["rho_h"],layers[j1]["rho_h"]
                if min(rh1,rh0,rj0,rj1)>0:
                    factor_checks+=1
                    reserve_left=(math.comb(n,j1)*rj1
                                  * math.comb(n,h0)*rh0)
                    reserve_right=(math.comb(n,j0)*rj0
                                   * math.comb(n,h1)*rh1)
                    if reserve_left < 2*reserve_right:
                        failures.append({"kind":"reserve_factor",**parameter,
                                         "k":order["r"],"t":t,"ell":ell})
                    g_left=(layers[j1]["e_h"]*rj0
                            * (-layers[h0]["e_h"])*rh1)
                    g_right=(layers[j0]["e_h"]*rj1
                             * (-layers[h1]["e_h"])*rh0)
                    if 2*g_left < g_right:
                        failures.append({"kind":"g_factor",**parameter,
                                         "k":order["r"],"t":t,"ell":ell})
                    split_g_checks += 1
                    # A still sharper split: the positive reflected ratio
                    # is nondecreasing, while an interior negative g loses
                    # at most a factor two in one step.
                    if layers[j1]["e_h"]*rj0 < layers[j0]["e_h"]*rj1:
                        failures.append({"kind":"positive_g_ratio",**parameter,
                                         "k":order["r"],"t":t,"ell":ell})
                    if (2*(-layers[h0]["e_h"])*rh1
                            < (-layers[h1]["e_h"])*rh0):
                        failures.append({"kind":"negative_g_half",**parameter,
                                         "k":order["r"],"t":t,"ell":ell})
    ratio,parameter,k,t,h,image=minimum_payment
    report={
        "status":"PASS_AFFINE_BRIDGE_REFLECTION_PAIRS" if not failures
                 else "FAIL_AFFINE_BRIDGE_REFLECTION_PAIRS",
        "source":str(SOURCE),
        "hard_record_count":len(source["records"]),
        "reflection_pair_check_count":pair_checks,
        "offset_one_failure_count":offset_one_failures,
        "outward_ratio_check_count":outward_checks,
        "factor_check_count":factor_checks,
        "split_g_check_count":split_g_checks,
        "negative_g_convexity_check_count":negative_g_convexity_checks,
        "failure_count":len(failures),"first_failures":failures[:10],
        "minimum_payment_over_debt":{
            "numerator":ratio.numerator,"denominator":ratio.denominator,
            "decimal":float(ratio),**parameter,"k":k,"t":t,
            "h":h,"image":image,
        },
        "scope_warning":"Exact finite hard-record replay, not proof.",
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
    if failures:
        raise SystemExit(1)


if __name__=="__main__":
    main()
