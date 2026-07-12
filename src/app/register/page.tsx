export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded shadow">
        <h2 className="text-2xl font-bold text-center">Create an account</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" required className="mt-1 w-full border rounded px-3 py-2" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input type="password" required className="mt-1 w-full border rounded px-3 py-2" placeholder="********" />
          </div>
          <div>
            <label className="block text-sm font-medium">Confirm Password</label>
            <input type="password" required className="mt-1 w-full border rounded px-3 py-2" placeholder="********" />
          </div>
          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
            Sign up
          </button>
        </form>
        <p className="text-sm text-center">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}