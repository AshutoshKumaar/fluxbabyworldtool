import "./globals.css";
import { Mooli } from "next/font/google";

const mooli = Mooli({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata = {
  title: "Flux Baby World",
  description: "School Management Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mooli.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
