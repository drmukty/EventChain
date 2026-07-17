export default function VerifyCertificate({
  params,
}: {
  params: { certificateId: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl rounded-2xl border p-8 text-center">
        <h1 className="text-3xl font-bold">Certificate Verification</h1>

        <p className="mt-4">
          Certificate ID:
        </p>

        <p className="font-mono text-lg">
          {params.certificateId}
        </p>

        <p className="mt-6 text-gray-500">
          Verification details will be added in the next step.
        </p>
      </div>
    </div>
  );
}
