"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef } from "react";
import { gsap, registerGsapPlugins } from "@/lib/gsap";

type GsapLenisProviderProps = {
  readonly children: React.ReactNode;
};

export function GsapLenisProvider({ children }: GsapLenisProviderProps) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    registerGsapPlugins();

    const update = (time: number) => {
      lenisRef.current?.lenis?.raf(time * 1000);
    };

    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
