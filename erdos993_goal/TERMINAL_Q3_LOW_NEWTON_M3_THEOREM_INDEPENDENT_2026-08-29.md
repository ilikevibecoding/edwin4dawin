# Terminal q3 payment: exact all-order Newton coefficient m=3

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M3_AUDIT`

## Claim

For every supported terminal cell in the tree-base reduction, the coefficient
of `binom(t-1,3)` in the normalized untruncated terminal included-payment
margin is nonnegative.

This note proves only Newton degree `m=3`. It does not prove degrees `m=0,1,2`,
the complete terminal payment, the final unimodality bridge, or Erdos Problem
993.

## Notation and exact split

Let `F=G-w`, let `N=|F|`, and let the supported target rank be `j>=3`. Put

```text
a=f_2(F),        b=f_j(F),
c=c0+a*s,       e=e0+b*s,
P=[x^3](1+x)^(s+1) I_G(x),
R=the one-edge four-set coefficient after adjoining isolates,
U=[x^(j+1)](1+x)^(s+1) I_G(x),
A=P*c-a*R,
Q=(j+1)b(c+R)-3(P+a)e.
```

The normalized margin has the exact decomposition

```text
delta=(j+1)a*A*U+a*P*Q.                         (1)
```

All coefficients below are Newton coefficients in the basis `binom(s,m)`,
where `s=t-1`. Product weights are

```text
kappa(p,q;m)=m!/((m-p)!(m-q)!(p+q-m)!).
```

If `W=sum_v binom(deg_G(v),2)`, the tree identities give

```text
N-1 <= W <= binom(N,2),
p1=(N^2+N+2)/2,  p2=N+2,
p0=[P]_0=i3(G)+i2(G),
(N-1)(N^2-2N+6)/6 <= p0 <= N(N-1)(N+1)/6,
R1=N^2-2W >= N.
```

Also `a>=binom(N-1,2)`. At every supported rank the containment shadows are

```text
U0,U1 >= b,
U2 >= j*b/(N-j+1),
U3 >= j(j-1)*b/((N-j+1)(N-j+2)).                (2)
```

## The cone j>=4

The prescribed-root incidence bound gives `z_j<=j*b`; since `h_j<=b`,

```text
e0=b+z_j+h_j <= (j+2)b.                          (3)
```

Coefficientwise lower bounds for `Q` are

```text
B0=(j+1)ba-3e0(p0+a),
B1=(j+1)b(a+N)-3e0*p1-3b(p1+p0+a),
B2=(j+1)bN-3e0*p2-6b(p1+p2),
B3=-3(e0+3b(p2+1)).
```

Expanding `[P*B]_3`, applying (3), and then using the correct monotonicity
directions (`a` has positive coefficient and `p0` has negative coefficient)
gives

```text
[P*Q]_3 >= -(b/2) Q3,
Q3=15N^4+14N^3j+169N^3+89N^2j+689N^2
   +229Nj+1469N+316j+1948.                       (4)
