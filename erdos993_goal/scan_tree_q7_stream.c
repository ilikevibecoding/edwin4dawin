/* Stream graph6 trees and audit the rank-seven reserve

       Q7 = 14*i7^2 - i6*i7 - 16*i6*i8.

   The scanner also records alpha and counts the finite "small" factors
   (alpha <= 11) that do not already belong to the rank-seven full cone.
   A small factor is exceptional when alpha <= 7 (q8 vanishes, so the
   ratio-cone parametrisation is unavailable) or Q7 < 0.
*/
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXN 32
#define KMAX 8

static uint32_t adj[MAXN];

static void conv(const uint64_t *a, const uint64_t *b, uint64_t *out) {
    uint64_t tmp[KMAX + 1] = {0};
    for (int i = 0; i <= KMAX; ++i)
        for (int j = 0; i + j <= KMAX; ++j)
            tmp[i + j] += a[i] * b[j];
    memcpy(out, tmp, sizeof(tmp));
}

static void rooted_dp(int v, int parent, uint64_t *omit, uint64_t *total,
                      int *alpha_omit, int *alpha_total) {
    uint64_t take[KMAX + 1] = {0,1,0,0,0,0,0,0,0};
    memset(omit, 0, (KMAX + 1) * sizeof(uint64_t));
    omit[0] = 1;
    int ao = 0, at = 1;
    uint32_t nbrs = adj[v];
    while (nbrs) {
        int w = __builtin_ctz(nbrs);
        nbrs &= nbrs - 1;
        if (w == parent) continue;
        uint64_t child_omit[KMAX + 1], child_total[KMAX + 1];
        int child_alpha_omit, child_alpha_total;
        rooted_dp(w, v, child_omit, child_total,
                  &child_alpha_omit, &child_alpha_total);
        conv(omit, child_total, omit);
        conv(take, child_omit, take);
        ao += child_alpha_total;
        at += child_alpha_omit;
    }
    for (int k = 0; k <= KMAX; ++k) total[k] = omit[k] + take[k];
    *alpha_omit = ao;
    *alpha_total = ao > at ? ao : at;
}

static int parse_graph6(const char *s, int expected_n) {
    int n = ((unsigned char)s[0]) - 63;
    if (n != expected_n || n > MAXN) return 0;
    memset(adj, 0, sizeof(adj));
    int pos = 1, bit = 5;
    int value = ((unsigned char)s[pos]) - 63;
    for (int j = 1; j < n; ++j) {
        for (int i = 0; i < j; ++i) {
            int edge = (value >> bit) & 1;
            if (edge) {
                adj[i] |= UINT32_C(1) << j;
                adj[j] |= UINT32_C(1) << i;
            }
            if (--bit < 0) {
                bit = 5;
                value = ((unsigned char)s[++pos]) - 63;
            }
        }
    }
    return 1;
}

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "usage: scan_tree_q7_stream ORDER\n");
        return 2;
    }
    int n = atoi(argv[1]);
    char line[4096], min_line[4096] = "";
    uint64_t count = 0, small = 0, negative = 0, exceptional = 0;
    int64_t minimum = INT64_MAX;
    uint64_t witness[KMAX + 1] = {0};
    int witness_alpha = 0;
    while (fgets(line, sizeof(line), stdin)) {
        size_t len = strcspn(line, "\r\n");
        line[len] = '\0';
        if (!len || !parse_graph6(line, n)) continue;
        uint64_t omit[KMAX + 1], p[KMAX + 1];
        int alpha_omit, alpha;
        rooted_dp(0, -1, omit, p, &alpha_omit, &alpha);
        int64_t margin = 14 * (int64_t)p[7] * (int64_t)p[7]
                       - (int64_t)p[6] * (int64_t)p[7]
                       - 16 * (int64_t)p[6] * (int64_t)p[8];
        ++count;
        if (alpha <= 11) {
            ++small;
            if (margin < 0) ++negative;
            if (alpha <= 7 || margin < 0) {
                ++exceptional;
                printf("E %d %d", n, alpha);
                for (int k = 0; k <= KMAX; ++k) printf(" %" PRIu64, p[k]);
                putchar('\n');
            }
            if (margin < minimum) {
                minimum = margin;
                witness_alpha = alpha;
                memcpy(witness, p, sizeof(witness));
                strncpy(min_line, line, sizeof(min_line) - 1);
                min_line[sizeof(min_line) - 1] = '\0';
            }
        }
    }
    fprintf(stderr,
            "order=%d count=%" PRIu64 " small=%" PRIu64
            " q7_negative=%" PRIu64 " exceptional=%" PRIu64
            " minimum=%" PRId64 " witness_alpha=%d graph6=%s poly=",
            n, count, small, negative, exceptional, minimum,
            witness_alpha, min_line);
    for (int k = 0; k <= KMAX; ++k)
        fprintf(stderr, "%s%" PRIu64, k ? "," : "", witness[k]);
    fputc('\n', stderr);
    return 0;
}
