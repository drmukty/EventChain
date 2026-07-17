"use client";

import { useEffect, useState } from "react";

export default function VerifyCertificate({
  params,
}: {
  params: { certificateId: string };
}) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/verify/${params.certificateId}`)
      .then((res) => res.json())
      .then(setData);
  }, [params.certificateId]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!data.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>❌ Certificate Not Found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-green-600">
          ✅ Certificate Verified
        </h1>

        <p className="mt-6">
          <strong>Attendee:</strong> {data.certificate.attendee}
        </p>

        <p>
          <strong>Event:</strong> {data.certificate.event}
        </p>

        <p>
          <strong>Certificate ID:</strong> {data.certificate.certificateId}
        </p>

        <p>
          <strong>Issued:</strong>{" "}
          {new Date(data.certificate.issuedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
