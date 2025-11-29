# Mối Quan Hệ Giữa Các Model Trong Dự Án

## 1. User (users.model.js)

Model User đại diện cho người dùng trong hệ thống.

**Quan hệ:**

-   **User - ApiKey**: One-to-One (1-1)

    -   Mỗi user có một ApiKey duy nhất
    -   `User.hasOne(apiKey, { foreignKey: 'userId' })`
    -   `apiKey.belongsTo(User, { foreignKey: 'userId' })`

-   **User - Cart**: One-to-Many (1-n)

    -   Mỗi user có thể có nhiều items trong giỏ hàng
    -   `User.hasMany(cart, { foreignKey: 'userId' })`
    -   `cart.belongsTo(User, { foreignKey: 'userId' })`

-   **User - Payments**: One-to-Many (1-n)

    -   Mỗi user có thể có nhiều thanh toán
    -   `User.hasMany(payments, { foreignKey: 'userId' })`
    -   `payments.belongsTo(User, { foreignKey: 'userId' })`

-   **User - BuildPcCart**: One-to-Many (1-n)

    -   Mỗi user có thể tạo nhiều cấu hình PC
    -   `User.hasMany(buildPcCart, { foreignKey: 'userId' })`
    -   `buildPcCart.belongsTo(User, { foreignKey: 'userId' })`

-   **User - UserWatchProduct**: One-to-Many (1-n)

    -   Mỗi user có thể theo dõi nhiều sản phẩm
    -   `User.hasMany(userWatchProduct, { foreignKey: 'userId' })`
    -   `userWatchProduct.belongsTo(User, { foreignKey: 'userId' })`

-   **User - ProductPreview**: One-to-Many (1-n)
    -   Mỗi user có thể đánh giá nhiều sản phẩm
    -   `User.hasMany(productPreview, { foreignKey: 'userId' })`
    -   `productPreview.belongsTo(User, { foreignKey: 'userId' })`

## 2. Product (products.model.js)

Model Product đại diện cho sản phẩm trong hệ thống.

**Quan hệ:**

-   **Product - Category**: Many-to-One (n-1)

    -   Nhiều sản phẩm thuộc về một danh mục
    -   `Product.belongsTo(Category, { foreignKey: 'categoryId' })`
    -   `Category.hasMany(Product, { foreignKey: 'categoryId' })`

-   **Product - Cart**: One-to-Many (1-n)

    -   Một sản phẩm có thể có trong nhiều giỏ hàng
    -   `Product.hasMany(cart, { foreignKey: 'productId' })`
    -   `cart.belongsTo(Product, { foreignKey: 'productId' })`

-   **Product - Payments**: One-to-Many (1-n)

    -   Một sản phẩm có thể được mua nhiều lần
    -   `Product.hasMany(payments, { foreignKey: 'productId' })`
    -   `payments.belongsTo(Product, { foreignKey: 'productId' })`

-   **Product - BuildPcCart**: One-to-Many (1-n)

    -   Một sản phẩm có thể được sử dụng trong nhiều cấu hình PC
    -   `Product.hasMany(buildPcCart, { foreignKey: 'productId' })`
    -   `buildPcCart.belongsTo(Product, { foreignKey: 'productId' })`

-   **Product - UserWatchProduct**: One-to-Many (1-n)

    -   Một sản phẩm có thể được theo dõi bởi nhiều user
    -   `Product.hasMany(userWatchProduct, { foreignKey: 'productId' })`
    -   `userWatchProduct.belongsTo(Product, { foreignKey: 'productId' })`

-   **Product - ProductPreview**: One-to-Many (1-n)
    -   Một sản phẩm có thể có nhiều đánh giá
    -   `Product.hasMany(productPreview, { foreignKey: 'productId' })`
    -   `productPreview.belongsTo(Product, { foreignKey: 'productId' })`

## 3. Category (category.model.js)

Model Category đại diện cho danh mục sản phẩm.

**Quan hệ:**

-   **Category - Product**: One-to-Many (1-n)
    -   Một danh mục có thể chứa nhiều sản phẩm
    -   `Category.hasMany(Product, { foreignKey: 'categoryId' })`
    -   `Product.belongsTo(Category, { foreignKey: 'categoryId' })`

## 4. Cart (cart.model.js)

Model Cart đại diện cho giỏ hàng của người dùng.

**Quan hệ:**

-   **Cart - User**: Many-to-One (n-1)

    -   Nhiều items trong giỏ hàng thuộc về một user
    -   `cart.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasMany(cart, { foreignKey: 'userId' })`

-   **Cart - Product**: Many-to-One (n-1)
    -   Mỗi item trong giỏ hàng liên kết với một sản phẩm
    -   `cart.belongsTo(Product, { foreignKey: 'productId' })`
    -   `Product.hasMany(cart, { foreignKey: 'productId' })`

