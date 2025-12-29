# PCShop — Slides Outline

## Slide 1 — Tiêu đề & Tổng quan
- PCShop: E-commerce linh kiện PC
- Mục tiêu: trải nghiệm mua sắm, build cấu hình, tìm kiếm nhanh
- Đối tượng: Người dùng cuối, người cần báo giá; Admin vận hành
- Notes (thuyết trình):
  - Giới thiệu ngắn: bài toán mua PC/linh kiện và nhu cầu báo giá nhanh.
  - Nhấn mạnh: tập trung vào tốc độ tìm kiếm, trải nghiệm Build PC, và quản trị.

## Slide 2 — Đối tượng mục tiêu
- User: mua PC/linh kiện/phụ kiện theo nhu cầu
- Người cần báo giá/in cấu hình nhanh
- Admin: quản lý sản phẩm, đơn hàng, người dùng, nội dung
- Notes:
  - Mô tả từng nhóm: hành vi và kỳ vọng (User vs Người cần báo giá vs Admin).
  - Lợi ích cốt lõi cho mỗi nhóm.

## Slide 3 — Giá trị cho User
- Tìm kiếm nhanh (Typesense), lọc/sắp xếp
- Build PC từng linh kiện, kiểm soát chi phí & tồn kho
- Giỏ hàng, Checkout, Xem & In báo giá
- Blog/guide hỗ trợ quyết định; Chatbot FAQ
- Notes:
  - Trải nghiệm end-to-end từ tìm kiếm → build → báo giá → mua.
  - Ví dụ thực tế: tìm “RTX 3060”, build cấu hình gaming tầm trung.

## Slide 4 — Giá trị cho Admin
- Quản lý danh mục/sản phẩm/kho/giá
- Quản lý người dùng/đơn hàng/giỏ hàng
- Quản lý nội dung blog/liên hệ
- Theo dõi tìm kiếm, cải thiện dữ liệu
- Notes:
  - Nhấn vào vận hành: chính xác dữ liệu, đồng bộ tìm kiếm.
  - Tác động đến hiệu quả kinh doanh.

## Slide 5 — Tính năng nổi bật (Highlight)
- Tìm kiếm thông minh (Typesense, similar products)
- Build PC trực quan, kiểm soát ngân sách/tồn kho
- Xem & In báo giá, quy trình mua sắm đầy đủ
- Notes:
  - Vì sao chọn Typesense (tốc độ, facet, typo tolerance).
  - Điểm khác biệt: Build PC có kiểm soát ngân sách/tồn kho.

## Slide 6 — Kiến trúc & Công nghệ
- Frontend: React + Vite, Ant Design, React Router, SCSS Modules
- Backend: Node/Express, Sequelize, Typesense, Cloudinary
- Tách client/server; controllers, services, models
- Notes:
  - Triết lý kiến trúc: tách bạch, dễ mở rộng.
  - Các thành phần chính và dòng dữ liệu.

## Slide 7 — Flow Demo (tổng quan)
- Trang chủ → danh mục/bộ lọc
- Tìm kiếm → kết quả → lọc/sắp xếp → similar products
- Build PC → chọn linh kiện → chi phí dự tính → Xem & In/Thêm vào giỏ
- Giỏ hàng & Checkout → thanh toán
- Blog & Chatbot → hỗ trợ
- Admin → dashboard quản trị
- Notes:
  - Lộ trình demo 10–15 phút; mục tiêu mỗi chặng.
  - Giữ nhịp: không đi quá sâu mỗi phần, tập trung highlight.

## Slide 8 — Demo chi tiết: Tìm kiếm thông minh
- Nhập từ khóa (VD: “RTX 3060”)
- Kết quả hiển thị tên/giá/ảnh
- Lọc theo componentType; sắp xếp theo giá
- Mở chi tiết → sản phẩm tương tự
- Notes:
  - Giải thích nhanh cách index/fields để lọc.
  - Nêu lợi ích business: giảm thời gian tìm kiếm, tăng chuyển đổi.

## Slide 9 — Demo chi tiết: Build PC
- Mỗi nhóm linh kiện có modal chọn sản phẩm
- Tìm kiếm/sắp xếp trong modal
- Điều chỉnh số lượng; kiểm tra tồn kho, giới hạn số lượng
- Cảnh báo vượt ngân sách; cập nhật tổng chi phí
- Xem & In báo giá hoặc Thêm vào giỏ
- Notes:
  - Nhấn mạnh tương thích/kiểm soát (kế hoạch nâng cấp).
  - Giá trị cho khách: minh bạch chi phí và dễ chỉnh cấu hình.

