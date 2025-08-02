#!/bin/bash

# This script sends a hardcoded test message to the OLD local TypeScript service
# which runs on port 8080.

# The JSON payload extracted from your Cloud Function logs.
# The TypeScript app expects the raw message payload directly.
JSON_PAYLOAD='{"postId":"INt1qgFtaM7xqHSHaWQZ","action":"created","timestamp":1749332175680,"data":{"title":"test","content":"","keywords":["test"],"focus":"","id":"INt1qgFtaM7xqHSHaWQZ"}}'

# Send the request to your local TypeScript server.
echo "Sending test message to http://127.0.0.1:8080/..."
curl -X POST http://127.0.0.1:8080/pubsub/push \
-H "Content-Type: application/json" \
-d "$JSON_PAYLOAD"

echo -e "\n\nDone. Check the terminal where your TypeScript service is running for logs." 