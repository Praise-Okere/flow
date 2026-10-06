"use client";

import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

type Props = { links: { href: string; label: string }[] };

// Section links for small screens, where the inline nav is hidden.
export function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink transition active:scale-95"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 top-16 bg-ink/10" />
          <nav id="mobile-menu" className="absolute inset-x-0 top-16 animate-fade-up border-b border-line bg-white px-4 pb-4 pt-2 shadow-card">
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center rounded-xl px-3 text-[16px] font-medium text-ink transition active:bg-surface"
              >
                {label}
              </a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
