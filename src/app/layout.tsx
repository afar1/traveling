import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Traveling - Internal CRM & Map",
  description: "Manage contacts and view them on an interactive map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add meta tags to prevent caching */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Include Mapbox CSS directly */}
        <link 
          href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" 
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
