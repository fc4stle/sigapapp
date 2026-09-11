"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createSupabaseAnonClient } from "@/lib/supabase-anon";
import AccessibleMarkers from "./AccessibleMarkers";
import { gempaKey, useGempaHover } from "./GempaHoverProvider";

interface Gempa {
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  lintang: number;
  bujur: number;
}

const YOGYAKARTA_CENTER: [number, number] = [-7.7956, 110.3695];

function getMarkerColor(magnitude: number): string {
  if (magnitude > 5) return "#ef4444";
  if (magnitude >= 4) return "#f97316";
  return "#eab308";
}

function FitAllGempa({ gempaList }: { gempaList: Gempa[] }) {
  const map = useMap();

  useEffect(() => {
    if (gempaList.length === 0) return;

    if (gempaList.length === 1) {
      map.setView([gempaList[0].lintang, gempaList[0].bujur], 8, {
        animate: true,
        duration: 1,
      });
      return;
    }

    const bounds = gempaList.map(
      (g) => [g.lintang, g.bujur] as [number, number]
    );
    requestAnimationFrame(() => {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    });
  }, [gempaList, map]);

  return null;
}

const WILAYAH_ZOOM = 10;

interface RipplePosition {
  x: number;
  y: number;
  mag: number;
  key: string;
}

function RippleMarkers({ gempaList }: { gempaList: Gempa[] }) {
  const map = useMap();
  const [positions, setPositions] = useState<RipplePosition[]>([]);

  useEffect(() => {
    const update = () => {
      const pos = gempaList
        .filter((g) => g.magnitude >= 5)
        .map((g) => {
          const point = map.latLngToContainerPoint([g.lintang, g.bujur]);
          return {
            x: point.x,
            y: point.y,
            mag: g.magnitude,
            key: `${g.lintang}_${g.bujur}`,
          };
        });
      setPositions(pos);
    };
    update();
    map.on("move zoom", update);
    return () => {
      map.off("move zoom", update);
    };
  }, [gempaList, map]);

  return (
    <>
      {positions.map((p) => (
        <div
          key={p.key}
          className="absolute pointer-events-none"
          style={{
            left: p.x - 20,
            top: p.y - 20,
            width: 40,
            height: 40,
            zIndex: 650,
          }}
        >
          <div className="w-full h-full rounded-full border-2 border-red-500 ripple-anim" />
        </div>
      ))}
    </>
  );
}

function getKedalamanSingkat(kedalaman: string): string {
  const match = kedalaman.match(/(\d+)/);
  return match ? match[1] : "";
}

// Adaptive tooltip that adjusts direction based on marker position
function AdaptiveTooltip({ lat, lng, children }: { lat: number; lng: number; children: React.ReactNode }) {
  const map = useMap();
  const [direction, setDirection] = useState<"top" | "left">("top");
  const [offset, setOffset] = useState<[number, number]>([0, -10]);

  useEffect(() => {
    const updateDirection = () => {
      const point = map.latLngToContainerPoint([lat, lng]);
      const size = map.getSize();
      const xRatio = point.x / size.x;
      
      if (xRatio > 0.7) {
        setDirection("left");
        setOffset([-10, 0]);
      } else {
        setDirection("top");
        setOffset([0, -10]);
      }
    };

    updateDirection();
    map.on("move zoom resize", updateDirection);
    return () => {
      map.off("move zoom resize", updateDirection);
    };
  }, [map, lat, lng]);

  return (
    <Tooltip key={direction} direction={direction} offset={offset} className="gempa-tooltip">
      {children}
    </Tooltip>
  );
}

export default function PetaGempa({
  center,
  gempaList: externalGempaList,
}: {
  center?: [number, number];
  gempaList?: Gempa[];
}) {
  const hasCustomCenter = center !== undefined;
  const { hoveredGempaKey } = useGempaHover();

  const [internalGempaList, setInternalGempaList] = useState<Gempa[]>([]);

  useEffect(() => {
    if (externalGempaList !== undefined) {
      setInternalGempaList(externalGempaList);
      return;
    }
    let isMounted = true;

    async function fetchGempa() {
      const supabase = createSupabaseAnonClient();
      const { data, error } = await supabase
        .from("gempa")
        .select("magnitude, kedalaman, wilayah, tanggal, jam, lintang, bujur")
        .order("date_time", { ascending: false });

      if (!error && data && isMounted) {
        setInternalGempaList(data);
      }
    }

    fetchGempa();
    return () => {
      isMounted = false;
    };
  }, [externalGempaList]);

  const gempaList = externalGempaList ?? internalGempaList;

  return (
    <div className="h-full w-full">
      <div role="application" aria-label="Peta lokasi gempa bumi terkini" className="h-full w-full">
        <MapContainer
          center={YOGYAKARTA_CENTER}
          zoom={hasCustomCenter ? WILAYAH_ZOOM : 8}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <div
            className="absolute inset-0 pointer-events-none grid-map-bg"
            style={{ zIndex: 400 }}
          />
          <FitAllGempa gempaList={gempaList} />
          <RippleMarkers gempaList={gempaList} />
          {gempaList.map((gempa) => {
            const key = gempaKey(gempa);
            const isHovered = hoveredGempaKey === key;
            return (
              <CircleMarker
                key={key}
                center={[gempa.lintang, gempa.bujur]}
                radius={isHovered ? gempa.magnitude * 2 * 1.3 : gempa.magnitude * 2}
                pathOptions={{
                  color: isHovered ? "#ffffff" : getMarkerColor(gempa.magnitude),
                  fillColor: getMarkerColor(gempa.magnitude),
                  fillOpacity: 0.7,
                  weight: isHovered ? 3 : 1.5,
                }}
              >
                <AdaptiveTooltip lat={gempa.lintang} lng={gempa.bujur}>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)" }}>
                    M{gempa.magnitude} - Kedalaman {getKedalamanSingkat(gempa.kedalaman)}km
                  </span>
                </AdaptiveTooltip>
                <Popup>
                  <div className="flex flex-col gap-1">
                    <p>Magnitude: {gempa.magnitude}</p>
                    <p>Kedalaman: {gempa.kedalaman}</p>
                    <p>Wilayah: {gempa.wilayah}</p>
                    <p>
                      Waktu: {gempa.tanggal}, {gempa.jam}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <AccessibleMarkers gempaList={gempaList} />
    </div>
  );
}
