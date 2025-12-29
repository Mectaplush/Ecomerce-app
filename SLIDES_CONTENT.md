# PCShop (Ecomerce-app) — Slide Content

Slide 1 — Tiêu đề & Mở đầu

-   Tiêu đề: PCShop (Ecomerce-app)
-   Phụ đề: Trải nghiệm mua sắm PC/linh kiện toàn diện
-   Điểm chính:
    -   Đối tượng: Khách hàng mua PC/linh kiện, người cần báo giá nhanh, Admin quản trị.
    -   Mục tiêu: Tìm kiếm nhanh, Build PC trực quan, quản trị hiệu quả.

Slide 2 — Đối tượng mục tiêu

-   Người dùng cuối: Gaming/Đồ họa/Văn phòng/Học tập.
-   Người cần báo giá/in cấu hình nhanh.
-   Admin: Quản lý sản phẩm, đơn hàng, người dùng, blog, hỗ trợ.

Slide 3 — Giá trị cho User

-   Tìm kiếm chính xác với Typesense, lọc/sắp xếp linh hoạt.
-   Build PC theo nhu cầu, theo dõi chi phí và tồn kho.
-   Giỏ hàng/Checkout mượt, xem & in báo giá.
-   Blog/Guide hỗ trợ quyết định; Chatbot FAQ nhanh.

Slide 4 — Giá trị cho Admin

-   Quản lý danh mục/sản phẩm/kho/giá.
-   Quản lý người dùng/đơn hàng/giỏ hàng.
-   Quản trị nội dung: blog, liên hệ, phản hồi.
-   Theo dõi tìm kiếm, cải thiện dữ liệu (Typesense, embeddings).

Slide 5 — Tính năng nổi bật (Overview)

-   Trang chủ & danh mục, banner/quảng bá.
-   Tìm kiếm thông minh (Typesense), similar products.
-   Build PC: chọn linh kiện theo componentType, chi phí/tồn kho.
-   Giỏ hàng & Checkout; Báo giá; Blog; Chatbot; Tài khoản; Admin.

Slide 6 — Tìm kiếm thông minh (Highlight)

-   Hybrid search qua Typesense: tên, mô tả, tags, componentType.
-   Lọc/sắp xếp theo giá, tồn kho, phổ biến.
-   Sản phẩm tương tự từ name/description.
-   Lợi ích: tìm nhanh, kết quả liên quan, tối ưu chuyển đổi.

Slide 7 — Build PC (Highlight)

-   Chọn linh kiện: CPU, Mainboard, RAM, SSD/HDD, VGA, PSU, Case, Cooler, Monitor, Phụ kiện.
-   Kiểm soát số lượng, tồn kho, ngân sách tổng.
-   Tự động tính “Chi phí dự tính”; Xem & In; Thêm vào giỏ.

Slide 8 — Giỏ hàng & Checkout

-   Quản lý số lượng, xóa sản phẩm, tổng tiền.
-   Luồng thanh toán, thông tin giao hàng.
-   Trải nghiệm mượt, minh bạch chi phí.

Slide 9 — Blog & Chatbot

-   Blog: tin tức, review, hướng dẫn.
-   Chatbot: FAQ, hướng dẫn, hiển thị markdown đẹp.
-   Tăng niềm tin, hỗ trợ quyết định mua.

Slide 10 — Tài khoản người dùng

-   Đăng ký/Đăng nhập/Quên mật khẩu.
-   Quản lý thông tin cá nhân, địa chỉ.
-   Lịch sử đơn hàng (nếu triển khai).

Slide 11 — Admin Dashboard

-   Quản lý sản phẩm/giá/tồn kho.
-   Quản lý đơn hàng/người dùng/liên hệ.
-   Đồng bộ dữ liệu tìm kiếm lên Typesense.

Slide 12 — Kiến trúc & Công nghệ

-   Frontend: React + Vite, Ant Design, React Router, SCSS.
-   Backend: Node.js/Express, Sequelize, Typesense, Cloudinary.
-   Tách client/server, services/controllers/models rõ ràng.

Slide 13 — Flow demo (10–15’)

-   Tìm kiếm thông minh (3’): từ khóa → kết quả → lọc/sắp xếp → similar.
-   Build PC (5’): chọn linh kiện → số lượng/tồn kho/ngân sách → chi phí → Xem & In/Giỏ.
-   Giỏ hàng & Checkout (2’).
-   Blog & Chatbot (2’).
-   Admin (2’).

Slide 14 — Demo cues (chi tiết)

-   Trang chủ: banner, danh mục → vào VGA.
-   Tìm kiếm: “RTX 3060”, lọc componentType=vga, sort giá.
-   Product detail: mở “Sản phẩm tương tự”.
-   Build PC: mở modal, chọn từng linh kiện, xem chi phí.
-   Quotation: Xem & In; Giỏ hàng: thêm cấu hình, checkout.

Slide 15 — Điểm mạnh nổi bật

-   Build PC trực quan, kiểm soát ngân sách/tồn kho.
-   Tìm kiếm nhanh, similar products nhờ Typesense.
-   Hệ thống đầy đủ: nội dung, chatbot, quản trị.

Slide 16 — Khó khăn (Challenges)

-   Dữ liệu không đồng nhất: componentType, tags, mô tả.
-   Tìm kiếm & gợi ý: indexing, facet/searchable, tối ưu query.
-   Build PC logic: ngân sách, tồn kho, tương thích linh kiện.
-   Trải nghiệm & hiệu năng: debounce, pagination, bundle.
-   Bảo mật & ổn định: auth/roles, token, xử lý lỗi tập trung.

Slide 17 — Hướng phát triển (Roadmap)

-   Chuẩn hóa dữ liệu & tương thích linh kiện (socket, RAM, PSU...).
-   Nâng cấp tìm kiếm & đề xuất: synonyms, typo, boost brand/tags.
-   UX Build PC: so sánh nhanh, lưu/chia sẻ/clone cấu hình, gợi ý thay thế.
-   Checkout & thanh toán: tích hợp cổng, phí vận chuyển tự động.
-   Quản trị & báo cáo: dashboard số liệu, nhập/xuất CSV, auto-sync.
-   Hiệu năng & DevOps: caching API, CDN ảnh, logging/monitoring, CI/CD.
-   i18n & Accessibility: đa ngôn ngữ, chuẩn WCAG cơ bản.

Slide 18 — Ghi chú loại bỏ AI Build PC

-   Đã loại bỏ toàn bộ UI/state/logic AI Build PC ở frontend.
-   Backend AI PC Builder dùng Typesense + fallback DB.
-   Code sạch, không lỗi compile/lint sau chỉnh sửa.

Slide 19 — Kết luận

-   Nền tảng tốt cho mua sắm và tìm kiếm.
-   Tập trung chuẩn hóa dữ liệu, nâng UX Build PC, mở rộng tương thích/đề xuất.
-   Giá trị rõ rệt cho User và Admin.

Slide 20 — Q&A

-   Câu hỏi & phản hồi.
-   Liên hệ: (điền thông tin nhóm/dự án).
