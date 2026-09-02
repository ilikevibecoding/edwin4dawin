#!/usr/bin/env python3
"""Direct finite assertion for the canonical i2/i3/i4 forest IE identity.

This is a regression guard for the singleton-g2 Q3-reserve exploration.  It
compares the exact canonical formulas against literal independent-set and
connected-edge-subgraph enumeration on every forest in the NetworkX atlas.
It is a validation artifact, not an all-order singleton-g2 theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    forest_independent_row,
)


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json"
MARKER="PASS_DIRECT_VALIDATION_ISO_N5_G2_Q3_IE_IDENTITY_RANK5_G2_ALT"


def independent_count(graph,rank):
    return sum(
        all(not graph.has_edge(a,b) for a,b in itertools.combinations(vertices,2))
        for vertices in itertools.combinations(graph.nodes(),rank)
    )


def connected_three_edges(graph):
    total=0
    for chosen in itertools.combinations(graph.edges(),3):
        vertices=set().union(*map(set,chosen))
        subgraph=nx.Graph();subgraph.add_edges_from(chosen)
        total+=int(nx.is_connected(subgraph) and len(vertices)==4)
    return total


def main():
    n=sp.Symbol("n")
    row,names=forest_independent_row("PIN",n)
    checked=0
    stream=[]
    for graph0 in nx.graph_atlas_g():
        if len(graph0) and not nx.is_forest(graph0):
            continue
        graph=nx.convert_node_labels_to_integers(graph0)
        order=len(graph);edges=graph.number_of_edges()
        wedges=sum(sp.binomial(graph.degree(v),2) for v in graph)
        r3=connected_three_edges(graph)
        rules={n:order,names["edges"]:edges,names["wedges"]:wedges,
               names["connected_3_edges"]:r3}
        literal=tuple(independent_count(graph,k) for k in (2,3,4))
        formula=tuple(int(row[k].subs(rules)) for k in (2,3,4))
        assert formula==literal,(nx.to_graph6_bytes(graph,header=False),formula,literal)
        q3=6*literal[1]**2-literal[0]*literal[1]-8*literal[0]*literal[2]
        assert q3>=0
        stream.append((order,edges,int(wedges),r3,*literal,q3))
        checked+=1
    source_sha=hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    canonical=HERE/"derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
    report={"marker":MARKER,"atlas_forests_checked":checked,
            "orders":[0,7],"all_i2_i3_i4_identities_exact":True,
            "all_q3_values_nonnegative":True,
            "record_stream_sha256":hashlib.sha256(repr(stream).encode()).hexdigest().upper(),
            "canonical_source_sha256":hashlib.sha256(canonical.read_bytes()).hexdigest().upper(),
            "source_sha256":source_sha,
            "scope":"Direct finite regression guard for the canonical IE identity; no all-order singleton-g2 claim."}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps(report,indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":main()
