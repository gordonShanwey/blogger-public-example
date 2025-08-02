#!/bin/bash

# This script sends a hardcoded test message to the local Python service
# to simulate a Pub/Sub push notification for post regeneration.

# The JSON payload for regeneration
JSON_PAYLOAD='{"postId":"3s4375ndtcw8IJmMMSsT","action":"regenerate","timestamp":1750367075322,"data":{"id":"3s4375ndtcw8IJmMMSsT","selectedSections":[],"feedback":"Please improve the content and make it more engaging","originalContent":""}}'

# Use printf for reliable, cross-shell string output without a newline.
# This feeds the pure JSON string to the base64 encoder.
if [[ "$(uname)" == "Darwin" ]]; then
  BASE64_PAYLOAD=$(printf "%s" "$JSON_PAYLOAD" | base64 -b 0)
else
  BASE64_PAYLOAD=$(printf "%s" "$JSON_PAYLOAD" | base64 -w 0)
fi

# Construct the final JSON body for the POST request, mimicking a real Pub/Sub push.
FINAL_BODY=$(printf '{"message": {"data": "%s", "messageId": "local-test-regenerate-message"}, "subscription": "local-test-subscription"}' "$BASE64_PAYLOAD")

# Send the request to your local Python server.
echo "Sending regeneration test message to http://127.0.0.1:8000/pubsub/push..."
curl -X POST http://127.0.0.1:8000/pubsub/push \
-H "Content-Type: application/json" \
-d "$FINAL_BODY"

echo -e "\n\nDone. Check the terminal where your Python service is running for logs." 