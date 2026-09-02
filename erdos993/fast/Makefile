CC := gcc
CFLAGS ?= -O3 -march=native -std=c11 -Wall -Wextra

all: wromcheck

wromcheck: wromcheck.c
	$(CC) $(CFLAGS) -o $@ $<

sanitize: wromcheck.c
	$(CC) -O1 -g -std=c11 -fsanitize=address,undefined -o wromcheck_asan $<
	./wromcheck_asan --nmin 1 --nmax 16 > /dev/null && echo "sanitizer run n<=16 OK"

crosscheck: wromcheck
	python3 crosscheck_c_vs_python.py 14 22

clean:
	rm -f wromcheck wromcheck_asan

.PHONY: all sanitize crosscheck clean
