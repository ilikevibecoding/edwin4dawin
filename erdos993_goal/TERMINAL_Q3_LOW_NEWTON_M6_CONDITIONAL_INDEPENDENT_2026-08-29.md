# Terminal q3 payment: conditional Newton-degree-6 lemma

Date: 2026-08-29

Status: exact all-order lemma conditional on the intended strong-induction
input `q_j(F)<=1` for the smaller root-deletion forest.  The condition is not
silently promoted to a theorem here.

Use the Newton basis in `s=t-1`, and put `N=|F|`, `a=f_2(F)`, `b=f_j(F)`.
For the split

```text
delta=(j+1)a*A*U+L,      L=a*P*Q,
Q=(j+1)b(c+R)-3(P+a)e,
```

direct Newton multiplication gives

```text
L_6=-60a[e_0+(6P_2+15)b]
   =-60a[e_0+3b(2N+9)],                         (1)
```

because `P_2=i_1(G)+1=N+2`.  Also `A_4=4a`, and the two product kernels
`kappa(4,2;6)=15`, `kappa(4,3;6)=60` give

```text
[A*U]_6 >= 60a(U_2+4U_3).                       (2)
```

Under `q_j(F)<=1`, `z_j<=jb`.  Since `H` is induced in `F`, `h_j<=b`, so

```text
e_0=z_j+h_j+b <= (j+2)b.                        (3)
```

The ordinary containment shadows and the forest edge count give

```text
U_2 >= f_(j-1) >= j b/(N-j+1),
U_3 >= f_(j-2) >= binom(j,2)b/binom(N-j+2,2),
a >= binom(N-1,2).                              (4)
```

Substitute `j=3+k`, `N=j+r`.  After multiplying the desired inequality

```text
(j+1)a(U_2+4U_3) >= b(6N+j+29)                 (5)
```

by the positive denominator `2(r+1)(r+2)`, the remaining numerator is

```text
4k^5 + 9k^4r + 50k^4 + 6k^3r^2 + 98k^3r + 240k^3
+ k^2r^3 + 55k^2r^2 + 385k^2r + 550k^2
+ 7kr^3 + 149kr^2 + 602kr + 568k
+ 20r^2 + 60r + 40.
```

Every coefficient is positive.  Equations (1)--(5) prove `delta_6>=0`.

The condition `q_j(F)<=1` is exactly the smaller-object input needed by the
strong-induction program (`q_j(F)<=q_3(F)<=q_2(F)<=1`).  Without assembling
that induction, this file is only a conditional lemma.

