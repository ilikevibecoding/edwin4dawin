# Erdős Problem #993 — Literature and Status Audit (as of 2026-09-02)

Problem (Alavi–Malde–Schwenk–Erdős 1987, catalogued as Erdős Problem #993): for every tree (equivalently every
forest) T, the independent-set sequence i_0(T), i_1(T), ..., i_alpha(T) (i_k = number of independent vertex sets of
size k, alpha = independence number) is unimodal.

Scope of this document: literature and status audit only. No computations were run, no code was written or
executed, and no git commands were issued. Every item below was either retrieved directly (web fetch of the
page / arXiv metadata API / OEIS b-file / GitHub API), or seen in search-engine snippets of the cited page; the
retrieval mode is stated per item. Items that could not be retrieved or confirmed are marked UNVERIFIED.

Tags used: PROOF-CLAIM / COUNTEREXAMPLE-CLAIM / PARTIAL / COMPUTATIONAL / BACKGROUND.
Note: every COUNTEREXAMPLE-CLAIM below is a counterexample to the *log-concavity strengthening*, not to
unimodality. No counterexample to unimodality of any tree or forest was found in any source.

---

## 1. Status of Erdős Problem #993 according to the primary catalogue

### 1.1 https://www.erdosproblems.com/993

Direct fetch (two attempts) returned only the Cloudflare JavaScript challenge page ("Performing security
verification ... Enable JavaScript and cookies to continue"), so the page text below comes from search-engine
snippets of the page (retrieved 2026-09-02), not from a direct fetch.

What the snippets show (page state "last edited 01 February 2026"):

- Statement: "The independent set sequence of any tree or forest is unimodal." Attributed to Alavi, Malde,
  Schwenk and Erdős [AMSE87], "who showed that this is false for general graphs G (in fact every possible pattern
  of inequalities is achieved by some graph)". The page also notes that the matching (independent edge set)
  sequence is unimodal for every graph by Schwenk [Sc81], and that [AMSE87] ask whether every unimodal pattern is
  achieved by some graph.
- Status indicators visible in the snippet: "Comments (7)", "Proof claims (0)", "Proof expositions (0) ...
  No proof expositions yet.", "Formalised statement? No", "OEIS A000055, possible", "Currently working on:
  will0708". The page is listed among open problems (the site's "Random Solved / Random Open" navigation appears,
  but no "solved" marker or proof claim is shown for #993).
- Recommended citation shown by the site: T. F. Bloom, Erdős Problem #993, https://www.erdosproblems.com/993.
- Revision history page https://www.erdosproblems.com/history/993 (snippet) shows a 2025-10-20 revision of the
  attribution text; no change of status.

Tag: BACKGROUND (catalogue entry). Status per catalogue: OPEN, zero proof claims.

### 1.2 https://www.erdosproblems.com/forum/thread/993 (discussion thread)

Direct fetch also blocked by Cloudflare; content below is from search-engine snippets of the thread and of the user
page https://www.erdosproblems.com/forum/user/tylersatchelorden. Three substantive threads of comments were visible:

1. User "BrettRey" (Brett Reynolds). A Jan 7, 2026 comment: "I verified computationally that the independent set
   sequence is unimodal for every tree with n <= 29 vertices, extending Radcliffe's n <= 25 verification cited in
   Basit and Galvin [arXiv:2006.12562]." A follow-up comment gives public artifacts at
   https://github.com/BrettRey/erdos-problem-993 and records: n = 28: 2,023,443,032 trees, 0 unimodality failures;
   n = 29: 5,469,566,585 trees, 0 unimodality failures; a log-concavity/near-miss audit at n = 28: 19 log-concavity
   failures, all at k = 14, 0 non-unimodal trees, top near-miss ratio 0.8565665724120973 at k = 13; the analogous
   audit at n = 29 "not yet completed". It also announces a manuscript with a subdivision–contraction identity
   I(T_e; x) = I(T; x) + x I(T/e; x), a "Hub Exclusion + Transfer" reduction to the d_leaf <= 1 regime and a mean
   bound mu(T) < n/3 in that regime, explicitly "not claiming a full solution at this stage; one closure route
   remains conditional on a separate mode-mean inequality, which I have verified computationally through n <= 23",
   with an AI-assistance disclosure. Tag: COMPUTATIONAL / PARTIAL (not peer reviewed).
2. User "tylersatchelorden" (GitHub "Tyorden"; signs as Tyler Satchel Orden). Comment dated 02 Aug 2026:
   exhaustive check of all free trees on 30 vertices (14,830,871,802) and 31 vertices (40,330,829,030) with
   nauty/gentreeg plus an exact integer in/out subtree DP, zero unimodality failures, per-order counts matching
   OEIS A000055, and independent reproduction of BrettRey's n = 28, 29 counts. Comment dated 09 Aug 2026:
   extension to n = 32, all 109,972,410,221 free trees checked (16 res/mod parts, ~27 hours), zero unimodality
   failures. Repository: https://github.com/Tyorden/erdos-993-trees-n31 (see 2.22). Disclosure in the comment:
   "pipeline written and run with Claude (Anthropic) assistance". Tag: COMPUTATIONAL (not peer reviewed).
3. An unattributed comment (author not visible in the snippet) on forests: since a forest's independence
   polynomial is the product of its components' polynomials and products of log-concave sequences are log-concave
   (Hoggar 1974), a forest can be non-unimodal only if some tree component is already non-log-concave; the
   commenter reports generating 4,445 non-log-concave "bush" trees (generalising T_{3,m,n}, T*_{3,m,n}) up to 60
   vertices and testing forests built from the 80 most extreme ones (pairs, triples, powers up to the 20th,
   products with paths P_1..P_16; the snippet cuts off at "253,695"). Author, exact counts and outcome: UNVERIFIED
   beyond the snippet; the visible text implies no non-unimodal forest was found. Tag: COMPUTATIONAL.