## Slide 10 — Demo: Giỏ hàng & Checkout
- Quản lý số lượng, xóa mặt hàng
- Tổng tiền tự động cập nhật
- Chuyển sang Checkout: thông tin giao hàng/đơn hàng
- Notes:
  - Trải nghiệm đơn giản, ít bước; dự định tích hợp cổng thanh toán.
  - Theo dõi trạng thái đơn hàng (roadmap).

## Slide 11 — Demo: Blog & Chatbot
- Mở bài viết: review/guide
- Chatbot: đặt câu hỏi, trả lời markdown đẹp
- Notes:
  - Vai trò nội dung: tạo niềm tin, hỗ trợ trước bán.
  - Chatbot phạm vi: FAQ/hướng dẫn; tránh overpromise AI.

## Slide 12 — Demo: Admin
- Đăng nhập, mở dashboard
- Quản lý sản phẩm/đơn hàng/người dùng/liên hệ
- (Tuỳ chọn) đồng bộ dữ liệu lên Typesense
- Notes:
  - Nhấn mạnh tính chính xác dữ liệu và tác động đến tìm kiếm.
  - Kế hoạch báo cáo số liệu và auto-sync.

## Slide 13 — Khó khăn (Challenges)
- Dữ liệu sản phẩm không đồng nhất; thiếu thông số
- Đồng bộ & tối ưu tìm kiếm Typesense
- Logic Build PC: ngân sách, tồn kho, tương thích linh kiện
- UX & hiệu năng: debounce, pagination, lazy load
- Bảo mật & xử lý lỗi
- Notes:
  - Nêu ví dụ điển hình: socket CPU/Mainboard, chuẩn RAM.
  - Giải pháp ngắn hạn: chuẩn hóa thuộc tính, cải thiện index.

## Slide 14 — Hướng phát triển (Roadmap)
- Chuẩn hóa dữ liệu & tự động kiểm tra tương thích
- Nâng cấp tìm kiếm: synonyms, typo tolerance, boost
- Cải tiến UX Build PC: so sánh, lưu/chia sẻ preset, gợi ý thay thế
- Thanh toán: tích hợp cổng, phí vận chuyển tự động
- Quản trị: dashboard số liệu, import/export, sync Typesense
- Hiệu năng/DevOps: caching, CDN, logging/monitoring, CI/CD
- i18n & Accessibility
- Notes:
  - Ưu tiên ngắn hạn: dữ liệu & tương thích + tìm kiếm.
  - Trung hạn: thanh toán, báo cáo, hiệu năng.

## Slide 15 — Kết luận
- Nền tảng vững: mua sắm + tìm kiếm + build cấu hình
- Trọng tâm phát triển: dữ liệu chuẩn, UX Build PC, đề xuất & tương thích
- Lợi ích rõ rệt cho user và admin
- Notes:
  - Tóm tắt giá trị và lời kêu gọi thử demo.
  - Mở Q&A.

---

## Slide phụ — Sơ đồ Flow hệ thống (Architecture/Runtime)

System Flow (User-facing):

User (Web) → Client (React/Vite)
  → API Gateway (Express) → Services/Controllers
    → Search (Typesense)
    → Database (Sequelize → SQL)
    → Media (Cloudinary)
  → Authentication (JWT/Role)
  → Responses (Success/Error) → Client UI

- Notes (thuyết trình):
  - Trình bày luồng request: Client gửi yêu cầu → API → dịch vụ (Search/DB/Media) → trả về.
  - Nêu cơ chế auth (JWT, phân quyền Admin/User).
  - Giải thích cách Typesense tham gia: query nhanh, facet, similar.
  - Chỉ ra các nơi có caching/logging/monitoring (Roadmap).

Checkout/Build PC Specific Flow:

Build PC UI → chọn linh kiện (modal) → gọi Search API (Typesense)
→ xác thực tồn kho/giá từ DB → cập nhật “Chi phí dự tính”
→ Xem & In (Quotation) hoặc Thêm vào giỏ (Cart Service)
→ Checkout → Shipping/Payments (Roadmap)

- Notes:
  - Nhấn vào bước xác thực dữ liệu: tồn kho/giá lấy từ DB.
  - Quotation là bước chuyển đổi quan trọng trước khi thêm giỏ.

Admin Flow:

Admin UI → Auth (JWT Role=Admin)
→ Dashboard → CRUD Sản phẩm/Đơn hàng/Người dùng/Blog
→ Sync Search (Typesense) khi dữ liệu thay đổi
→ Báo cáo số liệu (Roadmap)

- Notes:
  - Điều kiện truy cập (role-based).
  - Tầm quan trọng của đồng bộ tìm kiếm sau CRUD.
