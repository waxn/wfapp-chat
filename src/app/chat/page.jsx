"use client";

import React, { useEffect, useRef, useState } from "react";
import { account, databases, ID, Query, client } from "../../lib/appwrite";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const MSGS_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);

  useEffect(() => {
    account.get().then(setUser).catch(() => setUser(null));
  }, []);

  // Load messages + subscribe to realtime
  useEffect(() => {
    let unsub;
    let mounted = true;

    (async () => {
      if (!DB_ID || !MSGS_ID) {
        setErr("Missing DB or collection ID in .env.local");
        return;
      }

      try {
        const res = await databases.listDocuments(DB_ID, MSGS_ID, [
          Query.orderDesc("createdAt"),
          Query.limit(100),
        ]);
        const docs = res.documents || [];
        if (!mounted) return;
        setMessages(docs.reverse()); // show oldest -> newest
        scrollToBottom();
      } catch (e) {
        console.error("Failed to load messages:", e);
        setErr("Failed to load messages");
      }

      // subscribe to realtime updates
      unsub = client.subscribe(
        `databases.${DB_ID}.collections.${MSGS_ID}.documents`,
        (response) => {
          try {
            if (!response || !response.events) return;

            // new document created
            if (response.events.some((ev) => typeof ev === "string" && ev.endsWith(".create"))) {
              setMessages((prev) => [...prev, response.payload]);
              // small delay then scroll
              setTimeout(() => scrollToBottom(), 50);
            }
          } catch (e) {
            console.error("Realtime handler error:", e);
          }
        }
      );
    })();

    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  function scrollToBottom() {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {}
  }

  // handle sending (used by Enter and the Send button)
  async function sendMessage(e) {
    e.preventDefault();

    if (!user) {
      setErr("You must be logged in to post.");
      return;
    }

    const body = (text || "").trim();
    if (!body) return;

    setErr("");
    try {
      await databases.createDocument(DB_ID, MSGS_ID, ID.unique(), {
        senderId: user.$id,
        senderName: user.name || user.email,
        text: body,
        createdAt: new Date().toISOString(),
      });
      // clear only after successful create
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
      setErr(err?.message || "Failed to send");
    }
  }

  return (
    <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100%",
    background: "#0b0e17"
  }}>
    {/* Main chat container */}
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "80%", // makes it narrower, not full screen
      maxWidth: "900px",
      height: "90vh",
      border: "1px solid #2a3040",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#1e1f26",
      boxShadow: "0 0 12px rgba(0,0,0,0.6)"
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #2a3040",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#2a2d3a"
      }}>
        <b style={{ color: "#fff" }}># public-chat</b>
        <div style={{ display: "flex", gap: "8px" }}>
          {user ? (
            <>
              <span className="tag" style={{ color: "#bbb" }}>
                {user.name || user.email}
              </span>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await account.deleteSession("current");
                  location.href = "/";
                }}
              >
                <button className="btn" style={{ background: "#3a3f52" }}>Logout</button>
              </form>
            </>
          ) : (
            <>
              <a className="btn" href="/auth/login">Login</a>
              <a className="btn" href="/auth/register" style={{ background: "#3a3f52" }}>Register</a>
            </>
          )}
        </div>
      </div>

      {/* Chat content */}
      {user ? (
        <>
          {/* Messages */}
          <div
            style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                background: "#1e1f26",
                display: "flex",
                flexDirection: "column"
            }}
            >
            {messages.map((m) => {
                const isMe = user && m.senderId === user.$id;
                return (
                <div
                    key={m.$id}
                    style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginBottom: "12px"
                    }}
                >
                    <div
                    style={{
                        maxWidth: "70%",
                        textAlign: isMe ? "right" : "left"
                    }}
                    >
                    {/* Sender + timestamp */}
                    <div
                        style={{
                        fontSize: "0.8rem",
                        color: "#aaa",
                        marginBottom: "4px"
                        }}
                    >
                        {isMe ? "You" : m.senderName} •{" "}
                        {new Date(m.createdAt || m.$createdAt).toLocaleTimeString()}
                    </div>

                    {/* Message bubble */}
                    <div
                        style={{
                        display: "inline-block",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: isMe ? "#5865f2" : "#2c2f3f",
                        color: "#fff",
                        wordWrap: "break-word"
                        }}
                    >
                        {m.text}
                    </div>
                    </div>
                </div>
                );
            })}
            <div ref={messagesEndRef} />
            </div>

          {/* Composer */}
          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              padding: "12px",
              borderTop: "1px solid #2a3040",
              background: "#2a2d3a"
            }}
          >
            <input
              className="input"
              style={{
                flex: 1,
                marginRight: "8px",
                borderRadius: "8px",
                border: "1px solid #444",
                padding: "10px",
                background: "#11141d",
                color: "#fff"
              }}
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!user}
            />
            <button
              className="btn"
              type="submit"
              style={{ background: "#5865f2", color: "#fff" }}
              disabled={!user}
            >
              Send
            </button>
          </form>
          {err && <div style={{ color: "#ff8888", margin: "8px 12px" }}>{err}</div>}
        </>
      ) : (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ccc",
          fontSize: "1.1rem",
          background: "#1e1f26"
        }}>
          <div style={{ textAlign: "center" }}>
            <p>Please login or register to send and view messages.</p>
            <div style={{ marginTop: "12px" }}>
              <a className="btn" href="/auth/login" style={{ marginRight: "8px" }}>Login</a>
              <a className="btn" href="/auth/register" style={{ background: "#3a3f52" }}>Register</a>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
