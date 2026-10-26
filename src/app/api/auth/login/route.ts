import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Request body must be an object", 400);
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return jsonError("email and password are required", 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await compare(password, user.passwordHash))) {
      return jsonError("Invalid email or password", 401);
    }

    await setSessionCookie(user.id);
    return Response.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
  } catch (error) {
    console.error("Login failed", error);
    return jsonError("Could not sign in", 500);
  }
}
