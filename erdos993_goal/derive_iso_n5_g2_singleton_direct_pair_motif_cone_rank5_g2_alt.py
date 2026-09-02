#!/usr/bin/env python3
"""Exact pair-motif lower cone for complete singleton-ordinary g2.

Unlike the exploratory star-moment cone, this reduction treats every
connected three-edge subtree by whether it contains neither, one, or both
marks.  The subtrees containing both marks are counted by their exact forest
geometry (adjacent, common-neighbor, or distance-three).  This avoids any
unproved deletion bound for paths.
"""

import sympy as sp

from derive_iso_n5_g2_singleton_l_parent_invariant_rank5_g2_alt import derive_parent
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import forest_independent_row


def choose(value,rank):
    return sp.prod(value-j for j in range(rank))/sp.factorial(rank)


def derive_pair_cone(positive_uv=None,q3_scale=sp.Integer(0),q3_w_scale=sp.Integer(0)):
    parent,s,x=derive_parent("singleton")
    n=s["n"];e=s["edge_count"];du=s["degree_u"];dv=s["degree_v"]
    adj=s["adjacent"];re=s["C_connected3_E"];qre=s["Q_connected3_E"]
    xu=s["C_neighbor_excess_u"];xv=s["C_neighbor_excess_v"]
    cE6=next(variable for variable in parent.free_symbols if str(variable)=="cE6")
    # Optional exploratory extraction of the proved rank-three forest reserve
    # Q3(C)=6*i3(C)^2-i2(C)*i3(C)-8*i2(C)*i4(C)>=0.  A positive scale means
    # that this nonnegative block is split off before the residual cone is
    # formed.  The default zero is the literal raw-g2 cone.
    if q3_scale:
        canonical_row,canonical_names=forest_independent_row("Q3PIN",n)
        pin_rules={canonical_names["edges"]:e,
                   canonical_names["wedges"]:s["C_wedges_E"],
                   canonical_names["connected_3_edges"]:re}
        i2c,i3c,i4c=(sp.expand(canonical_row[k].subs(pin_rules)) for k in (2,3,4))
        assert sp.expand(i2c-(choose(n,2)-e))==0
        assert sp.expand(i3c-(choose(n,3)-e*(n-2)+s["C_wedges_E"]))==0
        assert sp.expand(i4c-(choose(n,4)-e*choose(n-2,2)
                             +s["C_wedges_E"]*(n-4)+choose(e,2)-re))==0
        q3=sp.expand(6*i3c**2-i2c*i3c-8*i2c*i4c)
        parent=sp.expand(parent-q3_scale*q3)
    if q3_w_scale:
        mw=n-2
        ew=e-du-dv+adj
        ww=(s["C_wedges_E"]-choose(du,2)-choose(dv,2)
            -s["C_neighbor_excess_u"]-s["C_neighbor_excess_v"]
            +adj*(du+dv-2)+s["C_common_neighbor"])
        rw=x["C_connected3_W"]
        canonical_w,canonical_w_names=forest_independent_row("Q3WPIN",mw)
        w_rules={canonical_w_names["edges"]:ew,
                 canonical_w_names["wedges"]:ww,
                 canonical_w_names["connected_3_edges"]:rw}
        i2w,i3w,i4w=(sp.expand(canonical_w[k].subs(w_rules)) for k in (2,3,4))
        q3w=sp.expand(6*i3w**2-i2w*i3w-8*i2w*i4w)
        parent=sp.expand(parent-q3_w_scale*q3w)
    assert sp.diff(parent,cE6)==-6 and sp.diff(parent,qre)==-6
    # Exact lower substitutions: i6(C)<=C(n,6), and induced Q has R3(Q)<=R3(C).
    reduced=sp.expand(parent.subs({cE6:choose(n,6),qre:re}))
    a=sp.factor(sp.diff(reduced,re))
    b=sp.factor(sp.diff(reduced,s["C_connected3_U"]))
    c=sp.factor(sp.diff(reduced,s["C_connected3_V"]))
    k=sp.factor(sp.diff(reduced,s["C_three_edge_five"]))
    ku=sp.factor(sp.diff(reduced,x["C_three_edge_five_U"]))
    # A forest with q edges satisfies
    #   S4 = sum_v C(d(v),4) <= (q-3) S3 / 4,
    # since d(v)<=q term by term.  Apply this not only to C but to the two
    # vertex-deleted rows, whose edge counts are e-du and e-dv.  This is
    # substantially sharper than the order-only cap when selected vertices
    # or components are isolated.
    t=sp.expand(k*(e-3)/4)
    tu=sp.expand(ku*(e-du-3)/4)
    tv=sp.expand(ku*(e-dv-3)/4)
    bp=sp.factor(b-tu);cp=sp.factor(c-tv)
    weight_none=sp.factor(a+bp+cp-t)
    weight_u=sp.factor(a+cp-t);weight_v=sp.factor(a+bp-t)
    both_weight=sp.factor(a-t)
    both_floor=sp.factor((-8*n**2+54*n-193)/4)
    # The displayed elementary floors use e<=n-1, du<=e, dv<=e, and
    # e>=du+dv-adj.  They are positive at n=14 and have positive shifts.
    floors={
        "floor_bp":(22*n**2-79*n+52)/4,
        "floor_cp":(22*n**2-79*n+52)/4,
        "floor_weight_u":(12*n**2-24*n-140)/4,
        "floor_weight_v":(12*n**2-24*n-140)/4,
        "floor_weight_none":(34*n**2-79*n-112)/4,
    }
    y=sp.symbols("y",nonnegative=True)
    if q3_scale==0:
        for floor in floors.values():
            shifted=sp.Poly(sp.expand(floor.subs(n,y+14)),y)
            assert all(value>0 for value in shifted.all_coeffs())
    # Q35>=R4_nonstar and S4<=((m-4)/4)S3 in each marked row.  After those
    # payments every R3 motif avoiding at least one mark has one of the
    # positive weights above.  The connected three-edge motifs containing
    # both marks have an exact/sharp order-specific bound.  If u,v are
    # adjacent, count the two-edge extensions of uv.  If their unique common
    # neighbor w exists, use deg(w)-2 <= (xu+xv)/2-1.  Otherwise a four-vertex
    # tree can contain both marks only as their unique length-three path.
    if positive_uv is None:
        positive_uv=sp.symbols("positive_degree_u_v",integer=True,nonnegative=True)
    m_adj=sp.expand(choose(du+dv-2,2)+xu+xv-(du+dv-2))
    m_common=sp.expand(du+dv+(xu+xv)/2-3)
    common=s["C_common_neighbor"]
    motif_bound=sp.expand(
        adj*m_adj+(1-adj)*common*m_common
        +(1-adj)*(1-common)*positive_uv
    )
    # For the negative both-mark weight, write
    # e=du+dv-adj+h, du=adj+u0, dv=adj+v0.  Its difference from both_floor is
    # -( (2n+9)(adj+u0+v0) + (2n-23)h )/4 <= 0 for n>=14.
    if q3_scale==0:
        assert all(value<0 for value in sp.Poly(both_floor.subs(n,y+14),y).all_coeffs())
    pair_debt=sp.expand(both_weight*motif_bound)
    high=[re,s["C_connected3_U"],s["C_connected3_V"],x["C_connected3_W"],
          s["C_three_edge_five"],s["C_connected4_E"],
          x["C_three_edge_five_U"],x["C_connected4_U"],
          x["C_three_edge_five_V"],x["C_connected4_V"],qre]
    low=sp.expand(reduced.subs({variable:0 for variable in high}))
    cone=sp.expand(low+pair_debt)
    r3w_residual=sp.factor(sp.diff(reduced,x["C_connected3_W"]))
    names={"n":n,"edge_count":e,"degree_u":du,"degree_v":dv,
           "degree_p":x["degree_p"],"neighbor_excess_p":x["neighbor_excess_p"],
           "adjacent":adj,"adjacent_pu":x["adjacent_pu"],"adjacent_pv":x["adjacent_pv"],
           "common_neighbor_pu":x["common_neighbor_pu"],"common_neighbor_pv":x["common_neighbor_pv"],
           "C_wedges_E":s["C_wedges_E"],"C_neighbor_excess_u":s["C_neighbor_excess_u"],
           "C_neighbor_excess_v":s["C_neighbor_excess_v"],
           "C_common_neighbor":s["C_common_neighbor"],"Q_wedges_E":s["Q_wedges_E"],
           "Q_neighbor_excess_u":s["Q_neighbor_excess_u"],
           "Q_neighbor_excess_v":s["Q_neighbor_excess_v"],
           "both_weight":both_weight,"both_floor":both_floor,
           "weight_none":weight_none,"weight_u":weight_u,"weight_v":weight_v,
           "C_connected3_W_residual":r3w_residual,
           "pair_motif_bound":motif_bound,"positive_degree_u_v":positive_uv,
           "q3_reserve_scale":sp.sympify(q3_scale),
           "q3_w_reserve_scale":sp.sympify(q3_w_scale),**floors}
    return cone,names


def main():
    cone,names=derive_pair_cone()
    print("BOTH_FLOOR",names["both_floor"])
    for key in ("Q_wedges_E","Q_neighbor_excess_u","Q_neighbor_excess_v",
                "C_wedges_E","C_neighbor_excess_u","C_neighbor_excess_v",
                "C_common_neighbor","neighbor_excess_p"):
        variable=names[key];print("DERIV",key,sp.factor(sp.diff(cone,variable)))
        print("CURV",key,sp.factor(sp.diff(cone,variable,2)))
    print("TERMS",len(sp.Poly(cone,*sorted(cone.free_symbols,key=str)).terms()))
    print("SYMBOLS"," ".join(map(str,sorted(cone.free_symbols,key=str))))


if __name__=="__main__":main()
