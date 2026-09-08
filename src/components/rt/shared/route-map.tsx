"use client";

import { useEffect, useRef } from "react";
import { traceBounds, type GPSPoint } from "@/lib/rt/gps";
import { cn } from "@/lib/utils";

// Dynamically import leaflet only on client (avoids SSR issues)
let L: typeof import("leaflet") | null = null;
let cssLoaded = false;
if (typeof window !== "undefined") {
  // inject leaflet CSS once (avoids bundler issues with relative image paths)
  if (!cssLoaded) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    cssLoaded = true;
  }
  // @ts-expect-error — leaflet default import
  L = (await import("leaflet")).default || (await import("leaflet"));
}

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>';

interface RouteMapProps {
  points: { lat: number; lng: number; t: number }[];
  className?: string;
  /** show "start" + "end" markers */
  markers?: boolean;
  height?: number;
}

export function RouteMap({ points, className, markers = true, height = 200 }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!L || !containerRef.current || points.length === 0) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });
    mapRef.current = map;

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

    // polyline
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    const polyline = L.polyline(latlngs, {
      color: "#2bb6c4",
      weight: 4,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    layerRef.current = polyline;

    // gradient effect via a second thinner stroke
    L.polyline(latlngs, { color: "#7fe3c4", weight: 2, opacity: 0.7 }).addTo(map);

    // markers
    if (markers && latlngs.length > 0) {
      L.circleMarker(latlngs[0], { radius: 6, color: "#fff", fillColor: "#2bb6c4", fillOpacity: 1, weight: 2 }).addTo(map);
      L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: "#fff", fillColor: "#ff7a59", fillOpacity: 1, weight: 2 }).addTo(map);
    }

    // fit bounds
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    } else {
      map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, markers]);

  if (points.length === 0) {
    return (
      <div
        className={cn("grid place-items-center rounded-2xl bg-muted/40 text-sm text-muted-foreground", className)}
        style={{ height }}
      >
        Chưa có dữ liệu GPS
      </div>
    );
  }

  return <div ref={containerRef} className={cn("overflow-hidden rounded-2xl", className)} style={{ height }} />;
}
