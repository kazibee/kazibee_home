#!/usr/bin/env bash
# First live Agent Swarms launch through the website API (Phase 3 acceptance).
#
#   ./scripts/swarm-smoke.sh [origin] [region] [resourceClass]
#
# Logs in as the site owner (prompts for username + password; nothing is
# stored), creates a swarm, launches one machine, then polls the machine's
# event ring until `head.hello` arrives (the head booted on Fargate and opened
# its runtime-control channel) or 4 minutes pass. Finally stops the swarm so
# no Fargate task is left running. Cookies live only in a temp jar that is
# deleted on exit.
set -euo pipefail

ORIGIN="${1:-https://dev.kazibee.com}"
REGION="${2:-us-east-1}"
CLASS="${3:-head_small}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

rid() { uuidgen | tr -d - | tr 'A-Z' 'a-z'; }

read -r -p "Owner username or email: " IDENTIFIER
read -r -s -p "Password: " PASSWORD; echo

R="$(rid)"
LOGIN="$(curl -s -c "$JAR" -X POST -H 'content-type: application/json' \
  -d "{\"kind\":\"auth.login.request\",\"protocolVersion\":\"1.0\",\"identifier\":\"$IDENTIFIER\",\"password\":\"$PASSWORD\",\"idempotencyKey\":\"idem_$R\",\"correlationId\":\"cor_$R\"}" \
  "$ORIGIN/v1/connect/auth/login")"
unset PASSWORD
SESSION="$(printf '%s' "$LOGIN" | sed -nE 's/.*"sessionId":"([^"]+)".*/\1/p')"
[[ -n "$SESSION" ]] || { echo "login failed: $LOGIN" >&2; exit 1; }
CSRF="$(awk '$6 ~ /csrf/ {print $7}' "$JAR" | tail -1)"
[[ -n "$CSRF" ]] || { echo "no csrf cookie in jar" >&2; exit 1; }
echo "session ok ($SESSION)"

api() { # method path [json]   (path may already carry a query string)
  local method="$1" path="$2" body="${3:-}" sep='?'
  [[ "$path" == *\?* ]] && sep='&'
  if [[ -n "$body" ]]; then
    curl -s -b "$JAR" -X "$method" -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
      -d "$body" "$ORIGIN$path${sep}sessionId=$SESSION"
  else
    curl -s -b "$JAR" -X "$method" -H "x-csrf-token: $CSRF" "$ORIGIN$path${sep}sessionId=$SESSION"
  fi
}

CREATE="$(api POST /v1/swarms "{\"env\":\"dev\",\"region\":\"$REGION\",\"resourceClass\":\"$CLASS\"}")"
SWARM="$(printf '%s' "$CREATE" | sed -nE 's/.*"swarmId":"([^"]+)".*/\1/p')"
[[ -n "$SWARM" ]] || { echo "create failed: $CREATE" >&2; exit 1; }
echo "swarm $SWARM"

LAUNCH="$(api POST "/v1/swarms/$SWARM/machines")"
MACHINE="$(printf '%s' "$LAUNCH" | sed -nE 's/.*"machineId":"([^"]+)".*/\1/p')"
[[ -n "$MACHINE" ]] || { echo "launch failed: $LAUNCH" >&2; api POST "/v1/swarms/$SWARM/stop" >/dev/null; exit 1; }
echo "machine $MACHINE  $(printf '%s' "$LAUNCH" | sed -nE 's/.*"ecsTaskArn":"([^"]+)".*/\1/p')"

echo "polling events (up to 4 min)…"
HELLO=0
for i in $(seq 1 24); do
  sleep 10
  api POST "/v1/swarms/$SWARM/liveness" "{\"desktopSeenAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >/dev/null || true
  EVENTS="$(api GET "/v1/swarms/$SWARM/machines/$MACHINE/events?after=0&limit=100")"
  KINDS="$(printf '%s' "$EVENTS" | grep -oE '"kind":"[^"]+"' | sort | uniq -c | tr '\n' ' ')"
  PRES="$(api GET "/v1/swarms/$SWARM" | grep -oE '"state":"(online|offline)"' | head -1)"
  echo "t+$((i*10))s presence=${PRES:-?} ${KINDS:-(no events yet)}"
  if printf '%s' "$EVENTS" | grep -q 'head.heartbeat'; then HELLO=1; break; fi
done

echo "stopping swarm"
api POST "/v1/swarms/$SWARM/stop" | head -c 200; echo
if [[ "$HELLO" == 1 ]]; then echo "PASS: head connected and heartbeated through the cloud"; else echo "FAIL: no head heartbeat within 4 minutes"; exit 1; fi
