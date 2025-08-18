import { NextRequest, NextResponse } from "next/server";
import { signIn } from "next-auth/react";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    // This endpoint will be used by the frontend to initiate login
    // The actual authentication is handled by NextAuth
    return NextResponse.json(
      { 
        message: "Login initiated", 
        redirectUrl: `/api/auth/signin?email=${encodeURIComponent(email)}` 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}