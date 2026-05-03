#!/usr/bin/env bash
# Send a test event reminder via the deployed testEventReminder Cloud Function.
#
# Usage:
#   ./test-reminder.sh                        — lists upcoming events, picks the next one
#   ./test-reminder.sh <eventId>              — sends to your email
#   ./test-reminder.sh <eventId> <email>      — sends to a specific address

set -e

PROJECT="portal-uclmal"
REGION="us-central1"
OVERRIDE_EMAIL="${2:-vytautasniedvaras@gmail.com}"

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

echo "Fetching auth tokens..."
ACCESS_TOKEN=$(gcloud auth print-access-token)
IDENTITY_TOKEN=$(gcloud auth print-identity-token)

echo "Fetching events from Firestore..."
curl -sf \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/events?pageSize=50" \
  > "$TMPFILE"

EVENT_ID=$(python3 - "${1:-}" "$TMPFILE" <<'PYEOF'
import sys, json
from datetime import datetime, timezone

arg     = sys.argv[1]
tmpfile = sys.argv[2]

with open(tmpfile) as f:
    data = json.load(f)

docs = data.get("documents", [])
now  = datetime.now(timezone.utc)

events = []
for doc in docs:
    fields = doc.get("fields", {})
    title  = fields.get("title", {}).get("stringValue", "?")
    ts     = fields.get("startDateTime", {}).get("timestampValue", "")
    eid    = doc["name"].split("/")[-1]
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        events.append((dt, eid, title))
    except Exception:
        pass

events.sort()
future = [(dt, eid, t) for dt, eid, t in events if dt > now]

if arg:
    ids = [eid for _, eid, _ in events]
    if arg not in ids:
        print(f"ERROR: event '{arg}' not found", file=sys.stderr)
        sys.exit(1)
    print(arg)
else:
    if not future:
        print("ERROR: no upcoming events found", file=sys.stderr)
        sys.exit(1)
    print("Upcoming events:", file=sys.stderr)
    for dt, eid, title in future[:10]:
        marker = "  ◀ using this" if eid == future[0][1] else ""
        print(f"  {dt.strftime('%Y-%m-%d %H:%M')}  {title:<40}  {eid}{marker}", file=sys.stderr)
    print(future[0][1])
PYEOF
)

echo ""
echo "Fetching secret..."
SECRET=$(firebase functions:secrets:access REMINDER_TEST_SECRET)

URL="https://${REGION}-${PROJECT}.cloudfunctions.net/testEventReminder"
URL="${URL}?eventId=${EVENT_ID}&secret=${SECRET}&overrideEmail=${OVERRIDE_EMAIL}"

echo "Sending test reminder → ${OVERRIDE_EMAIL}"
echo ""

curl -sf -H "Authorization: Bearer ${IDENTITY_TOKEN}" "${URL}" | python3 -m json.tool
