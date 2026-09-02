# Boundary-SM3 one-root and augmenting-tree reduction

Date: 2026-08-13

Status: the identities and implications below are exact.  The exhaustive and
random checks are bounded evidence.  The one-root inequality and the matching
theorem remain unproved, so this is not a proof of SM3 or of Erdos Problem
#993.

## 1. Exact setup

Let `T` be a tree or forest and `p` a vertex such that

```text
F=T-p,       H=T-N[p],       alpha(T)=alpha(F)=beta.
```

The neighbors `S=N_T(p)` lie in distinct components of `F`.  For a component
rooted at `s_i`, write

```text
C_i=I(F_i-s_i),       D_i=I(F_i-N[s_i]).
```

Then the marked-root polarization is

```text
Phi(x,y)=product_i (C_i(x)+y x D_i(x)),
H(x)=Phi(x,0).
```

Let

```text
M_1(x)=[y]Phi(x,y)
      =x sum_i D_i(x) product_(j!=i) C_j(x).          (1)
```

Thus `[x^r]M_1` counts independent `r`-sets of `F` containing exactly one
neighbor of `p`.  Since `F` also has layers with two or more marked roots,

```text
f_r >= h_r + m_(r,1).                                (2)
```

In the exceptional leaf-induction boundary put

```text
r=floor(2 beta/3),       D_r(H)=3h_r-h_(r-1).
```

The following one-root statement is therefore a sufficient strengthening of
the first conditional half of Boundary-SM3:

> **One-root boundary payment (ORP).** If `D_r(H)<0`, then
> 
> ```text
> h_r+m_(r,1) >= h_(r-1).                             (3)
> ```

Indeed (2)-(3) give `f_r>=h_(r-1)`, precisely the first implication in the
surviving conditional split (12)-(13) of
`FUGACITY3_COEFFICIENT_PREFIX_REDUCTION_2026-07-26.md`.

The sign condition is essential.  The unrestricted half-occupation statement
`f_k>=h_(k-1)` fails even inside the prefix; the exact order-16 replay below
finds 3,400 such failures.  None occurs among the 54,772 cases with
`3h_k<h_(k-1)`.

## 2. Stronger local matching target

Let `L` be the independent `(r-1)`-sets of `H`, and let `R_1` be the
independent `r`-sets of `F` containing at most one vertex of `S`.  Join
`A in L` to `B in R_1` when the subgraph of `F` induced by `A triangle B` is
connected.

Because both sides are independent and their sizes differ by one, every such
symmetric difference is an induced bipartite tree whose `B` side has one
more vertex.  Toggling it is exactly a minimal augmenting-tree move.  A
matching saturating `L` proves (3), and is a more structured target than the
bare coefficient inequality.  The converse is not automatic: the scalar
coefficient inequality checks Hall only for the whole left rank, whereas the
matching requires Hall's inequality for every proper subfamily.  Thus the
connected matching is a strictly stronger sufficient target, not an
equivalent reformulation of ORP.

This formulation is genuinely stronger than simple inclusion.  The first
inclusion-matching failure already occurs at order 9, while the connected
augmenting-tree matching still saturates every left vertex.

## 3. Exact bounded evidence and failure shields

Run

```text
python probe_noncore_vertex_half_occupation.py --max-order 16 \
  --output noncore_vertex_half_occupation_one_root_full_n16.json
```

It checks every vertex of all 32,507 unlabeled trees through order 16.  There
are 54,772 conditional prefix instances with `3h_k<h_(k-1)`.  Both
`f_k>=h_(k-1)` and the stronger one-root payment (3) have zero failures.
In fact, if the individual summands of `M_1` are ordered by their rank-`k`
contribution, `h_k` plus the two largest summands already pay `h_(k-1)` in
all 54,772 cases.  One summand is insufficient in 432 cases, while two have
zero failures.  This is a sharper finite target, not an all-order theorem.
The replay simultaneously records:

* 3,400 failures of unrestricted prefix half occupation;
* 5,440 failures of the crude maximum-set binomial bound;
* 14 failures of the still stronger demand `m_(k,1)>=h_(k-1)`.

Hence the retained `h_k` term in (3) and the negative-`D_k(H)` hypothesis are
both real, not cosmetic.

Run

```text
python probe_boundary_sm3_connected_injection.py --max-order 12 \
  --output boundary_sm3_one_root_connected_matching_n12.json
```

Across 985 trees, 5,661 pendant setups, 2,614 exceptional setups and 807
negative-closed-row setups, the one-root connected-exchange graph has no
matching failure.  Two ordinary inclusion matchings fail.  More rigid
canonical constructions are also false: a fixed-root map first collides at
order 7, and the naive all-unmatched-roots degree bound fails at order 9.

A separate random exact run

```text
python probe_random_boundary_one_root_payment.py --samples 1000 \
  --min-order 20 --max-order 60 \
  --output random_boundary_one_root_payment_1k.json
```

checks 75,296 ranks and 106 conditional ranks without a one-root failure.

## 4. Remaining theorem

The clean all-order target is now either (3), or equivalently the stronger
augmenting-tree matching assertion above, for the exceptional rank.  Standard
augmenting-graph theory only guarantees at least one augmenting tree for each
nonmaximum independent set; it does not give a simultaneous matching of all
sets.  Hall's condition is the missing statement.

This reduction removes several false proof ideas but does not settle the
second conditional half

```text
D_(r+1)(F)+D_r(F) >= f_r.
```

Both halves are still needed to prove Boundary-SM3 and hence the
three-quarters cascade.

## 5. Artifact hashes

SHA-256 hashes for the replayed artifacts are:

```text
8A9866E2DFA01287E5CDF11389CC76E16D8E8F8D129E520D6F8A173ACEFC3E2F
  probe_noncore_vertex_half_occupation.py
E68E9A2F8DAE8A82CF6F214BC3E7F3A18C639B6BCA5F7F0CB5EBA4541317F50F
  noncore_vertex_half_occupation_one_root_full_n16.json
96FCD6FBCD12E354E4F4161397BD054382732BAAA1B1D5CA6808FCEF9235F191
  probe_boundary_sm3_connected_injection.py
2A42B80BC4A80BF8228CB331AFFB8D7BAE17B7862AAEF37A028DF153A4CBE961
  boundary_sm3_one_root_connected_matching_n12.json
6CF05C43470D360DBBABD677FF5528682C4A6EB9048B073BD16278075B20A303
  probe_random_boundary_one_root_payment.py
4F4E1DAD3F9A29DB5C4F97CF515E5C8E9D4B46B395A12F49B0179B5FD9E1747B
  random_boundary_one_root_payment_1k.json
```

The note hash must be computed after this manifest is finalized.
