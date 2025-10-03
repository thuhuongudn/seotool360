import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  UploadCloud,
  ImageIcon,
  MapPin,
  Info,
  Star,
  StarOff,
  Compass,
  Loader2,
  Sparkles,
  Copy,
  Check,
  FileDown,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import ExifReader from "exifreader";
import type { ChangeEvent, DragEvent } from "react";
import type { LeafletEventHandlerFn, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { format } from "date-fns";

type ExifRational = [number, number];

const DEFAULT_LAT = 16.068484;
const DEFAULT_LNG = 108.195472;
const DEFAULT_ZOOM = 13;
const MAX_FILE_SIZE_MB = 15;
const MAX_CANVAS_DIMENSION = 4000;
const JPEG_QUALITY = 0.92;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GOONG_API_KEY = "vmBdGIeUBdmUX4ARIhfa4iygOubW9A73K51syJgF";
const GOONG_GEOCODE_ENDPOINT = "https://rsapi.goong.io/geocode";
const SEARCH_THROTTLE_MS = 1500;
const DEFAULT_COPYRIGHT = "nhathuocvietnhat.vn";
const DEFAULT_ADDRESS = "224 Thái Thị Bôi, Chính Gián, Thanh Khê, Đà Nẵng";
const ALT_TEXT_MIN_LENGTH = 100;
const ALT_TEXT_MAX_LENGTH = 125;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const PRESET_LOCATIONS: Array<{ label: string; lat: number; lng: number }> = [
  { label: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  { label: "Hà Nội", lat: 21.0285, lng: 105.8542 },
  { label: "TP. Hồ Chí Minh", lat: 10.8231, lng: 106.6297 },
  { label: "Huế", lat: 16.4637, lng: 107.5909 },
  { label: "Nha Trang", lat: 12.2388, lng: 109.1967 },
];

type AltTextModel = "gemini" | "openai";

const ALT_TEXT_DEFAULT_MODEL: AltTextModel = "gemini";

interface LoadedMetadata {
  title?: string;
  subject?: string;
  author?: string;
  copyright?: string;
  keywords?: string;
  date?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

const ALT_TEXT_MODELS: Array<{ value: AltTextModel; label: string; description: string }> = [
  {
    value: "gemini",
    label: "Gemini 2.5 Flash",
    description: "Khuyến nghị – tốc độ nhanh, chi phí thấp",
  },
  {
    value: "openai",
    label: "OpenAI GPT-4o-mini",
    description: "Chất lượng cao hơn, chi phí cao hơn",
  },
];

function encodeUnicodeToXp(value: string): number[] {
  const terminated = value + "\u0000";
  const buffer: number[] = [];
  for (let i = 0; i < terminated.length; i += 1) {
    const code = terminated.charCodeAt(i);
    buffer.push(code & 0xff, (code >> 8) & 0xff);
  }
  return buffer;
}

function convertGpsToRational(deg: number): ExifRational[] {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 10000), 10000],
  ];
}

function convertExifGpsToDecimal(value: any, ref: any): number | undefined {
  if (!value || !Array.isArray(value.value) || !ref) return undefined;
  const getNumber = (entry: any) => {
    if (!entry) return 0;
    if (Array.isArray(entry)) {
      const [num = 0, den = 1] = entry;
      return Number(num) / (Number(den) || 1);
    }
    if (typeof entry === "object" && "numerator" in entry && "denominator" in entry) {
      return Number(entry.numerator) / (Number(entry.denominator) || 1);
    }
    return Number(entry) || 0;
  };

  const [deg, min, sec] = value.value as any[];
  const multiplier = ref.description === "S" || ref.description === "W" ? -1 : 1;
  const d = getNumber(deg);
  const m = getNumber(min);
  const s = getNumber(sec);
  return multiplier * (d + m / 60 + s / 3600);
}

function convertExifRating(tag: any): number | undefined {
  if (!tag) return undefined;
  const raw = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  if (typeof raw !== "number") return undefined;
  if (raw > 5) {
    return Math.round((raw / 100) * 5);
  }
  return Math.round(raw);
}

function formatExifDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/"/g, "").trim();
  if (!clean.includes(":")) return undefined;
  const parts = clean.split(/[ :]/);
  if (parts.length < 3) return undefined;
  const [year, month, day] = parts;
  const iso = `${year}-${month}-${day}`;
  if (Number.isNaN(Date.parse(iso))) return undefined;
  return iso;
}

function parseKeywords(tag: any): string | undefined {
  if (!tag) return undefined;
  if (Array.isArray(tag.value)) {
    const chars = tag.value as number[];
    const decoder = new TextDecoder("utf-16le");
    const uint = new Uint8Array(chars);
    const decoded = decoder.decode(uint).replace(/\u0000/g, "").trim();
    return decoded;
  }
  if (typeof tag.description === "string") {
    return tag.description;
  }
  return undefined;
}

function makeDateTimeOriginal(date: string) {
  try {
    return format(new Date(date), "yyyy:MM:dd HH:mm:ss");
  } catch (error) {
    return undefined;
  }
}

function sanitizeKeywords(keywords: string): string {
  return keywords
    .split(",")
    .map((item) => removeVietnameseDiacritics(item.trim()))
    .filter(Boolean)
    .join(", ");
}

const removeVietnameseDiacritics = (value: string): string =>
  value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const toAsciiFallback = (value: string): string => {
  if (!value) return "";
  const normalized = removeVietnameseDiacritics(value);
  return Array.from(normalized)
    .map((char) => (char.charCodeAt(0) <= 255 ? char : "?"))
    .join("");
};

const prepareAsciiOrTransliteration = (value: string): string => {
  if (!value) return "";
  if (!/[\u0080-\uFFFF]/.test(value)) {
    return value;
  }
  return toAsciiFallback(value);
};

