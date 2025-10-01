import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface FloatingSupportButtonProps {
  zaloUrl?: string;
  messengerUrl?: string;
  contactEmail?: string;
  className?: string;
}

export default function FloatingSupportButton({
  zaloUrl = "https://zalo.me/0355418417",
  messengerUrl = "https://m.me/quang.nguyentan",
  contactEmail = "tanquangyds@gmail.com",
  className = ""
}: FloatingSupportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Theo dõi scroll để hiển thị nút scroll to top
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 ${className}`}>
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-in fade-in slide-in-from-bottom-5"
          aria-label="Cuộn lên đầu trang"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Options - Email, Messenger & Zalo */}
      {isOpen && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Email Contact Button */}
          <button
            onClick={() => {
              window.location.href = `mailto:${contactEmail}?subject=Cần hỗ trợ thêm?&body=Liên hệ với đội ngũ chuyên gia SEO của chúng tôi để được tư vấn miễn phí`;
              setIsOpen(false);
            }}
            className="w-14 h-14 bg-transparent hover:opacity-80 transition-all duration-300 transform hover:scale-110"
            aria-label="Liên hệ qua email"
            title="Liên hệ ngay"
          >
            <img
              src="https://cdn.hstatic.net/files/200000713511/file/4616094.png"
              alt="Email"
              className="w-full h-full drop-shadow-lg"
            />
          </button>

          {/* Messenger Button */}
          <button
            onClick={() => window.open(messengerUrl, "_blank")}
            className="w-14 h-14 bg-transparent hover:opacity-80 transition-all duration-300 transform hover:scale-110"
            aria-label="Chat qua Messenger"
          >
            <img
              src="https://theme.hstatic.net/200000713511/1001249172/14/addthis-messenger.svg?v=669"
              alt="Messenger"
              className="w-full h-full drop-shadow-lg"
            />
          </button>

          {/* Zalo Button */}
          <button
            onClick={() => window.open(zaloUrl, "_blank")}
            className="w-14 h-14 bg-transparent hover:opacity-80 transition-all duration-300 transform hover:scale-110"
            aria-label="Chat qua Zalo"
          >
            <img
              src="https://theme.hstatic.net/200000713511/1001249172/14/addthis-zalo.svg?v=669"
              alt="Zalo"
              className="w-full h-full drop-shadow-lg"
            />
          </button>
        </div>
      )}

      {/* Main Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 bg-transparent hover:opacity-80 transition-all duration-300 transform hover:scale-110 ${
          isOpen ? "rotate-45" : ""
        }`}
        data-testid="button-floating-support"
        aria-label={isOpen ? "Đóng menu chat" : "Mở menu chat"}
      >
        <img
          src="https://cdn.hstatic.net/files/200000713511/file/livechat_v4.png"
          alt="Chat"
          className="w-full h-full drop-shadow-lg"
        />
      </button>

      {/* Tooltip/Label */}
      {!isOpen && (
        <div className="absolute right-16 bottom-0 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-300">
          Liên hệ với chúng tôi
        </div>
      )}
    </div>
  );
}