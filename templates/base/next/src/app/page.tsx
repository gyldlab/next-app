import Image from "next/image";

import HeroDotGridBackground from "./components/HeroDotGridBackground";

const docLinks = [{ label: "Next.js Docs →", href: "https://nextjs.org/docs" }] as const;

const supportLinks = [
  { label: "CLI Repo →", href: "https://github.com/gyldlab/next-app" },
  { label: "Report Issue →", href: "https://github.com/gyldlab/next-app/issues/new/choose" },
  { label: "Request Add-on →", href: "https://github.com/gyldlab/next-app/issues/new/choose" },
] as const;

export default function Home() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8">
      <header className="flex items-start justify-between gap-6">
        <Image
          className="block dark:hidden"
          src="/GYLDLAB-B.svg"
          alt="GYLDLAB"
          width={57}
          height={36}
          loading="eager"
          unoptimized
        />
        <Image
          className="hidden dark:block"
          src="/GYLDLAB-W.svg"
          alt="GYLDLAB"
          width={57}
          height={36}
          loading="eager"
          unoptimized
        />
        <div className="shrink-0 text-right">
          <p className="text-[0.62rem] font-medium tracking-[0.32em] text-zinc-700 uppercase dark:text-zinc-300">
            Starter by
          </p>
          <a
            href="https://gyldlab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex flex-col items-end"
          >
            <span className="font-display text-[1.65rem] leading-none tracking-[0.08em] text-zinc-950 uppercase transition-colors dark:text-zinc-50">
              GYLDLAB
            </span>
            <span className="text-[0.72rem] tracking-[0.22em] text-zinc-700 uppercase underline-offset-4 transition-colors group-hover:underline dark:text-zinc-300">
              gyldlab.com
            </span>
          </a>
        </div>
      </header>

      <section className="relative flex flex-1 flex-col justify-center overflow-hidden py-12 sm:py-16">
        <HeroDotGridBackground />
        <div className="relative z-10 flex flex-col gap-8">
          <h1 className="font-display text-[clamp(4.5rem,15vw,11rem)] leading-none text-zinc-950 uppercase dark:text-zinc-50">
            Production-ready
            <br />
            starter.
            <br />
            Start shipping.
          </h1>

          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium tracking-[0.22em] text-zinc-700 uppercase dark:text-zinc-300">
              Get started by editing{" "}
              <code className="font-mono tracking-normal text-zinc-950 normal-case dark:text-zinc-100">
                src/app/page.tsx
              </code>
            </p>
            <p className="text-base leading-7 text-pretty text-zinc-700 dark:text-zinc-200">
              This scaffold ships with production-ready defaults. Use the docs below for your stack,
              and if the CLI needs a fix or another add-on, raise it on GitHub.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-line flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-6">
        {[...docLinks, ...supportLinks].map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            {link.label}
          </a>
        ))}
      </footer>
    </main>
  );
}
