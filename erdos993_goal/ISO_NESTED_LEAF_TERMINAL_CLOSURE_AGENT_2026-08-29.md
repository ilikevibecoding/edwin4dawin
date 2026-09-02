# Conditional ISO nested-leaf terminal closure

Date: 2026-08-29

Status: **exact dependency and terminal-closure theorem.**  The terminal
bases are proved.  The arbitrary-forest third-leaf recurrence is still open,
so this note is not an all-forest ISO theorem and not a solution of Erdős
Problem 993.

## Quantities

For an independence-polynomial coefficient row \(p\), put

\[
Q_r(p)=r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}.
\]

For a leaf \(\ell\sim v\) of a forest \(F\), the exact leaf decomposition is

\[
Q_r(F)=Q_r(F-\ell)+Q_{r-1}(F-\{\ell,v\})+D_r(F,\ell).
\]

For a second nonsibling leaf \(w\sim u\), the exact difference of the two
\(D\)-remainders is the four-minor quantity \(N_r(B;u,v)\), where
\(B=F-\{\ell,w\}\).  The complete formulas and their symbolic derivations
are pinned in `verify_iso_leaf_nested_path_bases_root.py`.

## Proved terminal bases

Three independent exact terminal theorems are now available.

1. **First-level rooted star plus isolates.**  If
   \(F=K_{1,m}\sqcup tK_1\), with \(\ell\) a star leaf, then
   \(D_r(F,\ell)\ge0\) for all \(m\ge1,t\ge0,r\ge2\).

   - producer SHA-256:
     `9532842E08F1B2B68F6D6E48CEE31B7C519FB3A0C3B0E633A58CF6DFD7414047`
   - report SHA-256:
     `9764F21B884B9BF03C551CFF945B3BE7754A694C3A58698F3CFDB10AD711D420`
   - independent audit SHA-256:
     `B6ECDD69374E5AE759D8A7170943B60DDCB9AF6537178B34CA7A5BE1A8179416`
   - independent audit report SHA-256:
     `25D1EA167558B63C8403963571E4AF36253D240A3C9617BABF52943216675FB1`

2. **Connected bare two-terminal path.**  For a path \(P_n\), with its two
   endpoints marked, \(N_r(P_n;u,v)\ge0\) for every rank.  Boundary orders
   have explicit positive polynomials, and the interior is a positive
   factorial factor times a 26-term positive polynomial.

   - producer SHA-256:
     `EB6CBA9DFFE324D8FF19368E44B184B65D8BEDAB0D68F8043276D7CBF8200E6F`
   - report SHA-256:
     `F4D6D1181EC69333C3E2B12E24FFDB839DDF1A79561C2B439D45F95FC98FB5CD`

3. **Disconnected two rooted stars.**  If
   \(B=K_{1,a}\sqcup K_{1,b}\), with the star centres marked, then
   \(N_r(B;u,v)\ge0\) for all \(a,b\ge0,r\ge2\).  The proof is an exact
   nonnegative bivariate Newton expansion.

   - producer SHA-256:
     `FDE0BEF62F49D31AC5183FE5BB10734A3793F9FD64AEDF929AE2275275F9FD92`
   - report SHA-256:
     `B6B862674C9967411C62A965032674A6FC9410968C7C5D59851AA640088AF9B3`
   - independent edge-list audit SHA-256:
     `D59814D0DC6CE54E3D792D38A7BB11350622F8D2AFED5DFCAD61FF7FC68F1BD7`
   - independent audit report SHA-256:
     `AF3174CCAD287E5CA39D1A95FE911F1D50FEFB4D1CF606AC3B2203FD0D44A385`

## Exact remaining recurrence

Let \(z\) be an unmarked leaf of a marked forest \((B;u,v)\), with support
\(s\).  The required third-leaf statements are:

\[
N_r(B;u,v)-N_r(B-z;u,v)
\ge N_{r-1}(B-\{z,s\};u,v)
\tag{ordinary}
\]

when \(s\notin\{u,v\}\), together with the corresponding isolate recurrence,
and

\[
N_r(B;u,v)\ge N_r(B-z;u,v)
\tag{marked-support collision}
\]

when \(s\in\{u,v\}\).  These are exact forest-specific inequalities, not
formal consequences of downset or general-graph log concavity.

## Conditional induction

Assume all three third-leaf modes above.

- Repeatedly remove every unmarked leaf whose support is not a mark, charging
  the smaller two-vertex minor through the ordinary recurrence.
- Remove isolated unmarked vertices through the isolate recurrence.
- Remove leaves supported at a mark through the collision recurrence.

Every strict deletion lowers the forest order, so strong induction applies.
The terminal marked component is a bare path between \(u\) and \(v\) when
the marks are connected.  When they are disconnected, the terminal is the
two isolated marks, which is the \(a=b=0\) case of the proved two-rooted-star
theorem.  Hence the three recurrence modes plus the proved bases imply

\[
N_r(B;u,v)\ge0
\]

for every marked forest and every rank.

Returning one level, repeatedly remove nonsibling leaves relative to the
fixed leaf \(\ell\).  The exact nested identity and the just-obtained
all-forest \(N\)-inequality preserve \(D_r\ge0\).  The remaining graph is a
rooted star plus isolated components, covered by terminal theorem 1.  Thus
the third-leaf recurrences would imply the all-forest leaf remainder
\(D_r(F,\ell)\ge0\), and then double induction in the exact leaf identity
would prove

\[
Q_r(I(F))\ge0
\]

for every forest and every rank.

## Collision-free alternative and precise gap

If one proves only the ordinary and isolate recurrences, but not the
marked-support collision recurrence, terminal marked components retain all
leaves adjacent to \(u\) and \(v\).  The disconnected terminal is exactly
the proved two-rooted-star family.  The connected terminal, however, is a
two-ended broom: a \(u\)-to-\(v\) path with arbitrary leaf bundles at its
two marked endpoints.  Only the bare-path subfamily is currently proved.
Therefore the collision-free route still needs an all-order two-ended-broom
base; the disjoint-star theorem alone does not close it.

## What is and is not closed

The terminal classification and every terminal base cited above are exact.
The only remaining step in this nested-leaf route is the arbitrary-forest
third-leaf recurrence (or, equivalently for the collision-free variant, the
ordinary/isolate recurrences plus the connected two-ended-broom theorem).
Finite zero-negative scans are supporting evidence only and are not promoted
to a proof here.
