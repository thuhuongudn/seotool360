import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
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
  FileDown,
  RefreshCcw,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import ExifReader from "exifreader";
import type { ChangeEvent, DragEvent } from "react";
import type { LeafletEventHandlerFn, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { format } from "date-fns";

const DEFAULT_LAT = 16.0544;
const DEFAULT_LNG = 108.2022;
const DEFAULT_ZOOM = 13;
const MAX_FILE_SIZE_MB = 15;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PRESET_LOCATIONS: Array<{ label: string; lat: number; lng: number }> = [
  { label: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  { label: "Hà Nội", lat: 21.0285, lng: 105.8542 },
  { label: "TP. Hồ Chí Minh", lat: 10.8231, lng: 106.6297 },
  { label: "Huế", lat: 16.4637, lng: 107.5909 },
  { label: "Nha Trang", lat: 12.2388, lng: 109.1967 },
];

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

function encodeUnicodeToXp(value: string): number[] {
  const terminated = value + "\u0000";
  const buffer: number[] = [];
  for (let i = 0; i < terminated.length; i += 1) {
    const code = terminated.charCodeAt(i);
    buffer.push(code & 0xff, (code >> 8) & 0xff);
  }
  return buffer;
}

function convertGpsToRational(deg: number) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 100), 100],
  ];
}

