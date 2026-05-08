import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24" style={{ background: "var(--color-background)" }}>
      <h1
        className="text-4xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", letterSpacing: "-0.02em" }}
      >
        Friluftskompis
      </h1>
      <p className="mt-4 text-lg" style={{ color: "var(--color-text-secondary)" }}>
        Din turplanlegger for Norges fjell og natur.
      </p>
      <Link
        href="/kart"
        className="mt-8 px-6 py-4 font-bold text-white transition-opacity hover:opacity-90"
        style={{
          background: "var(--color-brand)",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-ui)",
        }}
      >
        Åpne kart
      </Link>
    </main>
  );
}
