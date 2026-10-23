import clsx from "clsx";

export function Logo({ dark = false, size = "md" }: { dark?: boolean; size?: "md" | "lg" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-bold tracking-tight", size === "lg" ? "text-3xl" : "text-xl")}>
      <svg
        viewBox="0 0 32 32"
        className={size === "lg" ? "h-10 w-10" : "h-7 w-7"}
        aria-hidden
      >
        <rect width="32" height="32" rx="9" className="fill-accent-500" />
        <circle cx="10" cy="11" r="2.6" fill="white" />
        <circle cx="16" cy="8.5" r="2.6" fill="white" />
        <circle cx="22" cy="11" r="2.6" fill="white" />
        <path d="M9.5 21.5c0-4 3-7 6.5-7s6.5 3 6.5 7c0 2.2-2 3.2-3.6 2.5-1-.4-1.9-.7-2.9-.7s-1.9.3-2.9.7c-1.6.7-3.6-.3-3.6-2.5z" fill="white" />
      </svg>
      <span className={dark ? "text-white" : "text-brand-800"}>
        mapi<span className="text-accent-500">go</span>
      </span>
    </span>
  );
}
