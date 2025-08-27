// app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { account, ID } from "../../../lib/appwrite";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await account.create(ID.unique(), email, password, name || email.split("@")[0]);
      await account.createEmailPasswordSession(email, password);
      router.replace("/chat");
    } catch (e) {
      setErr(e?.message || "Registration failed");
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h2>Register</h2>
      <div className="space" />
      <form onSubmit={onSubmit} className="card flex-col">
        {err && <div style={{ color: "#ff8888" }}>{err}</div>}
        <input className="input" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="password" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" type="submit">Create account</button>
      </form>
    </div>
  );
}
