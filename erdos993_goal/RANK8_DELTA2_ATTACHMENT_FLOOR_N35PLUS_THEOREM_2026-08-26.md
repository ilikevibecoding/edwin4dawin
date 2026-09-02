# Rank-eight Delta2 terminal gate for rooted trees of order at least 35

## Theorem

For every rooted tree core of order `n>=35`, the rank-eight terminal `Delta2`
residual is nonnegative throughout the exact rank-six defect interval and the
root-capacity polygon used in the terminal-broom reduction.

This closes the reduced `Delta2` terminal gate in this order range. It does
not by itself close orders `28..34`, the other rank-eight increment lanes,
connected `Q8`, forest `Q8`, or Problem 993.

## Reduction and exact cover

The structural reduction is concave across the rank-six defect interval, so
only `k=1` and `k=7` remain. The root polygon leaves two live paths:
lower-cross and upper-capacity. The attachment-incidence theorem gives

`i7(T-q)/i7(T) >= (n-19)/(n-12)`.

At `n=35` the floor is `16/23`, and it increases to one. The four required
tensors are therefore

`{k=1,k=7} x {lower-cross,upper-capacity}`.

Three tensors were already strictly positive on the larger domain `n>=28`.
The remaining `k=1` lower-cross tensor is compactified by `t=T/35` and has
2,313,441 exact Bernstein coefficients. Every coefficient is strictly
positive. Across the four-path assembly, all 9,253,764 coefficients are
strictly positive.

## Independent audits

The tail audit imports neither the tensor producer nor its Bernstein engine.
It pins the producer and report bytes, reconstructs the embedded fail-closed
manifest from the source AST, rebuilds the attachment-floor map and
lower-cross identity, and checks the exact positive minimum and coefficient
counts.

The assembly audit separately reconstructs both compactifications, both live
path identities, and the endpoint/path Cartesian product. It verifies that
the only remaining `Delta2` band is `k=1` lower-cross at orders `28..34`.

## Replay

```powershell
python certify_rank8_delta2_lcross_k1_attachment_floor_tail35_root.py
python audit_rank8_delta2_lcross_k1_attachment_floor_tail35_root.py
python assemble_rank8_delta2_attachment_floor_n35plus_root.py
python audit_rank8_delta2_attachment_floor_n35plus_root.py
```

The tail report and tail audit SHA-256 digests are

`00860979907DF5E22F518944AB93596F03E83CD70300EA08C340D1887733B6F3`

and

`2C5145F40B600663AE77EAC37E5C20848EFBA9BC7F51913D50516CB527C13719`.

The assembled report and independent assembly audit SHA-256 digests are

`A57332C57EA89C00C84069EBEC00D9D3B7186E55F90B345243EAFA75A2707E8E`

and

`22BC10CB0B64D66B7E8D40484941349AAD8ABC6E743E2BE7C3C1A8403362C177`.
