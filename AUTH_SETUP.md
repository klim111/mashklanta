# Authentication Setup Guide

## Overview
This project now has a complete authentication system connected to Neon DB with the following features:

- User registration (signup)
- User login/logout
- Session management with NextAuth.js
- Password hashing with bcrypt
- Database integration with Prisma

## Database Connection
The project is connected to Neon DB using the following connection string:
```
postgresql://neondb_owner:npg_CXhV5SKywi8e@ep-young-grass-adj67kbc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Environment Variables
Make sure your `.env.local` file contains:
```env
DATABASE_URL=postgresql://neondb_owner:npg_CXhV5SKywi8e@ep-young-grass-adj67kbc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login (handled by NextAuth)
- `GET /api/auth/signin` - NextAuth signin page
- `GET /api/auth/signout` - NextAuth signout

### Testing
- `GET /api/test-db` - Test database connection
- `GET /api/users` - List all users (for testing)

## Database Schema
The database includes the following tables:
- `User` - User accounts with hashed passwords
- `Account` - OAuth accounts (NextAuth)
- `Session` - User sessions (NextAuth)
- `VerificationToken` - Email verification tokens (NextAuth)
- `Document` - User documents
- `Calculation` - User calculations
- `RatesCache` - Cached rates data

## How to Use

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Database Connection
Visit: http://localhost:3000/api/test-db

### 3. Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 4. Test User Listing
Visit: http://localhost:3000/api/users

### 5. Use the Frontend
- Click "התחברות" (Login) or "התחל עכשיו" (Signup) in the navbar
- Fill out the forms
- Users will be automatically logged in after successful registration

## Frontend Components

### AuthForms Component
Located at `src/components/ui/auth-forms.tsx`
- Handles both login and signup
- Form validation
- Error handling
- Auto-login after signup

### Updated Navbar
Located at `src/components/ui/navbar.tsx`
- Shows login/signup buttons when not authenticated
- Shows user name and logout button when authenticated
- Works on both desktop and mobile

## Security Features
- Passwords are hashed using bcrypt with salt rounds of 12
- Session management with NextAuth.js
- CSRF protection
- Input validation with Zod schemas

## Testing the Setup

1. **Database Connection**: The test endpoint should return success
2. **User Registration**: Create a test user via API or frontend
3. **User Login**: Use the created credentials to log in
4. **Session Management**: Verify that the user stays logged in
5. **User Logout**: Test the logout functionality

## Troubleshooting

### Database Connection Issues
- Verify the DATABASE_URL in `.env.local`
- Check if Neon DB is accessible
- Run `npx prisma migrate dev` to ensure tables exist

### Authentication Issues
- Verify NEXTAUTH_SECRET is set
- Check browser console for errors
- Verify the auth endpoints are working

### Frontend Issues
- Check if SessionProvider is properly wrapped
- Verify all imports are correct
- Check for TypeScript errors

## Next Steps
1. Add email verification
2. Implement password reset
3. Add OAuth providers (Google, GitHub, etc.)
4. Add user profile management
5. Implement role-based access control