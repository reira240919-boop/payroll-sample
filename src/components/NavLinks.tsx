"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import Spinner from "@/components/Spinner";

interface NavLinksProps {
  links: { href: string; label: string }[];
}

function NavLinkPendingHint() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="ml-1.5" /> : null;
}

export default function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();

  // Pick the single longest (most specific) matching href, so a route like
  // /employee/daily-reports/new doesn't also light up the /employee/daily-reports
  // tab just because it shares that prefix.
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {links.map((link) => {
        const active = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {link.label}
            <NavLinkPendingHint />
          </Link>
        );
      })}
    </nav>
  );
}
