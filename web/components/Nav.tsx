"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const appLinks = [
  { href: "/", label: "New Analysis" },
  { href: "/documents", label: "Your Documents" },
];
const publicLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact Us" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const links = user ? [...appLinks, ...publicLinks] : publicLinks;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" /> Signalyze
        </Link>

        <div className="nav-right">
          <nav className="nav-links">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={active ? "nav-link nav-link--active" : "nav-link"}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-auth">
            {user ? (
              <>
                <span className="nav-email">{user.email}</span>
                <button className="nav-logout" type="button" onClick={() => void handleLogout()}>
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="nav-link nav-link--active">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
