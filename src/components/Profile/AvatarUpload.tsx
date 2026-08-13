"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Camera, Loader2, X } from "lucide-react";

interface AvatarUploadProps {
  currentAvatar: string | null;
  onAvatarUpdate: (url: string) => void;
}

export function AvatarUpload({ currentAvatar, onAvatarUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      toast.success("Avatar updated!");
      onAvatarUpdate(data.url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove avatar?")) return;
    setUploading(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove");
        return;
      }
      toast.success("Avatar removed");
      onAvatarUpdate("");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute bottom-0 right-0 flex gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-full bg-base-500 p-2 text-white shadow-lg hover:bg-base-600 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      {currentAvatar && (
        <button
          onClick={handleRemove}
          disabled={uploading}
          className="rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