```

The positive anchor coefficients satisfy

```text
A1/a >= (N-1)(N^2-2N+6)/6 + N+2,
A2/a >= N^2+3N+8,
A3/a >= 3N+10.                                   (5)
```

Retaining the nine nonzero `m=3` kernel pairs

```text
(A1,U2):3, (A1,U3):3,
(A2,U1):3, (A2,U2):6, (A2,U3):3,
(A3,U0):1, (A3,U1):3, (A3,U2):3, (A3,U3):1
```

and applying (2) defines a rational lower bound `E` with
`[A*U]_3>=a*b*E`. By (1) and (4), it suffices that

```text
2(j+1) binom(N-1,2) E - Q3 >= 0.                 (6)
```

Set `j=4+k`, `N=j+r`, with integers `k,r>=0`. The denominator in (6) is
`2(r+1)(r+2)`. Its numerator is

```text
k^8+6k^7r+34k^7+15k^6r^2+185k^6r+548k^6
+20k^5r^3+415k^5r^2+2637k^5r+5388k^5
+15k^4r^4+490k^4r^3+5072k^4r^2+22001k^4r+34285k^4
+6k^3r^5+320k^3r^4+4894k^3r^3+33599k^3r^2
+111035k^3r+139102k^3+k^2r^6+109k^2r^5+2400k^2r^4
+23037k^2r^3+117751k^2r^2+316968k^2r+334162k^2
+15kr^6+509kr^5+6341kr^4+42251kr^3+172000kr^2
+409524kr+393128k+20r^6+290r^5+1250r^4+710r^3
+3326r^2+64028r+108432.
```

All 42 coefficients are positive (the minimum is 1), proving the entire
`j>=4`, `N>=j` cone.

## The boundary j=3

Here the preceding uncorrelated bound is too weak. Use the exact deletion
identities

```text
c0=a+z2+h2,       e0=b+z3+h3,
x=(z2+h2)/a >= 0.
```

The separately proved all-forest theorem `q3(F)<=q2(F)` gives

```text
z3/b <= 3z2/(2a),
```

and the all-rank rooted reserve gives

```text
h3/b <= (8h2+2a-z2)/(6a).
```

Consequently

```text
e0/b <= 1+3z2/(2a)+(8h2+2a-z2)/(6a)
      = 4(1+x)/3.                                 (7)
```

The forest comparison in (7) is not inferred from the finite atlas: it is
pinned to a symbolic all-forest producer and a separate exact auditor that
rebuilds the component convolution and cap argument.

With (7), the remainder and anchor bounds become

```text
[P*Q]_3 >= -(b/6) Qcorr,
Qcorr=45N^4+80N^3x+413N^3+432N^2x+1647N^2
     +1072Nx+3619N+1320x+4992,

A1/a >= p0_lower+N+2+x*p1,
A2/a >= N^2+3N+8+x(N+2),
A3/a >= 3N+10+x.
```

Using the same nine kernels and shadows in (1) yields

```text
delta_3/(ab) >=
(9N^4+10N^3x-89N^3-96N^2x-393N^2-658Nx
 -2359N-1008x-3708)/6.                            (8)
```

For `N=15+q`, `q>=0`, the numerator in (8) is exactly

```text
9q^4+10q^3x+451q^3+354q^2x+7752q^2
+3212qx+47276q+1272x+27732,
```

whose nine coefficients are positive. This proves `j=3` for `N>=15`.

For `N<=14` (equivalently `|G|<=15`), the pinned exhaustive exact census of
all 13,188 unlabeled trees, every marked root, and every supported rank has
zero negative `m=3` coefficients. This is a finite exact certificate, not an
extrapolation. The larger star/path/random adversarial searches are useful
evidence but are not used in the all-order proof.

At a supported `j>=3` cell, `b>0` and containment of an independent j-set
implies `a>0`, so the normalizations in (7) and (8) are legitimate. Unsupported
ranks are outside the terminal-cell claim.

## Replay and pins

Run:

```powershell
python .\audit_terminal_q3_low_newton_m3_all_order_agent.py
```

Expected status:

```text
PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M3_AUDIT
```

Primary artifacts:

```text
audit_terminal_q3_low_newton_m3_all_order_agent.py
SHA256 D08DC624367D1605157C67A3AB408837F5407346EB94433807D4F9EA13EBE843

terminal_q3_low_newton_m3_all_order_independent_audit_20260829.json
SHA256 F1BB22801458466AB2AAE90540C4B4F2951462E105C0F61C6D8347BF61107667

prove_all_forest_q3_q2_component_lift_root.py
SHA256 6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00

all_forest_q3_q2_component_lift_exact_root_20260829.json
SHA256 71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442

audit_all_forest_q3_q2_component_lift_independent_agent.py
SHA256 63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815

all_forest_q3_q2_component_lift_independent_audit_20260829.json
SHA256 7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D
```

The verifier also pins the rooted-reserve, tail, finite-order, and independent
low-Newton census artifacts by SHA256 and fails closed on any mismatch.
