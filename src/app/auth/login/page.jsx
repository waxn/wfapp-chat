// app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { account } from "../../../lib/appwrite";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await account.createEmailPasswordSession(email, password);
      router.replace("/chat");
    } catch (e) {
      setErr(e?.message || "Login failed");
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <div className="space" />
      <form onSubmit={onSubmit} className="card flex-col">
        {err && <div style={{ color: "#ff8888" }}>{err}</div>}
        <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="password" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" type="submit">Login</button>
      </form>
    </div>
  );
}
