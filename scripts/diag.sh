#!/bin/sh
PWD_VAL=$(pwd)
FILES_HERE=$(ls -A 2>/dev/null | tr '\n' ' ')
FILES_UP=$(ls -A .. 2>/dev/null | tr '\n' ' ')
WS_HERE=$(test -f pnpm-workspace.yaml && echo 1 || echo 0)
WS_UP=$(test -f ../pnpm-workspace.yaml && echo 1 || echo 0)
WS_UP2=$(test -f ../../pnpm-workspace.yaml && echo 1 || echo 0)
ASTRO_HERE=$(test -f astro.config.mjs && echo 1 || echo 0)
ASTRO_PLAYGROUND=$(test -f playground/astro.config.mjs && echo 1 || echo 0)
echo "__DIAG__ PWD=${PWD_VAL} | WS_HERE=${WS_HERE} WS_UP=${WS_UP} WS_UP2=${WS_UP2} | ASTRO_HERE=${ASTRO_HERE} ASTRO_PLAYGROUND=${ASTRO_PLAYGROUND} | FILES_HERE=[${FILES_HERE}] | FILES_UP=[${FILES_UP}]"
exit 1
