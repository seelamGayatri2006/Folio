"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { FileText, UploadCloud, Loader2 } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") setFile(f);
    else setError("Please drop a PDF file");
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const course = await api.uploadPdf(file);
      router.push(`/course/${course.id}`);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-ink mb-2">Upload a PDF</h1>
        <p className="text-muted text-sm mb-8">
          Books, papers, docs — Folio extracts the text and builds a structured course from it.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-md p-14 text-center transition ${
            dragging ? "border-cover bg-cover/5" : "border-line"
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileText size={32} className="text-cover" />
              <p className="font-medium text-ink">{file.name}</p>
              <p className="text-xs text-muted font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <UploadCloud size={32} className="text-muted" />
              <p className="text-ink font-medium">Drag a PDF here</p>
              <p className="text-sm text-muted">or</p>
              <label className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium cursor-pointer hover:bg-cover transition">
                Browse files
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-danger text-sm mt-4">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full mt-6 bg-cover text-white py-3 rounded-sm font-medium flex items-center justify-center gap-2 hover:bg-cover-dim transition disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Uploading…
            </>
          ) : (
            "Generate course"
          )}
        </button>

        <p className="text-xs text-muted mt-4">
          Course generation continues in the background — you'll land on the course page and can
          watch chapters populate as they're written.
        </p>
      </div>
    </main>
  );
}
