import gsap from "gsap";
import { useGSAP } from "@gsap/react";

let gsapRegistered = false;

export function registerGsapPlugins(): void {
  if (gsapRegistered) {
    return;
  }

  gsap.registerPlugin(useGSAP);
  gsapRegistered = true;
}

registerGsapPlugins();

export { gsap, useGSAP };
