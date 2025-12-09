#!/bin/bash
# Deploy script for FitFlow
# Usage: npm run deploy:dev

echo "📦 Pushing to dev branch..."
git push origin main:dev

echo "🚀 Triggering Vercel deployment..."
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_tkfJbivrYUNOZsNGYTuUJeigqESP/ZmdeQArGNV"

echo ""
echo "✅ Done! Check Vercel Dashboard for deployment status."
