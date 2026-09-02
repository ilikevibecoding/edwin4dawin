# Terminal-support recurrence for the token-sliding envelope

Date: 2026-08-28

Status: exact recurrence and exact conditional mixture lemma.  The tree-specific
conditions needed to turn the lemma into an all-tree theorem remain open.

## 1. Coefficient convention

For a forest `F`, write

```text
I_F(x) = sum_r i_r(F) x^r,
C_F(x) = sum_(ab in E(F)) I_(F-(N[a] union N[b]))(x)
       = sum_(j>=0) s_(j+1)(F) x^j,
D_F(x) = I'_F(x) = sum_(j>=0) (j+1)i_(j+1)(F) x^j.
```

Thus `q_(j+1)(F)=C_(F,j)/D_(F,j)` whenever the denominator is nonzero.

## 2. Exact terminal-support recurrence

Let `G` be a tree or forest with a marked vertex `w`.  Form `T` by adjoining
an edge `w-v` and then adjoining `t>=1` new leaves at `v`.  Then

```text
I_T = (1+x)^t I_G + x I_(G-w),

C_T = (1+x)^t C_G
      + x C_(G-w)
      + I_(G-N_G[w])
      + t I_(G-w),

D_T = (1+x)^t D_G
      + t(1+x)^(t-1) I_G
      + I_(G-w)
      + x D_(G-w).
```

The `C_T` identity follows by splitting the unique induced edge into four
types: a core edge incident with `w`, a core edge not incident with `w`, the
stem `wv`, or one of the `t` leaf edges.  For a non-incident core edge, the
configurations containing `v` sum exactly to `x C_(G-w)`.  The stem leaves
the residual forest `G-N[w]`; each leaf edge leaves `G-w`.

Putting `K_F=D_F-C_F` gives the coefficientwise-positive identity

```text
K_T = (1+x)^t K_G + x K_(G-w)
      + t((1+x)^(t-1)I_G-I_(G-w))
      + (I_(G-w)-I_(G-N[w])).
```

Positivity alone does not prove a coefficient-ratio envelope because the
anchor ratio changes under the four summands.

## 3. Exact two-block mixture lemma

Split the recurrence into the `v`-excluded and `v`-included blocks

```text
(I0,C0) = ((1+x)^t I_G, (1+x)^t C_G),
(I1,C1) = (x I_(G-w),
           x C_(G-w)+I_(G-N[w])+t I_(G-w)).
```

Let `Dq=I'q`.  Fix anchor coefficient index `2` (rank three), and write

```text
dq=Dq_2, cq=Cq_2,
Dq=Dq_j, Cq=Cq_j,
Mq=cq*Dq-dq*Cq.
```

The full rank-`j+1` envelope margin `M` satisfies the exact identity

```text
d0*d1*M
 = (d0+d1)(d1*M0+d0*M1)
   +(c1*d0-c0*d1)(d1*D0-d0*D1).
```

Consequently the extension is safe at this rank if both block margins are
nonnegative and their self-slack pays any adverse change in the block
weights.  The stronger sufficient payment observed in every exact test is

```text
(d0+d1)*d0*M1
 >= (c1*d0-c0*d1)*(d0*D1-d1*D0)_+,
```

together with `c1/d1>=c0/d0`.  This is presently a proof obligation, not a
proved universal inequality.

## 4. Fail-closed guards

Two simpler anchor comparisons are false.  With base graph6 `FqD?G`:

```text
w=1, t=5: q3(T)=26/59 < q3(G)=5/11;
w=0, t=4: q3(T)=62/129 < q3(G-w)=1/2.
```

The corrected isolate-adjusted comparison

```text
q3(T) >= q3(G disjoint-union t isolated vertices)
```

survived the exact diagnostic, but is not yet proved.

The uniform subdivided star `S_18` remains a mandatory guard: its ratios
increase from rank 15 to 16 and from 16 to 17, even though every supported
ratio remains below `q3=80/131`.  Therefore no adjacent-rank monotonicity is
used here.

## 5. Exact finite evidence and scope

The independent diagnostic rebuilt the two recurrences literally for all
unlabelled base trees of orders 2 through 10, every marked vertex, and
`1<=t<=5`: 9,040 recurrence cells and 53,112 higher-rank envelope checks.
It found no `q_r>q3` failure.  It also found no failure of the two block
envelopes or of the included-block payment displayed above.

Separately, the stronger candidate `q_r<=q4` for `r>=5` passed all 172,496
unlabelled trees through order 18 in 1,204,792 exact rank checks.  This is
finite evidence only.

None of these finite passes proves the terminal-extension preservation
conditions, the all-tree `q3` envelope, the averaged surplus theorem, or
Erdos Problem 993.
