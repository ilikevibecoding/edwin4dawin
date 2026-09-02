# Exact failure of the decoupled middle-band box

Date: 2026-08-16

Status: **exact failure of a proposed continuous enclosure; not a tree
counterexample.**

For `Delta^0 R_1`, take the order-19, `m=|A-N[q]|=17` weak box using only:

```text
s >= 1-C(17,4)/C(15,5),
d >= 1-z*(17-4)*(1-s)/5,
q6 >= (2+z)/14,
6/14 <= z <= 1/mu_19.
```

At the three lower endpoints, map the displayed `z` interval affinely to
`0<=Z<=1`. Exact denominator clearing gives

```text
-9*(
  499346258628447448*Z^3
 +1136588247530492125*Z^2
 +110440949701165000*Z
 +1791847254421875
)/205401109375.
```

This is strictly negative on the entire unit interval. Therefore those
separate `m,s,z,d,q6` bounds cannot prove the finite bridge, even though all
6,041,145 actual rooted cores at order 19 pass. The failure pinpoints the
missing ingredient: a joint constraint coupling the core polynomial with
the root-deleted forests `H=A-q` and `J=A-N[q]`. It must not be reported as
a negative `R_t` tree or as evidence against the conjecture.
