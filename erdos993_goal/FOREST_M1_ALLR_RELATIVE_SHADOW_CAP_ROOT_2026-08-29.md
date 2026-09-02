# Forest terminal `m=1`: all-`R` relative-shadow cap

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.**

## Statement

Let `G` be a forest, mark `w`, and put

```text
F=G-w,  H=G-N_G[w],  d=deg_G(w),  S=|H|.
```

For a supported target `j`, write `b=i_j(F)` and
`y=i_j(H)/b`.  If `d>j`, then

```text
y <= (S-j+1)/(S-j+1+j*(d-j)).                       (1)
```

For `d<=j`, the corresponding statement is the trivial cap `y<=1`.

## Proof

List the root neighbors as `u_1,...,u_d` and put

```text
X_i=N_F(u_i) subset H.
```

The sets `X_i` are pairwise disjoint: a common vertex would create a
4-cycle through `w`.

Fix an independent `j`-set `A` of `H`.  Since the `X_i` are disjoint, at
most `j` of them meet `A`; hence at least `d-j` indices satisfy
`A intersect X_i=empty`.  For every such index and every `x in A`, the
shadow `B=A-{x}` is an independent `(j-1)`-set of `H-X_i`.

Double-count triples `(i,B,x)` of this form.  The preceding paragraph gives
at least

```text
j*(d-j)*i_j(H)                                      (2)
```

triples.  For fixed `(i,B)`, there are at most `S-j+1` possible extension
vertices `x`, so

```text
j*(d-j)*i_j(H)
 <=(S-j+1)*sum_i i_(j-1)(H-X_i).                    (3)
```

For each `i`, adjoining `u_i` to an independent `(j-1)`-set of `H-X_i`
gives an independent `j`-set of `F` containing exactly that one root
neighbor.  These classes are pairwise disjoint and are disjoint from the
sets wholly contained in `H`.  Thus

```text
b>=i_j(H)+sum_i i_(j-1)(H-X_i).                     (4)
```

If `i_j(H)=0`, then `y=0`.  Otherwise `S>=j`, and combining (3)--(4) gives
(1).

## Scope

The cap is valid for every root-excess value and is strongest in the
high-degree regime.  It may be intersected with the independent balanced-
neighbor cap.  It does not prove a terminal Newton sign, forest `m=0`, the
full terminal payment, unimodality, or Erdos Problem 993.
