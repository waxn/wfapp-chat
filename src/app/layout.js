// app/layout.tsx
export const metadata = { title: "Public Chat", description: "Global chat with Appwrite" };

import "./global.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
