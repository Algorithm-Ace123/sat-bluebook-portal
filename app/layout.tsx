import "./globals.css";

export const metadata = {
    title: "Pramana",
    description: "SAT practice & assignments portal",
    icons: {
        icon: "/logo.png"
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen" suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
