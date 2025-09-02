# Vercel Deployment Fix Guide - NEXTAUTH_SECRET Error

## The Problem
Your Vercel deployment is failing with the error:
```
Error: NEXTAUTH_SECRET is required in production
```

This is happening because the `NEXTAUTH_SECRET` environment variable is not set in your Vercel project.

## Solution Steps

### Step 1: Generate a Secure Secret
First, generate a new secure secret for production. Run this command in your terminal:

```bash
openssl rand -base64 32
```

This will output something like: `qVsn7Y4as2vcYBMdgyh0n54ZYqgcD/VPQSbJEeFyJhg=`

**Important:** Save this value securely - you'll need it in the next step.

### Step 2: Add Environment Variables to Vercel

1. **Go to your Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project (`mashklanta`)

2. **Navigate to Settings**
   - Click on the "Settings" tab
   - Select "Environment Variables" from the left sidebar

3. **Add the Required Variables**
   
   Add these environment variables (click "Add" for each one):

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `NEXTAUTH_SECRET` | *[Your generated secret from Step 1]* | ✅ Production, ✅ Preview, ✅ Development |
   | `NEXTAUTH_URL` | `https://mashklanta.vercel.app` | ✅ Production |
   | `DATABASE_URL` | *[Your PostgreSQL connection string]* | ✅ Production, ✅ Preview, ✅ Development |

   **For NEXTAUTH_URL:**
   - Replace `mashklanta.vercel.app` with your actual Vercel domain
   - For preview deployments, you might want to use a different URL

4. **Verify Database URL**
   Based on your code, you're using Neon PostgreSQL. Make sure your `DATABASE_URL` is set correctly:
   ```
   postgresql://[username]:[password]@[host]/[database]?sslmode=require
   ```

### Step 3: Redeploy Your Application

After adding the environment variables:

1. **Trigger a new deployment**
   - Option 1: Push a new commit to your repository
   - Option 2: Go to the Deployments tab and click "Redeploy" on the latest deployment
   - Option 3: Use Vercel CLI: `vercel --prod`

### Step 4: Verify the Fix

Once deployed, test that everything is working:

1. **Check the deployment logs**
   - The build should complete without the NEXTAUTH_SECRET error

2. **Test the health endpoint**
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```
   
   You should see a response with `authSecret: true`

3. **Test authentication**
   - Try to access `/api/auth/signin`
   - Attempt to log in with test credentials

## Additional Environment Variables (Optional but Recommended)

If your application uses these services, add these variables as well:

| Key | Description | Example |
|-----|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://default:password@host:6379` |
| `S3_REGION` | AWS S3 region | `us-east-1` |
| `S3_BUCKET` | S3 bucket name | `your-bucket-name` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `BOI_RATES_URL` | Bank of Israel rates API | `https://api.boi.org.il/...` |
| `RATES_CACHE_TTL` | Cache TTL in seconds | `900` |

## Quick Checklist

- [ ] Generated a secure NEXTAUTH_SECRET using `openssl rand -base64 32`
- [ ] Added NEXTAUTH_SECRET to Vercel environment variables
- [ ] Added NEXTAUTH_URL with your production domain
- [ ] Verified DATABASE_URL is set correctly
- [ ] Selected all environments (Production, Preview, Development) for NEXTAUTH_SECRET
- [ ] Redeployed the application
- [ ] Tested the health endpoint
- [ ] Tested authentication flow

## Troubleshooting

### Still getting the error after adding variables?

1. **Double-check variable names** - They are case-sensitive
2. **Ensure no typos** - Copy and paste the variable names exactly
3. **Check deployment environment** - Make sure variables are set for "Production"
4. **Clear build cache** - In Vercel settings, you can clear the build cache and redeploy

### Authentication not working after fix?

1. **Verify NEXTAUTH_URL** matches your exact domain (including https://)
2. **Check browser console** for any client-side errors
3. **Review Vercel function logs** for server-side errors
4. **Ensure database is accessible** from Vercel's servers

## Security Notes

- **Never commit secrets to Git** - Always use environment variables
- **Rotate secrets regularly** - Generate new secrets periodically
- **Use different secrets** for development and production
- **Keep secrets secure** - Don't share them in public channels

## Need More Help?

- Check the [NextAuth.js documentation](https://next-auth.js.org/configuration/options#secret)
- Review [Vercel's environment variables guide](https://vercel.com/docs/environment-variables)
- Check your project's logs in the Vercel dashboard