#!/usr/bin/env python3
"""Probe whether adding a bridge can only decrease terminal Newton m=1."""

from math import comb
import networkx as nx
import audit_terminal_q3_low_newton_m2_forest_base_agent as q


def m1(data, root, target):
    gi,gc=data['pair']
    rr=data['roots'][root]
    fi,fc=rr['F']; hi,_=rr['H']
    # Fixed terminal-q3 low block versus target-j high block.
    a=q.coefficient(fi,2); b=q.coefficient(fi,target)
    if not b: return None
    z2=q.coefficient(fc,1); h2=q.coefficient(hi,2)
    zj=q.coefficient(fc,target-1); hj=q.coefficient(hi,target)
    vals=[]
    for shift in range(2):
        t=shift+1
        P=sum(comb(t,l)*q.coefficient(gi,3-l) for l in range(t+1))
        R=sum(comb(t,l)*q.coefficient(gc,2-l) for l in range(t+1))
        U=sum(comb(t,l)*q.coefficient(gi,target+1-l) for l in range(t+1))
        c=z2+h2+t*a; e=zj+hj+t*b
        M=(target+1)*b*c-3*a*e
        A=P*c-a*R; slack=P*b-a*U
        vals.append(P*(P+a)*M-(target+1)*A*slack)
    return vals[1]-vals[0]


def main():
    minimum=None; negatives=[]; checks=0
    for order in range(4,11):
        for ti,tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree=nx.convert_node_labels_to_integers(tree0,ordering='sorted')
            tree_data=q.tree_type_data(tree)
            for edge in list(tree.edges()):
                forest=tree.copy(); forest.remove_edge(*edge)
                forest_data=q.tree_type_data(forest)
                for root in tree:
                    for target in range(3,order):
                        fv=m1(forest_data,root,target); tv=m1(tree_data,root,target)
                        if fv is None or tv is None: continue
                        diff=fv-tv; checks+=1
                        item=(diff,order,ti,edge,root,target,fv,tv)
                        if minimum is None or item<minimum: minimum=item
                        if diff<0: negatives.append(item)
    print('checks',checks,'minimum',minimum,'negative_count',len(negatives))
    print('first_negatives',sorted(negatives)[:20])


def best_bridge():
    minimum=None; negatives=[]; checks=0
    for order in range(4,10):
        for ti,tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree=nx.convert_node_labels_to_integers(tree0,ordering='sorted')
            for cut in list(tree.edges()):
                forest=tree.copy(); forest.remove_edge(*cut)
                comps=[sorted(c) for c in nx.connected_components(forest)]
                if min(map(len,comps)) == 1:
                    continue
                forest_data=q.tree_type_data(forest)
                bridge_data=[]
                left_choices=[v for v in comps[0] if forest.degree(v)==1]
                right_choices=[v for v in comps[1] if forest.degree(v)==1]
                for left in left_choices:
                    for right in right_choices:
                        joined=forest.copy(); joined.add_edge(left,right)
                        bridge_data.append(((left,right),q.tree_type_data(joined)))
                for root in forest:
                    for target in range(3,order):
                        fv=m1(forest_data,root,target)
                        if fv is None: continue
                        options=[(m1(data,root,target),edge) for edge,data in bridge_data]
                        options=[item for item in options if item[0] is not None]
                        if not options: continue
                        tv,edge=min(options)
                        diff=fv-tv; checks+=1
                        item=(diff,order,ti,cut,root,target,fv,tv,edge)
                        if minimum is None or item<minimum: minimum=item
                        if diff<0: negatives.append(item)
    print('best bridge checks',checks,'minimum',minimum,'negative_count',len(negatives))
    print('best bridge first negatives',sorted(negatives)[:20])


def all_leaf_bridges(max_order=9):
    minimum=None; negatives=[]; checks=0
    for order in range(4,max_order+1):
        for ti,tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree=nx.convert_node_labels_to_integers(tree0,ordering='sorted')
            for cut in list(tree.edges()):
                forest=tree.copy(); forest.remove_edge(*cut)
                comps=[sorted(c) for c in nx.connected_components(forest)]
                if min(map(len,comps))==1: continue
                fd=q.tree_type_data(forest)
                for left in [v for v in comps[0] if forest.degree(v)==1]:
                    for right in [v for v in comps[1] if forest.degree(v)==1]:
                        joined=forest.copy(); joined.add_edge(left,right); td=q.tree_type_data(joined)
                        for root in forest:
                            for target in range(3,order):
                                fv=m1(fd,root,target); tv=m1(td,root,target)
                                if fv is None or tv is None: continue
                                item=(fv-tv,order,ti,cut,(left,right),root,target,fv,tv); checks+=1
                                if minimum is None or item<minimum: minimum=item
                                if item[0]<0: negatives.append(item)
    print('all leaf checks',checks,'minimum',minimum,'negative_count',len(negatives))
    print('all leaf negatives',sorted(negatives)[:20])


def all_forest_leaf_bridges(max_order=9):
    """Include arbitrary common nontrivial forest components."""
    types=[]
    for order in range(2,max_order+1):
        for graph in nx.nonisomorphic_trees(order):
            graph=nx.convert_node_labels_to_integers(graph,ordering='sorted')
            types.append({'order':order,'graph':graph})
    minimum=None; negatives=[]; checks=0; forests=0
    for order in range(4,max_order+1):
        for components in q.component_multisets(types,order):
            if len(components)<2: continue
            forests+=1
            graphs=[types[index]['graph'] for index in components]
            forest=nx.disjoint_union_all(graphs)
            ranges=[]; start=0
            for graph in graphs:
                ranges.append(tuple(range(start,start+len(graph)))); start+=len(graph)
            fd=q.tree_type_data(forest); joined_cache={}
            for root in forest:
                ci=next(index for index,vertices in enumerate(ranges) if root in vertices)
                left=[u for u in ranges[ci] if u!=root and forest.degree(u)==1]
                for u in left:
                    for oi,vertices in enumerate(ranges):
                        if oi==ci: continue
                        for v in vertices:
                            if forest.degree(v)!=1: continue
                            edge=tuple(sorted((u,v)))
                            if edge not in joined_cache:
                                joined=forest.copy(); joined.add_edge(*edge)
                                joined_cache[edge]=q.tree_type_data(joined)
                            td=joined_cache[edge]
                            for target in range(3,order):
                                fv=m1(fd,root,target); tv=m1(td,root,target)
                                if fv is None or tv is None: continue
                                item=(fv-tv,order,components,edge,root,target,fv,tv)
                                checks+=1
                                if minimum is None or item<minimum: minimum=item
                                if item[0]<0: negatives.append(item)
    print('all forest leaf forests',forests,'checks',checks,'minimum',minimum,
          'negative_count',len(negatives))
    print('all forest leaf negatives',sorted(negatives)[:20])


if __name__=='__main__':
    main()
    best_bridge()
