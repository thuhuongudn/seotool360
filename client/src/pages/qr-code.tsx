import { useState, useRef, useMemo, useCallback, type ComponentType } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Trash2,
  Download,
  QrCode as QrCodeIcon,
  ImageIcon,
  Info,
  Smartphone,
  MapPin,
  Globe,
  UserRound,
} from "lucide-react";
import QRCode from "qrcode";

type QRType = "url" | "phone" | "maps" | "vcard";

interface FormValues {
  url: string;
  phone: string;
  maps: string;
  vcardFullName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardCompany: string;
  vcardJobTitle: string;
  vcardWebsite: string;
  vcardAddress: string;
}

const INITIAL_FORM: FormValues = {
  url: "",
  phone: "",
  maps: "",
  vcardFullName: "",
  vcardPhone: "",
  vcardEmail: "",
  vcardCompany: "",
  vcardJobTitle: "",
  vcardWebsite: "",
  vcardAddress: "",
};

const QR_TYPE_DETAILS: Record<QRType, { label: string; description: string; icon: ComponentType<any> }> = {
  url: {
    label: "Website / URL",
    description: "Nhập đường dẫn website hoặc trang đích bạn muốn chia sẻ.",
    icon: Globe,
  },
  phone: {
    label: "Số điện thoại",
    description: "Người quét có thể gọi ngay sau khi quét mã.",
    icon: Smartphone,
  },
  maps: {
    label: "Google Maps",
    description: "Dẫn người dùng tới địa chỉ hoặc tọa độ trên Google Maps.",
    icon: MapPin,
  },
  vcard: {
    label: "VCard (Danh thiếp)",
    description: "Tạo danh thiếp QR chuyên nghiệp với đầy đủ thông tin liên hệ.",
    icon: UserRound,
  },
};

