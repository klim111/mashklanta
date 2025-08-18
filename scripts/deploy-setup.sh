#!/bin/bash

# Deployment Environment Setup Script
echo "🚀 Deployment Environment Setup Script"
echo "======================================"

# Generate a new secret for production
echo "🔐 Generating new NEXTAUTH_SECRET for production..."
NEW_SECRET=$(openssl rand -base64 32)

echo ""
echo "📋 Environment Variables for Production:"
echo "========================================"
echo ""
echo "# Database"
echo "DATABASE_URL=postgresql://neondb_owner:npg_CXhV5SKywi8e@ep-young-grass-adj67kbc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
echo ""
echo "# NextAuth.js (CRITICAL - This fixes the NO_SECRET error)"
echo "NEXTAUTH_SECRET=$NEW_SECRET"
echo "NEXTAUTH_URL=https://your-production-domain.com"
echo ""
echo "# Optional but recommended"
echo "REDIS_URL=redis://your-redis-url"
echo "S3_REGION=eu-central-1"
echo "S3_BUCKET=your-bucket"
echo "AWS_ACCESS_KEY_ID=your-aws-key"
echo "AWS_SECRET_ACCESS_KEY=your-aws-secret"
echo "BOI_RATES_URL=https://your-boi-api.example.com/rates"
echo "RATES_CACHE_TTL=900"
echo ""
echo "⚠️  IMPORTANT: Replace 'your-production-domain.com' with your actual domain!"
echo ""
echo "📝 Copy these variables to your deployment platform's environment settings."
echo ""
echo "🔍 To test after deployment:"
echo "   curl https://your-domain.com/api/health"
echo ""
echo "✅ The NO_SECRET error should be resolved after setting these variables."