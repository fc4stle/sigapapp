"use client";

import dynamic from "next/dynamic";

const PetaKualitasUdara = dynamic(() => import("./PetaKualitasUdara"), { ssr: false });

export default function PetaKualitasUdaraWrapper({
  center,
}: {
  center?: [number, number];
}) {
  return <PetaKualitasUdara center={center} />;
}