---

## 2. Sources (citation, URL, content, tag, retrieval mode)

### 2.1 Alavi, Malde, Schwenk, Erdős (1987) — original problem
Y. Alavi, P. J. Malde, A. J. Schwenk, P. Erdős, "The vertex independence sequence of a graph is not constrained",
Congressus Numerantium 58 (1987), 15–23. MathSciNet MR0944684 (89e:05181).
URL: https://mathscinet.ams.org/mathscinet/relay-station?mr=944684 (relay page retrieved via search; the paper
itself is not online). Content: for every permutation pi of {1,...,m} there is a graph G with alpha(G) = m whose
independent-set sequence is ordered according to pi (so the sequence is "not constrained" for general graphs);
the paper asks (Problem 3, per Li 2026, item 2.13) whether the independence polynomial of every tree/forest is
unimodal. Tag: BACKGROUND. Citation details verified via MathSciNet relay page and consistent reference lists in
Basit–Galvin 2021, Galvin 2025/26, Kadrawi–Levit 2023/25, Heilman 2020.

### 2.2 Levit & Mandrescu (2006) — the "last third" theorem
V. E. Levit, E. Mandrescu, "Partial unimodality for independence polynomials of König–Egerváry graphs",
Congressus Numerantium 179 (2006), 109–119. (Heilman 2020 cites it as [LM07]; all other sources say 2006.)
Primary text NOT retrievable online (Congressus Numerantium); statement taken verbatim from Basit–Galvin (2021,
Theorem 2) and Heilman (2020, Theorem 1.8), which agree:

  For a König–Egerváry graph G (a graph with |V| = alpha + mu, mu = matching number; all bipartite graphs, hence
  all trees and forests, are König–Egerváry),
      i_{ceil((2 alpha - 1)/3)} >= i_{ceil((2 alpha - 1)/3) + 1} >= ... >= i_{alpha - 1} >= i_alpha.

Basit–Galvin note the bound is tight: alpha vertex-disjoint edges have a sequence weakly decreasing from exactly
index ceil((2 alpha - 1)/3). Heilman: "the last third ... is unimodal", "Question 1.6 is 'one-third true'";
Levit–Mandrescu also asked whether all bipartite graphs have unimodal sequences, which is false.

IMPORTANT CORRECTION to the task prompt: the theorem is stated for König–Egerváry graphs, NOT for arbitrary
graphs. For arbitrary graphs the corresponding tail result is Basit–Galvin (2021) Theorem 3: for any graph on n
vertices with independence number alpha, (i_k) is weakly decreasing for k >= ceil(alpha(n-1)/(alpha+n)); with
alpha <= n/2 (which König–Egerváry graphs satisfy) this recovers the Levit–Mandrescu index.
Tag: PARTIAL (rigorous tail control for all trees). Statement verified via two independent secondary sources;
primary not retrieved.

Related: V. E. Levit, E. Mandrescu, "Very well-covered graphs with log-concave independence polynomials",
Carpathian J. Math. 20 (2004), 73–80 — the source of the (now refuted) conjecture that every forest has a
log-concave independence polynomial (per Kadrawi–Levit 2023 ref. [23] and Li 2026). Tag: BACKGROUND; citation seen
only in reference lists (UNVERIFIED directly).

### 2.3 Galvin (2011) — log-concavity strengthening suggested
D. Galvin, "Two problems on independent sets in graphs", Discrete Mathematics 311 (2011), 2105–2112;
arXiv:1206.3206. URL: https://arxiv.org/abs/1206.3206 (ar5iv rendering retrieved). Content: evidence for the
Levit–Mandrescu bipartite-unimodality conjecture via random equibipartite graphs; Kadrawi–Levit (2023) cite it
as the place where the tree/forest/bipartite conjecture was suggested to be strengthened to log-concavity.
Tag: BACKGROUND.

### 2.4 Yosef, Mizrachi, Kadrawi (2021) — database verification to 20 vertices
R. Yosef, M. Mizrachi, O. Kadrawi, "On Unimodality of Independence Polynomials of Trees", arXiv:2101.06744
(v1 2021-01-17, v5 2022-03-07; 20 pages). URL: https://arxiv.org/abs/2101.06744 (retrieved; arXiv API metadata
retrieved). Content: builds a database of all 1,346,025 non-isomorphic unlabeled trees on <= 20 vertices with their
independence polynomials and checks that all are log-concave, hence unimodal. Tag: COMPUTATIONAL.

### 2.5 Radcliffe — log-concavity of all trees on <= 25 vertices
A. J. Radcliffe, personal communication (unpublished computation). Cited as [27] "A. J. Radcliffe, personal
communication" in Basit–Galvin (2021): "Radcliffe [27] has verified that every tree on up to 25 vertices has
ordered log-concave independent set sequence"; also cited in T. Ball, D. Galvin, C. Hyry, K. Weingartner,
"Independent set and matching permutations", J. Graph Theory 99 (2022), 40–57 (per Kadrawi–Levit 2023 ref. [26]),
and by Galvin 2025/26 (ref. [22]). No primary artifact (code or data) was found. Tag: COMPUTATIONAL; existence of
the computation verified through three citing papers, content otherwise UNVERIFIED.

