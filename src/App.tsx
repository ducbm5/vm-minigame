import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  QrCode,
  Gift,
  Camera,
  Search,
  Check,
  XCircle,
  Sparkles,
  ArrowLeft,
  CheckSquare,
  Award,
  Lock
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const ADMIN_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7l25leDtFU8WYmwWE_fl_t0bNyAXLwC2aR3O3frU5-NITLDj7kO3BGUguQ9QC0M8/exec";

// Official Sponsorship prizes
const PRIZES = [
  "Gang tay",
  "Khăn ống"
];

interface TicketData {
  ticketId: string;
  name: string;
  phone: string;
  game1?: string;
  game2?: string;
  game3?: string;
  game4?: string;
  gift1?: string;
  gift2?: string;
  timestamp: string;
}

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<"user" | "admin">(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path === "/admin" || path.startsWith("/admin") || search.includes("admin") || search.includes("view=admin")) {
      return "admin";
    }
    return "user";
  });

  // Listen for browser back/forward buttons (popstate routing)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === "/admin" || path.startsWith("/admin") || search.includes("admin") || search.includes("view=admin")) {
        setCurrentView("admin");
      } else {
        setCurrentView("user");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // User Registration States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [successData, setSuccessData] = useState<TicketData | null>(null);
  const [formTouched, setFormTouched] = useState({ name: false, phone: false });

  // Admin Panel States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_auth") === "true";
  });
  const [adminPasscode, setAdminPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode === "0966559155") {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      setPasscodeError("");
    } else {
      setPasscodeError("Mật khẩu không chính xác. Vui lòng nhập lại.");
    }
  };

  const [searchTicketId, setSearchTicketId] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<TicketData | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  
  // Admin Game checkboxes and Gift checkboxes
  const [adminGame1, setAdminGame1] = useState(false);
  const [adminGame2, setAdminGame2] = useState(false);
  const [adminGame3, setAdminGame3] = useState(false);
  const [adminGame4, setAdminGame4] = useState(false);
  const [adminGift1, setAdminGift1] = useState(false);
  const [adminGift2, setAdminGift2] = useState(false);
  const [syncingAdmin, setSyncingAdmin] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Sync state variables with current scannedTicket data
  useEffect(() => {
    if (scannedTicket) {
      setAdminGame1(scannedTicket.game1 === "Đã chơi" || scannedTicket.game1 === "OK" || scannedTicket.game1 === "Checked" || scannedTicket.game1 === "x");
      setAdminGame2(scannedTicket.game2 === "Đã chơi" || scannedTicket.game2 === "OK" || scannedTicket.game2 === "Checked" || scannedTicket.game2 === "x");
      setAdminGame3(scannedTicket.game3 === "Đã chơi" || scannedTicket.game3 === "OK" || scannedTicket.game3 === "Checked" || scannedTicket.game3 === "x");
      setAdminGame4(scannedTicket.game4 === "Đã chơi" || scannedTicket.game4 === "OK" || scannedTicket.game4 === "Checked" || scannedTicket.game4 === "x");
      setAdminGift1(scannedTicket.gift1 === "Gang tay" || scannedTicket.gift1 === "Găng tay" || scannedTicket.gift1 === "Đã nhận" || scannedTicket.gift1 === "Checked" || scannedTicket.gift1 === "x" || scannedTicket.gift1 === "OK");
      setAdminGift2(scannedTicket.gift2 === "Khăn ống" || scannedTicket.gift2 === "Đã nhận" || scannedTicket.gift2 === "Checked" || scannedTicket.gift2 === "x" || scannedTicket.gift2 === "OK");
    } else {
      setAdminGame1(false);
      setAdminGame2(false);
      setAdminGame3(false);
      setAdminGame4(false);
      setAdminGift1(false);
      setAdminGift2(false);
    }
  }, [scannedTicket]);

  // References for QR code scanning
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Auto-fill ticket ID in admin panel if passed in URL
  useEffect(() => {
    const search = window.location.search;
    if (currentView === "admin") {
      // Find standard ticket formatted like VM26-XXXXX
      const ticketMatch = search.match(/VM26-[A-Z0-9]{5}/i);
      if (ticketMatch) {
        const matchedId = ticketMatch[0].toUpperCase();
        setSearchTicketId(matchedId);
        handleLookupTicket(matchedId);
      }
    }
  }, [currentView]);

  // Handle Camera scanning initialization and destruction
  useEffect(() => {
    if (currentView !== "admin" || !isScanning) {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop()
          .then(() => { html5QrCodeRef.current = null; })
          .catch(err => console.error("Error stopping scanner:", err));
      }
      return;
    }

    setScannerError(null);
    // Tiny delay to ensure container element with id "qr-reader" is fully rendered in the DOM
    const timer = setTimeout(() => {
      try {
        const qrCodeScanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrCodeScanner;

        qrCodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              // Expand scanner target area to 90% of width to make capturing the QR code extremely quick & easy
              const size = Math.min(width, height) * 0.9;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // Successfully scanned text
            // Parse link if it's a URL
            let extractedId = decodedText.trim();
            if (decodedText.includes("?")) {
              const parts = decodedText.split("?");
              const potentialId = parts[parts.length - 1];
              if (potentialId && potentialId.startsWith("VM26-")) {
                extractedId = potentialId;
              }
            }
            
            setSearchTicketId(extractedId);
            handleLookupTicket(extractedId);
            
            // Stop scanning
            setIsScanning(false);
            if (html5QrCodeRef.current) {
              html5QrCodeRef.current.stop().catch(err => console.error(err));
            }
          },
          () => {
            // silent scan failure logs to avoid spamming console
          }
        ).catch(err => {
          console.error("Lỗi bắt đầu camera:", err);
          setScannerError("Không thể kích hoạt camera. Vui lòng cấp quyền truy cập camera hoặc tự nhập mã.");
          setIsScanning(false);
        });
      } catch (e: any) {
        console.error("Camera initialization failure:", e);
        setScannerError("Thiết bị không hỗ trợ camera hoặc đang bị chiếm quyền sử dụng.");
        setIsScanning(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Unmount cleanup failure:", err));
      }
    };
  }, [isScanning, currentView]);

  // User validation
  const validateName = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập họ và tên";
    if (trimmed.length < 3) return "Họ tên quá ngắn (tối thiểu 3 ký tự)";
    return null;
  };

  const validatePhone = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return "Vui lòng nhập số điện thoại";
    const phoneRegex = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(trimmed)) {
      return "Số điện thoại không đúng định dạng (Ví dụ: 0987654321)";
    }
    return null;
  };

  // Extract core phone digits by stripping leading 0 or country code 84 for consistent comparison
  const getCorePhone = (ph: string): string => {
    let cleaned = ph.replace(/\D/g, "");
    if (cleaned.startsWith("84") && cleaned.length > 9) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  // Re-add the leading 0 for beautiful display on the frontend
  const formatDisplayPhone = (ph: string): string => {
    const cleaned = ph.toString().trim().replace(/\D/g, "");
    if (!cleaned) return ph;
    if (cleaned.length === 9 && !cleaned.startsWith("0")) {
      return "0" + cleaned;
    }
    return ph;
  };

  const isFormValid = !validateName(name) && !validatePhone(phone);

  // Generate unique Ticket ID
  const generateTicketId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "VM26-";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check duplicate and retrieve current registry (Real-time checks via App Script)
  const checkDuplicatePhone = async (inputPhone: string): Promise<TicketData | null> => {
    const corePhone = getCorePhone(inputPhone);
    if (!corePhone) return null;
    
    // Attempt Real-time lookup through Google Apps Script API (Bypasses caching and secure)
    try {
      const response = await fetch(`${ADMIN_SCRIPT_URL}?action=checkPhone&phone=${encodeURIComponent(corePhone)}`);
      if (response.ok) {
        const result = await response.json();
        if (result && result.success && result.exists && result.data) {
          return {
            ticketId: result.data.id || result.data.ticketId || "",
            name: result.data.name || "",
            phone: formatDisplayPhone(result.data.phone || result.data.ph || ""),
            game1: result.data.game1 || "",
            game2: result.data.game2 || "",
            game3: result.data.game3 || "",
            game4: result.data.game4 || "",
            gift1: result.data.gift1 || "",
            gift2: result.data.gift2 || "",
            timestamp: result.data.timestamp || ""
          };
        }
      }
    } catch (err) {
      console.error("Real-time check failed:", err);
    }
    return null;
  };

  // Lookup Ticket details (Real-time Apps Script API only)
  const handleLookupTicket = async (targetId: string) => {
    if (!targetId.trim()) return;
    
    setAdminLoading(true);
    setAdminError(null);
    setScannedTicket(null);
    setSyncSuccess(false);

    const formattedId = targetId.trim().toUpperCase();

    // Try real-time API
    try {
      const response = await fetch(`${ADMIN_SCRIPT_URL}?action=get&id=${encodeURIComponent(formattedId)}`);
      if (response.ok) {
        const res = await response.json();
        if (res && res.success && res.data) {
          setScannedTicket({
            ticketId: res.data.id || res.data.ticketId || "",
            name: res.data.name || "",
            phone: formatDisplayPhone(res.data.phone || res.data.ph || ""),
            game1: res.data.game1 || "",
            game2: res.data.game2 || "",
            game3: res.data.game3 || "",
            game4: res.data.game4 || "",
            gift1: res.data.gift1 || "",
            gift2: res.data.gift2 || "",
            timestamp: res.data.timestamp || ""
          });
        } else {
          setAdminError(res.message || `Không tìm thấy thông tin lượt chơi cho mã: ${formattedId}`);
        }
      } else {
        setAdminError("Lỗi kết nối API Google Sheet.");
      }
    } catch (e) {
      console.error("Unable to fetch real-time ticket:", e);
      setAdminError("Lỗi kết nối dữ liệu Google Sheet. Vui lòng thử lại.");
    } finally {
      setAdminLoading(false);
    }
  };

  // Submit User Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched({ name: true, phone: true });

    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsDuplicate(false);

    // Check duplicate
    const existingRegistration = await checkDuplicatePhone(phone.trim());
    if (existingRegistration) {
      setSuccessData(existingRegistration);
      setIsDuplicate(true);
      setName("");
      setPhone("");
      setFormTouched({ name: false, phone: false });
      setIsLoading(false);
      return;
    }

    // Capture precise current Ho Chi Minh time
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    
    const formattedTime = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    const ticketId = generateTicketId();

    const payload = {
      ticketId,
      name: name.trim(),
      phone: phone.trim(),
      timestamp: formattedTime
    };

    try {
      const formBody = new URLSearchParams();
      formBody.append("id", payload.ticketId);
      formBody.append("name", payload.name);
      formBody.append("phone", payload.phone);
      formBody.append("timestamp", payload.timestamp);

      let isServerDuplicate = false;
      let existingTicketFromServer: TicketData | null = null;

      try {
        // Try standard CORS POST first so we can read the server's response if it detects duplicate
        const response = await fetch(ADMIN_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString()
        });

        if (response.ok) {
          const res = await response.json();
          if (res && res.exists && res.data) {
            isServerDuplicate = true;
            existingTicketFromServer = {
              ticketId: res.data.id || res.data.ticketId || "",
              name: res.data.name || "",
              phone: formatDisplayPhone(res.data.phone || res.data.ph || ""),
              game1: res.data.game1 || "",
              game2: res.data.game2 || "",
              game3: res.data.game3 || "",
              game4: res.data.game4 || "",
              gift1: res.data.gift1 || "",
              gift2: res.data.gift2 || "",
              timestamp: res.data.timestamp || ""
            };
          }
        }
      } catch (corsErr) {
        console.warn("CORS/Fetch POST error, performing transparent fallback:", corsErr);
        // Fallback: Send with mode: "no-cors" to guarantee the registration is sent to Google Sheets
        await fetch(ADMIN_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString()
        });
      }

      if (isServerDuplicate && existingTicketFromServer) {
        setSuccessData(existingTicketFromServer);
        setIsDuplicate(true);
      } else {
        setSuccessData(payload);
        setIsDuplicate(false);
      }
      
      setName("");
      setPhone("");
      setFormTouched({ name: false, phone: false });
    } catch (err: any) {
      console.error("Google Sheets Submission Error:", err);
      setErrorMsg("Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Admin Game updates & Gifts back to Google Sheet row
  const handleSubmitAdmin = async () => {
    if (!scannedTicket) return;

    setSyncingAdmin(true);
    setSyncSuccess(false);

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const year = parts.find(p => p.type === 'year')?.value || '2026';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    const updateTimeStr = `${day}/${month}/${year} ${hour}:${minute}:${second}`;

    const game1Str = adminGame1 ? "Đã chơi" : "";
    const game2Str = adminGame2 ? "Đã chơi" : "";
    const game3Str = adminGame3 ? "Đã chơi" : "";
    const game4Str = adminGame4 ? "Đã chơi" : "";

    const gift1Str = adminGift1 ? "Gang tay" : "";
    const gift2Str = adminGift2 ? "Khăn ống" : "";

    try {
      const updatePayload = new URLSearchParams();
      updatePayload.append("action", "updateAdmin");
      updatePayload.append("id", scannedTicket.ticketId);
      updatePayload.append("game1", game1Str);
      updatePayload.append("game2", game2Str);
      updatePayload.append("game3", game3Str);
      updatePayload.append("game4", game4Str);
      updatePayload.append("gift1", gift1Str);
      updatePayload.append("gift2", gift2Str);
      updatePayload.append("timestamp", updateTimeStr);

      await fetch(ADMIN_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: updatePayload.toString()
      });

      // Update local ticket state representation
      setScannedTicket(prev => prev ? {
        ...prev,
        game1: game1Str,
        game2: game2Str,
        game3: game3Str,
        game4: game4Str,
        gift1: gift1Str,
        gift2: gift2Str,
        timestamp: updateTimeStr
      } : null);

      setSyncSuccess(true);
      
      // Auto-hide success checkmark after 3.5 seconds
      setTimeout(() => {
        setSyncSuccess(false);
      }, 3500);
    } catch (err) {
      console.error("Failed to update status on Sheet:", err);
      alert("Lỗi cập nhật kết quả. Vui lòng thực hiện lại.");
    } finally {
      setSyncingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-red-600 selection:text-white font-sans w-full relative">
      


      {/* Main container designed as standard high-fidelity web page fitting all screen sizes */}
      <div className="w-full max-w-xl mx-auto bg-white min-h-screen flex flex-col justify-between shadow-sm border-x border-gray-100 relative">
        
        {/* ================= USER INTERFACE VIEW ================= */}
        {currentView === "user" && (
          <>
            {/* Top Header / Branding Area with Bold italic typography */}
            <div className="relative pt-10 px-6 sm:px-8 pb-5 border-b border-gray-100 flex flex-col bg-white">
              <button
                onClick={() => {
                  setCurrentView("admin");
                  window.history.pushState({}, "", "/admin");
                }}
                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-600 transition-colors rounded-lg flex items-center justify-center w-11 h-11 active:scale-90"
                title="Ban Tổ Chức"
              >
                <Lock className="w-4 h-4" />
              </button>
              <div className="text-left">
                <p className="text-xs font-bold text-red-600 tracking-widest uppercase mb-1">
                  VnExpress Marathon 2026
                </p>
                <h1 className="text-2xl sm:text-3xl font-black leading-none text-black uppercase italic tracking-tighter">
                  MINIGAME<br/>REGISTRATION
                </h1>
                <div className="h-1.5 w-12 bg-red-600 mt-2.5 mb-2"></div>
                
                <p className="text-xs text-gray-500 font-bold leading-tight italic uppercase tracking-wider">
                  VnExpress Da Nang International Marathon<br/>Herbalife Cup 2026
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-6 sm:px-8 py-6 flex flex-col justify-center bg-white">
              <AnimatePresence mode="wait">
                {!successData ? (
                  /* REGISTRATION FORM VIEW */
                  <motion.div
                    key="registration-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col justify-center"
                  >
                    <form onSubmit={handleSubmitRegistration} className="space-y-5">
                       {/* Name field */}
                       <div className="space-y-1.5">
                        <label className="block text-xs font-black text-black uppercase tracking-widest">
                          Họ và tên <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                          <input
                            id="user-name-input"
                            type="text"
                            placeholder="NGUYỄN VĂN A"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              setFormTouched(prev => ({ ...prev, name: true }));
                            }}
                            onBlur={() => setFormTouched(prev => ({ ...prev, name: true }))}
                            className={`w-full bg-slate-50 border-2 rounded-xl py-3.5 pl-11 pr-4 text-base font-bold uppercase focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-600 transition-all placeholder:text-gray-300 text-black ${
                              formTouched.name && validateName(name)
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-200 focus:border-red-600"
                            }`}
                          />
                        </div>
                        {formTouched.name && validateName(name) && (
                          <p className="text-xs text-red-600 font-bold uppercase tracking-wider mt-0.5">
                            {validateName(name)}
                          </p>
                        )}
                      </div>

                      {/* Phone field */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-black text-black uppercase tracking-widest">
                          Số điện thoại <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <Phone className="w-5 h-5" />
                          </div>
                          <input
                            id="user-phone-input"
                            type="tel"
                            placeholder="0987654321"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setFormTouched(prev => ({ ...prev, phone: true }));
                            }}
                            onBlur={() => setFormTouched(prev => ({ ...prev, phone: true }))}
                            className={`w-full bg-slate-50 border-2 rounded-xl py-3.5 pl-11 pr-4 text-base font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-600 transition-all placeholder:text-gray-300 text-black ${
                              formTouched.phone && validatePhone(phone)
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-200 focus:border-red-600"
                            }`}
                          />
                        </div>
                        {formTouched.phone && validatePhone(phone) && (
                          <p className="text-xs text-red-600 font-bold uppercase tracking-wider mt-0.5">
                            {validatePhone(phone)}
                          </p>
                        )}
                      </div>

                      {/* Error Notification */}
                      {errorMsg && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-700 text-xs rounded-xl font-bold uppercase">
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        id="submit-register-btn"
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 text-white font-black text-sm uppercase italic transition-all tracking-widest flex items-center justify-center gap-2 mt-4 rounded-xl cursor-pointer active:scale-[0.98] ${
                          isFormValid && !isLoading
                            ? "bg-black hover:bg-red-600 shadow-md shadow-red-600/10"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>ĐANG ĐĂNG KÝ THAM GIA...</span>
                          </>
                        ) : (
                          <>
                            <span>ĐĂNG KÝ THAM GIA</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-400 uppercase leading-relaxed font-bold tracking-wider">
                      Mỗi người được nhận 1 lượt chơi Minigame.
                    </div>
                  </motion.div>
                ) : (
                  /* REGISTRATION SUCCESS VIEW (TICKET) */
                  <motion.div
                    key="success-ticket"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex-1 flex flex-col justify-center py-2"
                  >
                    {isDuplicate ? (
                      <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs sm:text-sm flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-black uppercase tracking-wider text-xs">SĐT NÀY ĐÃ ĐĂNG KÝ TRƯỚC ĐÓ!</p>
                          <p className="opacity-90 mt-1 leading-relaxed font-semibold">
                            Hệ thống phát hiện SĐT đã tham gia. Dưới đây là thông tin vé đã ghi nhận:
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center mb-4">
                        <div className="inline-flex p-3 rounded-full bg-red-100 text-red-600 mb-2">
                          <CheckCircle2 className="w-7 h-7 animate-pulse" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-black uppercase italic tracking-tighter">
                          ĐĂNG KÝ THÀNH CÔNG!
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider">
                          Đã ghi nhận thông tin vào hệ thống
                        </p>
                      </div>
                    )}

                    {/* High-contrast Ticket Container */}
                    <div className="bg-white border-2 border-black rounded-2xl overflow-hidden relative shadow-md my-2">
                      {/* Left and Right Ticket punch-outs */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 border border-black z-10" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 border border-black z-10" />

                      {/* Upper Ticket portion */}
                      <div className="p-5 border-b border-dashed border-gray-300 bg-slate-50 relative">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">MÃ LƯỢT CHƠI</p>
                            <p className="text-xl font-black text-black tracking-widest italic uppercase">{successData.ticketId}</p>
                          </div>
                          <div className="px-3 py-1 bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider italic rounded">
                            VIP PASS
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</p>
                            <p className="text-base font-black text-black uppercase tracking-tight">{successData.name}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</p>
                            <p className="text-base font-mono font-bold text-black">{successData.phone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Lower Ticket portion */}
                      <div className="p-5 bg-white relative">
                        <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-3 uppercase gap-2">
                          <div>
                            <p className="text-gray-400 font-black">THỜI GIAN ĐĂNG KÝ</p>
                            <p className="text-black font-extrabold font-mono text-xs sm:text-sm mt-0.5">{successData.timestamp}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 font-black">SỰ KIỆN</p>
                            <p className="text-red-600 font-black text-[10px] sm:text-xs mt-0.5">VM DA NANG HERBALIFE 2026</p>
                          </div>
                        </div>

                        {/* QR Code integration */}
                        <div className="pt-5 pb-2 flex flex-col items-center justify-center border-t border-gray-100 mt-3">
                          <div className="p-3 border-2 border-black rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://vm-minigame.vercel.app/admin?${successData.ticketId}`)}`}
                              alt="QR Code"
                              className="w-52 h-52 sm:w-56 sm:h-56 transition-transform duration-300 hover:scale-[1.02]"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          {/* Extreme-high visibility Ticket ID Stamp */}
                          <div className="mt-4 px-6 py-2 bg-red-600 border-2 border-black rounded-xl shadow-md text-white font-black text-xl sm:text-2xl tracking-widest uppercase italic animate-pulse">
                            {successData.ticketId}
                          </div>

                          <p className="text-xs font-bold text-gray-400 uppercase mt-3 tracking-wider text-center leading-relaxed">
                            Đưa mã QR này cho Ban tổ chức<br/>để quét và nhận lượt quay thưởng!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-3.5 bg-slate-50 border border-gray-200 text-center text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold rounded-xl">
                      📸 <b>Vui lòng chụp lại màn hình tấm vé này</b> để làm căn cứ nhận quà và đổi lượt chơi Minigame tại sự kiện!
                    </div>

                    <button
                      id="back-to-register-btn"
                      onClick={() => {
                        setSuccessData(null);
                        setIsDuplicate(false);
                      }}
                      className="w-full mt-4 py-4 bg-black hover:bg-red-600 text-white font-black text-sm uppercase tracking-widest italic transition-colors rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>ĐĂNG KÝ LƯỢT CHƠI MỚI</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ================= ADMIN CONSOLE VIEW ================= */}
        {currentView === "admin" && (
          <div className="flex-1 flex flex-col justify-between bg-slate-900 text-white min-h-screen">
            {!isAdminAuthenticated ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-950 text-white min-h-[70vh]">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
                >
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950 border border-red-800 text-red-500 mb-2">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black tracking-tight uppercase italic text-white">
                      XÁC MINH BAN TỔ CHỨC
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                      Vui lòng nhập mật khẩu để truy cập trang quản trị
                    </p>
                  </div>

                  <form onSubmit={handleVerifyPasscode} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
                        MẬT KHẨU TRUY CẬP (SỐ)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="••••••••••••"
                        style={{ WebkitTextSecurity: "disc" } as any}
                        value={adminPasscode}
                        onChange={(e) => {
                          setAdminPasscode(e.target.value.replace(/\D/g, ""));
                          setPasscodeError("");
                        }}
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl py-4 px-4 text-base sm:text-lg font-bold text-white tracking-widest placeholder:text-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-center"
                        autoFocus
                      />
                    </div>

                    {passcodeError && (
                      <div className="text-xs text-red-400 font-bold text-center bg-red-950/30 border border-red-900/50 py-3 px-3 rounded-xl">
                        {passcodeError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-widest italic transition-all rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      XÁC NHẬN TRUY CẬP
                    </button>
                  </form>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        setCurrentView("user");
                        window.history.pushState({}, "", "/");
                      }}
                      className="text-xs font-black tracking-widest text-slate-500 hover:text-slate-300 uppercase transition-colors"
                    >
                      Quay lại trang khách hàng
                    </button>
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Admin Header Section */}
                <div className="p-6 border-b border-slate-800 bg-slate-950 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-black text-red-500 tracking-widest uppercase italic">
                        BAN TỔ CHỨC
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                        Mã sự kiện: VM-2026
                      </span>
                      <button
                        onClick={() => {
                          setIsAdminAuthenticated(false);
                          sessionStorage.removeItem("admin_auth");
                          setAdminPasscode("");
                        }}
                        title="Đăng xuất"
                        className="p-1.5 bg-slate-800 hover:bg-red-600 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase italic leading-none mt-1">
                    MINIGAME CHECK-IN
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                    Quét mã QR và xác nhận quà tặng của vận động viên
                  </p>
                </div>

                {/* Step Progress Bar */}
                <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-center gap-3 sm:gap-5 text-[11px] sm:text-xs font-black">
                  <div className={`flex items-center gap-1.5 ${!scannedTicket ? 'text-red-500' : 'text-slate-500'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${!scannedTicket ? 'bg-red-600 text-white animate-pulse font-extrabold' : 'bg-slate-800 text-slate-500'}`}>1</span>
                    <span className="uppercase tracking-widest">NHẬP / QUÉT VÉ</span>
                  </div>
                  <div className="w-5 h-[1px] bg-slate-800" />
                  <div className={`flex items-center gap-1.5 ${scannedTicket ? 'text-red-500' : 'text-slate-500'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${scannedTicket ? 'bg-red-600 text-white animate-pulse font-extrabold' : 'bg-slate-800 text-slate-500'}`}>2</span>
                    <span className="uppercase tracking-widest">CẬP NHẬT KẾT QUẢ</span>
                  </div>
                </div>

            {/* Admin Body Area */}
            <div className="flex-1 p-4 sm:p-6 space-y-6">
              
              {/* QR Scanner Controls & Search Input */}
              {!scannedTicket && (
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    1. TIẾP NHẬN THÔNG TIN VÉ
                  </p>

                  {/* Inline Camera stream or manual search option */}
                  <div className="flex flex-col gap-3.5">
                    
                    {isScanning ? (
                      <div className="relative border-2 border-dashed border-red-500 rounded-2xl overflow-hidden bg-black p-3 sm:p-4 flex flex-col items-center w-full">
                        <div className="relative w-full max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-2xl">
                          <div id="qr-reader" className="w-full h-full" />
                          {/* Animated laser line & targeting frame overlay */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                            <div className="absolute inset-6 border-2 border-dashed border-red-500/40 rounded-2xl" />
                            <div className="qr-laser-line" />
                          </div>
                        </div>
                        <button
                          onClick={() => setIsScanning(false)}
                          className="mt-3 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase rounded-xl tracking-wider active:scale-95 transition-all"
                        >
                          HỦY QUÉT CAMERA
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsScanning(true)}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white rounded-xl font-black text-sm uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/20"
                      >
                        <Camera className="w-4.5 h-4.5 animate-bounce" />
                        MỞ CAMERA QUÉT MÃ QR VÉ
                      </button>
                    )}

                    {scannerError && (
                      <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs font-medium leading-relaxed">
                        {scannerError}
                      </div>
                    )}

                    {/* Manual input lookup */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Mã vé (VD: VM26-ABCDE)"
                        value={searchTicketId}
                        onChange={(e) => setSearchTicketId(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-3.5 px-4 text-base font-bold uppercase tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLookupTicket(searchTicketId);
                        }}
                      />
                      <button
                        onClick={() => handleLookupTicket(searchTicketId)}
                        disabled={adminLoading || !searchTicketId.trim()}
                        className="px-5 bg-slate-800 hover:bg-red-600 disabled:bg-slate-950 disabled:text-slate-800 disabled:border-slate-800 border border-transparent rounded-xl text-white font-black text-sm transition-all cursor-pointer flex items-center justify-center active:scale-[0.98]"
                      >
                        {adminLoading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Search className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Loader */}
              {adminLoading && (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Đang tìm dữ liệu từ Google Sheets...
                  </p>
                </div>
              )}

              {/* Lookup Error msg */}
              {adminError && !adminLoading && (
                <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-xs">LỖI TÌM KIẾM</p>
                    <p className="opacity-90 mt-0.5 leading-relaxed">{adminError}</p>
                  </div>
                </div>
              )}

              {/* Scanned User Information & Redemption flow */}
              {scannedTicket && !adminLoading && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Participant Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-md relative overflow-hidden">
                    
                    {/* Glowing status stamp on card */}
                    <div className="absolute top-4 right-4">
                      {scannedTicket.game1 === "Đã chơi" || scannedTicket.game2 === "Đã chơi" || scannedTicket.game3 === "Đã chơi" || scannedTicket.game4 === "Đã chơi" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-800">
                          ĐÃ CHƠI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-800 animate-pulse">
                          CHƯA CHƠI
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MÃ LƯỢT CHƠI</p>
                      <p className="text-lg font-black text-white italic tracking-wider uppercase">{scannedTicket.ticketId}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-900">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HỌ VÀ TÊN VĐV</p>
                        <p className="text-sm font-bold text-white uppercase mt-0.5">{scannedTicket.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SỐ ĐIỆN THOẠI</p>
                        <p className="text-sm font-mono font-bold text-slate-300 mt-0.5">{scannedTicket.phone}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex justify-between items-start text-[10px] text-slate-400 font-bold uppercase tracking-wider gap-2">
                      <div>
                        <p className="text-slate-500 text-[9px]">ĐĂNG KÝ LÚC</p>
                        <p className="text-slate-300 font-mono mt-0.5">{scannedTicket.timestamp}</p>
                      </div>
                      {(scannedTicket.gift1 || scannedTicket.gift2) && (
                        <div className="text-right max-w-[60%]">
                          <p className="text-red-500 text-[9px]">QUÀ ĐÃ NHẬN</p>
                          <p className="text-emerald-400 font-extrabold mt-0.5 leading-tight text-xs">
                            {scannedTicket.gift1 && <span>{scannedTicket.gift1}</span>}
                            {scannedTicket.gift1 && scannedTicket.gift2 && <span> + </span>}
                            {scannedTicket.gift2 && <span>{scannedTicket.gift2}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4-GAME TRACKING & GIFT MANAGEMENT CONSOLE */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
                    
                    {/* Part 1: Game Checkboxes */}
                    <div className="space-y-3">
                      <div className="text-left pb-1 border-b border-slate-900">
                        <p className="text-[11px] font-black text-red-500 uppercase tracking-widest italic">
                          2. THEO DÕI TRẠNG THÁI CHƠI GAME
                        </p>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Tích chọn các game vận động viên đã hoàn thành
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Game 1 */}
                        <label 
                          id="admin-game-1-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGame1 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-game-1-checkbox"
                            checked={adminGame1}
                            onChange={(e) => {
                              setAdminGame1(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GAME 1</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGame1 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGame1 ? "✓ ĐÃ HOÀN THÀNH" : "○ CHƯA CHƠI"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">Bắt gậy</p>
                          </div>
                        </label>

                        {/* Game 2 */}
                        <label 
                          id="admin-game-2-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGame2 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-game-2-checkbox"
                            checked={adminGame2}
                            onChange={(e) => {
                              setAdminGame2(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GAME 2</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGame2 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGame2 ? "✓ ĐÃ HOÀN THÀNH" : "○ CHƯA CHƠI"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">Sàng bóng xuống lỗ</p>
                          </div>
                        </label>

                        {/* Game 3 */}
                        <label 
                          id="admin-game-3-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGame3 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-game-3-checkbox"
                            checked={adminGame3}
                            onChange={(e) => {
                              setAdminGame3(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GAME 3</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGame3 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGame3 ? "✓ ĐÃ HOÀN THÀNH" : "○ CHƯA CHƠI"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">PickleBall</p>
                          </div>
                        </label>

                        {/* Game 4 */}
                        <label 
                          id="admin-game-4-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGame4 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-game-4-checkbox"
                            checked={adminGame4}
                            onChange={(e) => {
                              setAdminGame4(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GAME 4</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGame4 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGame4 ? "✓ ĐÃ HOÀN THÀNH" : "○ CHƯA CHƠI"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">Vòng tròn về đích</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Part 2: Gift checkboxes */}
                    <div className="space-y-4 pt-1 border-t border-slate-900">
                      <div className="text-left">
                        <p className="text-[11px] font-black text-red-500 uppercase tracking-widest italic">
                          3. QUÀ TẶNG THỂ THAO ĐÃ TRAO
                        </p>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Tích chọn các món quà đã trao cho vận động viên
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Gift 1: Gang tay */}
                        <label 
                          id="admin-gift-1-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGift1 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-gift-1-checkbox"
                            checked={adminGift1}
                            onChange={(e) => {
                              setAdminGift1(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GIFT 1</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGift1 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGift1 ? "✓ ĐÃ TRAO" : "○ CHƯA TRAO"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">Găng tay</p>
                          </div>
                        </label>

                        {/* Gift 2: Khăn ống */}
                        <label 
                          id="admin-gift-2-container"
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                            adminGift2 
                              ? "bg-red-950/30 border-red-600 text-white shadow-md shadow-red-950/10" 
                              : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id="admin-gift-2-checkbox"
                            checked={adminGift2}
                            onChange={(e) => {
                              setAdminGift2(e.target.checked);
                              setSyncSuccess(false);
                            }}
                            className="h-6 w-6 accent-red-600 rounded-lg cursor-pointer border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">GIFT 2</p>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${adminGift2 ? 'bg-red-950 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {adminGift2 ? "✓ ĐÃ TRAO" : "○ CHƯA TRAO"}
                              </span>
                            </div>
                            <p className="text-sm font-black text-white mt-0.5 leading-tight truncate">Khăn ống</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Part 3: Synchronize Submit Button */}
                    <div className="pt-2 border-t border-slate-900">
                      {syncSuccess ? (
                        <div className="space-y-3">
                          <p className="text-xs text-emerald-400 font-black text-center uppercase tracking-wider animate-bounce">
                            🎉 Cập nhật kết quả thành công!
                          </p>
                          <button
                            onClick={() => {
                              setScannedTicket(null);
                              setSearchTicketId("");
                              setSyncSuccess(false);
                              setAdminError(null);
                              setIsScanning(false);
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 rounded-xl cursor-pointer shadow-lg shadow-emerald-950/20 active:scale-98"
                          >
                            <QrCode className="w-5 h-5" />
                            <span>QUÉT NGƯỜI TIẾP THEO</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <button
                            onClick={handleSubmitAdmin}
                            disabled={syncingAdmin}
                            id="btn-admin-submit"
                            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-900 disabled:text-slate-600 text-white font-black text-sm uppercase tracking-widest italic transition-all flex items-center justify-center gap-2 rounded-xl cursor-pointer shadow-lg shadow-red-950/20 active:scale-98"
                          >
                            {syncingAdmin ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>ĐANG CẬP NHẬT KẾT QUẢ...</span>
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-5 h-5" />
                                <span>CẬP NHẬT KẾT QUẢ</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setScannedTicket(null);
                              setSearchTicketId("");
                              setSyncSuccess(false);
                              setAdminError(null);
                              setIsScanning(false);
                            }}
                            disabled={syncingAdmin}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-400 font-bold text-sm uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 border border-slate-800/80 active:scale-98"
                          >
                            <XCircle className="w-4.5 h-4.5" />
                            <span>HỦY & CHỌN NGƯỜI KHÁC</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

            </div>
            </>
            )}

            {/* Admin visual footer branding banner */}
            <div className="bg-slate-950 py-4 px-6 text-center text-[8px] text-slate-500 font-black tracking-widest uppercase border-t border-slate-900">
              Hệ thống vận hành VnExpress Marathon 2026 • Ban Tổ Chức
            </div>

          </div>
        )}

        {/* ================= SHARED FOOTER BRAND ================= */}
        {currentView === "user" && (
          <div className="bg-black py-4 px-6 text-center text-[8px] text-gray-400 font-black tracking-widest uppercase leading-none">
            VnExpress Marathon Official Portal 2026
          </div>
        )}

      </div>
    </div>
  );
}
