"use client";

import React, { useEffect, useRef, useState } from "react";
import { account, databases, ID, Query, client, storage } from "../../lib/appwrite";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const MSGS_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const textInputRef = useRef(null); // Ref for the text input

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
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        } catch (e) {}
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

  // ensure we scroll to bottom after messages render
  useEffect(() => {
    // small timeout so DOM has painted
    const t = setTimeout(() => scrollToBottom(), 50);
    return () => clearTimeout(t);
  }, [messages]);

  // handle sending (used by Enter and the Send button)
  async function sendMessage(e) {
  e.preventDefault();
    if (!user) {
      setErr("You must be logged in to post.");
      return;
    }
    if (!text.trim() && !file) return; // Prevent duplicate sends
    if (sending) return;

    setSending(true);
    setErr("");

    const outgoingText = text.trim();
    setText("");

    let imageUrl = null;
    let imageFileId = null;

    try {
      if (file) {
        // Upload file and use SDK to get a proper view URL if possible
        let uploaded = null;
        try {
          uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);
        } catch (uploadErr) {
          console.error("Upload failed:", uploadErr);
          throw uploadErr;
        }
        const fid = uploaded?.$id || uploaded?.id;
        if (fid) {
          imageFileId = fid; // keep if you still want raw ID
          try {
            imageUrl = storage.getFileView(BUCKET_ID, fid).href;
          } catch (errView) {
            console.error('Failed to generate imageUrl:', errView);
          }
        }

        if (imageFileId) {
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }

      // Create the document - 👇 FIX: store imageUrl instead of imageFileId
      const payload = {
        senderId: user.$id,
        senderName: user.name || user.email,
        text: outgoingText || "",
        imageUrl: imageUrl || null, // Ensure this is not undefined
        createdAt: new Date().toISOString(),
      };
      console.log("Payload:", payload); // Debug: check the payload before sending
      await databases.createDocument(DB_ID, MSGS_ID, ID.unique(), payload);
    } catch (err) {
      console.error("Send failed:", err);
      setErr(err?.message || "Failed to send message");
      setText(outgoingText);
    } finally {
      setSending(false);
      textInputRef.current?.focus(); // Refocus the text input after sending
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
              padding: "18px",
              background: "#1e1f26",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
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
                        display: "inline-block",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: isMe ? "#5865f2" : "#2c2f3f",
                        color: "#fff",
                        wordWrap: "break-word",
                        maxWidth: "70%",
                        textAlign: isMe ? "right" : "left",
                        margin: "4px 8px"
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "#aaa", marginBottom: "4px" }}>
                        {isMe ? "You" : m.senderName} • {new Date(m.createdAt || m.$createdAt).toLocaleTimeString()}
                      </div>
                      {m.text && <div>{m.text}</div>}
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="uploaded"
                          style={{ maxWidth: "200px", display: "block", marginTop: "5px" }}
                          onError={(e) => {
                            console.error("Failed to load image:", m.imageUrl);
                            e.target.style.display = 'none'; // Hide broken images
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
            })}
            <div ref={messagesEndRef} />
            </div>

          {/* Composer - single bottom bar with plus icon for file upload */}
          {/* Show file name above input bar if file is selected */}
          {file && (
            <div style={{ color: '#fff', margin: '8px 16px 4px', fontSize: '0.95em', textAlign: 'left' }}>
              Selected file: {file.name}
            </div>
          )}
          <form onSubmit={sendMessage} className="row" style={{ marginTop:12, alignItems: 'center', padding: '8px 16px' }}>
            <input
              className="input"
              placeholder={user ? "Type a message…" : "Login to post"}
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={!user || sending}
              style={{ padding: '12px 16px', borderRadius: '12px', marginRight: '12px', flex: 1, background: '#0f1116', color: '#fff', border: '1px solid #222' }}
              ref={textInputRef} // Attach ref to the input
            />
            {/* Plus icon for file upload */}
            <label style={{ display: "flex", alignItems: "center", cursor: user ? "pointer" : "not-allowed", marginLeft: "8px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#5865f2" />
                <rect x="11" y="7" width="2" height="10" rx="1" fill="white" />
                <rect x="7" y="11" width="10" height="2" rx="1" fill="white" />
              </svg>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={e => setFile(e.target.files[0])}
                disabled={!user}
                style={{ display: "none" }}
              />
            </label>
            <button className="btn" type="submit" disabled={!user || sending} style={{ padding: '10px 14px', marginLeft: '8px', background: '#5865f2', color: '#fff', borderRadius: '10px', minWidth: '72px' }}>{sending ? 'Sending...' : 'Send'}</button>
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
