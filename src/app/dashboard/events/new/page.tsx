"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { UploadCloud } from "lucide-react";

// ✅ Set max file size to 150KB
const MAX_FILE_SIZE = 150000; // 150KB

async function uploadFile(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.url as string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    registrationDeadline: "",
    capacity: 100,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Check file size before uploading
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Image too large. Max ${MAX_FILE_SIZE / 1000}KB`);
      return;
    }

    try {
      const url = await uploadFile(file, "banners");
      setBannerUrl(url);
      toast.success("Banner uploaded");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          capacity: Number(form.capacity),
          bannerUrl: bannerUrl ?? undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error));
      toast.success("Event created");
      router.push(`/events/${data.event.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Could not create event");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-base-500";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-semibold">
        Create an event
      </motion.h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block cursor-pointer rounded-2xl border border-dashed border-white/15 p-6 text-center hover:border-base-500/50">
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          {bannerUrl ? (
            <img src={bannerUrl} alt="Event banner" className="mx-auto h-32 rounded-xl object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-fg-muted">
              <UploadCloud size={22} />
              <span className="text-sm">Upload a banner image (Max 150KB)</span>
            </div>
          )}
        </label>

        <input required placeholder="Event title" value={form.title} onChange={(e) => update("title", e.target.value)} className={inputClass} />
        <textarea required placeholder="Description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputClass} />
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="Category" value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass} />
          <input required placeholder="Venue" value={form.venue} onChange={(e) => update("venue", e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Starts</label>
            <input required type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Ends</label>
            <input required type="datetime-local" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Registration closes</label>
            <input required type="datetime-local" value={form.registrationDeadline} onChange={(e) => update("registrationDeadline", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input required type="number" min={1} placeholder="Capacity" value={form.capacity} onChange={(e) => update("capacity", Number(e.target.value) as any)} className={inputClass} />
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-fg-muted">
            Visibility: Public (all events are public)
          </div>
        </div>

        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-base-500 py-3 font-medium text-white shadow-glow disabled:opacity-60">
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