## 5. Payments (payments.model.js)

Model Payments đại diện cho các thanh toán trong hệ thống.

**Quan hệ:**

-   **Payments - User**: Many-to-One (n-1)

    -   Nhiều thanh toán thuộc về một user
    -   `payments.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasMany(payments, { foreignKey: 'userId' })`

-   **Payments - Product**: Many-to-One (n-1)
    -   Mỗi thanh toán liên kết với một sản phẩm
    -   `payments.belongsTo(Product, { foreignKey: 'productId' })`
    -   `Product.hasMany(payments, { foreignKey: 'productId' })`

## 6. BuildPcCart (buildPcCart.model.js)

Model BuildPcCart đại diện cho các cấu hình PC do người dùng tạo.

**Quan hệ:**

-   **BuildPcCart - User**: Many-to-One (n-1)

    -   Nhiều cấu hình PC thuộc về một user
    -   `buildPcCart.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasMany(buildPcCart, { foreignKey: 'userId' })`

-   **BuildPcCart - Product**: Many-to-One (n-1)
    -   Mỗi thành phần trong cấu hình PC liên kết với một sản phẩm
    -   `buildPcCart.belongsTo(Product, { foreignKey: 'productId' })`
    -   `Product.hasMany(buildPcCart, { foreignKey: 'productId' })`

## 7. UserWatchProduct (userWatchProduct.model.js)

Model UserWatchProduct đại diện cho việc người dùng theo dõi sản phẩm.

**Quan hệ:**

-   **UserWatchProduct - User**: Many-to-One (n-1)

    -   Nhiều lượt theo dõi thuộc về một user
    -   `userWatchProduct.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasMany(userWatchProduct, { foreignKey: 'userId' })`

-   **UserWatchProduct - Product**: Many-to-One (n-1)
    -   Mỗi lượt theo dõi liên kết với một sản phẩm
    -   `userWatchProduct.belongsTo(Product, { foreignKey: 'productId' })`
    -   `Product.hasMany(userWatchProduct, { foreignKey: 'productId' })`

## 8. ProductPreview (productPreview.js)

Model ProductPreview đại diện cho đánh giá sản phẩm.

**Quan hệ:**

-   **ProductPreview - User**: Many-to-One (n-1)

    -   Nhiều đánh giá thuộc về một user
    -   `productPreview.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasMany(productPreview, { foreignKey: 'userId' })`

-   **ProductPreview - Product**: Many-to-One (n-1)
    -   Nhiều đánh giá liên kết với một sản phẩm
    -   `productPreview.belongsTo(Product, { foreignKey: 'productId' })`
    -   `Product.hasMany(productPreview, { foreignKey: 'productId' })`

## 9. ApiKey (apiKey.model.js)

Model ApiKey đại diện cho key API của người dùng.

**Quan hệ:**

-   **ApiKey - User**: One-to-One (1-1)
    -   Mỗi API key thuộc về một user
    -   `apiKey.belongsTo(User, { foreignKey: 'userId' })`
    -   `User.hasOne(apiKey, { foreignKey: 'userId' })`

## Sơ đồ Mối quan hệ (ER Diagram)

```
                                  +-------------+
                                  |             |
                                  |    User     |
                                  |             |
                                  +------+------+
                                         |
                  +--------------------+ | +--------------------+
                  |                    | | |                    |
                  |                    v v v                    v
          +-------+-------+    +-------+-------+    +----------+---------+
          |               |    |               |    |                    |
          |    ApiKey     |    |     Cart      |    |      Payments      |
          |               |    |               |    |                    |
          +---------------+    +---------------+    +--------------------+
                                      ^                       ^
                                      |                       |
                     +----------------+                       |
                     |                                        |
                     |                                        |
              +------+------+                                 |
              |             |                                 |
              |   Product   +-------------------------------->+
              |             |
              +------+------+
                     |
                     v
          +----------+---------+
          |                    |
          |      Category      |
          |                    |
          +--------------------+


       User
         |
         +------> UserWatchProduct <------ Product
         |
         +------> ProductPreview <-------- Product
         |
         +------> BuildPcCart <----------- Product
```

## Đặc điểm chính của các mối quan hệ

1. User là trung tâm của hệ thống, liên kết với hầu hết các model khác
2. Product cũng đóng vai trò quan trọng, liên kết với nhiều model khác
3. Các mối quan hệ chủ yếu là One-to-Many (1-n)
4. Chỉ có User-ApiKey là mối quan hệ One-to-One (1-1)
5. Không có mối quan hệ Many-to-Many (n-n) trực tiếp, thay vào đó sử dụng các bảng trung gian như UserWatchProduct
