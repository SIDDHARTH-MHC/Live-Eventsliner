#!/bin/bash
# Eventsliner Quick Deploy Script
# After adding card to Render, run this to check deployment status

echo "=== Eventsliner Deployment Helper ==="
echo ""
echo "1. GitHub Repository:"
echo "   https://github.com/SIDDHARTH-MHC/Live-Eventsliner"
echo ""
echo "2. Add Card to Render (if not done):"
echo "   https://dashboard.render.com/billing"
echo ""
echo "3. Deploy via Blueprint:"
echo "   https://render.com/deploy?repo=https://github.com/SIDDHARTH-MHC/Live-Eventsliner"
echo ""
echo "4. Check Render Services:"
echo "   https://dashboard.render.com"
echo ""
echo "Press Ctrl+C to exit, or Enter to check if services are deployed..."
read

echo ""
echo "Checking Render services via API..."
curl -s -H "Authorization: Bearer rnd_Se06ph7WjsopvJzIajTRPDGzM6Yy" \
  https://api.render.com/v1/services?limit=10 | jq -r '.[] | select(.service.name | contains("eventsliner")) | "Service: \(.service.name)\nURL: https://\(.service.serviceDetails.url)\nStatus: \(.service.serviceDetails.deployStatus)\n"'

echo ""
echo "If no services appear above, deploy using the Blueprint URL."
echo "If services exist, check their logs at: https://dashboard.render.com"
