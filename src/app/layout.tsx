import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";

import { Nav } from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { THEME_COOKIE_NAME, parseSiteTheme } from "@/lib/theme";
import { getUserSettings } from "@/lib/user-settings";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonic Trading Simulator",
  description: "Track Sonic skin purchases and sales",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  let theme = parseSiteTheme(themeCookie);

  if (!themeCookie) {
    const user = await getAuthUser();
    if (user) {
      const settings = await getUserSettings(user);
      theme = settings.theme;
    }
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/${THEME_COOKIE_NAME}=([^;]+)/);if(m){document.documentElement.setAttribute("data-theme",m[1]==="light"?"light":"dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="app-body min-h-full">
        <ThemeProvider initialTheme={theme}>
          <Nav />
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
