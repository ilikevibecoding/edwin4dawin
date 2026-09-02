# Uniform `Q_k+V_k` decomposition for the pendant cascade

## Status

This note is an exact all-rank algebraic reduction.  It is **not** a proof of
the Alavi--Malde--Schwenk--Erdős conjecture: the two sign statements exposed
below remain to be proved uniformly.

## Identity

For a pendant edge `lp`, write

```text
P=I(G)=(1+x)B+xC,
B=I(G-{l,p}).
```

For a coefficient row `r`, use

```text
H_k(r)=k^2(r_k^2-r_(k-1)r_(k+1))/r_(k-1)
       +k(r_k-r_(k+1)).
```

Define

```text
Q_k(P)=2k p_k^2-p_(k-1)p_k-2(k+1)p_(k-1)p_(k+1),

V_k(B)=(k+2)b_(k-2)b_(k-1)
       +k(2k+1)b_(k-2)b_k
       -2(k-1)^2 b_(k-1)^2.
```

Then, for every `k>=2` for which the displayed denominators are nonzero,

```text
H_k(P)-H_(k-1)(B)
 = k Q_k(P)/(2p_(k-1))
   +3k c_(k-1)/2
   +V_k(B)/(2b_(k-2)).                         (1)
```

Indeed,

```text
H_k(P)=kQ_k(P)/(2p_(k-1))+3kp_k/2,
```

and the pendant identity gives `p_k=b_k+b_(k-1)+c_(k-1)`.
Subtracting `H_(k-1)(B)` yields (1) after one collection of terms.

In normalized extension means

```text
mu_j=(j+1)b_(j+1)/b_j,
```

the residual sign is equivalently

```text
V_k(B)/(b_(k-2)b_(k-1))
 =(k+2)+(2k+1)mu_(k-1)-2(k-1)mu_(k-2).        (2)
```

At `k=5,6,7`, (1) specializes exactly to the three separately proved
decompositions in the master route.  Thus the repeated low-rank algebra is
one uniform identity: the future all-rank work is to control the forest
reserve `Q_k` and the affine extension-mean residual `V_k`, retaining their
positive coupling when either standalone sign fails.

## A sharper uniform high-extension theorem for `V_k`

The proved two-extension lemma for forests says that, for
`u=mu_(k-2)>=2`,

```text
mu_(k-1) >= u-3+2/u.
```

Substitution in (2) gives

```text
V_k/(b_(k-2)b_(k-1))
 >= 3u-(5k+1)+(4k+2)/u.                       (3)
```

Multiplication by the positive number `u` shows that the sign of the right
side is the sign of

```text
P_k(u)=3u^2-(5k+1)u+4k+2.
```

The vertex of this upward quadratic is `(5k+1)/6`.  The simpler affine
endpoint

```text
u_0=(5k-1)/3
```

lies strictly to its right for every `k>=2`, and exact substitution gives

```text
P_k(u_0)=2(k+4)/3>0.
```

Consequently `P_k` is positive for every `u>=u_0`, giving the strengthened
all-rank subtheorem

```text
mu_(k-2)>=(5k-1)/3  ==>  V_k(B)>0              (k>=2).             (4)
```

The exact larger root is

```text
rho_k=((5k+1)+sqrt(25k^2-38k-23))/6,
```

so `u>=rho_k` is the sharp threshold supplied by the two-extension transfer;
the rational bound (4) avoids radicals and improves the earlier
`(5k+1)/3` bound by exactly `2/3`.  Thus the standalone residual can fail
only in the smaller bounded low-extension regime.  The remaining uniform
task is to control that regime, or retain the positive `Q_k`/deletion
coupling in (1).

## Replay

Run

```powershell
python .\verify_general_pgc_qv_decomposition.py
```

The replay symbolically expands both sides of (1), proves (2), and checks the
rank-five, rank-six, and rank-seven specializations.  Its terminal status is

```text
PASS_EXACT_GENERAL_PGC_QV_DECOMPOSITION
```
