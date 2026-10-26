import { Prisma } from "@/generated/prisma/client";
import { hash } from "bcryptjs";
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

  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return jsonError("Enter a valid email address", 400);
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return jsonError("Password must be 12–72 UTF-8 bytes", 400);
  }

  try {
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    await setSessionCookie(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("An account with this email already exists", 409);
    }
    console.error("Registration failed", error);
    return jsonError("Could not create account", 500);
  }
}
