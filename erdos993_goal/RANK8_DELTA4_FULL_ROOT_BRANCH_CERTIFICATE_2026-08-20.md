# Rank-eight `Delta^4` four-branch certificate

Date: 2026-08-20

Status: **exact closure of the two full-root and two upper-capacity boxes in
the audited eight-box `Delta^4` reduction for every core order `n>=23`,
conditional on the rank-seven `Q7(alpha>=12)` reserve.  Four `Delta^4` boxes
remain.  This is not a complete
`Delta^4`, `Q8`, connected-tree, or forest theorem.**

## 1. Dependency audit

The repaired `Delta^5` package was replayed before this calculation.  Its
all-order scope remains correct:

- the exact finite all-root census covers `1<=n<=22`;
- the analytic certificate covers `n>=23` and has 28,621,872 nonnegative
  Bernstein coefficients over six boxes;
- the analytic part is conditional on
  `Q7(A)=14c7^2-c6c7-16c6c8>=0` when `alpha(A)>=12`;
- bipartiteness gives `alpha(A)>=ceil(n/2)>=12` for `n>=23`;
- `Delta^5` is nonincreasing in `c8`, so the repaired endpoint
  `c8=c7(14c7-c6)/(16c6)` has the correct direction even on the part of the
  `q` interval where it is a looser upper overbound than the extension bound;
- its displayed `c7` curvature is nonpositive, so the two `D6` endpoint
  reduction remains valid.

The fresh replay report is
`rank8_q8_terminal_delta5_all_order_replay_20260817.json`, SHA-256
`E56F800A84E8E4A01A35EDEE75FF9C4F0ACF40EF9B9E14C71531C585CBD65569`.

## 2. Enlarged box

The previous exact `Delta^4` reduction leaves four root-capacity boxes for
each rank-six endpoint `k in {1,7}`.  On the full-root box, the reduced rational
function is independent of `n` after expressing it in the source variables
`w,x,U,V`.  Its denominator is

```text
23653217383979784968502135000000000000*x^13,
```

which is positive on every actual cone point.

Every actual cone slice for `n>=23` is contained in

```text
0 < w <= 33/190,
4/3 <= x/w <= 760/471,
0 <= U,V <= 1.
```

Indeed, writing `n=23+N`,

```text
33/190 - 3(n-1)/((n-3)(n-4))
 = 3N(11N+239)/(190(N+19)(N+20)) >= 0.
```

Also

```text
8/(6-w) - 4/3 = -4w/(3(w-6)) >= 0,
760/471 - 4/(3(1-w)) = 4(190w-33)/(471(w-1)) >= 0
```

when `0<w<=33/190`.

Use cube coordinates

```text
w=(33/190)W,
x=w(4/3 + (760/471-4/3)A),
0<=W,A,U,V<=1.
```

For each `k`, the cleared numerator has 4,390 monomials and multidegree
`(12,11,10,7)`.  All 13,728 tensor Bernstein coefficients are nonnegative in
one unsplit leaf: 13,632 are positive and 96 vanish only on the artificial
`w=0` closure.  Thus `Delta^4>=0` on both full-root boxes.

## 3. Scaled upper-capacity box

For the upper-capacity branch, keep the order-size coupling with

```text
t=1/n,  y=nw,  r=x/w.
```

Every actual cone point for `n>=23` lies in

```text
0<t<=1/23,
3<=y<=759/190,
4/3<=r<=760/471,
0<=U,V,Z<=1.
```

The new `y` bounds follow, again with `n=23+N`, from

```text
3n/(n-3)-3 = 9/(N+20) >= 0,
759/190 - 3n(n-1)/((n-3)(n-4))
 = 9N(21N+439)/(190(N+19)(N+20)) >= 0.
```

After substituting `n=1/t,w=yt,x=ytr`, multiplication by the positive
factor `t` clears the only negative power.  For each `k`, the resulting
polynomial has 127,179 monomials, multidegree `(14,13,12,11,8,2)`, and
884,520 tensor Bernstein coefficients.  Exactly 586,404 are positive,
298,116 vanish on the enlarged-box closure, and none is negative.  Thus both
upper-capacity boxes are closed.

## 4. Exact scope after the closure

Closed:

```text
k=1, full-root;
k=7, full-root;
k=1, upper-capacity;
k=7, upper-capacity.
```

Still live:

```text
k=1,7 crossed with
  lower-zero,
  lower-cross with its parameter retained.
```

The earlier lower-cross curvature witness remains only an obstruction to
endpoint collapse.  Likewise, the optional `V`-concavity shortcut is exact for
the `k=1` full-root box but false for `k=7`: at
`n=28,w=3/25,x=2/11,U=1,V=0`,