const extractBase64Payload = (dataUrl: string | null): { mime: string; base64: string } | null => {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const parts = dataUrl.split(",");
  if (parts.length < 2) return null;
  const header = parts[0];
  const base64 = parts.slice(1).join(",");
  const mimeMatch = header.match(/^data:(.*?);base64$/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  if (!base64) return null;
  return { mime, base64 };
};

const sanitizeAltTextOutput = (value: string): string =>
  value
    .replace(/```[a-z]*|```/gi, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^"|"$/g, "")
    .trim();

const truncateToMaxAltLength = (value: string, maxLength = ALT_TEXT_MAX_LENGTH): string => {
  const trimmed = value.trim();
  const chars = Array.from(trimmed);
  if (chars.length <= maxLength) return trimmed;

  const limited = chars.slice(0, maxLength);
  let cutIndex = limited.length;

  for (let i = limited.length - 1; i >= 0; i -= 1) {
    if (/\s/.test(limited[i])) {
      cutIndex = i;
      break;
    }
  }

  const truncated = limited.slice(0, cutIndex > 0 ? cutIndex : limited.length);
  const result = truncated.join("").trim();
  return result.length > 0 ? result : limited.join("").trim();
};

const buildSlugFromPieces = (...parts: string[]): string => {
  const combined = parts
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join("-");

  if (!combined) return "";

  return removeVietnameseDiacritics(combined)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ImageSeoContent() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalName, setOriginalName] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<LoadedMetadata>({});
  const [metadata, setMetadata] = useState({
    title: "",
    subject: "",
    author: "",
    copyright: DEFAULT_COPYRIGHT,
    keywords: "",
    date: format(new Date(), "yyyy-MM-dd"),
    rating: 0,
  });
  const [rawKeywords, setRawKeywords] = useState("");
  const [fileSlug, setFileSlug] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [latitudeInput, setLatitudeInput] = useState(DEFAULT_LAT.toFixed(6));
  const [longitudeInput, setLongitudeInput] = useState(DEFAULT_LNG.toFixed(6));
  const [addressQuery, setAddressQuery] = useState(DEFAULT_ADDRESS);
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchAt, setLastSearchAt] = useState<number | null>(null);
  const [altTextModel, setAltTextModel] = useState<AltTextModel>(ALT_TEXT_DEFAULT_MODEL);
  const [isGeneratingAltText, setIsGeneratingAltText] = useState(false);
  const [generatedAltText, setGeneratedAltText] = useState("");
  const [altTextValue, setAltTextValue] = useState("");
  const [altTextError, setAltTextError] = useState<string | null>(null);
  const [altTextCopied, setAltTextCopied] = useState(false);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

  const selectedAltTextModelInfo = useMemo(
    () => ALT_TEXT_MODELS.find((item) => item.value === altTextModel),
    [altTextModel],
  );

  const keywordsForPrompt = useMemo(() => {
    if (rawKeywords?.trim()) return rawKeywords.trim();
    if (metadata.keywords?.trim()) return metadata.keywords.trim();
    if (extractedMetadata.keywords?.trim()) return extractedMetadata.keywords.trim();
    return "";
  }, [rawKeywords, metadata.keywords, extractedMetadata.keywords]);

  const modelIsConfigured = altTextModel === "gemini" ? Boolean(geminiApiKey) : Boolean(openAiApiKey);
  const hasImageForAltText = Boolean(processedDataUrl || imagePreview);

  const normalizedManualSlug = useMemo(
    () => (fileSlug.trim().length > 0 ? buildSlugFromPieces(fileSlug.trim()) : ""),
    [fileSlug],
  );
  const autoSlug = useMemo(
    () => buildSlugFromPieces(metadata.copyright, metadata.title),
    [metadata.copyright, metadata.title],
  );
  const effectiveSlug = normalizedManualSlug || autoSlug;
  const slugPreview = useMemo(() => {
    const base = effectiveSlug || "optimized-image";
    return base.endsWith(".jpg") ? base : `${base}.jpg`;
  }, [effectiveSlug]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const resetState = (options?: { resetMetadata?: boolean; resetLocation?: boolean }) => {
    const { resetMetadata = false, resetLocation = false } = options || {};
    setSelectedFile(null);
    setOriginalName("");
    setImagePreview(null);
    setImageMime(null);
    setProcessedDataUrl(null);
    setIsSearching(false);
    setGeneratedAltText("");
    setAltTextValue("");
    setAltTextError(null);
    setAltTextCopied(false);
    setExtractedMetadata({});

    if (resetMetadata) {
      setMetadata({
        title: "",
        subject: "",
        author: "",
        copyright: DEFAULT_COPYRIGHT,
        keywords: "",
        date: format(new Date(), "yyyy-MM-dd"),
        rating: 0,
      });
      setRawKeywords("");
      setFileSlug("");
    }

    if (resetLocation) {
      setLatitude(DEFAULT_LAT);
      setLongitude(DEFAULT_LNG);
      setLatitudeInput(String(DEFAULT_LAT));
      setLongitudeInput(String(DEFAULT_LNG));
      setAddressQuery(DEFAULT_ADDRESS);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setupMap = async () => {
      if (!mapContainerRef.current) return;
      if (mapRef.current) return;
      const leafletModule = await import("leaflet");
      if (!isMounted) return;
      leafletRef.current = leafletModule;
      const L = leafletModule;
      const defaultIcon = L.icon({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = defaultIcon;

      const mapInstance = L.map(mapContainerRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance);

      const markerInstance = L.marker([DEFAULT_LAT, DEFAULT_LNG], { draggable: true }).addTo(mapInstance);

      markerInstance.on("dragend", () => {
        const pos = markerInstance.getLatLng();
        setLatitude(pos.lat);
        setLongitude(pos.lng);
        setLatitudeInput(pos.lat.toFixed(6));
        setLongitudeInput(pos.lng.toFixed(6));
      });

      const clickHandler: LeafletEventHandlerFn = (event) => {
        const e = event as unknown as { latlng: { lat: number; lng: number } };
        markerInstance.setLatLng(e.latlng);
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
        setLatitudeInput(e.latlng.lat.toFixed(6));
        setLongitudeInput(e.latlng.lng.toFixed(6));
      };

      mapInstance.on("click", clickHandler);

      mapRef.current = mapInstance;
      markerRef.current = markerInstance;
    };

    setupMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
    if (mapRef.current) {
      mapRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!altTextCopied) return;
    const timer = window.setTimeout(() => setAltTextCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [altTextCopied]);

  useEffect(() => {
    setAltTextError(null);
  }, [altTextModel]);

  const loadExifData = useCallback(async (file: File) => {
    try {
      const tags = (await ExifReader.load(file, { expanded: true })) as Record<string, any>;
      const loaded: LoadedMetadata = {};

      const title = tags["ImageDescription"]?.description || tags["XPTitle"]?.description;
      if (title) loaded.title = title;

      const subject = tags["XPSubject"]?.description;
      if (subject) loaded.subject = subject;

      const artist = tags["Artist"]?.description;
      if (artist) loaded.author = artist;

      const copyright = tags["Copyright"]?.description;
      if (copyright) loaded.copyright = copyright;

      const keywords = parseKeywords(tags["XPKeywords"]) || tags["Keywords"]?.description;
      if (keywords) loaded.keywords = sanitizeKeywords(keywords);

      const date = formatExifDate(tags["DateTimeOriginal"]?.description || tags["SubSecDateTimeOriginal"]?.description);
      if (date) loaded.date = date;

      const rating = convertExifRating(tags["Rating"] || tags["RatingPercent"]);
      if (rating !== undefined) loaded.rating = rating;

      const lat = convertExifGpsToDecimal(tags["GPSLatitude"], tags["GPSLatitudeRef"]);
      const lng = convertExifGpsToDecimal(tags["GPSLongitude"], tags["GPSLongitudeRef"]);
      if (lat !== undefined && lng !== undefined) {
        loaded.latitude = lat;
        loaded.longitude = lng;
      }

      setExtractedMetadata(loaded);
      setMetadata((prev) => ({
        title: loaded.title ?? prev.title,
        subject: loaded.subject ?? prev.subject,
        author: loaded.author ?? prev.author,
        copyright: loaded.copyright ?? prev.copyright,
        keywords: loaded.keywords ?? prev.keywords,
        date: loaded.date ?? prev.date,
        rating: loaded.rating ?? prev.rating,
      }));
      if (loaded.keywords) {
        setRawKeywords(loaded.keywords);
      }

      if (loaded.latitude !== undefined && loaded.longitude !== undefined) {
        setLatitude(loaded.latitude);
        setLongitude(loaded.longitude);
        setLatitudeInput(loaded.latitude.toFixed(6));
        setLongitudeInput(loaded.longitude.toFixed(6));
        setAddressQuery("Toạ độ từ metadata ảnh");
      }
    } catch (error) {
      console.warn("Không thể đọc metadata từ ảnh:", error);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast({
        title: "Định dạng không hỗ trợ",
        description: "Vui lòng chọn ảnh JPG, PNG hoặc WEBP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "Ảnh quá lớn",
        description: `Kích thước tối đa ${MAX_FILE_SIZE_MB}MB để đảm bảo xử lý nhanh chóng.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setOriginalName(file.name);
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString();
      if (result) {
        setImagePreview(result);
        loadExifData(file);
      }
    };
    reader.readAsDataURL(file);
  }, [loadExifData, toast]);

  const handleInputChange = (field: keyof typeof metadata) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (field === "keywords") {
      setRawKeywords(value);
      setMetadata((prev) => ({ ...prev, keywords: value }));
    } else {
      setMetadata((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleKeywordsBlur = () => {
    const cleaned = sanitizeKeywords(rawKeywords);
    setRawKeywords(cleaned);
    setMetadata((prev) => ({ ...prev, keywords: cleaned }));
  };

  const handleRatingChange = (value: number) => {
    setMetadata((prev) => ({ ...prev, rating: prev.rating === value ? 0 : value }));
  };

  const handleAddressSearch = useCallback(async () => {
    const trimmed = addressQuery.trim();
    if (!trimmed) {
      toast({
        title: "Vui lòng nhập địa điểm",
        description: "Bạn có thể nhập toạ độ hoặc tên thành phố (VD: Hà Nội).",
        variant: "destructive",
      });
      return;
    }

    const now = Date.now();
    if (lastSearchAt && now - lastSearchAt < SEARCH_THROTTLE_MS) {
      toast({
        title: "Tìm kiếm quá nhanh",
        description: "Vui lòng chờ giây lát trước khi tìm kiếm lại.",
        variant: "destructive",
      });
      return;
    }

    const updateCoordinates = (lat: number, lng: number, label: string, description?: string) => {
      setLatitude(lat);
      setLongitude(lng);
      const latFixed = lat.toFixed(6);
      const lngFixed = lng.toFixed(6);
      setLatitudeInput(latFixed);
      setLongitudeInput(lngFixed);
      setAddressQuery(label);
      toast({
        title: "Đã cập nhật toạ độ",
        description: description ?? `Toạ độ: ${latFixed}, ${lngFixed}`,
      });
    };

    setLastSearchAt(now);
    setIsSearching(true);

    try {
      const coordinateMatch = trimmed.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
      if (coordinateMatch) {
        const lat = parseFloat(coordinateMatch[1]);
        const lng = parseFloat(coordinateMatch[2]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          updateCoordinates(lat, lng, trimmed, `Đã sử dụng toạ độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          return;
        }
      }

      let apiResultApplied = false;
      let apiErrorType: "network" | "zero-results" | "invalid-response" | null = null;

      try {
        const response = await fetch(`${GOONG_GEOCODE_ENDPOINT}?address=${encodeURIComponent(trimmed)}&api_key=${GOONG_API_KEY}`);
        if (!response.ok) {
          apiErrorType = "network";
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          const best = data.results[0];
          const lat = best?.geometry?.location?.lat;
          const lng = best?.geometry?.location?.lng;
          if (typeof lat === "number" && typeof lng === "number") {
            const formatted = typeof best?.formatted_address === "string" ? best.formatted_address : trimmed;
            updateCoordinates(lat, lng, formatted, `Đã tìm thấy: ${formatted}`);
            apiResultApplied = true;
            return;
          }
          apiErrorType = "invalid-response";
        } else {
          apiErrorType = data?.status === "ZERO_RESULTS" ? "zero-results" : "invalid-response";
        }
      } catch (geoError) {
        if (!apiErrorType) {
          apiErrorType = "network";
        }
        console.error("Goong geocode error:", geoError);
      }

      if (!apiResultApplied) {
        const lowerTrimmed = trimmed.toLowerCase();
        const preset = PRESET_LOCATIONS.find((location) => lowerTrimmed.includes(location.label.toLowerCase()));
        if (preset) {
          updateCoordinates(preset.lat, preset.lng, preset.label, `Không tìm thấy địa chỉ cụ thể. Đã sử dụng vị trí ${preset.label}.`);
          return;
        }

        const errorDescription =
          apiErrorType === "network"
            ? "Không thể kết nối dịch vụ định vị. Vui lòng kiểm tra mạng và thử lại."
            : apiErrorType === "zero-results"
            ? "Không tìm thấy địa điểm. Hãy thử nhập địa chỉ khác hoặc sử dụng toạ độ."
            : "Không thể xác định địa điểm. Bạn có thể nhập toạ độ (ví dụ: 16.0544, 108.2022) hoặc chọn thành phố ở Việt Nam.";

        toast({
          title: "Không tìm thấy địa điểm",
          description: errorDescription,
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [addressQuery, lastSearchAt, toast]);

  const composeAltTextPrompt = () => {
    const title = metadata.title || extractedMetadata.title || "Không có";
    const subject = metadata.subject || extractedMetadata.subject || "Không có";
    const keywords = keywordsForPrompt || "Không có";
    const copyright = metadata.copyright || extractedMetadata.copyright || DEFAULT_COPYRIGHT;

    const prompt = `Bạn là chuyên gia SEO & marketing. Dựa vào ảnh và thông tin sau, tạo alt text tối ưu SEO:\n\nThông tin sản phẩm:\n\n* Tiêu đề: ${title}\n* Chủ đề: ${subject}\n* Từ khóa: ${keywords}\n* Bản quyền: ${copyright}\n\nYêu cầu alt text:\n\n1. Bắt đầu bằng thông tin "{bản quyền}-" (bắt buộc)\n2. Mô tả chính xác nội dung ảnh, tập trung vào chủ thể & đặc điểm nổi bật liên quan sản phẩm, nếu ảnh là sản phẩm, thì tập trung vào thành phần và công dụng sản phẩm ở phần chủ đề và từ khoá để xây dựng mô tả (Ví dụ sai: Buonavit Baby vitamin tổng hợp nhỏ giọt 20ml mẫu mới, cho trẻ 0 tháng tuổi. Gồm lọ sản phẩm, ống và vỏ; ví dụ đúng: Buonavit Baby vitamin tổng hợp nhỏ giọt 20ml mẫu mới, cho trẻ 0 tháng tuổi. bổ sung vitamin tổng hợp cho trẻ sơ sinh) \n3. Ngôn ngữ tự nhiên, dễ đọc cho người dùng, phù hợp với ngôn ngữ trang (ví dụ tiếng Việt nếu trang tiếng Việt)\n4. Chứa từ khóa chính (nếu phù hợp tự nhiên) nhưng tránh nhồi nhét\n5. Độ dài tối ưu từ **cỡ 100 tới 125 ký tự** (bao gồm bản quyền), đủ chi tiết nhưng ngắn gọn\n6. Không bắt đầu bằng “Image of/Photo of/Ảnh của…” — vì đã rõ là alt text\n7. Nếu ảnh trang trí hoặc không có thông tin quan trọng thì alt=”” (nếu phù hợp)\n8. Tuân thủ tiêu chuẩn Google/Image SEO & tiêu chí trợ năng\n\nChỉ trả về alt text, không giải thích thêm.`;

    return {
      prompt,
    };
  };

  const handleGenerateAltText = async () => {
    if (!hasImageForAltText) {
      const message = "Vui lòng tải ảnh trước khi tạo alt text.";
      setAltTextError(message);
      toast({ title: "Thiếu ảnh", description: message, variant: "destructive" });
      return;
    }

    if (!modelIsConfigured) {
      const message =
        altTextModel === "gemini"
          ? "Vui lòng cấu hình GEMINI_API_KEY trong .env.local."
          : "Vui lòng cấu hình OPENAI_API_KEY trong .env.local.";
      setAltTextError(message);
      toast({ title: "Chưa cấu hình API", description: message, variant: "destructive" });
      return;
    }

    const imagePayload = extractBase64Payload(processedDataUrl || imagePreview);
    if (!imagePayload) {
      const message = "Không thể đọc dữ liệu ảnh. Hãy thử tải lại ảnh.";
      setAltTextError(message);
      toast({ title: "Lỗi ảnh", description: message, variant: "destructive" });
      return;
    }

    const { prompt } = composeAltTextPrompt();

    setIsGeneratingAltText(true);
    setAltTextError(null);
    setAltTextCopied(false);

    try {
      let responseText = "";

      if (altTextModel === "gemini") {
        if (!geminiApiKey) {
          throw new Error("GEMINI_API_KEY_MISSING");
        }

        const response = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: imagePayload.mime,
                      data: imagePayload.base64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const apiMessage = data?.error?.message || `Gemini trả về lỗi ${response.status}`;
          throw new Error(apiMessage);
        }

        const parts = data?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          responseText = parts
            .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
            .join(" ")
            .trim();
        }
      } else {
        if (!openAiApiKey) {
          throw new Error("OPENAI_API_KEY_MISSING");
        }

        const response = await fetch(OPENAI_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${imagePayload.mime};base64,${imagePayload.base64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 180,
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const apiMessage = data?.error?.message || `OpenAI trả về lỗi ${response.status}`;
          throw new Error(apiMessage);
        }

        const messageContent = data?.choices?.[0]?.message?.content;
        if (typeof messageContent === "string") {
          responseText = messageContent;
        } else if (Array.isArray(messageContent)) {
          responseText = messageContent
            .map((item: any) => (typeof item?.text === "string" ? item.text : ""))
            .join(" ")
            .trim();
        }
      }

      if (!responseText) {
        throw new Error("EMPTY_RESPONSE");
      }

      const cleaned = sanitizeAltTextOutput(responseText);
      const formatted = truncateToMaxAltLength(cleaned);

      setGeneratedAltText(formatted);
      setAltTextValue(formatted);
      toast({
        title: "Đã tạo alt text",
        description: "Alt text đã sẵn sàng. Bạn có thể chỉnh sửa hoặc sao chép để sử dụng.",
      });
    } catch (error: unknown) {
      console.error("Alt text generation error", error);
      let message = "Không thể tạo alt text, vui lòng thử lại sau.";
      if (error instanceof Error) {
        if (error.message === "GEMINI_API_KEY_MISSING") {
          message = "Vui lòng cấu hình GEMINI_API_KEY trong .env.local.";
        } else if (error.message === "OPENAI_API_KEY_MISSING") {
          message = "Vui lòng cấu hình OPENAI_API_KEY trong .env.local.";
        } else if (error.message === "EMPTY_RESPONSE") {
          message = "AI không trả về kết quả. Hãy thử nhập thêm thông tin hoặc chọn model khác.";
        } else if (error.message.trim().length > 0) {
          message = error.message;
        }
      }
      setAltTextError(message);
      toast({ title: "Tạo alt text thất bại", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingAltText(false);
    }
  };

  const handleCopyAltText = async () => {
    if (!altTextValue.trim()) {
      toast({
        title: "Chưa có alt text",
        description: "Hãy tạo (hoặc nhập) alt text trước khi sao chép.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!navigator?.clipboard) {
        throw new Error("CLIPBOARD_UNAVAILABLE");
      }
      await navigator.clipboard.writeText(altTextValue.trim());
      setAltTextCopied(true);
      toast({
        title: "Đã sao chép alt text",
        description: "Dán alt text vào thuộc tính alt khi tải ảnh lên website.",
      });
    } catch (copyError) {
      console.error("Copy alt text failed", copyError);
      const message =
        copyError instanceof Error && copyError.message === "CLIPBOARD_UNAVAILABLE"
          ? "Trình duyệt không hỗ trợ copy tự động. Bạn hãy chọn và sao chép thủ công."
          : "Không thể sao chép alt text. Hãy thử lại.";
      toast({ title: "Sao chép thất bại", description: message, variant: "destructive" });
    }
  };

  const handleApplyAltText = () => {
    if (!generatedAltText) {
      toast({
        title: "Chưa có alt text AI",
        description: "Hãy nhấn \"Tạo Alt Text\" để AI gợi ý trước.",
        variant: "destructive",
      });
      return;
    }
    setAltTextValue(generatedAltText);
    setAltTextCopied(false);
    toast({
      title: "Đã áp dụng alt text",
      description: "Alt text AI đã được chèn vào khung nhập để bạn chỉnh sửa hoặc sao chép.",
    });
  };

  const handleCoordinateInput = (type: "lat" | "lng") => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (type === "lat") {
      setLatitudeInput(value);
    } else {
      setLongitudeInput(value);
    }

    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      if (type === "lat") setLatitude(parsed);
      else setLongitude(parsed);
    }
  };

  const processImage = useCallback(async () => {
    if (!selectedFile || !imagePreview) {
      toast({
        title: "Chưa có ảnh",
        description: "Vui lòng tải lên một ảnh trước khi xử lý.",
        variant: "destructive",
      });
      return;
    }

    const sanitizeForProcessing = sanitizeKeywords(rawKeywords || metadata.keywords || "");

    const sanitizeLatitude = (value: number): number | null => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }
      if (value < -90 || value > 90) {
        return null;
      }
      return value;
    };

    const sanitizeLongitude = (value: number): number | null => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }
      if (value < -180 || value > 180) {
        return null;
      }
      return value;
    };

    const normalizeGpsComponents = (raw: any, originalDecimal: number): ExifRational[] => {
      if (!Array.isArray(raw)) {
        return convertGpsToRational(originalDecimal);
      }
      return raw.map((entry: any): ExifRational => {
        if (Array.isArray(entry)) {
          const [num = 0, den = 1] = entry;
          return [Math.round(Number(num)), Math.round(Number(den) || 1)];
        }
        if (entry && typeof entry === "object" && "numerator" in entry && "denominator" in entry) {
          const num = Math.round(Number(entry.numerator));
          const den = Math.round(Number(entry.denominator) || 1);
          return [num, den];
        }
        const numeric = Number(entry) || 0;
        return [Math.round(numeric), 1];
      });
    };

    const mapExifError = (code: string) => {
      switch (code) {
        case "piexif-unavailable":
          return {
            title: "Lỗi tải thư viện",
            description: "Không thể tải thư viện xử lý EXIF. Vui lòng tải lại trang và thử lại.",
          };
        case "piexif-load":
          return {
            title: "Không thể đọc metadata",
            description: "Không thể đọc metadata hiện tại từ ảnh. Ảnh có thể đã bị hỏng hoặc không chứa EXIF hợp lệ.",
          };
        case "piexif-dump":
          return {
            title: "Không thể tạo metadata mới",
            description: "Có lỗi khi tạo dữ liệu metadata mới cho ảnh. Hãy thử ảnh khác hoặc giảm dung lượng.",
          };
        case "piexif-insert":
          return {
            title: "Không thể nhúng metadata",
            description: "Có lỗi khi nhúng metadata vào ảnh. Hãy thử chuyển đổi ảnh sang JPG và thử lại.",
          };
        case "canvas-conversion":
          return {
            title: "Không thể chuyển đổi ảnh",
            description: "Ảnh quá lớn hoặc định dạng không được hỗ trợ. Hãy dùng ảnh nhỏ hơn hoặc định dạng JPG/PNG/WebP.",
          };
        case "image-validate":
          return {
            title: "Ảnh không hợp lệ sau xử lý",
            description: "Ảnh đầu ra không thể mở được. Vui lòng thử lại với ảnh khác hoặc kích thước nhỏ hơn.",
          };
        default:
          return {
            title: "Không thể xử lý ảnh",
            description: "Đã xảy ra lỗi không xác định. Hãy thử tải lại trang hoặc dùng ảnh khác.",
          };
      }
    };

    const validateDataUrl = (dataUrl: string) =>
      new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.onload = () => resolve();
        testImg.onerror = (event) => reject(event);
        testImg.src = dataUrl;
      });

    try {
      setIsProcessing(true);
      console.log("=== COMPREHENSIVE EXIF DIAGNOSTIC START ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Browser:", typeof navigator !== "undefined" ? navigator.userAgent : "unknown");
      console.log("Selected image info:", {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
      });
      console.log("Image preview prefix:", imagePreview.slice(0, 80));
      console.log("Metadata snapshot:", metadata);
      console.log("Raw keywords:", rawKeywords);
      console.log("Coordinates snapshot:", { latitude, longitude });

      const { default: piexif } = await import("piexifjs");
      const piexifAny = piexif as Record<string, any>;
      if (!piexifAny || typeof piexifAny.load !== "function" || typeof piexifAny.dump !== "function" || typeof piexifAny.insert !== "function") {
        throw new Error("piexif-unavailable");
      }

      const ImageIFD = piexifAny.ImageIFD;
      const ExifIFD = piexifAny.ExifIFD;
      const GPSIFD = piexifAny.GPSIFD;
      const GPSHelper = piexifAny.GPSHelper;
      console.log("=== PIEXIFJS LIBRARY ANALYSIS ===");
      console.log("Piexif type:", typeof piexifAny);
      console.log("Available properties:", Object.keys(piexifAny));
      console.log("Method availability:", {
        load: typeof piexifAny.load,
        dump: typeof piexifAny.dump,
        insert: typeof piexifAny.insert,
        GPSHelper: typeof GPSHelper,
      });
      try {
        const testExif: any = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {} };
        const testDump = piexifAny.dump(testExif);
        console.log("Basic piexif.dump test SUCCESS", testDump.length, "bytes");
      } catch (basicError) {
        console.error("Basic piexif.dump test FAILED", basicError);
      }

      const ensureJpeg = async (): Promise<string> => {
        console.log("=== STEP 1: IMAGE DATA PREPARATION ===");
        if (imageMime === "image/jpeg" || imagePreview.startsWith("data:image/jpeg")) {
          console.log("Ảnh đã ở định dạng JPEG, không cần chuyển đổi");
          return imagePreview;
        }
        const converted = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.src = imagePreview;
          img.onload = () => {
            try {
              let targetWidth = img.naturalWidth;
              let targetHeight = img.naturalHeight;
              const maxDim = Math.max(targetWidth, targetHeight);
              if (maxDim > MAX_CANVAS_DIMENSION) {
                const scale = MAX_CANVAS_DIMENSION / maxDim;
                targetWidth = Math.round(targetWidth * scale);
                targetHeight = Math.round(targetHeight * scale);
                console.log("[image-seo] Thu nhỏ ảnh để phù hợp EXIF", {
                  originalWidth: img.naturalWidth,
                  originalHeight: img.naturalHeight,
                  targetWidth,
                  targetHeight,
                });
              }
              const canvas = document.createElement("canvas");
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("canvas-conversion"));
                return;
              }
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
              console.log("Canvas conversion completed", { dataUrlPrefix: dataUrl.slice(0, 50) });
              resolve(dataUrl);
            } catch (canvasError) {
              reject(canvasError instanceof Error ? canvasError : new Error("canvas-conversion"));
            }
          };
          img.onerror = (event) => reject(event instanceof Error ? event : new Error("canvas-conversion"));
        });
        return converted;
      };

      let baseDataUrl: string;
      try {
        baseDataUrl = await ensureJpeg();
        console.log("Base data URL length:", baseDataUrl.length);
      } catch (conversionError) {
        console.error("[image-seo] Lỗi chuyển đổi ảnh sang JPG", conversionError);
        throw new Error(conversionError instanceof Error ? conversionError.message : "canvas-conversion");
      }

      let exifData;
      try {
        exifData = piexifAny.load(baseDataUrl);
        console.log("EXIF load SUCCESS", {
          zerothKeys: Object.keys(exifData["0th"] || {}),
          exifKeys: Object.keys(exifData["Exif"] || {}),
          gpsKeys: Object.keys(exifData["GPS"] || {}),
        });
      } catch (loadError) {
        console.error("[image-seo] piexifAny.load thất bại", loadError);
        throw new Error("piexif-load");
      }

      exifData["0th"] = exifData["0th"] || {};
      exifData["Exif"] = exifData["Exif"] || {};
      exifData["GPS"] = exifData["GPS"] || {};

      const asciiTitle = prepareAsciiOrTransliteration(metadata.title);
      const asciiAuthor = prepareAsciiOrTransliteration(metadata.author);
      const asciiCopyright = prepareAsciiOrTransliteration(metadata.copyright);

      try {
        exifData["0th"][ImageIFD.ImageDescription] = asciiTitle;
        console.log("Set ImageDescription", asciiTitle);
      } catch (err) {
        console.error("Set ImageDescription failed", err);
      }
      try {
        exifData["0th"][ImageIFD.Artist] = asciiAuthor;
        console.log("Set Artist", asciiAuthor);
      } catch (err) {
        console.error("Set Artist failed", err);
      }
      try {
        exifData["0th"][ImageIFD.Copyright] = asciiCopyright;
      } catch (err) {
        console.error("Set Copyright failed", err);
      }
      try {
        exifData["0th"][ImageIFD.XPTitle] = encodeUnicodeToXp(metadata.title);
      } catch (err) {
        console.error("Set XPTitle failed", err);
      }
      try {
        exifData["0th"][ImageIFD.XPSubject] = encodeUnicodeToXp(metadata.subject);
      } catch (err) {
        console.error("Set XPSubject failed", err);
      }
      try {
        exifData["0th"][ImageIFD.XPKeywords] = encodeUnicodeToXp(sanitizeForProcessing);
      } catch (err) {
        console.error("Set XPKeywords failed", err);
      }
      try {
        exifData["0th"][ImageIFD.Rating] = metadata.rating;
        exifData["0th"][ImageIFD.RatingPercent] = metadata.rating * 20;
      } catch (err) {
        console.error("Set Rating failed", err);
      }

      const dateTimeOriginal = makeDateTimeOriginal(metadata.date);
      if (dateTimeOriginal) {
        try {
          exifData["Exif"][ExifIFD.DateTimeOriginal] = dateTimeOriginal;
          exifData["Exif"][ExifIFD.DateTimeDigitized] = dateTimeOriginal;
        } catch (err) {
          console.error("Set DateTimeOriginal failed", err);
        }
      }

      const sanitizedLat = sanitizeLatitude(latitude);
      const sanitizedLng = sanitizeLongitude(longitude);
      if (sanitizedLat !== null && sanitizedLng !== null) {
        const latRef = sanitizedLat >= 0 ? "N" : "S";
        const lngRef = sanitizedLng >= 0 ? "E" : "W";
        try {
          const latRaw = GPSHelper && typeof GPSHelper.degToDmsRational === "function"
            ? GPSHelper.degToDmsRational(Math.abs(sanitizedLat))
            : convertGpsToRational(sanitizedLat);
          const lngRaw = GPSHelper && typeof GPSHelper.degToDmsRational === "function"
            ? GPSHelper.degToDmsRational(Math.abs(sanitizedLng))
            : convertGpsToRational(sanitizedLng);
          const latDms = normalizeGpsComponents(latRaw, sanitizedLat);
          const lngDms = normalizeGpsComponents(lngRaw, sanitizedLng);
          exifData["GPS"][GPSIFD.GPSVersionID] = [2, 3, 0, 0];
          exifData["GPS"][GPSIFD.GPSMapDatum] = "WGS-84";
          exifData["GPS"][GPSIFD.GPSLatitudeRef] = latRef;
          exifData["GPS"][GPSIFD.GPSLatitude] = latDms;
          exifData["GPS"][GPSIFD.GPSLongitudeRef] = lngRef;
          exifData["GPS"][GPSIFD.GPSLongitude] = lngDms;
          console.log("Set GPS tags", { latRef, lngRef, latDms, lngDms });
        } catch (err) {
          console.error("Set GPS tags failed", err, { latitude: sanitizedLat, longitude: sanitizedLng });
        }
      } else {
        console.warn("GPS values invalid, skipping EXIF GPS tags", { latitude, longitude });
      }

      let exifBytes: string;
      try {
        console.log("Final EXIF object before dump:", JSON.stringify(exifData, null, 2));
        exifBytes = piexifAny.dump(exifData);
        console.log("[image-seo] piexifAny.dump thành công", exifBytes.length);
      } catch (dumpError) {
        console.error("[image-seo] piexifAny.dump thất bại", dumpError);
        throw new Error("piexif-dump");
      }

      let finalDataUrl: string;
      try {
        finalDataUrl = piexifAny.insert(exifBytes, baseDataUrl);
        console.log("[image-seo] piexif.insert thành công", { finalLength: finalDataUrl.length });
        try {
          const verifyExif = piexifAny.load(finalDataUrl);
          console.log("[image-seo] EXIF sau insert", verifyExif.GPS);
        } catch (verifyError) {
          console.warn("[image-seo] Không thể load EXIF sau insert để kiểm tra", verifyError);
        }
      } catch (insertError) {
        console.error("[image-seo] piexifAny.insert thất bại", insertError);
        throw new Error("piexif-insert");
      }

      try {
        await validateDataUrl(finalDataUrl);
      } catch (validationError) {
        console.error("[image-seo] Ảnh đầu ra không hợp lệ", validationError);
        throw new Error("image-validate");
      }

      setProcessedDataUrl(finalDataUrl);
      setMetadata((prev) => ({ ...prev, keywords: sanitizeForProcessing }));
      setRawKeywords(sanitizeForProcessing);

      toast({
        title: "Đã chèn metadata",
        description: "Ảnh của bạn đã được tối ưu hóa với thông tin SEO và Geotag.",
      });
      console.log("[image-seo] Hoàn tất xử lý ảnh", { finalSize: finalDataUrl.length });
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : "unknown";
      const message = mapExifError(errorCode);
      if (!(error instanceof Error && error.message === "canvas-conversion")) {
        console.error("[image-seo] Lỗi xử lý ảnh", error);
      }
      toast({
        title: message.title,
        description: message.description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageMime, imagePreview, latitude, longitude, metadata, rawKeywords, selectedFile, toast]);

  const handleDownload = () => {
    if (!processedDataUrl) {
      toast({
        title: "Chưa có ảnh tối ưu",
        description: "Nhấn \"Xử lý và Tải về\" để tạo ảnh đã gắn metadata trước.",
        variant: "destructive",
      });
      return;
    }
    const effectiveBaseSlug = effectiveSlug || `optimized-image-${Date.now()}`;
    const normalizedBase = effectiveBaseSlug.toLowerCase().endsWith(".jpg")
      ? effectiveBaseSlug
      : `${effectiveBaseSlug}.jpg`;
    downloadDataUrl(processedDataUrl, normalizedBase);
  };

  const ratingStars = useMemo(() => {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      const isActive = metadata.rating >= i;
      stars.push(
        <button
          type="button"
          key={i}
          onClick={() => handleRatingChange(i)}
          className={`flex h-9 w-9 items-center justify-center rounded-md border transition ${
            isActive ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-border text-muted-foreground hover:text-amber-500"
          }`}
        >
          {isActive ? <Star className="h-5 w-5 fill-amber-500 text-amber-500" /> : <StarOff className="h-5 w-5" />}
        </button>,
      );
    }
    return stars;
  }, [metadata.rating]);

  const previewSection = imagePreview ? (
    <div className="relative overflow-hidden rounded-lg border bg-muted/40">
      <img src={imagePreview} alt="Xem trước ảnh" className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 p-8 text-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Xem trước ảnh sẽ xuất hiện ở đây sau khi bạn tải tệp lên.</p>
    </div>
  );

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Geotag là gì?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Geotag là việc gắn thông tin tọa độ GPS (vĩ độ, kinh độ) hoặc địa điểm cụ thể vào metadata của ảnh."
        }
      },
      {
        "@type": "Question",
        "name": "Geotag có ảnh hưởng đến SEO không?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Có. Geotag giúp ảnh và nội dung liên quan dễ xuất hiện trong kết quả tìm kiếm local và Google Maps."
        }
      },
      {
        "@type": "Question",
        "name": "SEO ảnh cần tối ưu những gì ngoài geotag?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ngoài geotag, bạn nên tối ưu tên file, alt text, metadata EXIF, caption và sitemap hình ảnh."
        }
      },
      {
        "@type": "Question",
        "name": "Cách kiểm tra một ảnh đã có geotag hay chưa?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bạn có thể dùng công cụ như ExifTool, Geoimgr hoặc kiểm tra thuộc tính ảnh trên máy tính hoặc điện thoại."
        }
      },
      {
        "@type": "Question",
        "name": "Làm sao để xóa geotag nếu không muốn chia sẻ vị trí?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Có thể xóa bằng phần mềm quản lý EXIF hoặc cài đặt quyền riêng tư trong điện thoại trước khi tải ảnh lên."
        }
      },
      {
        "@type": "Question",
        "name": "Geotag có rủi ro bảo mật không?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Có. Nếu không kiểm soát, ảnh chụp có thể tiết lộ vị trí cá nhân. Doanh nghiệp nên chỉ dùng geotag cho ảnh marketing chính thức."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Tối ưu Metadata & Geotag ảnh" }]} backLink="/" />

        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-4 py-1 text-sm font-medium text-emerald-600 mb-4">
            <ImageIcon className="h-4 w-4" />
            Công cụ tối ưu ảnh SEO & Geotag miễn phí
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tối ưu <span className="text-emerald-600">metadata & geotag</span> cho ảnh trong vài bước
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Tải ảnh lên, điền thông tin SEO, chọn vị trí trên bản đồ và tải về ảnh đã được nhúng metadata lẫn toạ độ địa lý.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tải ảnh & xem trước</CardTitle>
                <CardDescription>
                  Hỗ trợ JPG, PNG, WEBP. Nếu không phải JPG, ảnh sẽ được chuyển đổi sang JPG trước khi nhúng metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label
                  htmlFor="image-upload"
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/40 p-6 text-center cursor-pointer transition hover:border-emerald-400"
                >
                  <UploadCloud className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Kéo thả ảnh hoặc nhấp để chọn tệp</p>
                    <p className="text-sm text-muted-foreground">Kích thước tối đa {MAX_FILE_SIZE_MB}MB • Định dạng: JPG, PNG, WEBP</p>
                  </div>
                  <Input id="image-upload" type="file" accept={SUPPORTED_TYPES.join(",")} className="hidden" onChange={onFileInputChange} />
                </label>

                {originalName ? (
                  <div className="space-y-3 rounded-md border bg-background p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate" title={originalName}>
                        {originalName}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Đã tải lên thành công – bạn có thể tiếp tục chỉnh metadata bên dưới.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetState({ resetMetadata: false, resetLocation: false })}
                        className="w-full sm:w-auto self-start"
                      >
                        <RefreshCcw className="h-4 w-4 mr-1" />
                        Đổi ảnh khác
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetState({ resetMetadata: true, resetLocation: true })}
                        className="w-full sm:w-auto self-start"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xoá tất cả thông tin
                      </Button>
                    </div>
                  </div>
                ) : null}

                {previewSection}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lợi ích khi tối ưu Metadata & Geotag cho SEO hình ảnh</CardTitle>
                <CardDescription>
                  Một bức ảnh được tối ưu tốt với metadata và geotag sẽ trở thành nguồn traffic chất lượng từ Google Images và gia tăng độ tin cậy cho toàn bộ nội dung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Metadata giống như "hồ sơ lý lịch" của ảnh, giúp công cụ tìm kiếm hiểu rõ nội dung, tác giả, bản quyền và ngữ cảnh sử dụng.
                  Trong khi đó, geotag gắn kết ảnh với vị trí cụ thể (tọa độ GPS), đặc biệt hữu ích cho SEO local của doanh nghiệp.
                </p>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Ưu điểm khi tối ưu metadata và geotag:</h4>
                  <ul className="list-none space-y-2 pl-0">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">📷</span>
                      <div>
                        <strong>SEO ảnh:</strong> Tăng cơ hội xuất hiện trong Google Images nhờ tiêu đề, alt text và từ khóa chính xác.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">📍</span>
                      <div>
                        <strong>Geotag ảnh:</strong> Liên kết trực tiếp hình ảnh với địa điểm kinh doanh, hỗ trợ SEO Local trên Google Maps và Google Business Profile.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">🛡️</span>
                      <div>
                        <strong>Bản quyền & tác giả:</strong> Ghi rõ tác giả, ngày chụp và bản quyền ngay trong file ảnh, hạn chế việc sao chép trái phép.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">🔍</span>
                      <div>
                        <strong>Ngữ cảnh rõ ràng:</strong> Metadata bổ sung thông tin về ngày chụp, chủ đề và thiết bị, giúp Google và người dùng tin tưởng hơn.
                      </div>
                    </li>
                  </ul>
                  <p className="pt-2">
                    👉 Nếu bạn muốn cách SEO hình ảnh lên Google hiệu quả, hãy kết hợp: <strong>tên file chuẩn SEO</strong>,
                    <strong> alt text giàu từ khóa</strong>, <strong>metadata đầy đủ</strong> và <strong>geotag chính xác</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>❓ Câu hỏi thường gặp (FAQ)</CardTitle>
                <CardDescription>
                  Giải đáp những thắc mắc phổ biến về geotag và SEO hình ảnh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-4">
                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>Geotag là gì?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Geotag là việc gắn thông tin tọa độ GPS (vĩ độ, kinh độ) hoặc địa điểm cụ thể vào metadata của ảnh.
                    </p>
                  </details>

                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>Geotag có ảnh hưởng đến SEO không?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Có. Geotag giúp ảnh và nội dung liên quan dễ xuất hiện trong kết quả tìm kiếm local và Google Maps.
                    </p>
                  </details>

                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>SEO ảnh cần tối ưu những gì ngoài geotag?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Ngoài geotag, bạn nên tối ưu tên file, alt text, metadata EXIF, caption và sitemap hình ảnh.
                    </p>
                  </details>

                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>Cách kiểm tra một ảnh đã có geotag hay chưa?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Bạn có thể dùng công cụ như ExifTool, Geoimgr hoặc kiểm tra thuộc tính ảnh trên máy tính hoặc điện thoại.
                    </p>
                  </details>

                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>Làm sao để xóa geotag nếu không muốn chia sẻ vị trí?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Có thể xóa bằng phần mềm quản lý EXIF hoặc cài đặt quyền riêng tư trong điện thoại trước khi tải ảnh lên.
                    </p>
                  </details>

                  <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-500 transition-colors">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>Geotag có rủi ro bảo mật không?</span>
                      <span className="text-emerald-600 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                      Có. Nếu không kiểm soát, ảnh chụp có thể tiết lộ vị trí cá nhân. Doanh nghiệp nên chỉ dùng geotag cho ảnh marketing chính thức.
                    </p>
                  </details>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin SEO cho ảnh</CardTitle>
                <CardDescription>
                  Điền metadata phù hợp để Google hiểu rõ nội dung ảnh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meta-title">Tiêu đề</Label>
                    <Input id="meta-title" placeholder="Ảnh banner sản phẩm" value={metadata.title} onChange={handleInputChange("title")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-subject">Chủ đề</Label>
                    <Input id="meta-subject" placeholder="Sản phẩm mới ra mắt" value={metadata.subject} onChange={handleInputChange("subject")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-author">Tác giả</Label>
                    <Input id="meta-author" placeholder="Nguyễn Văn A" value={metadata.author} onChange={handleInputChange("author")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-copyright">Bản quyền</Label>
                    <Input id="meta-copyright" placeholder="Tất cả quyền hợp pháp thuộc website" value={metadata.copyright} onChange={handleInputChange("copyright")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-keywords">Từ khóa (phân cách bằng dấu phẩy)</Label>
                  <Textarea
                    id="meta-keywords"
                    rows={3}
                    placeholder="ảnh sản phẩm, banner ưu đãi, cửa hàng Đà Nẵng"
                    value={rawKeywords}
                    onChange={handleInputChange("keywords")}
                    onBlur={handleKeywordsBlur}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-slug">Tên file tải về (slug)</Label>
                  <Input
                    id="meta-slug"
                    placeholder="vi-du-ten-anh-va-thuong-hieu"
                    value={fileSlug}
                    onChange={(event) => setFileSlug(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Định dạng: chữ thường, dấu gạch ngang thay khoảng trắng. Bỏ trống để tự động tạo từ bản quyền + tiêu đề.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tên file dự kiến: <code>{slugPreview}</code>
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meta-date">Ngày chụp</Label>
                    <Input id="meta-date" type="date" value={metadata.date} max={format(new Date(), "yyyy-MM-dd")} onChange={handleInputChange("date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Đánh giá</Label>
                    <div className="flex items-center gap-2">{ratingStars}</div>
                  </div>
                </div>
                <div className="space-y-4 rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700">
                  <div>
                    <h3 className="text-base font-semibold">Tạo alt text cho ảnh bằng AI</h3>
                    <p className="text-sm text-muted-foreground">
                      Sử dụng metadata và hình ảnh đã tải lên để sinh mô tả alt text chuẩn SEO.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="alt-text-model">Model AI</Label>
                      <Select value={altTextModel} onValueChange={(value) => setAltTextModel(value as AltTextModel)}>
                        <SelectTrigger id="alt-text-model">
                          <SelectValue placeholder="Chọn model" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALT_TEXT_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAltTextModelInfo ? (
                        <p className="text-xs text-muted-foreground">{selectedAltTextModelInfo.description}</p>
                      ) : null}
                      {!modelIsConfigured ? (
                        <p className="text-xs text-orange-600 dark:text-orange-400">Chưa cấu hình API key cho model này.</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        onClick={handleGenerateAltText}
                        disabled={isGeneratingAltText || !hasImageForAltText || !modelIsConfigured}
                        className="flex-1 sm:flex-none"
                      >
                        {isGeneratingAltText ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tạo alt text...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            🤖 Tạo Alt Text
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alt-text-output">Kết quả</Label>
                    <Textarea
                      id="alt-text-output"
                      value={altTextValue}
                      onChange={(event) => {
                        setAltTextValue(event.target.value);
                        setAltTextCopied(false);
                      }}
                      placeholder="Alt text AI sẽ hiển thị tại đây. Bạn có thể chỉnh sửa thủ công."
                      rows={4}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Độ dài hiện tại: {altTextValue.length} ký tự (khuyến nghị {ALT_TEXT_MIN_LENGTH}-{ALT_TEXT_MAX_LENGTH}).
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleCopyAltText} disabled={!altTextValue.trim()}>
                          <span className="flex items-center gap-2">
                            {altTextCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {altTextCopied ? "Đã sao chép" : "📋 Sao chép"}
                          </span>
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleApplyAltText} disabled={!generatedAltText}>
                          <span className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            ✓ Áp dụng
                          </span>
                        </Button>
                      </div>
                    </div>
                    {altTextError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                        {altTextError}
                      </div>
                    ) : null}
                  </div>
                </div>
                {extractedMetadata.title || extractedMetadata.keywords || extractedMetadata.latitude ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <p className="font-semibold mb-1">Đã đọc metadata cũ từ ảnh</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {extractedMetadata.title ? <li>Tiêu đề: {extractedMetadata.title}</li> : null}
                      {extractedMetadata.keywords ? <li>Từ khóa: {extractedMetadata.keywords}</li> : null}
                      {extractedMetadata.date ? <li>Ngày chụp: {extractedMetadata.date}</li> : null}
                      {extractedMetadata.latitude !== undefined && extractedMetadata.longitude !== undefined ? (
                        <li>
                          Toạ độ cũ: {extractedMetadata.latitude.toFixed(4)}, {extractedMetadata.longitude.toFixed(4)}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geotag & vị trí địa lý</CardTitle>
                <CardDescription>
                  Chọn vị trí mặc định là Đà Nẵng hoặc nhập toạ độ/địa danh khác để gắn vào ảnh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address-search">Tìm kiếm địa điểm</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="address-search"
                      value={addressQuery}
                      onChange={(event) => setAddressQuery(event.target.value)}
                      placeholder="Nhập địa chỉ hoặc toạ độ (vd: 16.0544, 108.2022)"
                      disabled={isSearching}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddressSearch}
                      className="shrink-0"
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tìm kiếm...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Compass className="h-4 w-4" />
                          Tìm vị trí
                        </span>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gợi ý nhanh: {PRESET_LOCATIONS.map((item) => item.label).join(", ")}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Vĩ độ (Latitude)</Label>
                    <Input id="latitude" type="number" step="0.000001" value={latitudeInput} onChange={handleCoordinateInput("lat")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Kinh độ (Longitude)</Label>
                    <Input id="longitude" type="number" step="0.000001" value={longitudeInput} onChange={handleCoordinateInput("lng")} />
                  </div>
                </div>
                <div ref={mapContainerRef} className="h-80 w-full overflow-hidden rounded-lg border" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hoàn tất & tải ảnh đã tối ưu</CardTitle>
                <CardDescription>
                  Ảnh sẽ được nhúng metadata + geotag ngay trên trình duyệt, không upload lên máy chủ.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                  <p className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4" />
                    Lưu ý: Geotag chỉ hỗ trợ tốt khi ảnh được lưu ở định dạng JPG. Với PNG/WEBP, hệ thống sẽ chuyển sang JPG trước khi nhúng metadata.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={processImage} disabled={isProcessing || !selectedFile} className="flex-1">
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang xử lý ảnh...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Xử lý và nhúng metadata
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleDownload} disabled={!processedDataUrl} className="flex-1">
                    <FileDown className="h-4 w-4 mr-1" />
                    Tải ảnh đã tối ưu
                  </Button>
                </div>
                {processedDataUrl ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Ảnh đã được nhúng metadata. Bạn có thể nhấn tải về và sử dụng cho website, Google Business Profile hoặc các chiến dịch SEO local.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hướng dẫn sử dụng chi tiết</CardTitle>
                <CardDescription>
                  Các bước tối ưu ảnh chuẩn SEO ngay trên trình duyệt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Tải lên ảnh muốn tối ưu (ưu tiên ảnh gốc chất lượng cao).</li>
                  <li>Điền đầy đủ metadata: tiêu đề, chủ đề, tác giả, bản quyền, từ khóa và ngày chụp.</li>
                  <li>Chấm sao rating để ưu tiên những ảnh quan trọng.</li>
                  <li>Nhập địa chỉ hoặc toạ độ, sau đó nhấp bản đồ để tinh chỉnh vị trí chính xác.</li>
                  <li>Nhấn "Xử lý và nhúng metadata" rồi tải ảnh về để sử dụng ngay.</li>
                  <li>Upload ảnh đã tối ưu lên website, Google Business Profile hoặc các nền tảng cần SEO local.</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ImageSeo() {
  return <ImageSeoContent />;
}
