# Terminal q3 payment: exact Newton-degree-6 theorem

Date: 2026-08-29

Status: exact all-order proof of the `m=6` Newton coefficient inside the
pinned terminal-payment framework.  This supersedes the earlier conditional
draft: the needed bound `q_j(F)<=1` is unconditional for forests.

## The unconditional one-edge bound

Let `f_j` count independent `j`-sets in a forest `F`, and let `z_j` count
`(j+1)`-sets inducing exactly one edge.  Delete either endpoint of that edge.
Every one-edge set gives exactly two pairs `(S,x)` in which `S` is an
independent `j`-set and `x` has exactly one neighbor in `S`.  Conversely each
such pair reconstructs its one-edge set.  Thus their number is `2z_j`.

Let `D_j` be the selected-degree sum over all independent `j`-sets.  The
above pairs use a subset of these selected incidences, so `2z_j<=D_j`.  Root
each component once.  The pinned prescribed-root incidence injection gives
`D_j<=2U_j`, where `U_j` counts selected nonroots with multiplicity.  Since
`U_j<=j f_j`,

```text
2z_j <= D_j <= 2U_j <= 2j f_j,
z_j <= j f_j.                                         (1)
```

This is exactly `q_j(F)<=1`; no induction hypothesis is needed.

## Newton coefficient 6

Put `N=|F|`, `a=f_2(F)`, `b=f_j(F)`.  For

```text
delta=(j+1)a*A*U+L,     L=a*P*Q,
Q=(j+1)b(c+R)-3(P+a)e,
```

exact Newton multiplication gives

```text
L_6=-60a[e_0+(6P_2+15)b]
   =-60a[e_0+3b(2N+9)],                              (2)
```

because `P_2=i_1(G)+1=N+2`.  Also `A_4=4a`, and the kernels
`kappa(4,2;6)=15`, `kappa(4,3;6)=60` yield

```text
[A*U]_6 >= 60a(U_2+4U_3).                            (3)
```

By (1), `z_j<=jb`; because `H` is induced in `F`, `h_j<=b`.  Hence
`e_0=z_j+h_j+b<=(j+2)b`.  Standard containment shadows give

```text
U_2 >= j b/(N-j+1),
U_3 >= binom(j,2)b/binom(N-j+2,2),
a >= binom(N-1,2).                                   (4)
```

Writing `j=3+k`, `N=j+r`, the sufficient gap

```text
(j+1)a(U_2+4U_3)-b(6N+j+29)
```

has positive denominator `2(r+1)(r+2)` and numerator

```text
4k^5 + 9k^4r + 50k^4 + 6k^3r^2 + 98k^3r + 240k^3
+ k^2r^3 + 55k^2r^2 + 385k^2r + 550k^2
+ 7kr^3 + 149kr^2 + 602kr + 568k
+ 20r^2 + 60r + 40.
```

Every coefficient is positive.  Equations (2)--(4) prove `delta_6>=0` for
every supported `N>=j>=3`.

The replay script also independently enumerates every forest in the graph
atlas through seven vertices and checks literally that endpoint deletion
gives exactly `2z_j` pairs and that `2z_j<=D_j<=2U_j<=2j f_j`.

