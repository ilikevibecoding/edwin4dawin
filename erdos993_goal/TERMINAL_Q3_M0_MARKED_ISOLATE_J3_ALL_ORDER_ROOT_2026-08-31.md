# Terminal `q3` Newton `m=0`: marked-isolate `j=3` theorem

Date: 2026-08-31

## Exact scope

This note proves the terminal-`q3` Newton coefficient of degree `m=0` at
target `j=3` when the marked root is isolated, the terminal leaf is mandatory,
and the remaining forest has no isolated vertices.  The proof is all-order.

Let the remainder have order `N`, `h` components, `m=N-h` edges, and put

```text
Q=N-2h,
W=sum_v binom(deg(v),2)=Q+B,
p=max_v(deg(v)-1),
tau=# connected induced four-vertex subtrees.
```

The exact low rows are

```text
f2=C(N,2)-m,
z3=m(N-2)-2W,
f3=C(N,3)-m(N-2)+W,
z4=m C(N-2,2)-2C(m,2)-2W(N-4)+3tau,
f4=C(N,4)-m C(N-2,2)+C(m,2)+W(N-4)-tau.
```

For the isolated marked root and mandatory terminal leaf, define

```text
P=f3+2f2+N,       R=z4+2z3+m,
c=z3+2f2,         A=Pc-f2R,
U=f4+2f3+f2,      e=z4+2f3.
```

The retained-row terminal coefficient at `j=3` is exactly

```text
Delta=f2{4AU+P[4f3(c+R)-3(P+f2)e]}.                 (1)
```

## Correlated subtree cap

The companion all-order weighted-forest theorem proves

```text
tau <= (p+1)B/3+p(Q-p).                             (2)
```

This cap is exact on both paths and stars.  It retains the branching maximum
`p`; the earlier cap using only `(Q,W)` was much too loose on linear forests.

Substitute `N=Q+2+2r`, where `r=h-1`.  For `Q>0`, write

```text
p=1+a,           Q=p+u,
B=C(p,2)+y(p-1)u/2,        0<=y<=1.                 (3)
```

The interval in (3) follows from

```text
C(p,2)<=B<=sum_v (p-1)(deg(v)-1)/2=(p-1)Q/2.
```

## Exact sign certificate

As a polynomial in `tau`, (1) is convex:

```text
d^2 Delta/d tau^2=6(N^2-2N-Q)^2>=0.                (4)
```

At the cap (2), `-d Delta/d tau` is quadratic in `y`.  Conversion to the
degree-two Bernstein basis gives three coefficient polynomials, each with
165 nonnegative monomial coefficients in `(a,u,r)`.  Therefore the derivative
is nonpositive at the cap.  By (4), it is nonpositive throughout the feasible
interval, so `Delta` is minimized at the cap.

At the cap, `Delta` is cubic in `y`.  Bernstein coefficients 1, 2, and 3
have respectively 349 nonnegative monomial coefficients.  Coefficient 0
factors as a positive quadratic times `G/144`.  The polynomial `G` has
nonnegative coefficients after each of the exhaustive integer splits

```text
a=0,  a=1,  a=2,  a=3+s (s>=0).
```

Thus `Delta>=0` for every `Q>0`.  When `Q=0`, the remainder is a matching and
direct substitution gives

```text
Delta=16 r^2(r+1)^4
      (2r^4+16r^3+67r^2+98r+51)/9 >=0.
```

This exhausts the stated scope.

## Replay

```powershell
python .\prove_terminal_q3_m0_marked_isolate_j3_all_order_root.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT
```

The verifier rebuilds the low-row formulas, convexity identity, both
Bernstein conversions, every face split, the complete coefficient-stream
hash, and the pinned structural dependencies.

Frozen producer evidence:

```text
source SHA-256  8D39EE9ECDD3075053833C14B4A4ACCEADFB7174AC92C64D0F375826CCD6B558
report SHA-256  0E9D2C9F7338A87645D4EF3BE00008F6370C8B77084A823D451F84C0F08EDCBD
coefficient stream BBE7D62A4ED811730347DB98DC97A75AF10E579297C7F7C3489F28274CFD703C
```

An independent finite auditor directly counted the zero-edge and one-edge
subsets of all 1,600 no-isolate unlabeled forests through order 12.  Its
1,596 supported `j=3` rows had zero negative coefficients and minimum exact
margin `1836`; the sharp subtree cap also had zero violations.  The audit
replayed byte-identically:

```text
audit source SHA-256 080287409B50AA5A8270BBAA05DCF6905B2D2E902C82B76BCDEF7F292252420D
audit report SHA-256 53CC4CCD34CCF0A33BEA72FF67CE108C1A9F9257B2B8380A7F052100306D4130
PASS_INDEPENDENT_FINITE_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT
```

## Boundary

This closes the marked-isolate `j=3` lane only.  Targets `j>=4`, nonisolated
marked roots, the complete terminal payment, unimodality, and Erdős Problem
#993 remain separate.
