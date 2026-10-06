"use client";

import { useEffect } from "react";
import { AlertIcon, ArrowUpRight } from "./icons";

export type ModalError = {
  title: string;
  message: string;
  action?: { label: string; href: string };
};

export function ErrorModal({ error, onClose }: { error: ModalError | null; onClose: () => void }) {
  useEffect(() => {
    if (!error) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [error, onClose]);

  if (!error) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-title"
        className="w-full max-w-sm animate-fade-up rounded-2xl bg-white p-6 shadow-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertIcon className="h-5 w-5" />
        </div>
        <h2 id="error-title" className="mt-4 text-[17px] font-semibold text-ink">
          {error.title}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{error.message}</p>

        <div className="mt-6 flex gap-2">
          {error.action && (
            <a
              href={error.action.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-black text-[14px] font-medium text-white transition hover:bg-neutral-800"
            >
              {error.action.label}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          <button
            autoFocus
            onClick={onClose}
            className={`h-10 flex-1 rounded-lg text-[14px] font-medium transition ${
              error.action
                ? "border border-line text-ink hover:bg-surface"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