```text
d^2 Delta4/dV^2
 = 1783780582434341507278416/39830601611328125 > 0,
```

while the `Delta^4` value itself is positive.  This is a method obstruction,
not a tree counterexample or a negative `Delta^4` value.

A direct use of the same scaled rectangular enclosure on the two remaining
`k=1` branches is also unresolved.  The lower-zero and lower-cross boxes have
the identical most-negative Bernstein coefficient

```text
-3555422699116182410746475859518824337280884736000000000000000
 / 81149854271771248663
```

at indices `(14,0,0,0,6,2)` and `(14,0,0,0,6,0)`, respectively.  These are
the same shared junction (`Z=1` on lower-zero and `Z=0` on lower-cross).  The
enlarged rectangle permits `t=1/23,y=3,r=4/3`, but an actual cone point at
`t=1/23` has the strictly stronger coupled lower bounds
`y>=69/20` and `r>=8/(6-w)>4/3`.  Therefore the negative coefficients are
exact enclosure obstructions caused by dropping the lower `t-y-r` coupling;
they are not negative values, relaxed jets, or tree counterexamples.  Any next
certificate for the final four boxes must retain that coupled lower face.

## 5. Replay and hashes

Run

```powershell
python .\certify_rank8_delta4_full_branch_box.py --k 1 --no-split
python .\certify_rank8_delta4_full_branch_box.py --k 7 --no-split
python .\certify_rank8_delta4_scaled_n_branch_box.py --k 1 --piece ucap
python .\certify_rank8_delta4_scaled_n_branch_box.py --k 7 --piece ucap
python .\audit_rank8_delta5_delta4_full_branch_package.py
```

Expected markers are

```text
PASS_EXACT_RANK8_DELTA4_FULL_BRANCH_ENLARGED_BOX
PASS_EXACT_RANK8_DELTA4_FULL_BRANCH_ENLARGED_BOX
PASS_EXACT_RANK8_DELTA4_SCALED_N_BRANCH_ENLARGED_BOX
PASS_EXACT_RANK8_DELTA4_SCALED_N_BRANCH_ENLARGED_BOX
PASS_INDEPENDENT_SCOPE_AND_INTEGRITY_AUDIT
```

Current SHA-256 values are

```text
certify_rank8_delta4_full_branch_box.py
3BDE91905ADF15B5260290B7F74292CA19C4A9969818743AF4B13586B7C27E2D

probe_rank8_delta4_source_curvatures.py
2093FAE7FCDE4C810BDDEC9EB166FD797B1D9E296F06FE8A6C1461489EFD0A66

rank8_delta4_full_branch_k1_exact_20260820.json
863E1964FB0D29C9EE9554CED773D457DCD08456DD0AB120B38C3B060E0ECA02

rank8_delta4_full_branch_k7_exact_20260820.json
EDFD94CC2F3F824BF35F7F3F647AF5C10A6BF7D143D07C5D051D317733DEB578

certify_rank8_delta4_scaled_n_branch_box.py
207E511A080A79FD4AED8E8C533D9D469A36875E503D767D8595EE679E1DB6D3

rank8_delta4_scaled_n_k1_ucap_exact_20260820.json
955179AF39CC5CEDC5BD4A08978ED9C402E07935A06482B21FDC920A2E730761

rank8_delta4_scaled_n_k7_ucap_exact_20260820.json
B23F74417F6772C7D109E003CD6C89DD0D2F4D93E64084C4B2275DA63DB04FFA

audit_rank8_delta5_delta4_full_branch_package.py
837DE8A82783E54924EC604417B6F8739B96CBEA83C78CCE3928391D4D2EAC34

rank8_delta5_delta4_full_branch_independent_audit_20260820.json
2B8CD973BE37DC756C142F0F76896D322811CBB37C34F83F0F12C74746E9C278

certify_rank8_delta4_v_concavity_box.py
D66190756831A1E2B149C7AB9A23D16F3363C7C1E8C067592164E9AEE92EAEDE

rank8_delta4_v_concavity_k1_full_exact_20260820.json
B56B1871677F050AC83E2FB9D4B53D2052E1D8D51C09760D14E97AF9D5DBA2AD

rank8_delta4_scaled_n_k1_l0_exact_20260820.json
FCE10CAA2537E30EEB5E1E421F4628CA86FEBEEE4E1E5FD8DCE9CED50400C86C

rank8_delta4_scaled_n_k1_lcross_exact_20260820.json
AE90636B64F7065D321956D34C17A0D37353410CC86912FB3D5B114E0E68A790
```
