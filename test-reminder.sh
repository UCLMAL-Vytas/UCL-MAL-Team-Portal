#!/usr/bin/env bash
# Send a test event reminder via the deployed testEventReminder Cloud Function.
#
# Usage:
#   ./test-reminder.sh <eventId> [overrideEmail]
#
# Examples:
#   ./test-reminder.sh abc123
#   ./test-reminder.sh abc123 vytautasniedvaras@gmail.com

set -e

EVENT_ID="${1:?Usage: ./test-reminder.sh <eventId> [overrideEmail]}"
OVERRIDE_EMAIL="${2:-vytautasniedvaras@gmail.com}"

echo "Fetching secret..."
SECRET=$(firebase functions:secrets:access REMINDER_TEST_SECRET)

echo "Fetching auth token..."
TOKEN=$(gcloud auth print-identity-token)

URL="https://us-central1-portal-uclmal.cloudfunctions.net/testEventReminder"
URL="${URL}?eventId=${EVENT_ID}&secret=${SECRET}&overrideEmail=${OVERRIDE_EMAIL}"

echo "Calling testEventReminder for event: ${EVENT_ID}"
echo "Sending to: ${OVERRIDE_EMAIL}"
echo ""

curl -sf -H "Authorization: Bearer ${TOKEN}" "${URL}" | python3 -m json.tool
