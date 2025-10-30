#!/bin/bash

# Video Call System Deployment Script
# This script helps deploy the video call fixes to your git server

echo "🚀 Deploying Video Call System Fixes"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Check for required environment variables
echo "📋 Checking environment variables..."
if [ -z "$NEXT_PUBLIC_TURN_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_TURN_URL not set in environment"
    echo "   You'll need to set this in Vercel dashboard"
fi

if [ -z "$NEXT_PUBLIC_TURN_USERNAME" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_TURN_USERNAME not set in environment" 
    echo "   You'll need to set this in Vercel dashboard"
fi

if [ -z "$NEXT_PUBLIC_TURN_CREDENTIAL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_TURN_CREDENTIAL not set in environment"
    echo "   You'll need to set this in Vercel dashboard"
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not initialized"
    echo "Run: git init"
    exit 1
fi

# Stage all changes
echo "📦 Staging changes..."
git add .

# Show what will be committed
echo "📝 Changes to be committed:"
git diff --cached --name-only

# Commit the changes
echo ""
read -p "Enter commit message (or press Enter for default): " commit_message
if [ -z "$commit_message" ]; then
    commit_message="Fix video call streaming issues

- Fixed WebRTC negotiation race conditions
- Improved video element configuration  
- Enhanced HTTP signaling for WebRTC
- Added better TURN server connectivity
- Improved error handling and recovery
- Added comprehensive troubleshooting guide"
fi

git commit -m "$commit_message"

# Check if remote exists
if git remote get-url origin > /dev/null 2>&1; then
    echo "🌐 Pushing to remote repository..."
    git push origin $(git branch --show-current)
    echo "✅ Changes pushed to git server"
else
    echo "⚠️  No remote repository configured"
    echo "   Add your git server with: git remote add origin YOUR_GIT_URL"
    echo "   Then push with: git push -u origin main"
fi

# Build check
echo ""
echo "🔧 Running build check..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check for TypeScript errors"
    echo "Run: npm run build"
    exit 1
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "Next steps:"
echo "1. 📊 Check Vercel deployment status"
echo "2. 🔧 Verify environment variables in Vercel dashboard:"
echo "   - NEXT_PUBLIC_TURN_URL"
echo "   - NEXT_PUBLIC_TURN_USERNAME" 
echo "   - NEXT_PUBLIC_TURN_CREDENTIAL"
echo "3. 🧪 Test video calls from different networks"
echo "4. 📖 Refer to VIDEO_CALL_TROUBLESHOOTING.md for issues"
echo ""
echo "Debug URLs:"
echo "- Video call test: YOUR_DOMAIN/video-call/test-123"
echo "- Advisor dashboard: YOUR_DOMAIN/advisor-dashboard"
