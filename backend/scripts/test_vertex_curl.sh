#!/bin/bash
TOKEN=$(gcloud auth print-access-token)
PROJECT_ID="icp-demo-480309"
LOCATION="us-central1"

APP_MODELS=("gemini-2.5-flash" "gemini-2.0-flash-001" "gemini-2.0-flash-exp")

for MODEL in "${APP_MODELS[@]}"; do
    echo "----------------------------------------"
    echo "Testing Model: $MODEL"
    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models/$MODEL:generateContent" \
        -d '{
          "contents": {
            "role": "user",
            "parts": { "text": "Hello" }
          }
        }'
    echo ""
done