### 2.6 Kadrawi, Levit, Yosef, Mizrachi (2023) — the two 26-vertex non-log-concave trees
O. Kadrawi, V. E. Levit, R. Yosef, M. Mizrachi, "On Computing of Independence Polynomials of Trees", chapter in
"Recent Research in Polynomials" (ed. F. Özger), IntechOpen 2023, doi:10.5772/intechopen.1001130.
URL: https://www.intechopen.com/chapters/1130709 (retrieved). Content: a linear-time dynamic-programming
algorithm for the independence polynomial of a tree; all trees on <= 25 vertices are log-concave; at 26 vertices
"two trees having their independence polynomials unimodal but not log-concave" were found (T1 = the 3,k,k
structure with k = 4, T2 = the 3*,k,k+1 structure with k = 3; in Li 2026's notation T_{3,4,4} and T*_{3,3,4};
Ramos–Sun write 3_44 and 3*_34); the chapter states "It allows us to check all trees up to 26 vertices" and
constructs two infinite non-log-concave families. Tag: COUNTEREXAMPLE-CLAIM (to log-concavity) + COMPUTATIONAL
(all trees on <= 26 vertices unimodal).

### 2.7 Kadrawi & Levit (2023 arXiv; 2025 journal) — infinite families, order-28 exception, alpha-2 break
O. Kadrawi, V. E. Levit, "The independence polynomial of trees is not always log-concave starting from order 26",
arXiv:2305.01784 (v1 2023-05-02, v2 2023-08-16; 25 pages, 10 figures); published in Ars Mathematica
Contemporanea 25 (2025), no. 4, Paper #P4.03, doi:10.26493/1855-3974.3207.2ad (journal DOI page returned HTTP 406
to direct fetch; publication details verified via the DOI landing snippet, the Bar-Ilan CRIS record, and the
reference lists of Bautista-Ramos–Guillén-Galván–Gómez-Salgado 2026 and Levit–Kadrawi 2026).
URLs: https://arxiv.org/abs/2305.01784 , https://doi.org/10.26493/1855-3974.3207.2ad
Content (from the arXiv full text): starting from the two 26-vertex trees, infinite families with non-log-concave
independence polynomials are proved: the 3,k,k; 3,k,k+1; 3,k,k+2; 3*,k,k+1; 3*,k,k+2; 3*,k,k+3; and 3*,k,k
structures (Li 2026 restates these as: T_{3,k+1,k+1} and T*_{3,k,k+1} for k >= 3 from the 2023 chapter, and
T_{3,k,k+1}, T_{3,k,k+2}, T*_{3,k-1,k+1}, T*_{3,k,k+3}, T*_{3,k,k} for k >= 4 from this paper). Section "future
research": "a tree of order 28 does not belong to any infinite family like the previous ones we found. You can see
it in Figure 9"; "In all our previous counterexamples the log-concavity was violated at the alpha(G)-1 coefficient.
Nevertheless, there are trees with broken log-concavity at the alpha(G)-2 coefficient. For instance, see Figure
10." (Figure 9: "An exceptional tree of order 28 that has non-log-concave independence polynomial"; Figure 10: "A
tree with broken log-concavity at the alpha(G)-2 coefficient".) The paper conjectures (as restated by Galvin) that
for every l >= 1 some tree breaks log-concavity at alpha - l. Tag: COUNTEREXAMPLE-CLAIM (log-concavity).

### 2.8 Galvin (2025/2026) — spherically symmetric trees T_{m,t,1}, breaks far from the end
D. Galvin, "Trees with non log-concave independent set sequences", arXiv:2502.10654 (v1 2025-02-15; v2
2026-01-23, "updates the references and updates on one of the question posed in the discussion"; v2 text dated
January 27, 2026). URL: https://arxiv.org/abs/2502.10654 (full text and arXiv API metadata retrieved). No journal
version found (UNVERIFIED whether published).
Content: T_{m,t,1} is the rooted tree whose root has m children w_1..w_m, each w_i has t children, each of which has
one child (1 + m + 2mt vertices, alpha = (1+t)m; a spherically symmetric tree). Theorem 2.1: for t <= m <= 2^{t/16}
and t large, log-concavity is broken at index mt + 2. Theorem 1.3: for every sufficiently large t there is a tree
T_t with alpha(T_t) = (1+t) floor(2^{t/16}) whose sequence breaks log-concavity at t floor(2^{t/16}) + 2, i.e. at
distance about alpha/(16 log alpha) from alpha, confirming the Kadrawi–Levit conjecture (breaks at alpha - l for
every l). Special case T_{t,t,1} (1 + t + t^2 vertices) breaks at t^2 + 2; "Computation suggests" this holds for all
t >= 4. Question 3.1 asks whether breaks can occur at <= (1 - c) alpha for some c > 0; Galvin notes that, because of
Levit–Mandrescu, using log-concavity breaks as a route to a non-unimodal tree would require c > 1/3. Section 3
records Ferenc Bencs's computational observation (personal communication) that deeper spherically symmetric trees
T(2^m 1^n) break log-concavity at several places (T(2^4 1^9): 2 places; T(2^5 1^15): 3; T(2^6 1^17): 8;
T(2^7 1^23): 16; T(2^8 1^27): 24), poses Question 3.2, and notes that Bautista-Ramos (2.9) answered it. Lemma 3.3:
S_{t,2} (t paths of length 2 sharing an endpoint) is log-concave. Tag: COUNTEREXAMPLE-CLAIM (log-concavity) /
PARTIAL.

