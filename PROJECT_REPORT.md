# Báo cáo tổng quan dự án Ecomerce-app (PCShop)

## 1. Đối tượng mục tiêu

-   Người dùng cuối (khách hàng cá nhân): muốn mua PC, linh kiện hoặc phụ kiện theo nhu cầu (gaming, đồ họa, văn phòng, học tập).
-   Người dùng có nhu cầu báo giá/in cấu hình: cần tạo cấu hình và xuất báo giá nhanh.
-   Quản trị viên (Admin): quản lý sản phẩm, đơn hàng, người dùng, nội dung blog và hỗ trợ khách hàng.

## 2. Giá trị mang lại (User & Admin)

-   User:
    -   Tìm kiếm sản phẩm nhanh và chính xác (Typesense, bộ lọc, sắp xếp).
    -   Xây dựng PC theo nhu cầu với từng linh kiện (Build PC), theo dõi chi phí và kho.
    -   Quản lý giỏ hàng, thanh toán/checkout, xem/in báo giá.
    -   Nội dung blog/guide giúp ra quyết định mua hàng.
    -   Hỗ trợ qua chatbot (FAQ, hướng dẫn, gợi ý sản phẩm).
-   Admin:
    -   Quản lý danh mục/sản phẩm/kho/giá.
    -   Quản lý người dùng/đơn hàng/giỏ hàng.
    -   Quản lý nội dung: blog, liên hệ, phản hồi.
    -   Theo dõi tìm kiếm và cải thiện dữ liệu (Typesense, embeddings).

## 3. Danh sách tính năng (highlight)

-   Trang chủ & danh mục: hiển thị sản phẩm theo danh mục, banner/quảng bá.
-   Tìm kiếm thông minh (Highlight):
    -   Hybrid search qua Typesense: theo tên, mô tả, tags, componentType.
    -   Tìm sản phẩm tương tự (similar products) từ name/description.
    -   Lọc/sắp xếp theo giá, tồn kho, phổ biến.
-   Build PC (Highlight):
    -   Chọn linh kiện cho từng componentType (CPU, Mainboard, RAM, HDD/SSD, VGA, PSU, Case, Cooler, Màn hình, Phím/Chuột/Tai nghe).
    -   Kiểm soát số lượng, giới hạn ngân sách tổng, kiểm tra tồn kho.
    -   Xem tổng chi phí dự tính, thêm toàn bộ vào giỏ hàng.
    -   Xuất báo giá/Xem & In.
-   Giỏ hàng & Checkout: cập nhật số lượng, xóa sản phẩm, chuyển sang thanh toán.
-   Blog & nội dung: tin tức, hướng dẫn, review.
-   Chatbot (Highlight): hỗ trợ trả lời nhanh, hiển thị nội dung markdown đẹp (ReactMarkdown + styles).
-   User: đăng ký/đăng nhập/quên mật khẩu, thông tin cá nhân, địa chỉ.
-   Admin: dashboard quản lý sản phẩm, đơn hàng, người dùng, bài viết, hỗ trợ.

## 4. Flow demo/thuyết trình gợi ý

1. Mở trang chủ → giới thiệu danh mục/bộ lọc.
2. Demo tìm kiếm:
    - Gõ từ khóa → xem kết quả (sắp xếp theo giá, lọc theo componentType).
    - Mở chi tiết sản phẩm → gọi "sản phẩm tương tự" (Typesense similar).
3. Build PC:
    - Chọn từng linh kiện (CPU → Mainboard → RAM → SSD/HDD → VGA → PSU → Case → Cooler → Màn hình → Phụ kiện).
    - Điều chỉnh số lượng, xem tồn kho, tổng chi phí dự tính.
    - Xem & In báo giá → thêm vào giỏ hàng.
4. Giỏ hàng & Checkout:
    - Kiểm tra sản phẩm, tổng tiền, tiến hành thanh toán.
5. Blog & Chatbot:
    - Mở bài blog (review/guide), bật chatbot hỏi đáp nhanh.
6. Admin (nếu có quyền):
    - Vào dashboard quản lý: thêm/sửa sản phẩm, xem đơn hàng, duyệt liên hệ.

## 5. Ghi chú kỹ thuật (ngắn)

-   Frontend: React + Vite, Ant Design, React Router, SCSS Modules.
-   Backend: Node.js/Express, Sequelize (DB), Typesense (search), Cloudinary (media), OpenAI (tuỳ tính năng nâng cao).
-   Tách client/server, có services, controllers, models rõ ràng.

## 6. Điểm mạnh nổi bật

-   Trải nghiệm Build PC trực quan, kiểm soát ngân sách/tồn kho.
-   Tìm kiếm nhanh và gợi ý sản phẩm tương tự nhờ Typesense.
-   Hệ thống đầy đủ: từ nội dung blog, chatbot hỗ trợ đến quản trị.

