import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { minio, minioBucket } from "@/lib/minio";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

function encodeFilename(filename: string) {
  return encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required", 401);

  const { id } = await params;
  const file = await prisma.storedFile.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!file) return jsonError("File not found", 404);

  try {
    const objectStream = await minio.getObject(minioBucket, file.objectKey);
    return new Response(Readable.toWeb(objectStream) as ReadableStream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": file.size.toString(),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeFilename(file.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("File download failed", error);
    return jsonError("Could not download file", 502);
  }
}
