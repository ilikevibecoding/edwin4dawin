# Weak prefix ratio: exact leaf-boundary reduction

Date: 2026-08-29

Status: **exact conditional reduction, not an all-order proof.**  One pointed
boundary inequality remains to be proved.

For a forest `F`, write

```text
I(F;x)=sum_k i_k(F)x^k,
L(alpha)=ceil((2alpha-1)/3).
```

The weak prefix ratio needed by the ISO-to-unimodality implication is

```text
WR(F,r):  i_(r-1)(F) <= r i_r(F),       1<=r<L(alpha(F)).       (1)
```

## The sole pointed boundary target

Let `A` be a forest, let `p` be a vertex, and suppose

```text
alpha(A-p)=alpha(A)=beta.
```

For `beta` congruent to `0` or `2` modulo `3`, put

```text
r=L(beta).
```

Let `h_(r-1,p)(A)` count the independent `(r-1)`-sets of `A` containing
`p`.  The remaining target is

```text
BP(A,p):  h_(r-1,p)(A) <= r i_r(A).                (2)
```

Equivalently, because a set containing `p` deletes its closed neighborhood,

```text
i_(r-2)(A-N[p]) <= r i_r(A).                       (3)
```

## Conditional theorem

If (2) holds for every displayed pointed forest, then (1) holds for every
finite forest.

Choose a leaf `ell` of a nontrivial component of `T`, with neighbor `p`, and
put

```text
A=T-ell,       C=T-{ell,p}=A-p.
```

Then

```text
I(T)=I(A)+xI(C),
alpha(C)=alpha(T)-1,
alpha(A) in {alpha(T)-1,alpha(T)}.                 (4)
```

Define `W(F,r)=r i_r(F)-i_(r-1)(F)`.  Coefficient extraction from (4)
gives the exact identity

```text
W(T,r)=W(A,r)+W(C,r-1)+i_(r-1)(C).                 (5)
```

Strong induction closes `W(C,r-1)`, since
`r-1<L(alpha(C))` whenever `r<L(alpha(T))`.  If
`alpha(A)=alpha(T)`, induction also closes `W(A,r)`.  If
`alpha(A)=alpha(C)=beta`, induction closes it except when

```text
L(beta+1)=L(beta)+1 and r=L(beta).
```

The cutoff jumps exactly for `beta` congruent to `0` or `2` modulo `3`.
At that boundary, (5) becomes

```text
W(T,r)=W(C,r-1)+r i_r(A)-h_(r-1,p)(A),             (6)
```

which is nonnegative by (2).  An edgeless forest is the induction base,
because its row is binomial and satisfies (1) at every supported rank.

Thus the previously global-looking weak-ratio obligation is reduced to one
pointed coefficient inequality at two residue classes of one boundary rank.
The ordinary ISO inequality and this reduction are still separate: neither
this note nor the finite audit proves ISO, (2), unimodality, or Erdos Problem
993.

## Replay

Run

```powershell
python .\verify_weak_prefix_ratio_leaf_boundary_reduction_root.py
```

The verifier checks the cutoff arithmetic through `alpha=10000`, the
coefficient identity symbolically, and every literal leaf instance in the
NetworkX graph atlas.  Its required marker is

```text
PASS_EXACT_WEAK_PREFIX_RATIO_LEAF_BOUNDARY_REDUCTION
```