## 7. Kết luận

PCShop hướng tới trải nghiệm mua sắm PC/linh kiện trọn vẹn, hỗ trợ người dùng ra quyết định nhanh, và cung cấp công cụ quản trị hiệu quả cho admin.

---

## 8. Chi tiết tính năng để demo (kịch bản cụ thể)

-   Trang Chủ & Danh Mục

    -   Mục tiêu: Giới thiệu tổng quan, điều hướng nhanh theo danh mục.
    -   Demo:
        1. Mở trang chủ, lướt banner và các danh mục chính (CPU, VGA, RAM...).
        2. Click vào một danh mục (VD: VGA) để vào trang liệt kê.
        3. Quan sát phân trang, số lượng sản phẩm, ảnh và giá.

-   Tìm kiếm thông minh (Typesense)

    -   Mục tiêu: Tìm nhanh, lọc chính xác theo từ khóa và thuộc tính.
    -   Demo:
        1. Nhập từ khóa (VD: "RTX 3060") vào ô tìm kiếm.
        2. Xem kết quả: tên, mô tả, hình ảnh, giá.
        3. Lọc theo componentType (VD: vga), sắp xếp theo giá tăng/giảm.
        4. Mở chi tiết một sản phẩm → sử dụng tính năng "Sản phẩm tương tự" để hiển thị gợi ý liên quan.

-   Build PC (Xây dựng cấu hình)

    -   Mục tiêu: Chọn linh kiện theo từng nhóm, kiểm soát tồn kho và tổng ngân sách.
    -   Demo:
        1. Vào trang Build PC.
        2. Với từng dòng linh kiện (CPU/Mainboard/RAM/SSD/VGA/PSU/Case/Cooler/Monitor/Phụ kiện), nhấn "Chọn" để mở modal sản phẩm.
        3. Tìm kiếm/sắp xếp trong modal, chọn 1 sản phẩm → sản phẩm hiện vào khu vực đã chọn.
        4. Điều chỉnh số lượng bằng InputNumber (có kiểm tra tồn kho, giới hạn số lượng, kiểm tra tổng ngân sách).
        5. Quan sát "Chi phí dự tính" tự động cập nhật; nếu vượt ngưỡng sẽ có cảnh báo.
        6. Nhấn "Xem & In" để mở trang báo giá, hoặc "Thêm vào giỏ hàng" để chuyển toàn bộ cấu hình vào Cart.

-   Giỏ hàng (Cart) & Checkout

    -   Mục tiêu: Quản lý sản phẩm, số lượng, tổng tiền và điều hướng thanh toán.
    -   Demo:
        1. Mở giỏ hàng: hiển thị danh sách sản phẩm từ Build PC hoặc từ trang sản phẩm.
        2. Tăng/giảm số lượng, xóa mặt hàng → tổng tiền cập nhật.
        3. Nhấn "Thanh toán" (Checkout) để xem thông tin giao hàng/đơn hàng.

-   Báo giá (Quotation)

    -   Mục tiêu: Xem và in cấu hình đã chọn.
    -   Demo:
        1. Từ Build PC, nhấn "Xem & In".
        2. Trang báo giá hiển thị danh sách linh kiện, giá lẻ, tổng tiền.
        3. In hoặc lưu PDF (tuỳ trình duyệt).

-   Blog & Nội dung

    -   Mục tiêu: Cung cấp kiến thức/hướng dẫn, hỗ trợ quyết định mua.
    -   Demo:
        1. Vào trang Blog, chọn một bài viết (review/guide).
        2. Quan sát nội dung, hình ảnh, các bài liên quan.

-   Chatbot hỗ trợ

    -   Mục tiêu: Trả lời nhanh FAQ, hướng dẫn cơ bản, hiển thị nội dung đẹp.
    -   Demo:
        1. Mở chatbot từ góc trang.
        2. Đặt câu hỏi (VD: "Nên chọn CPU nào cho gaming tầm trung?").
        3. Xem câu trả lời dạng markdown: tiêu đề, danh sách, đoạn code (nếu có) hiển thị đẹp.

-   Tài khoản người dùng

    -   Mục tiêu: Quản lý thông tin và đơn hàng.
    -   Demo:
        1. Đăng ký/Đăng nhập tài khoản.
        2. Vào trang thông tin cá nhân: cập nhật địa chỉ, số điện thoại.
        3. Xem lịch sử đơn hàng (nếu workflow đã triển khai).