### 2.9 Bautista-Ramos (2025) — arbitrarily many breaks
C. Bautista-Ramos, "Multiple breaks of log-concavity in the independence polynomials of trees", arXiv:2511.00334
(v1 2025-11-01; 6 pages). URL: https://arxiv.org/abs/2511.00334 (HTML retrieved via search; arXiv API metadata
retrieved). Content: for each positive integer m and every sufficiently large t, the tree TG_{m,t} (built from
Galvin's T_{m,t} and S_{2,t}) breaks log-concavity at m indices, answering Galvin's question affirmatively.
Tag: COUNTEREXAMPLE-CLAIM (log-concavity).

### 2.10 Bautista-Ramos, Guillén-Galván, Gómez-Salgado (2026) — consecutive breaks, recurrences
C. Bautista-Ramos, C. Guillén-Galván, P. Gómez-Salgado, "Linear recurrences for non-log-concave independence
polynomials of trees", arXiv:2603.14204 (v1 2026-03-15; 13 pages); Graphs and Combinatorics, published online
2026-06-22, doi:10.1007/s00373-026-03054-4. URLs: https://arxiv.org/abs/2603.14204 ,
https://doi.org/10.1007/s00373-026-03054-4 (both seen via search results; arXiv API metadata retrieved).
Content: a common "pattern graph" structure behind the known non-log-concave families yields linear recurrences;
non-isolated limit points of the zeros lie on the circle |z + 1/3| = 1/3; infinite families breaking
log-concavity at one, two and three consecutive indices, finite families breaking at four and five consecutive
indices; "arbitrarily many consecutive breaks may be achievable". Tag: COUNTEREXAMPLE-CLAIM (log-concavity).
(An earlier paper by the same authors, "Log-concavity of some independence polynomials via a partial ordering",
Discrete Mathematics 342 (2019), 18–28, appears in Galvin's reference list; UNVERIFIED directly. Tag: PARTIAL.)

### 2.11 Ramos & Sun (2025) — PatternBoost search, arXiv:2510.18826
E. Ramos, S. Sun, "An AI enhanced approach to the tree unimodality conjecture", arXiv:2510.18826 (v1 2025-10-21,
v2 2025-10-22; v2 comment: "Fixed typographical errors. Added a remark noting a private correspondence with
Galvin and Bencs, who have shown the existence of trees with log concavity breakage at multiple indices").
URL: https://arxiv.org/abs/2510.18826 (full HTML text and arXiv API metadata retrieved). Authors confirmed: Eric
Ramos and Sunny Sun (dblp/BibSonomy also list "E. Ramos, S. Sun", CoRR abs/2510.18826). Project done at the NYC
Discrete Math REU; compute from the Stevens Institute for Artificial Intelligence.
Content: uses PatternBoost (Charton–Ellenberg–Wagner–Williamson, arXiv:2411.00566) to find "tens of thousands of
new counter-examples to the log-concavity conjecture with vertex set sizes varying from 27 to 101"; breaks were
found only at indices floor(N/2) and floor(N/2) - 1 (N = number of vertices), the latter requiring special
engineering (e.g. N = 56, index 27); an overflow anecdote at N = 101 (Julia Int64) that did not invalidate the
counterexamples once corrected; Remark 2.4 reports that Galvin and Bencs communicated a multi-index family whose
smallest members have "well over 100 vertices". Code/data released: https://github.com/ericgramos/TreeUnimodalityPatternBoost
(repository exists; description "Pattern boost code used to build counter-examples to the log concavity conjecture
for trees"; the paper says it contains a folder with the complete output of one 60-vertex experiment including a
text file of ~35,000 non-log-concave 60-vertex trees; data not downloaded). Original PatternBoost code:
https://github.com/zawagner22/transformers_math_experiments. The paper does not claim any non-unimodal tree.
Tag: COMPUTATIONAL / COUNTEREXAMPLE-CLAIM (log-concavity).

### 2.12 Li, Li, Yang, Zhang (2025) — all spiders log-concave
E. Y. H. Li, G. M. X. Li, A. L. B. Yang, Z.-X. Zhang, "A symmetric function approach to log-concavity of
independence polynomials", arXiv:2501.04245 (v1 2025-01-08; 19 pages). URL: https://arxiv.org/abs/2501.04245
(abstract retrieved; arXiv API metadata retrieved). Content: log-concavity of I_G is equivalent to 2-Schur
positivity of a chromatic-symmetric-function object Y_G (via Stanley); consequently all spiders (trees with one
vertex of degree >= 3) and all pineapple graphs have log-concave, hence unimodal, independence polynomials.
(Brett Reynolds's web page attributes the spider result to "Li–Xie–Zhuang 2025"; the arXiv record lists the four
authors above.) Tag: PARTIAL.

### 2.13 G. M. X. Li (2026) — the Kadrawi–Levit families are unimodal
Grace M. X. Li, "Unimodality of independence polynomials of two family of trees", arXiv:2603.03025 (v1
2026-03-03). URL: https://arxiv.org/abs/2603.03025 (full text retrieved; arXiv API metadata retrieved).
Content: Theorem 1.4/1.5: for all m, n >= 1 the independence polynomials of T_{3,m,n} and T*_{3,m,n} (the families
containing all Kadrawi–Levit counterexamples to log-concavity) are unimodal, proved via chromatic symmetric
functions and 2-Schur positivity. States the conjecture as "[1, Problem 3]" and that it "remains open".
Tag: PARTIAL (rigorous unimodality for two infinite non-log-concave families).

### 2.14 Levit & Kadrawi (2026) — unicyclic closures (not trees)
V. E. Levit, O. Kadrawi, "Closing Trees into Unicyclic Counterexamples: Independence polynomials that stay
unimodal but lose log-concavity", arXiv:2603.17114 (v1 2026-03-17; 30 pages). URL: https://arxiv.org/abs/2603.17114
(full HTML text retrieved). Content: adding one edge to trees T_{3,k,k+r} yields an explicit infinite family
U_{k,r} (r in {0,1,2}) of unicyclic graphs with unimodal but non-log-concave independence polynomials; exact
verification for k <= 400; a computer-assisted theorem that all 66,303 one-edge enlargements of listed Galvin and
Bautista-Ramos trees are unimodal and non-log-concave. Its introduction summarises the tree picture: "Kadrawi and
Levit proved that trees of order 26 already fail log-concavity ... Galvin constructed a family whose first break
can occur arbitrarily close to the top ... Bautista-Ramos first showed that arbitrarily many breaks are possible
... Li proved in 2026 that the two basic Kadrawi–Levit families are nevertheless always unimodal". Uses the
Levit–Mandrescu tail theorem for bipartite (even-cycle) closures. Tag: PARTIAL / BACKGROUND (about unicyclic
graphs; no claim about the tree conjecture).

### 2.15 Hibi, Kara, Vien (2026) — symmetric unimodal tree polynomials; frontier statement
T. Hibi, S. Kara, D. Vien, "Symmetric and unimodal independence polynomials of trees", arXiv:2604.18824 (v1
2026-04-20; 10 pages + supplementary file). URL: https://arxiv.org/abs/2604.18824 (text retrieved; arXiv API
metadata retrieved). Content: existence of trees on n vertices with symmetric and unimodal independence polynomial
for all n not in {2,4,5,7,10}, and of degree d for all d != 3 (Bridge Lemma gluing construction; Macaulay2 checks).
Relevant status sentence: "As of April 2026, the conjecture remains open in general, and has been computationally
verified for trees on at most 29 vertices [15]" where [15] = Reynolds, Zenodo v3 (2.20). Tag: PARTIAL /
BACKGROUND.

### 2.16 Basit & Galvin (2021) — random trees; general tail bound
A. Basit, D. Galvin, "On the independent set sequence of a tree", Electronic Journal of Combinatorics 28(3)
(2021), #P3.23, doi:10.37236/9896; arXiv:2006.12562 (v1 2020-06-22, v2 2021-07-03).
URLs: https://doi.org/10.37236/9896 , https://arxiv.org/abs/2006.12562 (journal PDF text and arXiv metadata
retrieved). Content: for the uniformly random labelled n-vertex tree, a.a.s. the sequence is weakly increasing up
to index 0.280n (about the initial 49.5% of the non-zero part) and weakly decreasing from index 0.347n (about the
terminal 38.8%); Theorem 2 restates Levit–Mandrescu; Theorem 3 (general graphs) gives weak decrease from
ceil(alpha(n-1)/(alpha+n)); records that unimodality of all forests on <= 25 vertices had been verified
computationally [Radcliffe; Yosef–Mizrachi–Kadrawi], "but the full question remains stubbornly open".
Tag: PARTIAL.

### 2.17 Heilman (2020) — random trees, first 46.8% increasing
S. Heilman, "Independent Sets of Random Trees and of Sparse Random Graphs", arXiv:2006.04756 (v1 2020-06-08; 28
pages). URL: https://arxiv.org/abs/2006.04756 (HTML text retrieved; arXiv API metadata retrieved). Content: with
exponentially high probability the first 46.8% of the independent set sequence of a uniformly random tree is
increasing; combined with Levit–Mandrescu the question is "four-fifths true" w.h.p.; states the problem "is still
open". Publication status not checked (UNVERIFIED). Tag: PARTIAL.

### 2.18 Galvin & Hilyard (2018) — recursively defined tree families
D. Galvin, J. Hilyard, "The independent set sequence of some families of trees", Australasian Journal of
Combinatorics 70 (2018), 236–252; arXiv:1701.02204 (v4 2017-12-09, "To appear in Australas. J. Combin volume 70
issue 2 (2018)"). URL: https://arxiv.org/abs/1701.02204 (HTML text retrieved; arXiv API metadata retrieved).
Content: unimodality for paths with auxiliary trees attached periodically, in particular a path on 2n vertices with
l_1 and l_2 pendant edges attached alternately (extending Wang and B.-X. Zhu); log-concavity for large stars
attached to any graph; conjectures real-rootedness for Fibonacci trees. Tag: PARTIAL.

### 2.19 Bencs (2018) — real-rooted independence polynomials of trees
F. Bencs, "On trees with real-rooted independence polynomial", Discrete Mathematics 341(12) (2018), 3321–3330,
doi:10.1016/j.disc.2018.06.033; arXiv:1703.05409 (v1 2017-03-15). URLs: https://arxiv.org/abs/1703.05409 ,
https://doi.org/10.1016/j.disc.2018.06.033 (arXiv text retrieved; journal details from the author's page, Google
Scholar and ScienceDirect issue listing). Content: the "stable-path tree" construction from claw-free graphs
yields real-rooted (hence log-concave and unimodal) independence polynomials; new proofs for centipedes (Zhu) and
caterpillars (Wang–Zhu), and a proof of the Galvin–Hilyard conjecture for Fibonacci trees. Tag: PARTIAL.
(Bencs's later multi-break computations are known only as personal communications reported in Galvin 2.8 and
Ramos–Sun 2.11; no paper by Bencs on multi-break trees was found — UNVERIFIED.)

### 2.20 Reynolds (2026) — Zenodo record 10.5281/zenodo.19100781
B. Reynolds, "Mean bounds, structural reductions, and exhaustive verification for tree independence polynomial
unimodality", Zenodo, Version v3, updated 2026-03-18 (record page: "Published 2026 | Version v3 | Preprint |
Open"; single file main_v2.pdf, 452.7 kB, md5 02c1f75ad906edef02ef10d907a731ef).
URLs: https://doi.org/10.5281/zenodo.19100781 , https://zenodo.org/records/19100781 (record page retrieved
directly; the DOI redirect timed out once). Related software: https://github.com/BrettRey/erdos-problem-993
(release tags paper-v2-2026-03-04-doi5 and paper-v2-2026-03-18-doi listed on the record).
Exactly what the record claims (quoted from the record description): "The paper proves that the mean
independent-set size satisfies mu(T) < n/3 for every tree with d_leaf <= 1, develops structural reductions that
constrain any counterexample, and reports exhaustive verification of unimodality for all 8,691,747,673 trees on
n <= 29 vertices. It also includes asymptotic results for leaf attachment and a computer-assisted extremal
analysis for spider families. This version is the minor-revision polish snapshot dated 2026-03-18. It tightens
several arguments, clarifies the conditional framework and computational pipeline, and improves the presentation
of formalization and artifact status. The conjecture that every tree independence polynomial is unimodal remains
open." Status: preprint, not peer reviewed (Zenodo resource type "Preprint"; "minor-revision" wording suggests a
journal submission, but no journal acceptance or publication was found — UNVERIFIED). Zero citations listed on
Zenodo; cited by Hibi–Kara–Vien 2026 (2.15) as the n <= 29 frontier.
Cross-check (lookup only, no computation beyond adding published integers): 8,691,747,673 equals the sum of OEIS
A000055(n) for n = 1..29 (A000055(29) = 5,469,566,585), so the stated count covers every unlabeled tree on at most
29 vertices.
GitHub repository metadata (GitHub API, retrieved): public, created 2026-02-09, last push 2026-08-28, language
Python, MIT license, default branch master, 0 stars, 6 open issues, description "Computational search for a
counterexample to Erdős Problem #993: is the independent set sequence of every tree unimodal?". README (seen via
search snippet only; direct raw fetch failed): "Exhaustive: all 8,691,747,673 trees on n <= 29 are unimodal (0
violations)"; "n = 28: 2,023,443,032 trees, 0 unimodality failures, 19 log-concavity failures (all at k = 14), best
near-miss ratio 0.8565666"; "n = 27: 751,065,460 trees, 0 unimodality failures, 0 log-concavity failures, best
near-miss ratio 0.8571425"; "the analogous n = 29 log-concavity / near-miss audit has not been completed"; a Lean 4
development claiming "Every finite tree with at most two vertices of degree at least three has a log-concave — and
therefore unimodal — independence polynomial", with the README's own caveat "This result has not been peer
reviewed and is not yet part of the submitted manuscript". Popular exposition by the same author:
https://brettreynolds.ca/valley-hunt.html ("The Valley Hunt"), which states the problem "is still open", "none
exist at n = 27, and 19 exist at n = 28" for log-concavity failures, and that the two 26-vertex trees both fail at
k = 13 with worst ratio i_12 i_14 / i_13^2 = 1.145. Tag: COMPUTATIONAL / PARTIAL (not peer reviewed).

