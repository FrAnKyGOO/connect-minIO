"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type User = {
  id: string;
  email: string;
  createdAt: string;
};

type StoredFile = {
  id: string;
  originalName: string;
  contentType: string;
  size: string;
  createdAt: string;
};

type ApiError = { error?: string };

const maxFileBytes = 10 * 1024 * 1024;

function UploadIcon({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7.5 18.5h-1A4.5 4.5 0 0 1 6 9.51a6 6 0 0 1 11.67 1.48A3.75 3.75 0 0 1 17.25 18.5h-.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 20V11m0 0-3.25 3.25M12 11l3.25 3.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3.75v11.5m0 0 4.25-4.25M12 15.25l-4.25-4.25M5 19.25h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3.75 6.75A1.75 1.75 0 0 1 5.5 5h4.03c.46 0 .9.18 1.23.51l1.01 1.01c.33.33.77.51 1.23.51h5.5a1.75 1.75 0 0 1 1.75 1.75v8.47A1.75 1.75 0 0 1 18.5 19h-13a1.75 1.75 0 0 1-1.75-1.75V6.75Z" fill="currentColor" />
    </svg>
  );
}

function FileKindIcon({ file }: { file: StoredFile }) {
  const isPdf = file.contentType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");
  const isImage = file.contentType.startsWith("image/");
  const kind = isPdf ? "pdf" : isImage ? "image" : "text";

  return (
    <span className={`file-kind file-kind--${kind}`} aria-hidden="true">
      {isPdf ? (
        <svg viewBox="0 0 24 24" fill="none"><path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3.75v4h4M8 15.5h8M8 12.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      ) : isImage ? (
        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="9.5" r="1.5" fill="currentColor"/><path d="m5 17 4-4 2.5 2.5 2.5-3 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none"><path d="M7 4.25h10A2.75 2.75 0 0 1 19.75 7v10A2.75 2.75 0 0 1 17 19.75H7A2.75 2.75 0 0 1 4.25 17V7A2.75 2.75 0 0 1 7 4.25Z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      )}
    </span>
  );
}

function formatFileSize(size: string) {
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand-lockup${light ? " brand-lockup--light" : ""}`}>
      <Image
        src="/storage-mark.png"
        width={46}
        height={46}
        alt=""
        aria-hidden="true"
        className="brand-mark"
        priority
      />
      <span className="brand-name">MINIO <span>FILES</span></span>
    </div>
  );
}

export function FilesFrontend() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(async () => {
    const response = await fetch("/api/files", { cache: "no-store" });
    if (!response.ok) throw new Error("โหลดรายการไฟล์ไม่สำเร็จ");
    const data = (await response.json()) as { files: StoredFile[] };
    setFiles(data.files);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { user: User };
          if (active) setUser(data.user);
          await refreshFiles();
        } else if (response.status !== 401) {
          throw new Error("เชื่อมต่อ API ไม่สำเร็จ");
        }
      } catch {
        if (active) setError("เชื่อมต่อ API ไม่ได้ โปรดตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน");
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, [refreshFiles]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { user?: User } & ApiError;
      if (!response.ok || !data.user) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");

      setUser(data.user);
      setPassword("");
      await refreshFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เชื่อมต่อ API ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setFiles([]);
      setSelectedFile(null);
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  function acceptFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    if (file.size > maxFileBytes) {
      setSelectedFile(null);
      setError("ไฟล์มีขนาดเกิน 10 MB");
      return;
    }
    setSelectedFile(file);
  }

  async function uploadFile() {
    if (!selectedFile) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/files", { method: "POST", body: formData });
      const data = (await response.json()) as { file?: StoredFile } & ApiError;
      if (!response.ok) throw new Error(data.error ?? "อัปโหลดไฟล์ไม่สำเร็จ");

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("อัปโหลดไฟล์เรียบร้อยแล้ว");
      await refreshFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return <main className="loading-screen" aria-label="กำลังโหลด"><span className="loading-spinner" /></main>;
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-brand-panel" aria-label="MinIO Files">
          <Brand light />
          <Image
            src="/storage-stack.png"
            width={1536}
            height={1024}
            alt=""
            aria-hidden="true"
            className="auth-stack-art"
            priority
          />
        </section>
        <section className="auth-form-panel">
          <form className="auth-form" onSubmit={submitAuth}>
            <h1>{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h1>
            <p className="auth-intro">
              {mode === "login" ? "เข้าถึงไฟล์ของคุณได้จากทุกที่" : "สร้างบัญชีเพื่อเริ่มเก็บไฟล์ของคุณ"}
            </p>

            <label className="field-label" htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="กรอกอีเมลของคุณ"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={320}
            />

            <label className="field-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="กรอกรหัสผ่านของคุณ"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "register" ? 12 : undefined}
              maxLength={72}
            />
            {mode === "register" && <p className="field-hint">ใช้รหัสผ่านอย่างน้อย 12 ตัวอักษร</p>}

            {error && <p className="form-message form-message--error" role="alert">{error}</p>}

            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>

            <p className="auth-switch">
              {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
              >
                {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
              </button>
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand light />
        <nav className="sidebar-nav" aria-label="เมนูหลัก">
          <a className="nav-item nav-item--active" href="#files" aria-current="page">
            <FolderIcon />
            <span>คลังไฟล์</span>
          </a>
        </nav>
        <div className="sidebar-status"><span className="status-dot" />เชื่อมต่อแล้ว</div>
      </aside>

      <section className="workspace" id="files">
        <header className="workspace-topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="account-area">
            <div className="account-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</div>
            <span className="account-email">{user.email}</span>
            <span className="account-divider" />
            <button className="text-button signout-button" onClick={signOut} disabled={busy}>ออกจากระบบ</button>
          </div>
        </header>

        <div className="workspace-content">
          <div className="page-heading">
            <div>
              <h1>คลังไฟล์</h1>
              <p>จัดเก็บและจัดการไฟล์ของคุณในที่เดียว</p>
            </div>
            <div className="mobile-account-line">
              <span>{user.email}</span>
              <button className="text-button" onClick={signOut} disabled={busy}>ออกจากระบบ</button>
            </div>
          </div>

          <section
            className={`upload-panel${dragging ? " upload-panel--dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="upload-symbol"><UploadIcon /></span>
            <h2>อัปโหลดไฟล์</h2>
            <p className="upload-instruction">ลากไฟล์มาวางที่นี่ หรือเลือกจากเครื่อง</p>
            <p className="upload-limit">ไฟล์ขนาดไม่เกิน 10 MB</p>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              onChange={(event) => acceptFile(event.target.files?.[0])}
              aria-label="เลือกไฟล์จากเครื่อง"
            />
            {selectedFile ? (
              <div className="selected-file-actions">
                <span className="selected-file-name" title={selectedFile.name}>{selectedFile.name}</span>
                <button className="primary-button choose-button" onClick={uploadFile} disabled={busy}>
                  {busy ? "กำลังอัปโหลด…" : "อัปโหลด"}
                </button>
                <button className="text-button clear-file-button" onClick={() => setSelectedFile(null)} disabled={busy}>
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button className="primary-button choose-button" onClick={() => fileInputRef.current?.click()}>
                เลือกไฟล์
              </button>
            )}
          </section>

          {(error || notice) && (
            <p className={`form-message upload-message${error ? " form-message--error" : " form-message--success"}`} role={error ? "alert" : "status"}>
              {error || notice}
            </p>
          )}

          <section className="files-section" aria-labelledby="files-heading">
            <h2 id="files-heading">ไฟล์ของฉัน</h2>
            {files.length === 0 ? (
              <div className="empty-files">
                <span className="empty-icon"><FolderIcon /></span>
                <p>ยังไม่มีไฟล์</p>
                <span>เลือกไฟล์ด้านบนเพื่อเริ่มต้นใช้งาน</span>
              </div>
            ) : (
              <div className="files-table-wrap">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th scope="col">ชื่อไฟล์</th>
                      <th scope="col">ขนาด</th>
                      <th scope="col" className="date-column">วันที่อัปโหลด</th>
                      <th scope="col" className="download-column">ดาวน์โหลด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <span className="file-name-cell">
                            <FileKindIcon file={file} />
                            <span className="file-name" title={file.originalName}>{file.originalName}</span>
                          </span>
                        </td>
                        <td className="file-size-cell">{formatFileSize(file.size)}</td>
                        <td className="date-cell date-column">{formatDate(file.createdAt)}</td>
                        <td className="download-column">
                          <a className="download-link" href={`/api/files/${file.id}`} aria-label={`ดาวน์โหลด ${file.originalName}`}>
                            <DownloadIcon />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
