"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    venue: "",
    endsAt: "",
    registrationDeadline: "",
    capacity: 0,
  });

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          const e = data.event;
          setFormData({
            title: e.title || "",
            description: e.description || "",
            venue: e.venue || "",
            endsAt: e.endsAt ? new Date(e.endsAt).toISOString().slice(0, 16) : "",
            registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline).toISOString().slice(0, 16) : "",
            capacity: e.capacity || 0,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load event");
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    // ✅ Validate description length
    if (formData.description.length < 10) {
      setFieldErrors({ description: "Description must be at least 10 characters" });
      toast.error("Description must be at least 10 characters");
      setSaving(false);
      return;
    }

    // ✅ Validate dates
    const endDate = new Date(formData.endsAt);
    const deadline = new Date(formData.registrationDeadline);
    const today = new Date();
    const startDate = new Date(formData.endsAt); // We don't have start date in edit form

    // ✅ Check if deadline is after end date (should be before)
    if (deadline > endDate) {
      setFieldErrors({ registrationDeadline: "Registration deadline must be before the end date" });
      toast.error("Registration deadline must be before the end date");
      setSaving(false);
      return;
    }

    // ✅ Check if end date is in the past
    if (endDate < today) {
      setFieldErrors({ endsAt: "End date cannot be in the past" });
      toast.error("End date cannot be in the past");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = "Failed to update event";
        
        if (data.error) {
          if (typeof data.error === "string") {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.fieldErrors) {
            const fieldErrors = Object.values(data.error.fieldErrors).flat();
            errorMessage = fieldErrors.join(", ");
          }
        }
        
        // ✅ Handle specific error types
        if (errorMessage.includes("datetime") || errorMessage.includes("date")) {
          errorMessage = "Please check your date and time. Make sure the dates are valid and in the correct order.";
        }
        if (errorMessage.includes("capacity")) {
          errorMessage = "Capacity must be a positive number.";
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success("Event updated successfully!");
      router.push(`/dashboard/events/${id}`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "capacity" ? parseInt(value) || 0 : value,
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href={`/dashboard/events/${id}`}
        className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to event
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <h1 className="font-display text-3xl font-semibold text-gray-900 dark:text-white">Edit Event</h1>
        <p className="mt-2 text-fg-muted">Update your event details.</p>

        {/* ✅ Show general error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event Name *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-base-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
              className={`mt-1 w-full rounded-xl border px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-400 ${
                fieldErrors.description || (formData.description.length > 0 && formData.description.length < 10)
                  ? "border-red-500 focus:ring-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 bg-white"
              }`}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {formData.description.length}/500 characters
              </span>
              {formData.description.length > 0 && formData.description.length < 10 && (
                <span className="text-red-400">
                  Need {10 - formData.description.length} more characters
                </span>
              )}
              {formData.description.length >= 10 && (
                <span className="text-green-400">✅ Good length</span>
              )}
            </div>
            {fieldErrors.description && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.description}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Venue *</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-base-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date *</label>
            <input
              type="datetime-local"
              name="endsAt"
              value={formData.endsAt}
              onChange={handleChange}
              required
              className={`mt-1 w-full rounded-xl border px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                fieldErrors.endsAt
                  ? "border-red-500 focus:ring-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 bg-white"
              }`}
            />
            {fieldErrors.endsAt && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.endsAt}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">Must be after the start date and in the future</p>
          </div>

          {/* Registration Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Registration Deadline *</label>
            <input
              type="datetime-local"
              name="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={handleChange}
              required
              className={`mt-1 w-full rounded-xl border px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                fieldErrors.registrationDeadline
                  ? "border-red-500 focus:ring-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 bg-white"
              }`}
            />
            {fieldErrors.registrationDeadline && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.registrationDeadline}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">Must be before the end date</p>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Capacity *</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              required
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-base-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-base-500 py-3 font-medium text-white transition hover:bg-base-600 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/dashboard/events/${id}`}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
