#!/bin/bash

# Environment Setup Script for NextAuth.js
echo "🔧 Setting up environment variables for NextAuth.js..."

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy from example
cp .env.example .env.local

# Generate a secure NEXTAUTH_SECRET
echo "🔐 Generating secure NEXTAUTH_SECRET..."
SECRET=$(openssl rand -base64 32)
sed -i "s/NEXTAUTH_SECRET=replace-with-random-string/NEXTAUTH_SECRET=$SECRET/" .env.local

echo "✅ Environment setup complete!"
echo "📝 Please review and update .env.local with your specific values:"
echo "   - DATABASE_URL (your database connection string)"
echo "   - NEXTAUTH_URL (your application URL)"
echo "   - Other service-specific variables (S3, Redis, etc.)"
echo ""
echo "🔒 Your NEXTAUTH_SECRET has been automatically generated and set."
echo "🚀 You can now run 'npm run dev' to start the development server."