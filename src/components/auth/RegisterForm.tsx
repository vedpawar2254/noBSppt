"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PASSWORD_MIN_LENGTH, isValidEmail, isValidPassword } from "@/lib/auth/validation";

interface FieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  // Real-time field validation for inline errors (AC4)
  function validateField(field: "email" | "password", value: string): string | undefined {
    if (field === "email") {
      if (!value) return "Email is required.";
      if (!isValidEmail(value)) return "Enter a valid email address.";
    }
    if (field === "password") {
      if (!value) return "Password is required.";
      if (!isValidPassword(value))
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
  }

  function handleBlur(field: "email" | "password") {
    const value = field === "email" ? email : password;
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  function handleChange(field: "email" | "password", value: string) {
    if (field === "email") setEmail(value);
    else setPassword(value);
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  const emailError = errors.email;
  const passwordError = errors.password;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Final client-side validation before submission (AC4)
    const emailErr = validateField("email", email);
    const passErr = validateField("password", password);
    if (emailErr || passErr) {
      setErrors({ email: emailErr, password: passErr });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // AC1: redirect to dashboard after successful registration
        router.push("/dashboard");
        return;
      }

      if (res.status === 409 || res.status === 422) {
        setErrors(data.errors ?? { form: "Registration failed. Please try again." });
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } catch {
      setErrors({ form: "Network error. Please check your connection." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Registration form">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black ${
            emailError ? "border-red-500 focus:ring-red-500" : "border-gray-300"
          }`}
          placeholder="you@example.com"
        />
        {emailError && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
            {emailError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "password-error" : undefined}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black ${
            passwordError ? "border-red-500 focus:ring-red-500" : "border-gray-300"
          }`}
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        />
        {passwordError && (
          <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
            {passwordError}
          </p>
        )}
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-red-600">
          {errors.form}
        </p>
      )}

      {/* AC4: Submit button disabled until fields are valid */}
      <button
        type="submit"
        disabled={!isFormValid || loading}
        className="w-full py-2 px-4 bg-black text-white font-medium rounded-md text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-black font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
