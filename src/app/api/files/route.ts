import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { ensureMinioBucket, minio, minioBucket } from "@/lib/minio";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

const maxFileSize = Math.max(
  1,
  Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,
);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  const files = await prisma.storedFile.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      contentType: true,
      size: true,
      createdAt: true,
    },
  });

  return Response.json({
    files: files.map((file) => ({ ...file, size: file.size.toString() })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Request must use multipart/form-data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Choose a file in the 'file' field", 400);
  }
  if (file.size === 0) return jsonError("Empty files are not supported", 400);
  if (file.size > maxFileSize) {
    return jsonError("File exceeds the 10 MiB upload limit", 413);
  }

  const objectKey = `${user.id}/${randomUUID()}`;
  const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(file.type)
    ? file.type
    : "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await ensureMinioBucket();
    await minio.putObject(minioBucket, objectKey, buffer, buffer.length, {
      "Content-Type": contentType,
    });

    try {
      const savedFile = await prisma.storedFile.create({
        data: {
          ownerId: user.id,
          objectKey,
          originalName: file.name.slice(0, 255) || "upload",
          contentType,
          size: BigInt(buffer.length),
        },
        select: {
          id: true,
          originalName: true,
          contentType: true,
          size: true,
          createdAt: true,
        },
      });

      return Response.json(
        { file: { ...savedFile, size: savedFile.size.toString() } },
        { status: 201 },
      );
    } catch (error) {
      await minio.removeObject(minioBucket, objectKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("File upload failed", error);
    return jsonError("Could not upload file", 502);
  }
}
