/* Stream graph6 trees on stdin and check V7=9*i5*i6+105*i5*i7-72*i6^2.
   Intended for exact exhaustive order-23/24 boundary scans. */
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXN 32
#define KMAX 7

static uint32_t adj[MAXN];

static void conv(const uint64_t *a, const uint64_t *b, uint64_t *out) {
    uint64_t tmp[KMAX + 1] = {0};
    for (int i = 0; i <= KMAX; ++i)
        for (int j = 0; i + j <= KMAX; ++j)
            tmp[i + j] += a[i] * b[j];
    memcpy(out, tmp, sizeof(tmp));
}

static void rooted_dp_fast(int v, int parent, uint64_t *omit, uint64_t *total) {
    uint64_t take[KMAX + 1] = {0,1,0,0,0,0,0,0};
    memset(omit, 0, (KMAX + 1) * sizeof(uint64_t));
    omit[0] = 1;
    uint32_t nbrs = adj[v];
    while (nbrs) {
        int w = __builtin_ctz(nbrs);
        nbrs &= nbrs - 1;
        if (w == parent) continue;
        uint64_t child_omit[KMAX + 1], child_total[KMAX + 1];
        rooted_dp_fast(w, v, child_omit, child_total);
        conv(omit, child_total, omit);
        conv(take, child_omit, take);
    }
    for (int k = 0; k <= KMAX; ++k) total[k] = omit[k] + take[k];
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
        fprintf(stderr, "usage: scan_tree_v7_stream ORDER\n");
        return 2;
    }
    int n = atoi(argv[1]);
    char line[4096], min_line[4096] = "";
    uint64_t count = 0, negative = 0;
    int64_t minimum = INT64_MAX;
    uint64_t min_i5 = 0, min_i6 = 0, min_i7 = 0;
    while (fgets(line, sizeof(line), stdin)) {
        size_t len = strcspn(line, "\r\n");
        line[len] = '\0';
        if (!len || !parse_graph6(line, n)) continue;
        uint64_t omit[KMAX + 1], p[KMAX + 1];
        rooted_dp_fast(0, -1, omit, p);
        int64_t margin = 9 * (int64_t)p[5] * (int64_t)p[6]
                       + 105 * (int64_t)p[5] * (int64_t)p[7]
                       - 72 * (int64_t)p[6] * (int64_t)p[6];
        ++count;
        if (margin < 0) ++negative;
        if (margin < minimum) {
            minimum = margin;
            min_i5 = p[5]; min_i6 = p[6]; min_i7 = p[7];
            strncpy(min_line, line, sizeof(min_line) - 1);
            min_line[sizeof(min_line) - 1] = '\0';
        }
    }
    printf("order=%d\ncount=%" PRIu64 "\nnegative=%" PRIu64
           "\nminimum=%" PRId64 "\ni5=%" PRIu64 "\ni6=%" PRIu64
           "\ni7=%" PRIu64 "\ngraph6=%s\n",
           n, count, negative, minimum, min_i5, min_i6, min_i7, min_line);
    return negative ? 1 : 0;
}
