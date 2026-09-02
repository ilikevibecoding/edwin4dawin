#!/usr/bin/env python3
"""Direct-canonical finite all-forest audit of terminal Newton m=1."""

from __future__ import annotations

from functools import lru_cache
import hashlib
import json
from pathlib import Path

import networkx as nx
import audit_terminal_q3_low_newton_adversarial_agent as canonical
import audit_terminal_q3_low_newton_m2_forest_canonical_import_agent as rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def census(max_order: int = 13):
    types=[]
    tree_counts={}
    for order in range(1,max_order+1):
        graphs=[nx.empty_graph(1)] if order==1 else list(nx.nonisomorphic_trees(order))
        tree_counts[str(order)]=len(graphs)
        types.extend(rows.type_data(graph) for graph in graphs)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair=((1,),(0,))
        for index in components:
            pair=rows.union_pair(pair,types[index]['pair'])
        return pair

    forests=roots=supported=positive=zero=0
    minimum=None;minimum_cell='';by_target={};stream=hashlib.sha256()
    for order in range(4,max_order+1):
        for components in rows.component_multisets(types,order):
            if len(components)<2:
                continue
            forests+=1
            g_pair=forest_pair(components)
            seen=set()
            for position,type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest=components[:position]+components[position+1:]
                rest_pair=forest_pair(rest)
                root_type=types[type_index]
                for root in root_type['roots']:
                    roots+=1
                    f_pair=rows.union_pair(root['F'],rest_pair)
                    h_pair=rows.union_pair(root['H'],rest_pair)
                    adapter=rows.Adapter(f_pair,h_pair)
                    terminal=list(canonical.terminal_rows(
                        nx.Graph(),0,list(g_pair[0]),rows.one_edge_actual(g_pair[1]),adapter
                    ))
                    for item in terminal:
                        target=item[0]
                        m1=item[1][1]
                        # terminal_rows itself filters exactly by b=i_j(F)>0.
                        assert rows.coeff(f_pair[0],target)>0
                        assert m1>=0
                        supported+=1;positive+=m1>0;zero+=m1==0
                        by_target[str(target)]=by_target.get(str(target),0)+1
                        cell=(
                            f"order={order},components={components},"
                            f"type={root_type['graph6']},w={root['marked']},j={target}"
                        )
                        stream.update(f"{cell}|{m1}\n".encode())
                        if minimum is None or m1<minimum:
                            minimum,minimum_cell=m1,cell
    return {
        'maximum_G_order':max_order,
        'tree_types_by_order':tree_counts,
        'disconnected_forest_multisets':forests,
        'rooted_component_cells':roots,
        'supported_cells_all_j':supported,
        'supported_cells_by_target':by_target,
        'positive_m1_cells':positive,
        'zero_m1_cells':zero,
        'minimum_m1':minimum,
        'minimum_cell':minimum_cell,
        'ordered_cell_stream_sha256':stream.hexdigest().upper(),
    }


def main():
    result=census(13)
    assert result['zero_m1_cells']==0
    report={
        'schema':'terminal-q3-low-newton-m1-forest-finite-audit-v1',
        'date':'2026-08-29',
        'status':'PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13',
        'claim':(
            'Every supported disconnected-forest terminal cell with |G|<=13 '
            'has strictly positive Newton coefficient m=1.'
        ),
        'finite_census':result,
        'canonical_source':Path(canonical.__file__).name,
        'canonical_sha256':sha256(Path(canonical.__file__)),
        'row_source':Path(rows.__file__).name,
        'row_source_sha256':sha256(Path(rows.__file__)),
        'scope':(
            'This is a complete finite certificate only. It does not prove '
            'forest m=1 above order 13 or forest m=0.'
        ),
        'source':Path(__file__).name,
        'source_sha256':sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(report['status'])
    print(f"supported={result['supported_cells_all_j']} minimum={result['minimum_m1']}")
    print(f"report={OUTPUT}")


if __name__=='__main__':
    main()