function QrCodeGeneratorContent() {
  const [qrType, setQrType] = useState<QRType>("url");
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  const resetPreview = () => {
    setPngDataUrl(null);
    setSvgDataUrl(null);
    setLastSuccessMessage(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleLogoClear = () => {
    setLogoDataUrl(null);
    setLogoName(null);
    resetPreview();
  };

  const buildContentString = useCallback((): string => {
    switch (qrType) {
      case "url": {
        const raw = formValues.url.trim();
        if (!raw) {
          throw new Error("Vui lòng nhập đường dẫn website.");
        }
        const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        return normalized;
      }
      case "phone": {
        const phone = formValues.phone.trim();
        if (!phone) {
          throw new Error("Vui lòng nhập số điện thoại.");
        }
        return `tel:${phone.replace(/\s+/g, "")}`;
      }
      case "maps": {
        const address = formValues.maps.trim();
        if (!address) {
          throw new Error("Vui lòng nhập địa chỉ hoặc tọa độ Google Maps.");
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      }
      case "vcard": {
        const fullName = formValues.vcardFullName.trim();
        const phone = formValues.vcardPhone.trim();
        if (!fullName) {
          throw new Error("Vui lòng nhập họ tên cho VCard.");
        }
        if (!phone) {
          throw new Error("Vui lòng nhập số điện thoại cho VCard.");
        }

        const email = formValues.vcardEmail.trim();
        const company = formValues.vcardCompany.trim();
        const jobTitle = formValues.vcardJobTitle.trim();
        const websiteRaw = formValues.vcardWebsite.trim();
        const address = formValues.vcardAddress.trim();

        const website = websiteRaw
          ? /^https?:\/\//i.test(websiteRaw)
            ? websiteRaw
            : `https://${websiteRaw}`
          : "";

        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${fullName}`,
          `N:${fullName};;;;`,
          company ? `ORG:${company}` : "",
          jobTitle ? `TITLE:${jobTitle}` : "",
          `TEL;TYPE=CELL:${phone.replace(/\s+/g, "")}`,
          email ? `EMAIL;TYPE=INTERNET:${email}` : "",
          website ? `URL:${website}` : "",
          address ? `ADR;TYPE=WORK:;;${address};;;;` : "",
          "END:VCARD",
        ];

        return lines.filter(Boolean).join("\n");
      }
      default:
        return formValues.url.trim();
    }
  }, [formValues, qrType]);

  const drawLogoOnCanvas = useCallback(async (canvas: HTMLCanvasElement, dataUrl: string) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Không thể tải logo đã chọn."));
      img.src = dataUrl;
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Không thể vẽ logo lên mã QR.");
    }

    const maxPercentage = 0.2;
    const logoSize = Math.min(canvas.width, canvas.height) * maxPercentage;
    const x = (canvas.width - logoSize) / 2;
    const y = (canvas.height - logoSize) / 2;

    // Tạo nền trắng dưới logo để tăng độ tương phản
    ctx.save();
    ctx.fillStyle = "#ffffff";
    const padding = Math.max(4, logoSize * 0.12);
    const drawRoundedRect = (
      context: CanvasRenderingContext2D,
      rx: number,
      ry: number,
      width: number,
      height: number,
      radius: number,
    ) => {
      const r = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(rx + r, ry);
      context.lineTo(rx + width - r, ry);
      context.quadraticCurveTo(rx + width, ry, rx + width, ry + r);
      context.lineTo(rx + width, ry + height - r);
      context.quadraticCurveTo(rx + width, ry + height, rx + width - r, ry + height);
      context.lineTo(rx + r, ry + height);
      context.quadraticCurveTo(rx, ry + height, rx, ry + height - r);
      context.lineTo(rx, ry + r);
      context.quadraticCurveTo(rx, ry, rx + r, ry);
      context.closePath();
    };

    drawRoundedRect(ctx, x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2, logoSize * 0.1);
    ctx.fill();
    ctx.drawImage(image, x, y, logoSize, logoSize);
    ctx.restore();
  }, []);

  const buildSvgWithLogo = useCallback((svgString: string, dataUrl: string | null) => {
    if (!dataUrl) {
      return svgString;
    }

    const match = svgString.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const size = match ? Math.min(parseFloat(match[1]), parseFloat(match[2])) : 256;
    const logoSize = size * 0.2;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    const padding = Math.max(4, logoSize * 0.12);

    const insertion = `\n  <rect x="${x - padding}" y="${y - padding}" width="${logoSize + padding * 2}" height="${logoSize + padding * 2}" fill="#ffffff" rx="${logoSize * 0.1}" ry="${logoSize * 0.1}" />\n  <image href="${dataUrl}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />\n`;

    return svgString.replace("</svg>", `${insertion}</svg>`);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canvasRef.current) {
      return;
    }

    try {
      setIsGenerating(true);
      const content = buildContentString();
      const canvas = canvasRef.current;
      const size = 320;

      await QRCode.toCanvas(canvas, content, {
        width: size,
        margin: 2,
        color: {
          dark: "#111827",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      });

      if (logoDataUrl) {
        await drawLogoOnCanvas(canvas, logoDataUrl);
      }

      const pngUrl = canvas.toDataURL("image/png");
      setPngDataUrl(pngUrl);

      const rawSvg = await QRCode.toString(content, {
        type: "svg",
        margin: 2,
        color: {
          dark: "#111827",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      });

      const finalSvg = buildSvgWithLogo(rawSvg, logoDataUrl);
      const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(finalSvg)))}`;
      setSvgDataUrl(svgUrl);

      setLastSuccessMessage("Mã QR đã sẵn sàng! Bạn có thể tải xuống và sử dụng ngay.");
      toast({
        title: "Tạo mã QR thành công",
        description: "Mã QR đã được tạo với cấu hình hiện tại.",
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể tạo mã QR. Vui lòng thử lại.";
      toast({
        title: "Có lỗi xảy ra",
        description: message,
        variant: "destructive",
      });
      resetPreview();
    } finally {
      setIsGenerating(false);
    }
  }, [buildContentString, buildSvgWithLogo, drawLogoOnCanvas, logoDataUrl, toast]);

  const handleDownload = (format: "png" | "svg") => {
    const url = format === "png" ? pngDataUrl : svgDataUrl;
    if (!url) {
      toast({
        title: "Chưa có mã QR",
        description: "Vui lòng tạo mã QR trước khi tải xuống.",
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-code-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFile = (file: File) => {
    const isSupportedType = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"].includes(file.type);
    if (!isSupportedType) {
      toast({
        title: "Định dạng không hỗ trợ",
        description: "Vui lòng chọn ảnh PNG, JPG hoặc SVG.",
        variant: "destructive",
      });
      return;
    }

    const maxSizeMb = 2;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast({
        title: "Tệp quá lớn",
        description: `Logo không được vượt quá ${maxSizeMb}MB để đảm bảo khả năng quét.`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString();
      if (result) {
        setLogoDataUrl(result);
        setLogoName(file.name);
        resetPreview();
      }
    };
    reader.onerror = () => {
      toast({
        title: "Không thể đọc tệp",
        description: "Vui lòng thử lại với một logo khác.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const activeFields = useMemo(() => {
    switch (qrType) {
      case "url":
        return (
          <div className="space-y-2">
            <Label htmlFor="qr-url">Đường dẫn website</Label>
            <Input
              id="qr-url"
              placeholder="https://example.com"
              value={formValues.url}
              onChange={handleInputChange("url")}
            />
            <p className="text-sm text-muted-foreground">
              Hệ thống sẽ tự động thêm https:// nếu bạn nhập thiếu.
            </p>
          </div>
        );
      case "phone":
        return (
          <div className="space-y-2">
            <Label htmlFor="qr-phone">Số điện thoại</Label>
            <Input
              id="qr-phone"
              placeholder="+84 912 345 678"
              value={formValues.phone}
              onChange={handleInputChange("phone")}
            />
            <p className="text-sm text-muted-foreground">
              Nên sử dụng định dạng quốc tế (+84) để đảm bảo tương thích khi quét.
            </p>
          </div>
        );
      case "maps":
        return (
          <div className="space-y-2">
            <Label htmlFor="qr-maps">Địa chỉ hoặc tọa độ</Label>
            <Textarea
              id="qr-maps"
              placeholder="Ví dụ: 125 Phan Đình Phùng, Đà Nẵng hoặc 16.047079, 108.206230"
              value={formValues.maps}
              onChange={handleInputChange("maps")}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Người dùng sẽ được mở Google Maps với địa điểm đã chỉ định.
            </p>
          </div>
        );
      case "vcard":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-name">Họ và tên *</Label>
                <Input
                  id="qr-vcard-name"
                  placeholder="Nguyễn Văn A"
                  value={formValues.vcardFullName}
                  onChange={handleInputChange("vcardFullName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-phone">Số điện thoại *</Label>
                <Input
                  id="qr-vcard-phone"
                  placeholder="+84 912 345 678"
                  value={formValues.vcardPhone}
                  onChange={handleInputChange("vcardPhone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-email">Email</Label>
                <Input
                  id="qr-vcard-email"
                  placeholder="email@congty.com"
                  value={formValues.vcardEmail}
                  onChange={handleInputChange("vcardEmail")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-company">Công ty</Label>
                <Input
                  id="qr-vcard-company"
                  placeholder="Công ty ABC"
                  value={formValues.vcardCompany}
                  onChange={handleInputChange("vcardCompany")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-title">Chức vụ</Label>
                <Input
                  id="qr-vcard-title"
                  placeholder="Giám đốc Marketing"
                  value={formValues.vcardJobTitle}
                  onChange={handleInputChange("vcardJobTitle")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-vcard-website">Website</Label>
                <Input
                  id="qr-vcard-website"
                  placeholder="https://seotool360.com"
                  value={formValues.vcardWebsite}
                  onChange={handleInputChange("vcardWebsite")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-vcard-address">Địa chỉ</Label>
              <Textarea
                id="qr-vcard-address"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                value={formValues.vcardAddress}
                onChange={handleInputChange("vcardAddress")}
                rows={3}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              * Trường bắt buộc. Các thông tin khác giúp danh thiếp QR chuyên nghiệp và đầy đủ hơn.
            </p>
          </div>
        );
      default:
        return null;
    }
  }, [formValues, handleInputChange, qrType]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Tạo mã QR" }]} backLink="/" />

        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1 text-sm font-medium text-blue-600 mb-4">
            <QrCodeIcon className="h-4 w-4" />
            Công cụ tạo mã QR miễn phí
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tạo <span className="text-blue-600">mã QR tuỳ chỉnh</span> trong vài giây
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Chuyển đổi đường dẫn, thông tin liên hệ hoặc tọa độ chỉ bằng một cú nhấp. Công cụ hỗ trợ nhúng logo, tải về chất lượng cao và hoàn toàn miễn phí.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Form column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin mã QR</CardTitle>
                <CardDescription>
                  Chọn loại mã và nhập nội dung tương ứng. Hệ thống hỗ trợ Website, Số điện thoại, Google Maps và danh thiếp VCard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Loại mã QR</Label>
                  <Select value={qrType} onValueChange={(value) => {
                    setQrType(value as QRType);
                    setLastSuccessMessage(null);
                    resetPreview();
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn loại mã QR" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QR_TYPE_DETAILS).map(([value, detail]) => (
                        <SelectItem value={value} key={value}>
                          <div className="flex items-center gap-2">
                            <detail.icon className="h-4 w-4" />
                            <span>{detail.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {QR_TYPE_DETAILS[qrType].description}
                  </p>
                </div>

                {activeFields}

                <div className="space-y-3">
                  <Label>Logo thương hiệu (tuỳ chọn)</Label>
                  <label
                    htmlFor="qr-logo"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
                      isDragActive ? "border-blue-500 bg-blue-500/10" : "border-border bg-muted/40"
                    }`}
                  >
                    <UploadCloud className="h-8 w-8 text-blue-600 mb-3" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      Kéo thả hoặc nhấp để tải logo lên
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hỗ trợ PNG, JPG, SVG. Kích thước tối đa 2MB.
                    </p>
                    <Input
                      id="qr-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={onFileChange}
                    />
                  </label>

                  {logoDataUrl ? (
                    <div className="flex items-center justify-between rounded-lg border bg-background p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{logoName}</p>
                          <p className="text-xs text-muted-foreground">Logo sẽ được đặt ở trung tâm mã QR (tối đa 20% diện tích).</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleLogoClear}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xoá
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Khuyến nghị sử dụng logo hình vuông với nền trong suốt để mã QR dễ quét hơn.
                    </p>
                  )}
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Đang tạo mã QR...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <QrCodeIcon className="h-4 w-4" />
                      Tạo mã QR
                    </span>
                  )}
                </Button>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                  <p className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Mẹo: Sử dụng màu logo tương phản với nền trắng để tăng khả năng quét.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Giới thiệu & lợi ích</CardTitle>
                <CardDescription>
                  Vì sao bạn nên sử dụng công cụ tạo mã QR trên SEOTOOL360?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Công cụ tạo mã QR cho phép bạn chia sẻ thông tin tức thì chỉ bằng một thao tác quét. Phù hợp cho cá nhân và doanh nghiệp trong các chiến dịch marketing, sự kiện, danh thiếp hay đóng gói sản phẩm.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Hỗ trợ 4 loại dữ liệu phổ biến: Website, Số điện thoại, Google Maps, VCard.</li>
                  <li>Hoàn toàn miễn phí, không lưu trữ dữ liệu cá nhân, không watermark.</li>
                  <li>Ảnh chất lượng cao, tải nhanh dưới dạng PNG hoặc SVG.</li>
                  <li>Nhúng logo trung tâm mà vẫn đảm bảo quét dễ dàng nhờ chuẩn lỗi H.</li>
                  <li>Giao diện tiếng Việt thân thiện, thao tác đơn giản cho mọi đối tượng.</li>
                </ul>
                <p>
                  Hãy tạo mã QR độc đáo để tăng sự chuyên nghiệp cho thương hiệu và nâng cao trải nghiệm người dùng ngay bây giờ!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Preview column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kết quả mã QR</CardTitle>
                <CardDescription>
                  Xem trước mã QR và tải xuống ngay sau khi tạo thành công.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center rounded-xl bg-muted p-6">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={320}
                    className="h-[220px] w-[220px] rounded-lg bg-white shadow-sm"
                  />
                </div>

                {lastSuccessMessage ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {lastSuccessMessage}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-muted-foreground">
                    Mã QR sẽ hiển thị tại đây sau khi bạn nhấn "Tạo mã QR".
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => handleDownload("png")} className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" />
                    Tải PNG
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload("svg")} className="flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" />
                    Tải SVG
                  </Button>
                </div>

                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Hướng dẫn chi tiết tạo mã QR</h3>
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Chọn loại dữ liệu muốn mã hoá rồi nhập thông tin tương ứng.</li>
                    <li>Tuỳ chọn tải logo thương hiệu (nên sử dụng nền trong suốt, kích thước nhỏ hơn 20% QR).</li>
                    <li>Nhấn "Tạo mã QR" để hệ thống dựng ảnh với chuẩn lỗi mức H.</li>
                    <li>Kiểm tra phần xem trước, sau đó tải về dưới dạng PNG hoặc SVG để in ấn và chia sẻ.</li>
                    <li>Test thử bằng điện thoại trước khi sử dụng chính thức để đảm bảo quét thành công.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mẹo sử dụng hiệu quả</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <ul className="space-y-2 list-disc pl-5">
                  <li>Nên in mã QR kích thước tối thiểu 3 x 3 cm để đảm bảo quét tốt.</li>
                  <li>Tránh dùng màu nền trùng với màu mã QR, ưu tiên nền sáng và tương phản.</li>
                  <li>Đặt mã QR ở vị trí dễ nhìn, thêm lời kêu gọi hành động (CTA) để tăng lượt quét.</li>
                  <li>Đối với VCard, hãy cập nhật thông tin thường xuyên để mã luôn chính xác.</li>
                  <li>Test mã với nhiều ứng dụng quét khác nhau trước khi triển khai rộng rãi.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function QrCode() {
  const toolId = useToolId("qr-code");

  return (
    <ToolPermissionGuard toolId={toolId || ""} toolName="Tạo mã QR">
      <QrCodeGeneratorContent />
    </ToolPermissionGuard>
  );
}
