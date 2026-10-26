# Connect MinIO API

Next.js API for registering users, signing in, uploading files, and downloading a user's own files. PostgreSQL stores users and file metadata; the S3-compatible object store stores file bytes.

## Start locally

1. Copy `.env.example` to `.env` if you do not already have a local `.env`. Replace the example passwords and `JWT_SECRET` with random values.
2. Start PostgreSQL and object storage:

   ```bash
   docker compose up -d
   ```

3. Install packages and apply the initial database migration:

   ```bash
   npm install
   npx prisma generate
   npm run db:migrate -- --name init
   ```

4. Start Next.js:

   ```bash
   npm run dev
   ```

The API is at `http://localhost:3000`. The storage console is at `http://localhost:9001`; its credentials are in `.env`. The `files` bucket is created automatically on the first upload.

## API

Passwords must be 12–72 UTF-8 bytes. Uploads are limited to 10 MiB by default; change `MAX_UPLOAD_BYTES` to adjust the limit. Authentication is an HTTP-only JWT cookie.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and sign in |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Return the signed-in user |
| `POST` | `/api/files` | Upload multipart field `file` |
| `GET` | `/api/files/:id` | Download a file owned by the signed-in user |

Example with `curl`:

```bash
curl -i -c cookies.txt http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"a-long-demo-password"}'

curl -i -b cookies.txt -c cookies.txt http://localhost:3000/api/files \
  -F "file=@./sample.txt"

# Replace FILE_ID with the id returned by the upload request.
curl -L -b cookies.txt http://localhost:3000/api/files/FILE_ID \
  -o downloaded-sample.txt
```

Use the `id` in the upload response for downloads. The database checks the file owner before the object is streamed from storage.

For a production deployment, use a dedicated object-store account instead of root credentials, add rate limiting to auth routes, and review allowed file types and size limits.
