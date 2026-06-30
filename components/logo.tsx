import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Dispatch home">
      <span className="logo-mark">↗</span>
      <span>dispatch.</span>
    </Link>
  );
}
