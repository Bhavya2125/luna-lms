"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/client";
import { InstallBanner } from "@/components/InstallBanner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/login", { username, password });
      router.replace("/colleges");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <Image className="lg" src="/logo.png" alt="Luna Wave" width={230} height={179} priority />
      <form className="box" onSubmit={submit}>
        <h3>Sign in</h3>
        <p className="sub">Accounts are created by your Super Admin.</p>
        <label className="f" style={{ marginBottom: 8 }}>
          Username
          <input autoComplete="username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => setU(e.target.value)} required />
        </label>
        <label className="f" style={{ marginBottom: 12 }}>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} required />
        </label>
        <button className="p" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </form>
      <InstallBanner />
    </div>
  );
}
