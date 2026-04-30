import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold tracking-tight mb-4">nobsppt</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
        Signal over noise. AI slides that say exactly what needs to be said — nothing more.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="px-6 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="px-6 py-2 border border-gray-300 font-medium rounded hover:bg-gray-50 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
