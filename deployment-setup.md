# Deployment Setup Guide

## Environment Variables Required for Production

### Required Variables
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_CXhV5SKywi8e@ep-young-grass-adj67kbc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# NextAuth.js (CRITICAL - This was causing the NO_SECRET error)
NEXTAUTH_SECRET=qVsn7Y4as2vcYBMdgyh0n54ZYqgcD/VPQSbJEeFyJhg=
NEXTAUTH_URL=https://your-production-domain.com

# Optional but recommended
REDIS_URL=redis://your-redis-url
S3_REGION=eu-central-1
S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
BOI_RATES_URL=https://your-boi-api.example.com/rates
RATES_CACHE_TTL=900
```

## Platform-Specific Setup

### Vercel Deployment
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_CXhV5SKywi8e@ep-young-grass-adj67kbc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | `qVsn7Y4as2vcYBMdgyh0n54ZYqgcD/VPQSbJEeFyJhg=` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-vercel-domain.vercel.app` | Production |
| `NEXTAUTH_URL` | `https://your-preview-domain.vercel.app` | Preview |

### Netlify Deployment
1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings → Environment variables
4. Add the same variables as above

### Railway Deployment
1. Go to your Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add the same variables as above

### Render Deployment
1. Go to your Render dashboard
2. Select your service
3. Go to Environment tab
4. Add the same variables as above

## Generate a New Secret (Recommended for Production)

For production, you should generate a new secret:

```bash
# Generate a new secret
openssl rand -base64 32
```

Replace the `NEXTAUTH_SECRET` value with the newly generated secret.

## Testing the Fix

After setting the environment variables:

1. **Deploy your application**
2. **Test the health endpoint**: `https://your-domain.com/api/health`
3. **Test authentication**: Try to log in with existing credentials
4. **Check logs**: Ensure no more `NO_SECRET` errors

## Troubleshooting

### Still getting NO_SECRET error?
1. Verify environment variables are set correctly
2. Check that the deployment platform has reloaded the environment
3. Ensure the variable names are exactly as shown (case-sensitive)
4. Redeploy the application after setting variables

### Database connection issues?
1. Verify the `DATABASE_URL` is correct
2. Check if the database is accessible from your deployment platform
3. Ensure SSL is properly configured

### Authentication not working?
1. Check that `NEXTAUTH_URL` matches your production domain exactly
2. Verify the `NEXTAUTH_SECRET` is set
3. Check browser console for errors
4. Test with the health endpoint first