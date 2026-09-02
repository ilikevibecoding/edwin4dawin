# Ordinary-parent `H--K` family: adjacent-`k00` impossibility (scope lemma)

Date: 2026-09-02

## Setting and conventions (read off the frozen code, not the prose)

Rank-six `G1`, ordinary-parent leaf mode.  A leaf `z` has an unmarked parent
`p` (`p` is neither mark; the case `p in {u,v}` is the separate marked-parent
family).  Put

```text
A=F-z,   H=A-p,   K=A-N_A[p]=H-N_H(p),   u,v in H distinct.
```

The 56 frozen `H--K` lower classes
(`iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json`)
are labelled `<geometry>_e<epsilon>_t<eta>_k<kappa_u><kappa_v>_j<j_u><j_v>`:

- `geometry`: `adjacent` iff `uv` is an edge of `H` (the `HZ*`, `KZ*` rows
  are set to zero); `nonadjacent` otherwise.  Nonadjacent marks in one
  component of `H` and marks in different components share one class.
- `epsilon in {0,1}` switches the parent response `Q(H,L)`; `eta in {0,1}`
  switches the leaf response `Phi_J((1+x)H+xK)`.
- `K` mark mask: the lower producer sets `KU1=k-kappa_u`, `KV1=k-kappa_v`,
  and the order-eight census sets `kappa_u=int(u not in deleted_set)`.  So
  `kappa=1` means the mark is **retained** in `K` and `kappa=0` means the
  mark is **deleted** from `H` when forming `K`, i.e. the mark is a neighbour
  of `p`.  Hence `k00` = both marks are neighbours of the parent (this agrees
  with the handoff wording).
- The `J`-mask dominance report keys 32 families
  `(geometry, epsilon, eta, K-mask)` to 24 unique `j00` core hashes; the only
  merges are `k01 = k10` (the `u <-> v` symmetry) in every
  `(geometry, epsilon, eta)`.

## Lemma

If `uv in E(H)`, then `u` and `v` are not both neighbours of `p`; equivalently
the `K` mask `k00` never occurs in the adjacent geometry.

## Proof

If `u,v in N_H(p)` and `uv in E(H)`, then `p-u`, `u-v`, `v-p` form a triangle
in `A`, contradicting that `A` is a forest.  More generally, if `u,v` lie in
one component of `H` and both are adjacent to `p`, the `u--v` path in `H`
plus the two edges at `p` is a cycle.  Hence `D=N_H(p)` contains at most one
vertex of each component of `H`; conversely every such `D` is realized by
attaching a new vertex `p` to `D` and hanging `z` on `p`.  Adjacent marks
share a component, so `kappa_u=kappa_v=0` is impossible for them.

## What it closes and what it does not

- Removed at class level: the four `j00` cores keyed
  `adjacent_e{0,1}_t{0,1}_k00`.  Each of these hashes is keyed by no other
  family, so the reduction is clean: **24 -> 20** in-scope cores.  At the
  56-class level the eight classes whose every member is `adjacent_*_k00_*`
  leave the scope; the frozen order-eight census had already evaluated zero
  cells on exactly those eight classes.
- Not removed: the four `nonadjacent_*_k00` cores.  The same-component
  obstruction also forbids `k00` for nonadjacent marks in one component of
  `H`, but the frozen classes do not separate that case from marks in
  different components, where `k00` is realized (20,830 of the 209,808
  exhaustive instances through order eight).  A finer split of the
  nonadjacent geometry would be a new reduction, not this one.
- No sign is proved.  The 20 remaining all-order `H--K` core signs are still
  the open obligation of the ordinary-parent family.

## Exhaustive replay

Every nonisomorphic forest `H` of orders 1..8 (1, 2, 3, 6, 10, 20, 37, 76),
every ordered pair of distinct marks (6,704 pairs), every realizable deletion
set `D` (2, 7, 18, 55, 140, 395, 1008, 2715 per order; 2715 matches the
frozen census): 209,808 instances.

```text
adjacent:     k00 0      k01 6066   k10 6066   k11 17558
nonadjacent:  k00 20830  k01 39114  k10 39114  k11 81060
```

No adjacent `k00` and no same-component `k00` instance exists; realizability
of `D` coincides exactly with "at most one vertex per component" on every
subset of every `H`.  The independent audit re-enumerates forests by its own
construction, decides realizability by a direct acyclicity test, replays the
lemma on all completed forests `A` of orders 2..9 (307 forests, 113,580
`(p,u,v)` configurations), reproduces the order-eight ordered counts from the
frozen census counts (4130, 12470, 14636, 28204, 60266), recomputes all 56
class hashes from the recorded lower expressions, and rebuilds the
32 -> 24 -> 20 partition.

## Removed cores (out of scope)

