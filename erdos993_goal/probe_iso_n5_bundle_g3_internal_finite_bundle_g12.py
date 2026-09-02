#!/usr/bin/env python3
"""Exact order<=7 census for the two internal-spine transversal modes."""

from __future__ import annotations

import itertools
from collections import Counter

import networkx as nx

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import g3_rows
from prove_iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12 import row_cache


def main():
    counts=Counter(); minima={}; total=0
    for G0 in nx.graph_atlas_g():
        if not(2<=len(G0)<=7 and nx.is_forest(G0)):continue
        G=nx.convert_node_labels_to_integers(G0); rem=row_cache(G)
        for u,v in itertools.permutations(G.nodes(),2):
            if nx.node_connected_component(G,u)==nx.node_connected_component(G,v):continue
            c=tuple(rem(x) for x in ((),(u,),(v,),(u,v)))
            Au=nx.node_connected_component(G,u); Pv=nx.node_connected_component(G,v)
            # ordinary distinct
            for a in Au-{u}:
              for p in Pv-{v}:
                d=tuple(rem(x) for x in ((a,p),(a,p,u),(a,p,v),(a,p,u,v)))
                val=g3_rows(c,d);assert val>=0
                key='ordinary_distinct';counts[key]+=1;minima[key]=min(minima.get(key,val),val);total+=1
            # ordinary a=u collision
            for p in Pv-{v}:
                d=tuple(rem(x) for x in ((u,p),(u,p),(u,p,v),(u,p,v)))
                val=g3_rows(c,d);assert val>=0
                key='ordinary_collision';counts[key]+=1;minima[key]=min(minima.get(key,val),val);total+=1
            # endpoint p=v, a distinct
            for a in Au-{u}:
                d=tuple(rem(x) for x in ((a,v),(a,u,v),(a,v),(a,u,v)))
                val=g3_rows(c,d);assert val>=0
                key='endpoint_distinct';counts[key]+=1;minima[key]=min(minima.get(key,val),val);total+=1
            # double collision a=u,p=v
            d=tuple(rem(x) for x in ((u,v),(u,v),(u,v),(u,v)))
            val=g3_rows(c,d);assert val>=0
            key='endpoint_collision';counts[key]+=1;minima[key]=min(minima.get(key,val),val);total+=1
    print('PASS',total,dict(counts),minima)


if __name__=='__main__':main()
