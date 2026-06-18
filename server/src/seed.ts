import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole } from './users/entities/user.entity'
import { Store } from './stores/entities/store.entity'
import { Deal, DealStatus } from './deals/entities/deal.entity'
import { Reservation } from './reservations/entities/reservation.entity'
import { Comment, CommentStatus } from './comments/entities/comment.entity'
import { Like } from './deals/entities/like.entity'
import { Bookmark } from './deals/entities/bookmark.entity'
import { VerificationEvent } from './deals/entities/verification-event.entity'
import { ActivityEvent, AnalyticsSnapshot } from './analytics/entities/analytics.entity'

const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH || './data/foodly.db',
  synchronize: true,
  entities: [
    User, Store, Deal, Reservation, Comment,
    Like, Bookmark, VerificationEvent, ActivityEvent, AnalyticsSnapshot,
  ],
})

const storeSeeds = [
  // Quận 1 (CBD)
  { name: 'Circle K Nguyễn Huệ', address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', latitude: 10.7725, longitude: 106.7042, category: 'Tiện lợi', avgTrustScore: 4.6, totalDeals: 38 },
  { name: 'Family Mart Lê Lợi', address: '45 Lê Lợi, P. Bến Nghé, Quận 1', latitude: 10.7715, longitude: 106.7010, category: 'Tiện lợi', avgTrustScore: 4.8, totalDeals: 52 },
  { name: '7-Eleven Mạc Đĩnh Chi', address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', latitude: 10.7850, longitude: 106.6930, category: 'Tiện lợi', avgTrustScore: 4.5, totalDeals: 41 },
  { name: 'Ministop Nguyễn Thị Minh Khai', address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', latitude: 10.7820, longitude: 106.6990, category: 'Tiện lợi', avgTrustScore: 4.3, totalDeals: 27 },
  { name: 'GS25 Hai Bà Trưng', address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', latitude: 10.7760, longitude: 106.6960, category: 'Tiện lợi', avgTrustScore: 4.4, totalDeals: 33 },

  // Quận 3
  { name: 'Circle K CMT8', address: '500 Cách Mạng Tháng 8, P.11, Quận 3', latitude: 10.7890, longitude: 106.6750, category: 'Tiện lợi', avgTrustScore: 4.2, totalDeals: 29 },
  { name: 'B\'s Mart Lê Văn Sỹ', address: '25 Lê Văn Sỹ, P.14, Quận 3', latitude: 10.7880, longitude: 106.6850, category: 'Tiện lợi', avgTrustScore: 4.0, totalDeals: 15 },

  // Phú Nhuận
  { name: 'Family Mart Phan Xích Long', address: '360 Phan Xích Long, P.7, Phú Nhuận', latitude: 10.7980, longitude: 106.6800, category: 'Tiện lợi', avgTrustScore: 4.7, totalDeals: 44 },
  { name: '7-Eleven Nguyễn Văn Trỗi', address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', latitude: 10.7950, longitude: 106.6780, category: 'Tiện lợi', avgTrustScore: 4.1, totalDeals: 22 },

  // Bình Thạnh
  { name: 'Circle K Xô Viết Nghệ Tĩnh', address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', latitude: 10.8020, longitude: 106.7120, category: 'Tiện lợi', avgTrustScore: 4.3, totalDeals: 31 },

  // Quận 7
  { name: 'Family Mart Nguyễn Văn Linh', address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', latitude: 10.7300, longitude: 106.7200, category: 'Tiện lợi', avgTrustScore: 4.5, totalDeals: 36 },

  // Thủ Đức
  { name: 'Circle K Phạm Văn Đồng', address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', latitude: 10.8450, longitude: 106.7650, category: 'Tiện lợi', avgTrustScore: 4.1, totalDeals: 19 },

  // Gò Vấp
  { name: '7-Eleven Nguyễn Oanh', address: '80 Nguyễn Oanh, P.10, Gò Vấp', latitude: 10.8300, longitude: 106.6750, category: 'Tiện lợi', avgTrustScore: 3.9, totalDeals: 14 },

  // Tân Bình
  { name: 'Ministop Trường Sơn', address: '200 Trường Sơn, P.2, Tân Bình', latitude: 10.8100, longitude: 106.6500, category: 'Tiện lợi', avgTrustScore: 4.2, totalDeals: 25 },

  // Tân Phú
  { name: 'GS25 Lũy Bán Bích', address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', latitude: 10.7800, longitude: 106.6250, category: 'Tiện lợi', avgTrustScore: 3.8, totalDeals: 11 },

  // Hóc Môn (xa trung tâm)
  { name: 'Circle K Nguyễn Ảnh Thủ', address: '500 Nguyễn Ảnh Thủ, Hóc Môn', latitude: 10.8800, longitude: 106.5900, category: 'Tiện lợi', avgTrustScore: 3.7, totalDeals: 8 },

  // ===== THÊM CỬA HÀNG MỚI =====

  // Quận 2 (Thủ Đức cũ - khu Thảo Điền)
  { name: 'Annam Gourmet Thảo Điền', address: '158 Nguyễn Văn Hưởng, P. Thảo Điền, Quận 2', latitude: 10.8100, longitude: 106.7400, category: 'Thực phẩm nhập khẩu', avgTrustScore: 4.8, totalDeals: 25 },
  { name: 'Family Mart Thảo Điền', address: '88 Xuân Thủy, P. Thảo Điền, Quận 2', latitude: 10.8120, longitude: 106.7350, category: 'Tiện lợi', avgTrustScore: 4.4, totalDeals: 30 },

  // Quận 6
  { name: 'Bách Hóa Xanh Hậu Giang', address: '200 Hậu Giang, P.11, Quận 6', latitude: 10.7450, longitude: 106.6400, category: 'Siêu thị', avgTrustScore: 4.1, totalDeals: 45 },
  { name: 'Circle K Phạm Văn Chí', address: '50 Phạm Văn Chí, P.7, Quận 6', latitude: 10.7480, longitude: 106.6480, category: 'Tiện lợi', avgTrustScore: 3.9, totalDeals: 18 },

  // Quận 8
  { name: 'Bách Hóa Xanh Phạm Thế Hiển', address: '400 Phạm Thế Hiển, P.7, Quận 8', latitude: 10.7300, longitude: 106.6650, category: 'Siêu thị', avgTrustScore: 4.0, totalDeals: 35 },
  { name: 'Ministop Tạ Quang Bửu', address: '100 Tạ Quang Bửu, P.5, Quận 8', latitude: 10.7350, longitude: 106.6700, category: 'Tiện lợi', avgTrustScore: 4.3, totalDeals: 22 },

  // Quận 12
  { name: 'GS25 Quốc Lộ 22', address: '300 Quốc Lộ 22, P. Đông Hưng Thuận, Quận 12', latitude: 10.8600, longitude: 106.6350, category: 'Tiện lợi', avgTrustScore: 3.8, totalDeals: 14 },
  { name: 'Circle K Nguyễn Ảnh Thủ (2)', address: '200 Nguyễn Ảnh Thủ, P. Đông Hưng Thuận, Quận 12', latitude: 10.8550, longitude: 106.6400, category: 'Tiện lợi', avgTrustScore: 4.0, totalDeals: 20 },

  // Nhà Bè
  { name: 'Bách Hóa Xanh Huỳnh Tấn Phát', address: '500 Huỳnh Tấn Phát, Nhà Bè', latitude: 10.7100, longitude: 106.7100, category: 'Siêu thị', avgTrustScore: 4.2, totalDeals: 28 },

  // Củ Chi
  { name: 'Bách Hóa Xanh Tỉnh Lộ 8', address: '1000 Tỉnh Lộ 8, Củ Chi', latitude: 10.9700, longitude: 106.5000, category: 'Siêu thị', avgTrustScore: 3.9, totalDeals: 12 },

  // Bình Dương (sát HCM)
  { name: 'Circle K Đại lộ Bình Dương', address: '200 Đại lộ Bình Dương, Thủ Dầu Một', latitude: 10.9600, longitude: 106.6800, category: 'Tiện lợi', avgTrustScore: 4.1, totalDeals: 16 },
]

const dealSeeds = [
  // ===== Circle K Nguyễn Huệ (3 deals) =====
  { storeName: 'Circle K Nguyễn Huệ', title: 'Cơm gà sốt cay gói', description: 'Cơm gà sốt Thái gói tiện lợi, hạn sử dụng hôm nay. Gear hâm nóng 2 phút.', originalPrice: 25000, discountPrice: 10000, remainingQuantity: 8, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['com', 'ga', 'tien loi'], verified: true },
  { storeName: 'Circle K Nguyễn Huệ', title: 'Bánh mì gà cay Hàn Quốc', description: 'Bánh mì kẹp gà sốt cay Hàn Quốc, sản xuất sáng nay. Giảm 60%.', originalPrice: 22000, discountPrice: 9000, remainingQuantity: 5, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['banh mi', 'ga', 'tien loi'], verified: true },
  { storeName: 'Circle K Nguyễn Huệ', title: 'Mì cốc bò cay x 3', description: '3 mì cốc bò hải sản, gần hết hạn. Ngon hơn khi nấu.', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 15, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['mi', 'tien loi', 'snack'], verified: false },

  // ===== Family Mart Lê Lợi (3 deals) =====
  { storeName: 'Family Mart Lê Lợi', title: 'Cơm bento cá hồi', description: 'Cơm bento cá hồi nướng sốt teriyaki, rau củ tươi. Sản xuất sáng 6h, giảm giá 8h tối.', originalPrice: 35000, discountPrice: 15000, remainingQuantity: 4, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['com', 'ca', 'bento'], verified: true },
  { storeName: 'Family Mart Lê Lợi', title: 'Onigiri cá ngừ 2 cái', description: '2 cơm nắm onigiri nhân cá ngừ sốt mayo. Đóng gói sáng nay.', originalPrice: 28000, discountPrice: 11000, remainingQuantity: 7, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['com', 'ca', 'nhat'], verified: true },
  { storeName: 'Family Mart Lê Lợi', title: 'Trà sữa matcha đá xay', description: 'Trà sữa matcha đá xay Famima, 2 ly. Hạn dùng hôm nay.', originalPrice: 36000, discountPrice: 14000, remainingQuantity: 6, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['tra sua', 'uong', 'matcha'], verified: false },

  // ===== 7-Eleven Mạc Đĩnh Chi (3 deals) =====
  { storeName: '7-Eleven Mạc Đĩnh Chi', title: 'Bánh mì thịt nguội 7-Select', description: 'Bánh mì thịt nguội 7-Select, rau củ tươi ngon. Sản xuất sáng nay, giảm 50%.', originalPrice: 20000, discountPrice: 10000, remainingQuantity: 10, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['banh mi', 'thit', 'tien loi'], verified: true },
  { storeName: '7-Eleven Mạc Đĩnh Chi', title: 'Cơm cuộn kimbap', description: 'Cơm cuộn kimbap nhân thịt bò, 4 miếng. Gói riêng tươi ngon.', originalPrice: 18000, discountPrice: 7000, remainingQuantity: 9, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['com', 'kim bap', 'han'], verified: true },
  { storeName: '7-Eleven Mạc Đĩnh Chi', title: 'Bia lon Tiger 6 lon', description: '6 lon bia Tiger 330ml, khuyến mãi xả kho gần date.', originalPrice: 90000, discountPrice: 45000, remainingQuantity: 12, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['bia', 'uong', 'tien loi'], verified: false },

  // ===== Ministop Nguyễn Thị Minh Khai (2 deals) =====
  { storeName: 'Ministop Nguyễn Thị Minh Khai', title: 'Kem xốp vani ốc quế', description: 'Kem xốp vani ốc quế, 3 cây. Bảo quản lạnh, hạn dùng 5 ngày.', originalPrice: 24000, discountPrice: 10000, remainingQuantity: 8, latitude: 10.7820, longitude: 106.6990, address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', tags: ['kem', 'trang mieng', 'tien loi'], verified: true },
  { storeName: 'Ministop Nguyễn Thị Minh Khai', title: 'Khoai tây lắc phô mai', description: 'Khoai tây lắc phô mai que, gói 80g. 5 gói giảm 50%.', originalPrice: 20000, discountPrice: 10000, remainingQuantity: 14, latitude: 10.7820, longitude: 106.6990, address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', tags: ['snack', 'khoai tay', 'tien loi'], verified: false },

  // ===== GS25 Hai Bà Trưng (2 deals) =====
  { storeName: 'GS25 Hai Bà Trưng', title: 'Cơm trộn Hàn Quốc bibimbap', description: 'Cơm trộn bibimbap với rau củ, thịt bò xào và trứng. Hộp 350g.', originalPrice: 30000, discountPrice: 13000, remainingQuantity: 5, latitude: 10.7760, longitude: 106.6960, address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', tags: ['com', 'han', 'bento'], verified: true },
  { storeName: 'GS25 Hai Bà Trưng', title: 'Nước tăng lực Master 6 lon', description: '6 lon nước tăng lực Master, gần date. Giảm 55%.', originalPrice: 54000, discountPrice: 24000, remainingQuantity: 18, latitude: 10.7760, longitude: 106.6960, address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', tags: ['uong', 'tang luc', 'tien loi'], verified: false },

  // ===== Circle K CMT8 (3 deals) =====
  { storeName: 'Circle K CMT8', title: 'Xúc xích túi 5 cái', description: 'Xúc xích heo túi 5 cái, luộc/chảo. Hạn sử dụng 3 ngày.', originalPrice: 25000, discountPrice: 10000, remainingQuantity: 11, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['xuc xich', 'snack', 'tien loi'], verified: true },
  { storeName: 'Circle K CMT8', title: 'Bánh chuối socola', description: 'Bánh chuối nướng socola, 2 cái. Đồ nướng tại cửa hàng.', originalPrice: 18000, discountPrice: 7000, remainingQuantity: 6, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['banh', 'snack', 'tien loi'], verified: false },
  { storeName: 'Circle K CMT8', title: 'Mì ly bò cay x 6', description: '6 ly mì bò cay Hàn Quốc, gần date. Hàng xả kho.', originalPrice: 48000, discountPrice: 20000, remainingQuantity: 20, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['mi', 'tien loi', 'snack'], verified: false },

  // ===== Family Mart Phan Xích Long (3 deals) =====
  { storeName: 'Family Mart Phan Xích Long', title: 'Bento sườn non kho tàu', description: 'Cơm bento sườn non kho tàu, trứng cút. Nấu sáng nay, giảm giá tối.', originalPrice: 32000, discountPrice: 14000, remainingQuantity: 6, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['com', 'suon', 'bento'], verified: true },
  { storeName: 'Family Mart Phan Xích Long', title: 'Chả giò rế 10 cái', description: 'Chả giò rế nhân thịt heo, 10 cái. Hít dầu, để được 2 ngày.', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 7, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['cha gio', 'viet', 'tien loi'], verified: true },
  { storeName: 'Family Mart Phan Xích Long', title: 'Cà phê sữa đá x 6', description: '6 ly cà phê sữa đá gói. Pha sẵn, uống liền.', originalPrice: 48000, discountPrice: 20000, remainingQuantity: 9, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['ca phe', 'uong', 'tien loi'], verified: false },

  // ===== 7-Eleven Nguyễn Văn Trỗi (2 deals) =====
  { storeName: '7-Eleven Nguyễn Văn Trỗi', title: 'Sandwich gà nướng', description: 'Sandwich kẹp gà nướng, rau xà lách, sốt mayo. Tươi ngon.', originalPrice: 22000, discountPrice: 10000, remainingQuantity: 8, latitude: 10.7950, longitude: 106.6780, address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', tags: ['sandwich', 'ga', 'tien loi'], verified: true },
  { storeName: '7-Eleven Nguyễn Văn Trỗi', title: 'Nước ngọt Coca lon 6', description: '6 lon Coca-cola 330ml, xả tồn gần date.', originalPrice: 36000, discountPrice: 15000, remainingQuantity: 24, latitude: 10.7950, longitude: 106.6780, address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', tags: ['nuoc ngot', 'uong', 'tien loi'], verified: false },

  // ===== Circle K Xô Viết Nghệ Tĩnh (2 deals) =====
  { storeName: 'Circle K Xô Viết Nghệ Tĩnh', title: 'Bánh tráng trộn gói', description: 'Bánh tráng trộn sẵn gói 200g. Đồ ăn vặt hot.', originalPrice: 12000, discountPrice: 5000, remainingQuantity: 13, latitude: 10.8020, longitude: 106.7120, address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', tags: ['banh trang', 'viet', 'snack'], verified: false },
  { storeName: 'Circle K Xô Viết Nghệ Tĩnh', title: 'Bò khô túi 100g', description: 'Bò khô miếng, gói 100g. Ăn vặt bia rất ngon.', originalPrice: 35000, discountPrice: 18000, remainingQuantity: 7, latitude: 10.8020, longitude: 106.7120, address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', tags: ['bo kho', 'snack', 'bia'], verified: true },

  // ===== Family Mart Nguyễn Văn Linh (3 deals) =====
  { storeName: 'Family Mart Nguyễn Văn Linh', title: 'Bento gà chiên sốt ngọt', description: 'Cơm bento gà chiên sốt ngọt kiểu Hàn. Sốt gochujang.', originalPrice: 33000, discountPrice: 14000, remainingQuantity: 5, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['com', 'ga', 'bento'], verified: true },
  { storeName: 'Family Mart Nguyễn Văn Linh', title: 'Sữa chua uống 6 chai', description: '6 chai sữa chua uống Yakult-style, gần hạn 3 ngày.', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 16, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['sua chua', 'uong', 'tien loi'], verified: true },
  { storeName: 'Family Mart Nguyễn Văn Linh', title: 'Bánh bông lan cuộn kem', description: 'Bánh bông lan cuộn kem tươi, 4 miếng. Tráng miệng.', originalPrice: 22000, discountPrice: 9000, remainingQuantity: 6, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['banh', 'trang mieng', 'tien loi'], verified: false },

  // ===== Circle K Phạm Văn Đồng (2 deals) =====
  { storeName: 'Circle K Phạm Văn Đồng', title: 'Pizza gà mini gói', description: 'Pizza gà mini hộp, chỉ hâm microwave 2 phút. Gần date.', originalPrice: 28000, discountPrice: 12000, remainingQuantity: 6, latitude: 10.8450, longitude: 106.7650, address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', tags: ['pizza', 'tien loi', 'snack'], verified: true },
  { storeName: 'Circle K Phạm Văn Đồng', title: 'Trà ô long chai 6', description: '6 chai trà ô long không đường 500ml. Giảm giá gần date.', originalPrice: 42000, discountPrice: 18000, remainingQuantity: 12, latitude: 10.8450, longitude: 106.7650, address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', tags: ['tra', 'uong', 'khong duong'], verified: false },

  // ===== 7-Eleven Nguyễn Oanh (2 deals) =====
  { storeName: '7-Eleven Nguyễn Oanh', title: 'Cơm chiên dương châu gói', description: 'Cơm chiên dương châu gói 300g. Hâm nhanh.', originalPrice: 20000, discountPrice: 8000, remainingQuantity: 9, latitude: 10.8300, longitude: 106.6750, address: '80 Nguyễn Oanh, P.10, Gò Vấp', tags: ['com', 'chien', 'tien loi'], verified: false },
  { storeName: '7-Eleven Nguyễn Oanh', title: 'Snack que Hàn Quốc 5 gói', description: '5 gói snack que Hàn Quốc vị phô mai. Hàng xả kho.', originalPrice: 35000, discountPrice: 15000, remainingQuantity: 20, latitude: 10.8300, longitude: 106.6750, address: '80 Nguyễn Oanh, P.10, Gò Vấp', tags: ['snack', 'han', 'tien loi'], verified: false },

  // ===== Ministop Trường Sơn (2 deals) =====
  { storeName: 'Ministop Trường Sơn', title: 'Bánh mì que pate', description: 'Bánh mì que pate, 3 cái. Nhẹ nhàng, ăn sáng.', originalPrice: 15000, discountPrice: 6000, remainingQuantity: 12, latitude: 10.8100, longitude: 106.6500, address: '200 Trường Sơn, P.2, Tân Bình', tags: ['banh mi', 'sang', 'tien loi'], verified: true },
  { storeName: 'Ministop Trường Sơn', title: 'Nước suối 500ml thùng', description: 'Thùng 24 chai nước suối 500ml. Gần date, giảm 40%.', originalPrice: 60000, discountPrice: 36000, remainingQuantity: 30, latitude: 10.8100, longitude: 106.6500, address: '200 Trường Sơn, P.2, Tân Bình', tags: ['nuoc', 'uong', 'tien loi'], verified: false },

  // ===== GS25 Lũy Bán Bích (2 deals) =====
  { storeName: 'GS25 Lũy Bán Bích', title: 'Tokbokki gói 500g', description: 'Tokbokki bánh gạo sốt cay Hàn Quốc gói 500g. Nấu đơn giản.', originalPrice: 28000, discountPrice: 12000, remainingQuantity: 8, latitude: 10.7800, longitude: 106.6250, address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', tags: ['tokbokki', 'han', 'tien loi'], verified: false },
  { storeName: 'GS25 Lũy Bán Bích', title: 'Bánh gạo Hàn Quốc 3 gói', description: '3 gói bánh gạo Hàn Quốc vị rong biển. Ăn vặt.', originalPrice: 15000, discountPrice: 6000, remainingQuantity: 18, latitude: 10.7800, longitude: 106.6250, address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', tags: ['banh gao', 'han', 'snack'], verified: true },

  // ===== B's Mart Lê Văn Sỹ (2 deals) =====
  { storeName: 'B\'s Mart Lê Văn Sỹ', title: 'Bánh tráng muối ớt', description: 'Bánh tráng muối ớt túi 200g. Đặc sản Việt.', originalPrice: 10000, discountPrice: 4000, remainingQuantity: 15, latitude: 10.7880, longitude: 106.6850, address: '25 Lê Văn Sỹ, P.14, Quận 3', tags: ['banh trang', 'viet', 'snack'], verified: false },
  { storeName: 'B\'s Mart Lê Văn Sỹ', title: 'Hạt hướng dương rang', description: 'Hạt hướng dương rang muối 250g. Ăn nhậu.', originalPrice: 12000, discountPrice: 5000, remainingQuantity: 20, latitude: 10.7880, longitude: 106.6850, address: '25 Lê Văn Sỹ, P.14, Quận 3', tags: ['hat', 'snack', 'bia'], verified: false },

  // ===== Circle K Nguyễn Ảnh Thủ - Hóc Môn (1 deal) =====
  { storeName: 'Circle K Nguyễn Ảnh Thủ', title: 'Mì tôm Hảo Hảo thùng 30', description: 'Thùng 30 gói mì tôm Hảo Hảo chua cay. Hàng gần date, giá rẻ.', originalPrice: 105000, discountPrice: 45000, remainingQuantity: 40, latitude: 10.8800, longitude: 106.5900, address: '500 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['mi tom', 'viet', 'tien loi'], verified: true },

  // ===== THÊM DEAL CHO CỬA HÀNG MỚI =====

  // ===== Annam Gourmet Thảo Điền (3 deals) =====
  { storeName: 'Annam Gourmet Thảo Điền', title: 'Phô mai Parmesan Ý 200g', description: 'Phô mai Parmesan D.O.P nhập khẩu Ý, gần hạn 7 ngày. Giảm 50%.', originalPrice: 180000, discountPrice: 90000, remainingQuantity: 5, latitude: 10.8100, longitude: 106.7400, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['pho mai', 'nhap khau', 'y'], verified: true },
  { storeName: 'Annam Gourmet Thảo Điền', title: 'Rượu vang Chile 2019', description: 'Chai rượu vang đỏ Carmenere Chile 750ml, vintage 2019.', originalPrice: 350000, discountPrice: 195000, remainingQuantity: 3, latitude: 10.8105, longitude: 106.7410, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['ruou', 'vang', 'nhap khau'], verified: true },
  { storeName: 'Annam Gourmet Thảo Điền', title: 'Bánh mì baguette Pháp', description: 'Bánh mì baguette truyền thống Pháp, nướng sáng nay. 3 ổ.', originalPrice: 45000, discountPrice: 25000, remainingQuantity: 8, latitude: 10.8095, longitude: 106.7390, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['banh mi', 'phap', 'nhap khau'], verified: false },

  // ===== Family Mart Thảo Điền (2 deals) =====
  { storeName: 'Family Mart Thảo Điền', title: 'Cơm bento gà cốt lết', description: 'Cơm bento gà cốt lết chiên xù, sốt mayonnaise. Sản xuất sáng nay.', originalPrice: 34000, discountPrice: 14000, remainingQuantity: 6, latitude: 10.8120, longitude: 106.7350, address: '88 Xuân Thủy, Thảo Điền', tags: ['com', 'ga', 'bento'], verified: true },
  { storeName: 'Family Mart Thảo Điền', title: 'Salad rau trứng gà', description: 'Salad rau tươi trứng gà, sốt dầu giấm. Ăn healthy.', originalPrice: 28000, discountPrice: 12000, remainingQuantity: 5, latitude: 10.8125, longitude: 106.7340, address: '88 Xuân Thủy, Thảo Điền', tags: ['salad', 'healthy', 'rau'], verified: true },

  // ===== Bách Hóa Xanh Hậu Giang - Quận 6 (3 deals) =====
  { storeName: 'Bách Hóa Xanh Hậu Giang', title: 'Thịt ba chỉ rọi 1kg', description: 'Thịt ba chỉ rọi tươi, siêu thị nhập sáng. Giảm giá gần hết ngày.', originalPrice: 120000, discountPrice: 75000, remainingQuantity: 4, latitude: 10.7450, longitude: 106.6400, address: '200 Hậu Giang, Q.6', tags: ['thit', 'heo', 'thuc pham'], verified: true },
  { storeName: 'Bách Hóa Xanh Hậu Giang', title: 'Rau củ hỗn hợp 2kg', description: 'Bộ rau củ tươi: cải, cà rốt, khoai tây, bí. Đóng gói 2kg.', originalPrice: 45000, discountPrice: 25000, remainingQuantity: 10, latitude: 10.7455, longitude: 106.6405, address: '200 Hậu Giang, Q.6', tags: ['rau', 'cu', 'thuc pham'], verified: true },
  { storeName: 'Bách Hóa Xanh Hậu Giang', title: 'Cá hồi phi lê 300g', description: 'Phi lê cá hồi Na Uy, đông lạnh nhập khẩu. Gần hạn 5 ngày.', originalPrice: 180000, discountPrice: 99000, remainingQuantity: 3, latitude: 10.7445, longitude: 106.6390, address: '200 Hậu Giang, Q.6', tags: ['ca', 'hoi', 'nhap khau'], verified: true },

  // ===== Circle K Phạm Văn Chí - Quận 6 (2 deals) =====
  { storeName: 'Circle K Phạm Văn Chí', title: 'Mì gói Hàn Quốc 5 gói', description: '5 gói mì cay Hàn Quốc Shin Ramyun. Hàng gần date.', originalPrice: 45000, discountPrice: 22000, remainingQuantity: 15, latitude: 10.7480, longitude: 106.6480, address: '50 Phạm Văn Chí, Q.6', tags: ['mi', 'han', 'tien loi'], verified: false },
  { storeName: 'Circle K Phạm Văn Chí', title: 'Nước yến sào 5 chai', description: '5 chai yến sào đường phèn, bồi bổ sức khỏe.', originalPrice: 75000, discountPrice: 39000, remainingQuantity: 8, latitude: 10.7485, longitude: 106.6485, address: '50 Phạm Văn Chí, Q.6', tags: ['yen sao', 'uong', 'suc khoe'], verified: true },

  // ===== Bách Hóa Xanh Phạm Thế Hiển - Quận 8 (3 deals) =====
  { storeName: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Tôm sú tươi sống 500g', description: 'Tôm sú tươi sống size lớn, 500g. Đánh bắt sáng nay.', originalPrice: 150000, discountPrice: 99000, remainingQuantity: 3, latitude: 10.7300, longitude: 106.6650, address: '400 Phạm Thế Hiển, Q.8', tags: ['tom', 'hai san', 'tuoi song'], verified: true },
  { storeName: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Sữa tươi Vinamilk 5 lít', description: '5 hộp sữa tươi Vinamilk 1L. Hạn sử dụng 5 ngày.', originalPrice: 125000, discountPrice: 79000, remainingQuantity: 6, latitude: 10.7305, longitude: 106.6655, address: '400 Phạm Thế Hiển, Q.8', tags: ['sua', 'uong', 'thuc pham'], verified: true },
  { storeName: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Gạo ST25 5kg', description: 'Gạo ST25 ngon nhất thế giới, túi 5kg.', originalPrice: 120000, discountPrice: 85000, remainingQuantity: 10, latitude: 10.7310, longitude: 106.6660, address: '400 Phạm Thế Hiển, Q.8', tags: ['gao', 'viet', 'thuc pham'], verified: true },

  // ===== Ministop Tạ Quang Bửu - Quận 8 (2 deals) =====
  { storeName: 'Ministop Tạ Quang Bửu', title: 'Kem Hokkaido sữa tươi', description: 'Kem tươi Hokkaido vị sữa, 5 que. Bảo quản lạnh.', originalPrice: 35000, discountPrice: 16000, remainingQuantity: 9, latitude: 10.7350, longitude: 106.6700, address: '100 Tạ Quang Bửu, Q.8', tags: ['kem', 'sua', 'trang mieng'], verified: true },
  { storeName: 'Ministop Tạ Quang Bửu', title: 'Bánh mì sandwich nguyên cám', description: 'Bánh mì sandwich nguyên cám tươi, 6 lát.', originalPrice: 18000, discountPrice: 9000, remainingQuantity: 12, latitude: 10.7355, longitude: 106.6705, address: '100 Tạ Quang Bửu, Q.8', tags: ['banh mi', 'healthy', 'nguyen cam'], verified: false },

  // ===== GS25 Quốc Lộ 22 - Quận 12 (2 deals) =====
  { storeName: 'GS25 Quốc Lộ 22', title: 'Cơm trộn Hàn Quốc 2 hộp', description: '2 hộp cơm trộn bulgogi Hàn Quốc, sốt gochujang.', originalPrice: 35000, discountPrice: 15000, remainingQuantity: 7, latitude: 10.8600, longitude: 106.6350, address: '300 Quốc Lộ 22, Q.12', tags: ['com', 'han', 'tron'], verified: true },
  { storeName: 'GS25 Quốc Lộ 22', title: 'Trà đào cam sả 5 chai', description: '5 chai trà đào cam sả 500ml, giải khát mùa hè.', originalPrice: 55000, discountPrice: 29000, remainingQuantity: 14, latitude: 10.8605, longitude: 106.6355, address: '300 Quốc Lộ 22, Q.12', tags: ['tra dao', 'uong', 'tien loi'], verified: false },

  // ===== Circle K Nguyễn Ảnh Thủ 2 - Quận 12 (2 deals) =====
  { storeName: 'Circle K Nguyễn Ảnh Thủ (2)', title: 'Bánh tráng bơ gói', description: 'Bánh tráng bơ siêu to, gói 500g. Ăn vặt.', originalPrice: 25000, discountPrice: 12000, remainingQuantity: 20, latitude: 10.8550, longitude: 106.6400, address: '200 Nguyễn Ảnh Thủ, Q.12', tags: ['banh trang', 'bo', 'snack'], verified: false },
  { storeName: 'Circle K Nguyễn Ảnh Thủ (2)', title: 'Xúc xích Đức 10 cái', description: 'Xúc xích Đức nhập khẩu, 10 cái. Chỉ nướng/luộc.', originalPrice: 65000, discountPrice: 32000, remainingQuantity: 6, latitude: 10.8555, longitude: 106.6405, address: '200 Nguyễn Ảnh Thủ, Q.12', tags: ['xuc xich', 'duc', 'nhap khau'], verified: true },

  // ===== Bách Hóa Xanh Huỳnh Tấn Phát - Nhà Bè (2 deals) =====
  { storeName: 'Bách Hóa Xanh Huỳnh Tấn Phát', title: 'Thịt bò Mỹ bắp 1kg', description: 'Bắp bò Mỹ nhập khẩu, tươi đông lạnh 1kg.', originalPrice: 250000, discountPrice: 159000, remainingQuantity: 4, latitude: 10.7100, longitude: 106.7100, address: '500 Huỳnh Tấn Phát, Nhà Bè', tags: ['thit bo', 'my', 'nhap khau'], verified: true },
  { storeName: 'Bách Hóa Xanh Huỳnh Tấn Phát', title: 'Dưa hấu ruột đỏ 3kg', description: 'Trái dưa hấu ruột đỏ, ngọt mát. Nặng ~3kg.', originalPrice: 45000, discountPrice: 25000, remainingQuantity: 8, latitude: 10.7105, longitude: 106.7105, address: '500 Huỳnh Tấn Phát, Nhà Bè', tags: ['dua hau', 'trai cay', 'thuc pham'], verified: false },

  // ===== Bách Hóa Xanh Tỉnh Lộ 8 - Củ Chi (1 deal) =====
  { storeName: 'Bách Hóa Xanh Tỉnh Lộ 8', title: 'Trứng gà ta 30 quả', description: '30 quả trứng gà ta tươi, trang trại sạch.', originalPrice: 60000, discountPrice: 38000, remainingQuantity: 15, latitude: 10.9700, longitude: 106.5000, address: '1000 Tỉnh Lộ 8, Củ Chi', tags: ['trung', 'ga', 'thuc pham'], verified: true },

  // ===== Circle K Đại Lộ Bình Dương (2 deals) =====
  { storeName: 'Circle K Đại lộ Bình Dương', title: 'Bánh mì thịt nướng BBQ', description: 'Bánh mì thịt nướng BBQ sốt cay, rau sống tươi.', originalPrice: 22000, discountPrice: 10000, remainingQuantity: 8, latitude: 10.9600, longitude: 106.6800, address: '200 Đại lộ Bình Dương', tags: ['banh mi', 'thit nuong', 'tien loi'], verified: true },
  { storeName: 'Circle K Đại lộ Bình Dương', title: 'Cà phê sữa đá x 5 ly', description: '5 ly cà phê sữa đá gói. Pha sẵn uống liền.', originalPrice: 60000, discountPrice: 30000, remainingQuantity: 10, latitude: 10.9605, longitude: 106.6805, address: '200 Đại lộ Bình Dương', tags: ['ca phe', 'sua da', 'uong'], verified: true },

  // ===== THÊM DEAL MỚI CHO CỬA HÀNG CŨ (đa dạng) =====

  // ===== 7-Eleven Nguyễn Văn Trỗi - thêm =====
  { storeName: '7-Eleven Nguyễn Văn Trỗi', title: 'Dimsum gà há cảo 10 cái', description: '10 há cảo gà tôm hấp, kèm xì dầu. Hâm microwave 3 phút.', originalPrice: 38000, discountPrice: 18000, remainingQuantity: 7, latitude: 10.7955, longitude: 106.6785, address: '100 Nguyễn Văn Trỗi, Phú Nhuận', tags: ['dimsum', 'ha cao', 'hoa'], verified: true },

  // ===== Family Mart Phan Xích Long - thêm =====
  { storeName: 'Family Mart Phan Xích Long', title: 'Bò bít tết sốt tiêu đen', description: 'Bò bít tết sốt tiêu đen kèm khoai tây nghiền, hâm nóng 5 phút.', originalPrice: 55000, discountPrice: 25000, remainingQuantity: 3, latitude: 10.7985, longitude: 106.6805, address: '360 Phan Xích Long, Phú Nhuận', tags: ['bo', 'bit tet', 'tay'], verified: true },

  // ===== Family Mart Nguyễn Văn Linh - Quận 7 - thêm =====
  { storeName: 'Family Mart Nguyễn Văn Linh', title: 'Ramen tonkotsu hộp', description: 'Ramen tonkotsu xương heo, gồm thịt heo, trứng, rong biển.', originalPrice: 45000, discountPrice: 20000, remainingQuantity: 5, latitude: 10.7310, longitude: 106.7190, address: '1 Nguyễn Văn Linh, Q.7', tags: ['ramen', 'nhat', 'mi'], verified: true },

  // ===== 7-Eleven Mạc Đĩnh Chi - thêm =====
  { storeName: '7-Eleven Mạc Đĩnh Chi', title: 'Chân gà sả tắc 500g', description: 'Chân gà sả tắc muối ớt, gói 500g. Đồ nhậu lai rai.', originalPrice: 35000, discountPrice: 16000, remainingQuantity: 9, latitude: 10.7855, longitude: 106.6935, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['chan ga', 'sa tac', 'nhau'], verified: false },
]

const commentSeeds = [
  { dealTitle: 'Cơm gà sốt cay gói', content: 'Ngon, hâm nóng ăn liền. Tiện lợi!', username: 'demo_user' },
  { dealTitle: 'Cơm bento cá hồi', content: 'Cá hồi teriyaki chuẩn vị. Đáng tiền!', username: 'demo_user' },
  { dealTitle: 'Bento sườn non kho tàu', content: 'Ngon cơm, sườn mềm. Sẽ mua lại.', username: 'demo_user' },
  { dealTitle: 'Bánh mì gà cay Hàn Quốc', content: 'Hơi cay nhưng ngon, hợp dân văn phòng.', username: 'demo_user' },
  { dealTitle: 'Onigiri cá ngừ 2 cái', content: 'Cơm nắm Nhật chuẩn vị. Mua cho con ăn sáng.', username: 'demo_user' },
  { dealTitle: 'Bento gà chiên sốt ngọt', content: 'Gà chiên giòn, sốt ngọt ngon. Recommend!', username: 'demo_user' },
  { dealTitle: 'Cơm bento cá hồi', content: 'Có giao không shop?', username: 'demo_user' },
  { dealTitle: 'Bánh mì que pate', content: 'Ăn sáng nhanh gọn, rẻ.', username: 'demo_user' },
  { dealTitle: 'Phô mai Parmesan Ý 200g', content: 'Phô mai chuẩn Ý, giá tốt. Mua gấp kẻo hết!', username: 'lan_nguyen' },
  { dealTitle: 'Thịt ba chỉ rọi 1kg', content: 'Thịt tươi ngon, nấu ăn liền.', username: 'lan_nguyen' },
  { dealTitle: 'Tôm sú tươi sống 500g', content: 'Tôm to, tươi, giá rẻ hơn chợ.', username: 'huy_tran' },
  { dealTitle: 'Ramen tonkotsu hộp', content: 'Ramen chuẩn Nhật, nước súp đậm đà.', username: 'huy_tran' },
  { dealTitle: 'Dimsum gà há cảo 10 cái', content: 'Ngon, hấp nóng ăn sáng tuyệt vời!', username: 'mai_vo' },
  { dealTitle: 'Bánh mì sandwich nguyên cám', content: 'Ăn healthy, bánh mềm ngon.', username: 'mai_vo' },
]

async function upsertUser(email: string, username: string, role: UserRole, trustScore = 4.6, repPoints = 120) {
  const repo = dataSource.getRepository(User)
  let user = await repo.findOne({ where: { email } })
  if (!user) {
    user = repo.create({
      email, username, firstName: username.split('_')[0],
      passwordHash: await bcrypt.hash('Password123!', 12),
      role, trustScore, reputationPoints: repPoints,
    })
  } else {
    user.role = role; user.isActive = true
  }
  return repo.save(user)
}

async function run() {
  await dataSource.initialize()

  await upsertUser('admin@foodly.app', 'admin', UserRole.ADMIN, 5, 999)
  await upsertUser('moderator@foodly.app', 'moderator', UserRole.MODERATOR, 4.8, 450)
  await upsertUser('demo@foodly.app', 'demo_user', UserRole.USER, 4.6, 120)
  await upsertUser('lan@foodly.app', 'lan_nguyen', UserRole.USER, 4.3, 95)
  await upsertUser('huy@foodly.app', 'huy_tran', UserRole.USER, 4.7, 230)
  await upsertUser('mai@foodly.app', 'mai_vo', UserRole.USER, 4.0, 55)

  const admin = await dataSource.getRepository(User).findOne({ where: { email: 'admin@foodly.app' } })!
  const demo = await dataSource.getRepository(User).findOne({ where: { email: 'demo@foodly.app' } })!
  const lan = await dataSource.getRepository(User).findOne({ where: { email: 'lan@foodly.app' } })!
  const huy = await dataSource.getRepository(User).findOne({ where: { email: 'huy@foodly.app' } })!
  const moderator = await dataSource.getRepository(User).findOne({ where: { email: 'moderator@foodly.app' } })!

  const storeRepo = dataSource.getRepository(Store)
  const dealRepo = dataSource.getRepository(Deal)
  const commentRepo = dataSource.getRepository(Comment)
  const stores = new Map<string, Store>()

  for (const seed of storeSeeds) {
    let store = await storeRepo.findOne({ where: { name: seed.name } })
    if (!store) store = storeRepo.create(seed)
    Object.assign(store, seed, { isActive: true })
    stores.set(seed.name, await storeRepo.save(store))
  }

  const userIds = [admin!.id, demo!.id, lan!.id, huy!.id]
  const dealMap = new Map<string, Deal>()
  const images = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=900&q=80',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900&q=80',
    'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=900&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=900&q=80',
  ]

  for (const seed of dealSeeds) {
    const existing = await dealRepo.findOne({ where: { title: seed.title } })
    const store = stores.get(seed.storeName)
    if (!store) { console.warn(`Store not found: ${seed.storeName}`); continue }
    const deal = existing || dealRepo.create()
    const hoursUntilExpiry = Math.floor(Math.random() * 8) + 2
    Object.assign(deal, {
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      storeId: store.id,
      title: seed.title, description: seed.description,
      originalPrice: seed.originalPrice, discountPrice: seed.discountPrice,
      remainingQuantity: seed.remainingQuantity,
      originalQuantity: Math.max(seed.remainingQuantity, existing?.originalQuantity || seed.remainingQuantity),
      status: DealStatus.ACTIVE, verified: seed.verified,
      verifiedById: seed.verified ? moderator!.id : null,
      latitude: seed.latitude, longitude: seed.longitude, address: seed.address,
      images: [images[Math.floor(Math.random() * images.length)]],
      tags: seed.tags,
      expiresAt: new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000),
      likeCount: existing?.likeCount || Math.floor(Math.random() * 25) + 2,
      bookmarkCount: existing?.bookmarkCount || Math.floor(Math.random() * 12) + 1,
      commentCount: existing?.commentCount || 0,
      currency: 'VND',
    })
    const saved = await dealRepo.save(deal)
    dealMap.set(seed.title, saved)
  }

  for (const c of commentSeeds) {
    const deal = dealMap.get(c.dealTitle)
    if (!deal) continue
    const existing = await commentRepo.findOne({ where: { dealId: deal.id, content: c.content } })
    if (existing) continue
    const comment = commentRepo.create({
      dealId: deal.id, userId: demo!.id,
      content: c.content, status: CommentStatus.ACTIVE,
    } as any)
    await commentRepo.save(comment)
    await dealRepo.increment({ id: deal.id }, 'commentCount', 1)
  }

  console.log(`Seed hoàn tất — ${dealSeeds.length} deal tại ${storeSeeds.length} cửa hàng tiện lợi TP.HCM`)
  console.log()
  console.log('ADMIN:  admin@foodly.app / Password123!')
  console.log('MOD:    moderator@foodly.app / Password123!')
  console.log('USERS:  demo@foodly.app / Password123!')
  console.log('        lan@foodly.app / Password123!')
  console.log('        huy@foodly.app / Password123!')
  await dataSource.destroy()
}

run().catch(async err => {
  console.error(err)
  if (dataSource.isInitialized) await dataSource.destroy()
  process.exit(1)
})
