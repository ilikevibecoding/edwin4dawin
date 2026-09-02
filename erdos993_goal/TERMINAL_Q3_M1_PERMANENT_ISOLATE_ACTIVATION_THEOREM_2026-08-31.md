# Terminal `q3` Newton `m=1`: permanent-isolate activation

Date: 2026-08-31

Status: **proved for every forest base whose marked root is nonisolated,
conditional only where the pinned no-isolate theorem invokes the
strictly-smaller-forest `q` envelope.**

## Statement

Let `G` be a finite forest with marked nonisolated vertex `w`.  Permanent
isolated components may occur elsewhere in `G`.  For every supported terminal
target `j>=3`, the Newton coefficient `d1(G,w,j)` is nonnegative.

The only point not supplied directly by the no-isolate theorem and the shift
identity is support activation: after all permanent isolates are removed, the
same target `j` can be unsupported.  The lemma below closes exactly that seam.

## Unsupported-target factorization

Put `F=G-w`, `H=G-N[w]`, `a=i2(F)`, and `b=i_j(F)`.  If `b=0`, downward
closure gives `i_j(H)=0`.  Also `s_(j+1)(F)=0`: deleting one endpoint of the
unique edge in an exactly-one-edge `(j+1)`-set would otherwise leave an
independent `j`-set.

In the canonical terminal payment this sets the target included numerator
and denominator to zero.  The exact payment therefore factors as

```text
delta(t)=(j+1)*a*A(t)*U(t),
A(t)=P(t)c(t)-aR(t),
U(t)=i_(j+1)(G disjoint_union t K1).
```

Here `A(t)` is the terminal rank-three anchor cross.

## Coefficientwise anchor

Write

```text
P(t)=g3+t*g2+C(t,2)g1+C(t,3),
R(t)=r4+t*r3+C(t,2)r2,
c(t)=C+t*a,
C=s3(F)+i2(H)>=0.
```

In the Newton basis at `t=1+s`, exact forward differences give

```text
[C(s,0)] A = C(g2+g3)+a(g2+g3-r3-r4),
[C(s,1)] A = C(g1+g2)+a(2g1+3g2+g3-r2-r3),
[C(s,2)] A = C(g1+1)+a(5g1+2g2-r2+3),
[C(s,3)] A = C+a(3g1+7),
[C(s,4)] A = 4a.
```

The constant coefficient is nonnegative by the pinned all-forest anchor
theorem.  For the two nontrivial tail factors, let `n=|G|`, let `m` be its
number of edges, and put `W=sum_v C(deg(v),2)`.  Forest counting gives

```text
g1=n,
g2=C(n,2)-m,
g3=C(n,3)-m(n-2)+W,
r2=m,
r3=m(n-2)-2W.
```

Hence

```text
E1=2g1+3g2+g3-r2-r3
  =3W-2mn+n^3/6+n^2+5n/6,
E2=5g1+2g2-r2+3
  =n^2+4n+3-3m.
```

Every forest satisfies `m<=n-1` and `W>=max(0,2m-n)`.  The latter follows
from `C(d,2)>=d-1` on nonisolated vertices.  If `m<=n/2`,

```text
E1 >= n(n^2+5)/6.
```

If `m>=n/2` and `n>=3`, the lower is minimized at `m=n-1`; after `n=3+q`
it is

```text
q^3/6+q^2/2+13q/3+7 > 0.
```

The cases `n<3` are immediate, and

```text
E2 >= n^2+n+6 > 0.
```

Thus every Newton coefficient of `A(1+s)` is nonnegative.

The polynomial `U(1+s)` also has a nonnegative Newton row by Vandermonde.
Products preserve this property because

```text
C(s,p)C(s,q)
=sum_(r=max(p,q))^(p+q)
 r!/((r-p)!(r-q)!(p+q-r)!) C(s,r),
```

and every displayed multiplier is a positive integer.  Consequently every
Newton coefficient of an unsupported-target `delta` is nonnegative, not only
`m=1`.

## Restoring permanent isolates

For one permanent isolate the exact translation identity is

```text
d1(G+K1)=d1(G)+d2(G).
```

Start from the forest obtained by deleting all permanent isolates.  If the
target is supported, use the pinned all-target no-isolate `m=1` theorem; if it
is unsupported, use the factorization above.  Restore isolates one at a time.
At every unsupported stage both `d1` and `d2` are coefficientwise
nonnegative by the lemma.  Once support appears, the all-forest `m=2` theorem
supplies `d2>=0`.  Induction proves the statement.

## Replay

```powershell
python .\prove_terminal_q3_m1_permanent_isolate_activation_root.py
```

Required marker:

```text
PASS_EXACT_TERMINAL_Q3_M1_PERMANENT_ISOLATE_ACTIVATION_NONISOLATED_ROOT
```

Frozen source SHA-256:

```text
44C59D853027EC5F7D9CFF677DAD921C76FC3D64B04B47783B5510CB0450EE8F
```

Frozen report SHA-256:

```text
C01647EB7D4F5F3EBF8998517C72FD32AFFADBF0173FA534C07BA23B4A65CE82
```

## Scope guard

This theorem does not cover a marked isolated root, which is the star-component
terminal decomposition.  It also does not prove Newton `m=0`, the complete
terminal payment, the global `q` envelope, unimodality, or Erdős Problem #993.