-   Quản trị Admin
    -   Mục tiêu: Vận hành hệ thống.
    -   Demo:
        1. Đăng nhập Admin → mở Dashboard.
        2. Quản lý sản phẩm: thêm/sửa/xóa, cập nhật giá và tồn kho.
        3. Quản lý đơn hàng, người dùng, liên hệ.
        4. (Tuỳ chọn) Đồng bộ dữ liệu tìm kiếm lên Typesense.

---

## 9. Flow thuyết trình mẫu (timing 10–15 phút)

-   Phần mở đầu (1’):

    -   Giới thiệu đối tượng mục tiêu, giá trị mang lại.

-   Tìm kiếm thông minh (3’):

    -   Từ khóa → kết quả → lọc/sắp xếp → sản phẩm tương tự.

-   Build PC (5’):

    -   Chọn linh kiện → kiểm soát số lượng/tồn kho/ngân sách → xem tổng chi phí → Xem & In/Thêm vào giỏ.

-   Giỏ hàng & Checkout (2’):

    -   Quản lý số lượng, tổng tiền, chuyển sang thanh toán.

-   Blog & Chatbot (2’):

    -   Xem bài viết, gọi chatbot trả lời nhanh.

-   Admin (2’):

    -   Dashboard quản trị sản phẩm/đơn hàng/người dùng.

-   Kết thúc (1’):
    -   Tái khẳng định điểm mạnh nổi bật và hướng phát triển.

---

## 10. Khó khăn (Challenges)

-   Dữ liệu sản phẩm không đồng nhất
    -   Khó mapping chính xác componentType, tags, mô tả chuẩn hóa.
    -   Ảnh, mô tả, thông số kỹ thuật thiếu hoặc sai định dạng.
-   Tìm kiếm & gợi ý (Typesense)
    -   Yêu cầu đồng bộ dữ liệu thường xuyên (indexing), xử lý field facet/searchable hợp lý.
    -   Thiết kế query tối ưu để vừa chính xác vừa hiệu năng tốt.
-   Build PC logic
    -   Kiểm soát ngân sách tổng, tồn kho, giới hạn số lượng cần nhiều ràng buộc.
    -   Tương thích linh kiện (CPU–Mainboard, RAM xung/chuẩn…) đòi hỏi thêm dữ liệu kỹ thuật.
-   Trải nghiệm và hiệu năng
    -   Modal tìm sản phẩm nhiều, cần tối ưu UX (debounce, pagination, lazy load).
    -   Tối ưu bundle frontend (Vite), tránh render thừa, cải thiện thời gian phản hồi.
-   Bảo mật & ổn định
    -   Xác thực/Phân quyền (user/admin) rõ ràng, quản lý token an toàn.
    -   Xử lý lỗi tập trung (server), thông báo người dùng nhất quán.

---

## 11. Hướng phát triển (Roadmap)

-   Chuẩn hóa dữ liệu & tương thích linh kiện (Highlight)
    -   Bổ sung thuộc tính kỹ thuật: socket CPU/Mainboard, chuẩn RAM, PSU công suất, kích thước case…
    -   Xây luật kiểm tra tương thích tự động khi Build PC.
-   Nâng cấp tìm kiếm & đề xuất
    -   Tăng chất lượng dữ liệu Typesense (synonyms, typo tolerance, boost theo tags/brand).
    -   Thêm “Similar products” đa tiêu chí: giá, thương hiệu, hiệu năng.
-   Cải tiến UX Build PC
    -   So sánh nhanh giữa các linh kiện tương tự.
    -   Lưu nhiều cấu hình (preset), chia sẻ cấu hình, clone cấu hình.
    -   Gợi ý thay thế khi vượt ngân sách.
-   Checkout & thanh toán
    -   Tích hợp cổng thanh toán nội địa/quốc tế, theo dõi trạng thái đơn hàng.
    -   Tự động tính phí vận chuyển theo địa chỉ/thành phố.
-   Quản trị & báo cáo
    -   Dashboard số liệu: top sản phẩm, xu hướng tìm kiếm, tỷ lệ chuyển đổi.
    -   Công cụ nhập/xuất dữ liệu (CSV), đồng bộ lên Typesense tự động.
-   Hiệu năng & DevOps
    -   Caching cho API phổ biến, CDN cho ảnh.
    -   Logging/Monitoring (error tracking), triển khai CI/CD.
-   Quốc tế hóa (i18n) & Accessibility
    -   Hỗ trợ đa ngôn ngữ, chuẩn WCAG cơ bản.

---

## 12. Kết luận mở

Dự án đã có nền tảng tốt về trải nghiệm mua sắm và tìm kiếm. Tập trung chuẩn hóa dữ liệu, nâng UX Build PC và mở rộng khả năng đề xuất/tương thích sẽ mang lại giá trị rõ rệt cho cả người dùng và admin.