function convertExifGpsToDecimal(value: any, ref: any): number | undefined {
  if (!value || !Array.isArray(value.value) || !ref) return undefined;
  const [deg, min, sec] = value.value as Array<{ numerator: number; denominator: number }>;
  const multiplier = ref.description === "S" || ref.description === "W" ? -1 : 1;
  const d = deg.numerator / deg.denominator;
  const m = min.numerator / min.denominator;
  const s = sec.numerator / sec.denominator;
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
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

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
    copyright: "Tất cả quyền hợp pháp thuộc website",
    keywords: "",
    date: format(new Date(), "yyyy-MM-dd"),
    rating: 0,
  });
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [latitudeInput, setLatitudeInput] = useState(String(DEFAULT_LAT));
  const [longitudeInput, setLongitudeInput] = useState(String(DEFAULT_LNG));
  const [addressQuery, setAddressQuery] = useState("Đà Nẵng, Việt Nam");
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setOriginalName("");
    setImagePreview(null);
    setImageMime(null);
    setExtractedMetadata({});
    setMetadata({
      title: "",
      subject: "",
      author: "",
      copyright: "Tất cả quyền hợp pháp thuộc website",
      keywords: "",
      date: format(new Date(), "yyyy-MM-dd"),
      rating: 0,
    });
    setLatitude(DEFAULT_LAT);
    setLongitude(DEFAULT_LNG);
    setLatitudeInput(String(DEFAULT_LAT));
    setLongitudeInput(String(DEFAULT_LNG));
    setAddressQuery("Đà Nẵng, Việt Nam");
    setProcessedDataUrl(null);
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
    setMetadata((prev) => ({ ...prev, [field]: field === "keywords" ? sanitizeKeywords(value) : value }));
  };

  const handleRatingChange = (value: number) => {
    setMetadata((prev) => ({ ...prev, rating: prev.rating === value ? 0 : value }));
  };

  const handleAddressSearch = () => {
    const trimmed = addressQuery.trim();
    if (!trimmed) {
      toast({
        title: "Vui lòng nhập địa điểm",
        description: "Bạn có thể nhập toạ độ hoặc tên thành phố (VD: Hà Nội).",
        variant: "destructive",
      });
      return;
    }

    const coordinateMatch = trimmed.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (coordinateMatch) {
      const lat = parseFloat(coordinateMatch[1]);
      const lng = parseFloat(coordinateMatch[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setLatitude(lat);
        setLongitude(lng);
        setLatitudeInput(lat.toFixed(6));
        setLongitudeInput(lng.toFixed(6));
        toast({
          title: "Đã cập nhật toạ độ",
          description: "Marker đã được di chuyển tới vị trí mới.",
        });
        return;
      }
    }

    const preset = PRESET_LOCATIONS.find((location) => location.label.toLowerCase().includes(trimmed.toLowerCase()));
    if (preset) {
      setLatitude(preset.lat);
      setLongitude(preset.lng);
      setLatitudeInput(preset.lat.toFixed(6));
      setLongitudeInput(preset.lng.toFixed(6));
      toast({
        title: "Đã chọn vị trí",
        description: `Marker được đặt tại ${preset.label}.`,
      });
      return;
    }

    toast({
      title: "Không tìm thấy địa điểm",
      description: "Vui lòng nhập lại toạ độ (ví dụ: 16.0544, 108.2022) hoặc tên thành phố ở Việt Nam.",
      variant: "destructive",
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

    try {
      setIsProcessing(true);
      const piexif = await import("piexifjs");
      const ensureJpeg = async (): Promise<string> => {
        if (imageMime === "image/jpeg" || imagePreview.startsWith("data:image/jpeg")) {
          return imagePreview;
        }
        const img = new Image();
        img.src = imagePreview;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Không thể khởi tạo canvas để chuyển đổi ảnh.");
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.92);
      };

      const baseDataUrl = await ensureJpeg();
      const exif = piexif.load(baseDataUrl);

      exif["0th"] = exif["0th"] || {};
      exif["Exif"] = exif["Exif"] || {};
      exif["GPS"] = exif["GPS"] || {};

      exif["0th"][piexif.ImageIFD.ImageDescription] = metadata.title;
      exif["0th"][piexif.ImageIFD.Artist] = metadata.author;
      exif["0th"][piexif.ImageIFD.Copyright] = metadata.copyright;
      exif["0th"][piexif.ImageIFD.XPTitle] = encodeUnicodeToXp(metadata.title);
      exif["0th"][piexif.ImageIFD.XPSubject] = encodeUnicodeToXp(metadata.subject);
      exif["0th"][piexif.ImageIFD.XPKeywords] = encodeUnicodeToXp(metadata.keywords);
      exif["0th"][piexif.ImageIFD.Rating] = metadata.rating;
      exif["0th"][piexif.ImageIFD.RatingPercent] = metadata.rating * 20;

      const dateTimeOriginal = makeDateTimeOriginal(metadata.date);
      if (dateTimeOriginal) {
        exif["Exif"][piexif.ExifIFD.DateTimeOriginal] = dateTimeOriginal;
        exif["Exif"][piexif.ExifIFD.CreateDate] = dateTimeOriginal;
      }

      const latRef = latitude >= 0 ? "N" : "S";
      const lngRef = longitude >= 0 ? "E" : "W";
      exif["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
      exif["GPS"][piexif.GPSIFD.GPSLatitude] = convertGpsToRational(latitude);
      exif["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lngRef;
      exif["GPS"][piexif.GPSIFD.GPSLongitude] = convertGpsToRational(longitude);

      const exifBytes = piexif.dump(exif);
      const finalDataUrl = piexif.insert(exifBytes, baseDataUrl);
      setProcessedDataUrl(finalDataUrl);

      toast({
        title: "Đã chèn metadata",
        description: "Ảnh của bạn đã được tối ưu hóa với thông tin SEO và Geotag.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Không thể xử lý ảnh",
        description: "Exif chỉ hỗ trợ tốt cho ảnh JPG. Hãy thử với tệp JPG hoặc chuyển đổi trước khi xử lý.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [imageMime, imagePreview, latitude, longitude, metadata, selectedFile, toast]);

  const handleDownload = () => {
    if (!processedDataUrl) {
      toast({
        title: "Chưa có ảnh tối ưu",
        description: "Nhấn \"Xử lý và Tải về\" để tạo ảnh đã gắn metadata trước.",
        variant: "destructive",
      });
      return;
    }
    const baseName = originalName ? originalName.replace(/\.[^.]+$/, "") : "optimized-image";
    downloadDataUrl(processedDataUrl, `${baseName}-seo.jpg`);
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

  return (
    <div className="min-h-screen bg-background">
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
                  <div className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{originalName}</p>
                      <p className="text-muted-foreground">Đã tải lên thành công – bạn có thể tiếp tục chỉnh metadata bên dưới.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetState}>
                      <RefreshCcw className="h-4 w-4 mr-1" />
                      Đổi ảnh khác
                    </Button>
                  </div>
                ) : null}

                {previewSection}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lợi ích khi tối ưu metadata & geotag</CardTitle>
                <CardDescription>
                  Một bức ảnh tối ưu tốt sẽ trở thành nguồn traffic chất lượng từ Google Images và tăng độ tin cậy cho nội dung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Metadata là "hồ sơ lý lịch" của ảnh, giúp công cụ tìm kiếm hiểu rõ nội dung và ngữ cảnh. Geotag gắn kết ảnh với vị trí cụ thể, đặc biệt hữu ích cho SEO local.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Tăng cơ hội xuất hiện trong Google Images nhờ tiêu đề, từ khóa chính xác.</li>
                  <li>Gắn kết ảnh với địa điểm cụ thể, hỗ trợ SEO Local cho doanh nghiệp.</li>
                  <li>Ghi rõ tác giả & bản quyền ngay trong file ảnh, hạn chế sao chép trái phép.</li>
                  <li>Cung cấp ngữ cảnh rõ ràng (ngày chụp, chủ đề) giúp người dùng và Google tin tưởng hơn.</li>
                </ul>
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
                  <Textarea id="meta-keywords" rows={3} placeholder="ảnh sản phẩm, banner ưu đãi, cửa hàng Đà Nẵng" value={metadata.keywords} onChange={handleInputChange("keywords")} />
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
                    <Input id="address-search" value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} placeholder="Nhập địa chỉ hoặc toạ độ (vd: 16.0544, 108.2022)" />
                    <Button type="button" variant="secondary" onClick={handleAddressSearch} className="shrink-0">
                      <Compass className="h-4 w-4 mr-1" />
                      Tìm vị trí
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
  const toolId = useToolId("image-seo");

  return (
    <ToolPermissionGuard toolId={toolId || ""} toolName="Tối ưu Metadata & Geotag ảnh">
      <ImageSeoContent />
    </ToolPermissionGuard>
  );
}
