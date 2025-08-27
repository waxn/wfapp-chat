// app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";

export default function HomePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    account.get().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <div className="container">
      <nav className="nav">
        <div><b>Public Chat</b></div>
        <div className="row">
          {user ? (
            <>
              <span className="tag">Hi, {user.name || user.email}</span>
              <Link href="/chat" className="btn">Open Chat</Link>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await account.deleteSession("current");
                  location.reload();
                }}
              >
                <button className="btn" style={{ background: "#2f3646" }}>Logout</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn">Login</Link>
              <Link href="/auth/register" className="btn" style={{ background: "#2f3646" }}>Register</Link>
            </>
          )}
        </div>
      </nav>

      <div className="spacer" />
      <div className="card">
        <h2>Global Public Chat</h2>
        <p className="tag">Anyone can read. Only logged-in users can post.</p>
        <div className="space" />
        <Link href="/chat" className="btn">Enter Chat</Link>
      </div>
    </div>
  );
}