### 2.21 Han (2026) — Zenodo record 10.5281/zenodo.20745518 (hub spiders)
J. Han, "Unimodality of independence polynomials of hub spiders: log-concavity certificates and a reduction to a
single inequality", Zenodo, Version v1, published June 18, 2026, Preprint, file main.pdf (220.5 kB); software
https://github.com/madmax0404/erdos-993-paper. URL: https://zenodo.org/records/20745518 (retrieved directly).
Content (record description): studies "hub spiders" (a root joined to hubs each carrying pendant P_2 arms, a family
containing the Kadrawi–Levit trees); reduces hub-spider unimodality to log-concavity of a one-parameter
coefficient flow; proves unimodality for all one-hub spiders and 82 listed hub-spider cases including T_{3,4,4}
and T_{3,3,4}; partial Lean 4 formalization; explicitly "does not claim a solution of Erdős Problem 993 in full".
Not peer reviewed. Tag: PARTIAL.

### 2.22 Orden (2026) — GitHub repository Tyorden/erdos-993-trees-n31 (n <= 32)
T. S. Orden, "Exhaustive verification of tree independence-sequence unimodality to n = 32", README of
https://github.com/Tyorden/erdos-993-trees-n31 (raw README retrieved directly; 0 stars, 0 forks). Claims:
"unimodality holds for every free tree on up to 32 vertices"; table: n = 28: 2,023,443,032 (0 failures); n = 29:
5,469,566,585 (0); n = 30: 14,830,871,802 (0); n = 31: 40,330,829,030 (0); n = 32: 109,972,410,221 (0). Method:
nauty gentreeg -> listg -eq -> single-file C++ in/out subtree DP with u64 coefficients and a rise-then-fall scan;
n = 31 and n = 32 split into 16 res/mod parts; one Apple M3 Max; n = 32 run Aug 3–4, 2026 (~27 h). Disclosure:
"Pipeline written and run with Claude (Anthropic) assistance". The README cites arXiv:2604.18824 and the BrettRey
repository as the previous n <= 29 frontier and says its n = 28/29 counts reproduce those "exactly with an
independent implementation".
Cross-check (lookup only): the OEIS b-file https://oeis.org/A000055/b000055.txt (retrieved) gives A000055(28..32) =
2023443032, 5469566585, 14830871802, 40330829030, 109972410221, matching the README's per-order counts exactly.
(Remark on the u64 choice: every coefficient is at most the total number of independent sets, which is < 2^32 for a
32-vertex graph, so 64-bit coefficients cannot overflow at these orders.) Status: unpublished, single-author,
AI-assisted computational claim; not peer reviewed; no independent replication of n = 30–32 found.
Tag: COMPUTATIONAL.

