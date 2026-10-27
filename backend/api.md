Module	Endpoint	Access
Auth	POST /api/auth/register, POST /api/auth/login, GET /api/auth/me	public / logged in
Vendors	POST /api/vendors/apply, GET /api/vendors/me	vendor
Products	POST/PUT/DELETE /api/products, POST /api/products/:id/images	vendor (own)
Search	GET /api/search?q=&category=&minPrice=&maxPrice=&sort=	public
Cart	GET/POST/PATCH/DELETE /api/cart	customer
Orders	POST /api/orders/checkout, GET /api/orders, PATCH /api/orders/items/:id/status	customer / vendor
Payments	POST /api/payments/create, POST /api/payments/verify, webhook	customer
Reviews	POST /api/products/:id/reviews, GET /api/products/:id/reviews	customer
Coupons	POST /api/coupons (admin), POST /api/cart/coupon	admin / customer
Invoices	GET /api/orders/:id/invoice	customer
Admin	PATCH /api/admin/vendors/:id/approve, GET /api/admin/analytics	admin