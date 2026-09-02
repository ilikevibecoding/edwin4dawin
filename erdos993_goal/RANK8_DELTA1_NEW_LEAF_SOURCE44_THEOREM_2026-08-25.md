# Rank-eight Delta1 inserted-leaf theorem for source order at least 44

Date: 2026-08-25

Status: **proved with independent exact reconstruction**.  This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 44, let `v` be any vertex, and attach a
new leaf `w` at `v`.  At the new root `w`, the Newton `Delta1` coefficient of
the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The previously sealed source-order-45 theorem handles `|D|>=44`.  Thus only
`|D|=43` is new here.

## Endpoint reduction

The raw `Delta1` gate is separately concave in the two top coefficients `c8`
and `d7`.  The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four endpoint
masks.  The already independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`.  It remains to prove mask 3 at
`|D|=43`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
elementary extension counting give

```text
3/19 <= x <= 756/3599,
5/39 <= y <= 10/63.
```

For completeness, the two-extension step is short.  Choose an independent
four-set `S` of `D` uniformly and put `q=|D-N[S]|`.  Then

```text
E q = mu4 := 5d5/d4,
E i2(D-N[S]) = 15d6/d4.
```

A forest on an integer `q` vertices has at least `h(q)` independent pairs,
where `h(0)=h(1)=h(2)=0` and `h(q)=C(q-1,2)` for `q>=3`.  The piecewise-linear
interpolation `Phi` of `h` is convex, so Jensen gives

```text
mu5 := 6d6/d5 >= 2 Phi(mu4)/mu4
                     >= mu4-3+2/mu4.                 (0)
```

At `|D|=43`, the sharp forest ratio gives `mu4>=63/2`; the right side of
(0) is increasing there and equals `3599/126`.  Hence
`x=6/mu5<=756/3599`, as asserted above.  The final independent gate audit
recomputes these identities and monotonicity exactly.

The proved forest `Q5(D)>=0` inequality is exactly

```text
y <= 10x/(x+12).                                      (1)
```

Two compatible shadow counts, with `M=|F|`, are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 39(d4-f4).                                (3)
```

The identity `M=|E(D)|` is special to this tree/vertex decomposition: the
components of `D` are in bijection with the neighbors of `v`, so both
quantities equal `43-deg_A(v)`.  It is used below.

## The branch `M<=17`

The edge-union bound

```text
i_k(D) >= C(43,k)-17 C(41,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
109470, 781378, 4374864.
```

Together with `f_k<=C(17,k)`, the normalized absolute caps are

```text
f4/d4 <= 238/10947,
f5/d5 <= 238/30053,
f6/d6 <= 119/42066.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint.  Split `u5` at

```text
0, 61183/9086256, 238/30053,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout.  These four rational boxes
have 4,200 tensor Bernstein coefficients.  Every coefficient is strictly
positive.

## The exact branches `18<=M<=42`

The sharp forest ratio applied to the exact order `M` gives

```text
t_M=(M-7)(M-8)/(M-3),             f4 <= (5/t_M) f5.   (4)
```

This retains compatibility with the rank-6 multiplier `(M-5)/6` in (2).
Partition normalized `x` at

```text
0, 1/8, 1/4, 1/2, 1.
```

If `x_b` is the right endpoint of an `x` slab, use the rectangular
outer cap

```text
y <= min(10/63, 10 x_b/(x_b+12)).
```

Partition this `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For a slab with lower endpoint `y_0`, split `u5` at the exact intersection
of (3) and (4):

```text
s(M,y_0)=(y_0-4/39)/(5/t_M-4/39).
```

Use (4) on `[0,s]` and the exact cap

```text
f4 <= d4-(4/39)(d5-f5)
```

on `[s,1]`.  Both are valid upper bounds everywhere; the split merely keeps
the rational Bernstein boxes sharp.  Use (2) for `f6` throughout.

There are 25 exact integer orders, four `x` slabs, eight `y` slabs, and two
`u5` regions: 1,600 rational boxes.  Their 1,920,000 tensor Bernstein
coefficients are all strictly positive.  Together with the small branch,
the `|D|=43` mask-3 certificate has 1,604 boxes and 1,924,200 strictly
positive coefficients.

The independent audit reconstructs the endpoint numerator from the
canonical symbolic transcript, rather than importing the producer or its
probe.  Its canonical numerator hash is

```text
5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E
```

and the cleared endpoint denominator is

```text
2744 d5^4(d6+f5)>0.
```

Thus mask 3 is positive at `|D|=43`.  Masks 0--2 and separate concavity
complete the `|D|=43` gate.  Combining it with the sealed `|D|>=44` gate and
using `|D|=|A|-1` proves the theorem.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=44`.  Source orders 27--43, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC, and
Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43.py
  1765BFAC5EE1AC0B3A2790DD5286EEB383EF2254273258715E2AB22D5DE05210
rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43_20260825.json
  D30AB7AC32B5FCFF5249D3757C014321C0C5A938C40FA67227E5A624842553E6
audit_rank8_delta1_new_leaf_mask3_order43_small_F17_delta1d43.py
  42007F4C6738D397C9FB59137BD9B79507B8F6A1AA71C48B8CF36D4E8B10AC3E
rank8_delta1_new_leaf_mask3_order43_small_F17_independent_audit_delta1d43_20260825.json
  9F2D021B7EADD5DD4602CCA27868C3E45AE64AF5FE68BCEF5E0233FB6A635A9F

prove_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43.py
  E04C43AC27C1C795A1A3698E8851D9BA5168FD58FF4DE48978AD964EF127E4F4
audit_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43.py
  B11EFD7CEEC5066A0FFE473DA634390A75A7D385373C67EBEF2754F3A3AE7DFD

primary exact-F reports 18-23 / 24-29 / 30-35 / 36-42
  8D4260683BC003B77B0DCDDC35B4CB6B9CF8C1616D62749C129401ECC52EB261
  14DF56E8C82F0CD09AEC0B794790EDC9B34DCD9824C9C3DFFD8529546072015F
  AE7CBAA67D4915A6ABC17A14D9CF233B8BA09DD2EA831C38DD65D9D4B0191162
  EE8D898F75069E1DBC669E9C0D2EBCEB6C4576B6FBCDB4358F38E0F00E159F61
independent exact-F reports 18-23 / 24-29 / 30-35 / 36-42
  7D3F0479CD079D71CC1902525C1CD79454FBF4F1D55523BBF4C77DE9F4906D84
  A5054EBCA66EFB7F5229EF5EDBFE89A3B7255C67329607491EDEBD242BBB7286
  0B6A484EDFEAA3756606EB1DC2ED819ABEC4D226DDA606E532F444EB412C7EE6
  07C106467B7E4F8F1401C14A1E1327F621997B3355C724834A87CDF5A981B53C

audit_rank8_delta1_order43_bound_chain_delta1d43.py
  9EA713D51EDC03CDCACE483074E6DDCA4CB92850C5FE2012D012D4171D1D6CF3
rank8_delta1_order43_bound_chain_independent_audit_delta1d43_20260825.json
  98DA1F1AADB651E85881EFBD11433A0461DDD639D5A0C0D1D168F336A0F57F00

assemble_rank8_delta1_new_leaf_mask3_order43_delta1d43.py
  2894BCB5802DFE0DDB10A63565160AE0FD60F4F03D924C75B1302C1A130B11DF
rank8_delta1_new_leaf_mask3_order43_delta1d43_20260825.json
  DD8A2D5A76C6406BBA2056D540E89C8FA82A987895F0924A3156ECA3A429D68E
audit_rank8_delta1_new_leaf_mask3_order43_assembly_delta1d43.py
  1F8DC3EA75AC8B75B3BCFD22E2C4CA809C802A7E053A10A0412B9A2856C01E21
rank8_delta1_new_leaf_mask3_order43_assembly_independent_audit_delta1d43_20260825.json
  23706FF613AB4DB3ED825882BC8A3D75E9C42AFDCE951D039D6E41D06ED59118

assemble_rank8_delta1_new_leaf_gate_source44_delta1d43.py
  F501B4B649F87C796E9A7DC17081F6395F576D1BEC8E83BB44821062EC59B877
rank8_delta1_new_leaf_gate_source44_delta1d43_20260825.json
  C47198613AB94C0FC8C91DDC68884D406B02C2D2FD6E937BB85986587D4ECCB8
audit_rank8_delta1_new_leaf_gate_source44_delta1d43.py
  395604004AF2D26580EA044FE6EF0FD2BCF084E85DD972940FDFEBB70C9DFC62
rank8_delta1_new_leaf_gate_source44_independent_audit_delta1d43_20260825.json
  F3347EB183C7F23AD37CCD403A6A44DAF596581DA261A25411897FE15F8C3AB0
```
