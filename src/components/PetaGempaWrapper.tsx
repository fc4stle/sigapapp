"use client";

import dynamic from "next/dynamic";

const PetaGempa = dynamic(() => import("./PetaGempa"), { ssr: false });

export default function PetaGempaWrapper() {
  return <PetaGempa />;
}