```text
adjacent_e0_t0_k00  62305973CB260FDAF323A6508713A52F3C0C73DDD882D810AD15379955475C7C
adjacent_e0_t1_k00  79CFDCF6D4F55092B31546E7ECB9A8144E3A8CEBC81148802D7112A04B2B8D4E
adjacent_e1_t0_k00  AC32D80710C22208D26BD5951A443652F9FC221BECA921DEA96C35AAEC221514
adjacent_e1_t1_k00  FC5D1C6D51A0A6A0F7A8B30524EC529D25BF5AD0DF59D85DCDAF5D5DC279D0D3
```

## Remaining 20 in-scope cores

```text
adjacent_e0_t0_k01/k10     6868833CD62A55D9302BBC66991ABD1F0837DFD0B7F87F9B38F9A0BDCD2B1E82
adjacent_e0_t0_k11         68B96498F4EDDC9BE484C6A6B89CE464CAE49AEDC86B666048BEFB458B5418A9
adjacent_e0_t1_k01/k10     23F9C192267D82448DB1E491038AF28E32C32010561D607F9C1AE4FD37412DC2
adjacent_e0_t1_k11         8F87119316822EDBF4953C368625034CB4FF0F6386B24463B1BAA12510F6615D
adjacent_e1_t0_k01/k10     6BFC47DA173430EA5D380EFF02141F586A0B3EEA6047B6257730435EFF34F6DA
adjacent_e1_t0_k11         F4460D6D5D24E10E2CB934D490195FD60DA0194FEFD3532802415C4690D6BCB4
adjacent_e1_t1_k01/k10     F3765D871AE7C292A9392A105F5CB98EBA75992E1E6ED9655B79ECF011876B06
adjacent_e1_t1_k11         A7A5E911BD2AD6E837962D78EAD9749B1277163391A465A3518736CB00571280
nonadjacent_e0_t0_k00      D442FDCD7394892DF7665D3C4FEA731768EDA1307E29C57505EFDEDE7E825060
nonadjacent_e0_t0_k01/k10  1C749C2E4E6E98901837DE195C7504A91B3DE8670B30641E0B456D6EB85CDEFC
nonadjacent_e0_t0_k11      90E943CC9A4FE70D2CCC29B765BFC9752E0EF944B445172DCA478B9673D0AC8B
nonadjacent_e0_t1_k00      E0B74D88853DB70E7B771DB13395880750F5619F5075C393D7561DBA1429CAA0
nonadjacent_e0_t1_k01/k10  6038DA6566B36158455F06768B307E840D476326B77E16D28F8332032EEC93CA
nonadjacent_e0_t1_k11      A2C3BBCACDF5C941952891E3D88E78825A8CEAD63AD93AD1E993F4489EA7DB9A
nonadjacent_e1_t0_k00      6BAD3953E9659C69CBFC62A24D1E05C97E3EDEF28F9E340E577ECE7CD2A23C86
nonadjacent_e1_t0_k01/k10  9AE9132B720DA005D2186634730BE7E5BE6489121CB52F598CDF6A3430246B91
nonadjacent_e1_t0_k11      B76FF9FA0473399AA23DF379B1F87F73E1937CB023D07DAAE7F5C5B607502E2E
nonadjacent_e1_t1_k00      2DDF26E89D005172B2286DAD445AECF7293F6BA9E0130F89F90724C01F799D5B
nonadjacent_e1_t1_k01/k10  F2F2B0F64C2172EF2AB60970D50CB84B62CF6B6312842D60C52009BDC671C7CB
nonadjacent_e1_t1_k11      30A7C50B0EBA2CE7033D3ED850B3F3FA5AB1D00B9FFF57A7737FE9DD1D3C0A2B
```

## Exact replay

```powershell
python .\derive_iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_root.py
python .\audit_iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_independent_root.py
```

Required markers:

```text
PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT
PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_ADJACENT_K00_SCOPE_ROOT
```

Files and SHA-256:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_root.py
  56C41BEC4B5A42FEF6C5CFE55B1F10FFA3898F5C629A06307FD5B592A651B1B1
iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_exact_root_20260902.json
  E7D736F9305C11BBFC957A85E77FCF84218ED59E70F30512B39EABDC17B328F7
audit_iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_independent_root.py
  DAE46B2E4AA91D5A80C52F77DDA39C9496B84117DEB5F884C9BAE0D7D2D40F22
iso_n6_bundle_g1_ordinary_parent_hk_adjacent_k00_scope_independent_audit_root_20260902.json
  83CFF8E5021FCAECB0CAC7D6C983C7C668ECB68B921E97F07453EE4C96FCEAA8
```

Pinned inputs: lower report `22F1F54F...4E02CDF`, order-eight census
`08CD091C...4CF95BE`, `J`-mask dominance report `7B25D57E...0D349D6`, its
independent audit `338225DD...978222C`.

## Scope

This is a scope/partition lemma for the ordinary-parent family of rank-six
`G1`.  It shrinks the obligation list from 24 to 20 all-order core signs and
proves none of them; it does not close rank-six `G1`, all-`N6` integration,
unimodality, or Erdős Problem #993.