### 2.23 Other items seen only in search results or reference lists (not retrieved in full)
- "Trees with Independence Polynomials Having Only Real Zeros", Acta Mathematicae Applicatae Sinica (English
  Series), 2025, doi:10.1007/s10255-025-0082-x (https://link.springer.com/article/10.1007/s10255-025-0082-x):
  constructs infinite families of trees with real-rooted independence polynomials, generalising Zhu–Zhu; abstract
  states the conjecture "is still open". Authors not captured in the snippet — UNVERIFIED. Tag: PARTIAL.
- A. M. Y. Zhu, B.-X. Zhu, "Trees with real rooted independence polynomials", Front. Math. 19 (2024), 495–508, and
  "On real-rootedness of independence polynomials of rooted products of graphs", Acta Math. Appl. Sin. Engl. Ser.
  39 (2023), 854–867 (seen in the above paper's reference list). UNVERIFIED directly. Tag: PARTIAL.
- P. Bahls, B. Ethridge, L. Szabo, "Unimodality of the independence polynomials of non-regular caterpillars",
  Australas. J. Combin. 71 (2018), 104–112 (Galvin's and Li's reference lists). UNVERIFIED directly. Tag: PARTIAL.
- V. E. Levit, E. Mandrescu, "On well-covered trees with unimodal independence polynomials", Congr. Numer. 159
  (2002), 193–202, and "On unimodality of independence polynomials of some well-covered trees", DMTCS (2003)
  (reference lists). UNVERIFIED directly. Tag: PARTIAL.
- Y. Wang, B.-X. Zhu, "On the unimodality of independence polynomials of some graphs", European J. Combin. 32
  (2011), 10–20; Z.-F. Zhu, Australas. J. Combin. 38 (2007), 27–33 (reference lists). UNVERIFIED directly.
  Tag: PARTIAL.
- Y. O. Hamidoune, "On the numbers of independent k-sets in a claw free graph", JCTB 50 (1990), 241–244, and
  M. Chudnovsky, P. Seymour, JCTB 97 (2007), 350–357 (claw-free graphs: unimodal / real-rooted); A. J. Schwenk 1981
  [Sc81] on matching sequences; Heilmann–Lieb 1972. Tag: BACKGROUND (cited on the erdosproblems page and in most
  papers above; not re-verified here).

### 2.24 Searches for a 2026 full proof or a counterexample to unimodality
Searches run (2026-09-02): "Erdős problem 993" with solved / proof / disproved / counterexample; "independence
polynomial trees unimodal conjecture proved"; "tree unimodality conjecture proof"; "tree unimodality
counterexample"; "Alavi Malde Schwenk Erdős conjecture resolved"; plus the arXiv-oriented searches above.
Result: NO arXiv or journal item from 2023–2026 claiming a proof of unimodality for all trees/forests, and NO item
claiming a non-unimodal tree or forest, was found. Every 2026 source retrieved (Li 2603.03025; Levit–Kadrawi
2603.17114; Bautista-Ramos et al. 2603.14204; Hibi–Kara–Vien 2604.18824; Reynolds Zenodo v3; Han Zenodo v1) states or
presupposes that the conjecture is open. The erdosproblems.com page shows "Proof claims (0)". The only "PROOF"
statements found are partial (specific families) and are tagged PARTIAL above; none is a PROOF-CLAIM for the full
conjecture.

---

## 3. Read-only GitHub code search for the private project's artifact names

Commands (GitHub CLI, authenticated, read-only), run 2026-09-02 ~05:25–05:45 UTC:

- `gh search code "iso_n6_bundle_g1" --limit 5` — first run: no output, exit 0. Re-run with
  `--json path,repository`: `[]` (empty result set), exit 0. Re-run again after a 20 s pause: `[]`, exit 0.
  Result: NO public code matches.
- `gh search code "ERDOS993_MONOTONE_PROGRESS_LEDGER" --limit 5` — first run (plain): no output, exit 0. Second
  run (`--json`): `HTTP 429: try again in 3.5 ms`. Third run after 10 s: `HTTP 429: try again in 736.48 s`
  (GitHub secondary rate limit on the code-search endpoint). Fourth run at 05:40:30 UTC, after waiting out the
  736 s window (`--json path,repository`): `[]` (empty result set), exit 0.
  Result: NO public code matches.

Both artifact names therefore appear in no public GitHub repository indexed by code search (note: GitHub code
search only indexes public repositories and, for authenticated users, repositories they can access; the query is
an exact-token search, so a hit would have required the literal string to appear in indexed file contents).

Nothing was cloned or downloaded.

---

## 4. Verdict (as of 2026-09-02)

**Status: OPEN.** The Alavi–Malde–Schwenk–Erdős conjecture (Erdős Problem #993) is neither proved nor refuted.
No 2023–2026 arXiv or journal item claims a full proof, no source exhibits a non-unimodal tree or forest, and the
erdosproblems.com catalogue lists zero proof claims (page last edited 2026-02-01). What has been settled is the
*stronger* log-concavity conjecture (Levit–Mandrescu 2004; Galvin 2011), which is FALSE for trees.

Strongest verified facts:

1. Exhaustive unimodality verification.
   - Peer-reviewed / published record: all trees on <= 25 vertices are log-concave, hence unimodal (Radcliffe,
     personal communication, cited in Basit–Galvin EJC 2021 and Ball–Galvin–Hyry–Weingartner JGT 2022; Yosef–
     Mizrachi–Kadrawi arXiv 2021 for <= 20); all trees on <= 26 vertices are unimodal and exactly two are not
     log-concave (Kadrawi–Levit–Yosef–Mizrachi, IntechOpen 2023; Kadrawi–Levit, Ars Math. Contemp. 2025).
   - Largest n with an exhaustive check documented in a citable (non-peer-reviewed) preprint: n <= 29, all
     8,691,747,673 trees, zero failures (Reynolds, Zenodo 10.5281/zenodo.19100781 v3, 2026-03-18; adopted as the
     frontier "as of April 2026" by Hibi–Kara–Vien arXiv:2604.18824).
   - Largest n claimed anywhere: n <= 32 (Orden, GitHub Tyorden/erdos-993-trees-n31 and erdosproblems forum
     comments of 02 and 09 Aug 2026; n = 30: 14,830,871,802 trees, n = 31: 40,330,829,030, n = 32: 109,972,410,221,
     zero failures; per-order counts match OEIS A000055; independently reproduces Reynolds's n = 28, 29 counts).
     This is a single-author, AI-assisted, unreviewed computation with no independent replication found for
     n = 30–32; treat as strong but unconfirmed evidence.
2. Log-concavity status: FALSE for trees. Smallest counterexamples have 26 vertices (exactly two: T_{3,4,4} and
   T*_{3,3,4}, both breaking at k = 13 = alpha - 1); none on 27 vertices and 19 on 28 vertices (all at k = 14)
   per Reynolds's audit (computational, unreviewed). Infinite families: Kadrawi–Levit (2023/2025), Galvin
   (T_{m,t,1}, 2025/26), Bautista-Ramos (2025), Bautista-Ramos–Guillén-Galván–Gómez-Salgado (2026); tens of
   thousands of sporadic examples on 27–101 vertices (Ramos–Sun 2025, PatternBoost). Every non-log-concave tree
   reported in these sources is unimodal; the Kadrawi–Levit families T_{3,m,n}, T*_{3,m,n} are proved unimodal
   for all m, n (Li 2026), and all spiders are proved log-concave (Li–Li–Yang–Zhang 2025).
3. Where log-concavity can break relative to alpha: at alpha - 1 (all Kadrawi–Levit families and the two
   26-vertex trees); at alpha - 2 (Kadrawi–Levit ad hoc example, Fig. 10 of arXiv:2305.01784); at alpha - l for
   every l, specifically at about alpha (1 - 1/(16 log alpha)) (Galvin, Theorem 1.3); at m distinct indices for
   every m (Bautista-Ramos 2025); at 2 and 3 consecutive indices (infinite families) and 4 and 5 consecutive
   indices (finite families) (BGG 2026); Bencs's spherically symmetric trees T(2^m 1^n) show up to 24 breaks
   computationally (reported in Galvin). Rigorous tail control: for every tree (indeed every König–Egerváry graph)
   the sequence is weakly decreasing from index ceil((2 alpha - 1)/3) (Levit–Mandrescu 2006), so any
   non-unimodal tree must have its "valley" before that index; Galvin observes that a log-concavity-break route
   to non-unimodality would need breaks at <= (1 - c) alpha with c > 1/3 (his Question 3.1), which no known
   construction achieves. For general graphs the tail is decreasing from ceil(alpha(n-1)/(alpha+n))
   (Basit–Galvin 2021, Theorem 3); this general-graph statement, not the Levit–Mandrescu index, is what holds for
   arbitrary graphs.
4. Random trees: a.a.s. the initial ~49.5% of the sequence is increasing and the terminal ~38.8% decreasing
   (Basit–Galvin 2021); the first 46.8% is increasing w.h.p. (Heilman 2020).
5. Forests: unimodality of a forest reduces to its tree components only through log-concavity (products of
   log-concave sequences are log-concave); a non-unimodal forest would need a non-log-concave tree component
   (forum comment, 1.2; no non-unimodal forest reported anywhere).

Primary-source URLs (short list):
- https://www.erdosproblems.com/993 (Cloudflare-blocked to fetch; snippets) and https://www.erdosproblems.com/forum/thread/993
- https://mathscinet.ams.org/mathscinet/relay-station?mr=944684 (Alavi–Malde–Schwenk–Erdős 1987, Congr. Numer. 58, 15–23)
- https://doi.org/10.37236/9896 and https://arxiv.org/abs/2006.12562 (Basit–Galvin 2021; Levit–Mandrescu Theorem 2 restated)
- https://arxiv.org/abs/2006.04756 (Heilman 2020)
- https://arxiv.org/abs/2101.06744 (Yosef–Mizrachi–Kadrawi 2021)
- https://doi.org/10.5772/intechopen.1001130 (Kadrawi–Levit–Yosef–Mizrachi 2023)
- https://arxiv.org/abs/2305.01784 and https://doi.org/10.26493/1855-3974.3207.2ad (Kadrawi–Levit 2023/2025)
- https://arxiv.org/abs/2502.10654 (Galvin 2025/26)
- https://arxiv.org/abs/2510.18826 and https://github.com/ericgramos/TreeUnimodalityPatternBoost (Ramos–Sun 2025)
- https://arxiv.org/abs/2511.00334 (Bautista-Ramos 2025)
- https://arxiv.org/abs/2603.14204 and https://doi.org/10.1007/s00373-026-03054-4 (Bautista-Ramos–Guillén-Galván–Gómez-Salgado 2026)
- https://arxiv.org/abs/2603.03025 (Li 2026)
- https://arxiv.org/abs/2603.17114 (Levit–Kadrawi 2026)
- https://arxiv.org/abs/2604.18824 (Hibi–Kara–Vien 2026)
- https://arxiv.org/abs/2501.04245 (Li–Li–Yang–Zhang 2025)
- https://arxiv.org/abs/1701.02204 (Galvin–Hilyard 2018) ; https://arxiv.org/abs/1703.05409 (Bencs 2018)
- https://doi.org/10.5281/zenodo.19100781 and https://github.com/BrettRey/erdos-problem-993 (Reynolds 2026)
- https://zenodo.org/records/20745518 (Han 2026)
- https://github.com/Tyorden/erdos-993-trees-n31 (Orden 2026)
- https://oeis.org/A000055 (tree counts used for cross-checks)
