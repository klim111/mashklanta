#!/bin/bash

# Script to generate environment variables for Vercel deployment
# This helps fix the NEXTAUTH_SECRET error

echo "🔧 Vercel Environment Variables Generator"
echo "========================================="
echo ""

# Generate NEXTAUTH_SECRET
echo "🔐 Generating secure NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo ""

# Get production URL
echo "📝 Enter your Vercel production domain (e.g., mashklanta.vercel.app):"
read -p "Domain: " DOMAIN
NEXTAUTH_URL="https://$DOMAIN"
echo ""

# Display the variables to copy
echo "✅ Copy these environment variables to your Vercel dashboard:"
echo "============================================================"
echo ""
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=$NEXTAUTH_URL"
echo ""
echo "⚠️  Don't forget to also add your DATABASE_URL if not already set!"
echo ""
echo "📋 Instructions:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your project"
echo "3. Go to Settings → Environment Variables"
echo "4. Add each variable above"
echo "5. Select all environments (Production, Preview, Development)"
echo "6. Redeploy your application"
echo ""
echo "💡 Tip: Save the NEXTAUTH_SECRET securely - you'll need it if you deploy elsewhere!"