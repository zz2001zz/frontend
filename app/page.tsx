'use client';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';

interface FormData {
  time: string;
  specificTime: string;
  location: string;
  message: string;
}

interface AvailableDate {
  value: string;
  label: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({ time: '', specificTime: '', location: '', message: '' });
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupMessage, setPopupMessage] = useState<string>('');
  const [showBusyPopup, setShowBusyPopup] = useState<boolean>(false);
  const [isBusyEnd, setIsBusyEnd] = useState<boolean>(false);

  // 📝 Cấu hình Telegram ở đây (Sau khi deploy nên đưa vào biến môi trường .env)
  const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

  // Hàm gửi tin nhắn chung qua Telegram API
  const sendTelegramMessage = async (text: string) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown', // Hỗ trợ in đậm, xuống dòng cho đẹp
      }),
    });
    return response.ok;
  };

  // 1. Tự động tạo danh sách các ngày Thứ 7 và Chủ Nhật bắt đầu từ ngày 11/07/2026
  useEffect(() => {
    const dates: AvailableDate[] = [];
    // Bắt đầu quét từ ngày hôm nay (Tháng 7 năm 2026)
    const currentDate = new Date(2026, 6, 1); 

    // Vòng lặp chạy qua từng ngày trong tháng 7
    while (currentDate.getMonth() === 6) { 
      const dayOfWeek = currentDate.getDay();

      // Chỉ lấy Chủ Nhật (0) và bỏ qua Thứ Bảy (6)
      if (dayOfWeek === 0) {
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const valueDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

        dates.push({
          value: valueDate,
          label: `Chủ Nhật (Ngày ${formattedDate})`
        });
      }
      
      // Tăng thêm 1 ngày để tiếp tục kiểm tra
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setAvailableDates(dates);
  }, []);

  // 2. Ngăn chặn reload (F5) hoặc tắt trang bất ngờ
  useEffect(() => {
    if (isSubmitted || isBusyEnd) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitted, isBusyEnd]);

  // 3. Xử lý khi nhấn ĐỒNG Ý HẸN HÒ
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.time) {
      setPopupMessage("Cậu ơi, chọn ngày đi chơi với tớ đã nèee =(");
      setShowPopup(true);
      return;
    }
    if (!formData.specificTime) {
      setPopupMessage("Khung giờ nào thì hợp lý nhất nhỉ, cậu chọn giúp tớ với");
      setShowPopup(true);
      return;
    }
    if (!formData.location) {
      setPopupMessage("Chúng mình đi đâu được nhỉ, cậu gợi ý một nơi đi nha");
      setShowPopup(true);
      return;
    }

    setLoading(true);

    // Định dạng nội dung tin nhắn gửi về máy bạn
    const messageText = `
✨ *CẬU CÓ HẸN HÒ MỚI NÈ!* ✨
-----------------------------
📅 *Ngày hẹn:* ${formData.time}
⏰ *Khung giờ:* ${formData.specificTime}
📍 *Địa điểm:* ${formData.location}
💬 *Lời nhắn:* ${formData.message || '_Không có lời nhắn_'}
-----------------------------
🚀 _Chuẩn bị quần áo vuốt tóc đi đón người ta thôi!_
    `.trim();

    try {
      const isSuccess = await sendTelegramMessage(messageText);
      if (isSuccess) {
        setIsSubmitted(true);
      } else {
        setPopupMessage('Có lỗi hệ thống xảy ra, thử lại giúp tớ nhé');
        setShowPopup(true);
      }
    } catch (error) {
      console.error(error);
      setPopupMessage('Không thể kết nối mạng rồi, kiểm tra lại nhé');
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  // 4. Xử lý khi cô ấy chọn "Yep" (BÁO BẬN RỒI)
  const handleConfirmBusy = async () => {
    setShowBusyPopup(false);

    const busyText = `
🍂 *THÔNG BÁO BẬN* 🍂
-----------------------------
😢 *Trạng thái:* Bạn ấy đã bấm nút bận mất rồi.
💬 *Lời nhắn kèm theo:* ${formData.message || '_Không có lời nhắn_'}
-----------------------------
💔 _Đừng buồn, đợi dịp khác sang rủ lại nha bạn chỉ huy!_
    `.trim();

    try {
      await sendTelegramMessage(busyText);
    } catch (error) {
      console.error("Lỗi gửi trạng thái bận:", error);
    }

    setPopupMessage("Huhu, khi nào hết bận phải bù cho tớ đó nha 😭");
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    if (popupMessage === "Huhu, khi nào hết bận phải bù cho tớ đó nha 😭") {
      setIsBusyEnd(true);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4 selection:bg-pink-200 relative">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-pink-100 text-center">

        {isBusyEnd ? (
          <div className="py-8">
            <span className="text-6xl inline-block animate-bounce">🍂</span>
            <h2 className="text-2xl font-bold text-pink-600 mt-4">Hẹn gặp cậu vào một ngày không xa</h2>
            <p className="text-gray-500 mt-2">Tớ vẫn luôn ở đây chờ cậu nè 😉</p>
          </div>
        ) : !isSubmitted ? (
          <>
            <span className="text-4xl">💌</span>
            <h1 className="text-2xl font-bold text-pink-600 mt-2 mb-1">Cậu có hẹn với tớ chứ?</h1>
            <p className="text-gray-500 text-sm mb-6">Chọn thời gian và địa điểm cậu muốn đi nhé</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* MỤC 1: CHỌN NGÀY CUỐI TUẦN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khi nào cậu rảnh nè? </label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, time: e.target.value })}
                >
                  <option value="">Chọn một ngày cuối tuần</option>
                  {availableDates.map((date, index) => (
                    <option key={index} value={date.label}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* MỤC 2: CHỌN GIỜ CỤ THỂ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khung giờ nào thì hợp lý nhất nhỉ?</label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, specificTime: e.target.value })}
                >
                  <option value="">Chọn một buổi trong ngày</option>
                  <option value="Buổi sáng (8:30 - 11:30)">Buổi sáng mát mẻ (8:30 - 11:30) </option>
                  <option value="Buổi chiều (14:30 - 17:30)">Buổi chiều nhẹ nhàng (14:30 - 17:30) </option>
                  <option value="Buổi tối (19:00 - 22:00)">Buổi tối lung linh (19:00 - 22:00) </option>
                  <option value="Giờ giấc tùy ý tớ">Giờ nào cũng được, tớ quyết định sau nha </option>
                </select>
              </div>

              {/* MỤC 3: CHỌN ĐỊA ĐIỂM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cậu muốn chúng mình đi đâu đây?</label>
                <select
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 bg-white"
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="">Chọn một nơi cậu thích</option>
                  <option value="Cà phê chuyện trò nhẹ nhàng">Cà phê chuyện trò</option>
                  <option value="Đi ăn món gì đó ngon ngon (Lẩu/Nướng)">Đi ăn món gì đó ngon ngon </option>
                  <option value="Rạp chiếu phim lãng mạn">Rạp chiếu phim</option>
                </select>
              </div>

              {/* MỤC 4: LỜI NHẮN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn cho tớ (nếu có):</label>
                <textarea
                  className="w-full p-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-700 h-20 resize-none"
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBusyPopup(true)}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium rounded-xl transition duration-200"
                >
                  Tớ bận òi 😢
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-200 disabled:bg-pink-300"
                >
                  {loading ? 'Đang gửi...' : 'Gửi cho tớ ngay 🚀'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8">
            <span className="text-6xl inline-block animate-bounce">💖</span>
            <h2 className="text-2xl font-bold text-pink-600 mt-4">Gửi thành công rồi nè</h2>
            <p className="text-gray-600 mt-2">
              Tớ đã nhận được lịch hẹn <br />
              Chờ tớ qua đón cậu đi chơi nhé 😉
            </p>
          </div>
        )}
      </div>

      {/* POPUP 1: THÔNG BÁO CHUNG */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100 text-center">
            <p className="text-gray-700 font-medium mt-4 mb-6 leading-relaxed">{popupMessage}</p>
            <button
              onClick={handleClosePopup}
              className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-150"
            >
              Tớ biết rồi nha
            </button>
          </div>
        </div>
      )}

      {/* POPUP 2: XÁC NHẬN BẬN */}
      {showBusyPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100 text-center">
            <p className="text-gray-700 font-semibold mt-4 mb-6 text-lg">Cậu bận thật sao</p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowBusyPopup(false)}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl shadow-md transition duration-150 min-w-[80px]"
              >
                Khum
              </button>
              <button
                type="button"
                onClick={handleConfirmBusy}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-semibold rounded-xl transition duration-150 min-w-[80px]"
              >
                Yep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
