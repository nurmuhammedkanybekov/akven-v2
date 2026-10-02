import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminOrderDetail } from "./admin/AdminOrderDetail";
import { AdminNegotiations } from "./admin/AdminNegotiations";
import { AdminOrders } from "./admin/AdminOrders";
import { AdminProducts } from "./admin/AdminProducts";
import { AdminTerms } from "./admin/AdminTerms";
import { ProductEditor } from "./admin/ProductEditor";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { RequireAuth } from "./components/RequireAuth";
import { ToastProvider } from "./components/Toast";
import { ShopLayout } from "./layouts/ShopLayout";
import { CartPage } from "./pages/Cart";
import { CatalogPage } from "./pages/Catalog";
import { CheckoutPage } from "./pages/Checkout";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { OrderDetailPage } from "./pages/OrderDetail";
import { OrdersPage } from "./pages/Orders";
import { ProductPage } from "./pages/Product";
import { RegisterPage } from "./pages/Register";
import { StyleGuide } from "./pages/StyleGuide";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
          <Routes>
            <Route element={<ShopLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<CatalogPage />} />
              <Route path="men" element={<CatalogPage category="MEN" />} />
              <Route path="women" element={<CatalogPage category="WOMEN" />} />
              <Route path="kids" element={<CatalogPage category="KIDS" />} />
              <Route path="bundles" element={<CatalogPage category="BUNDLES" />} />
              <Route path="products/:slug" element={<ProductPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
              <Route path="orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
              <Route path="orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="styleguide" element={<StyleGuide />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminProducts />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="negotiations" element={<AdminNegotiations />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="sections" element={<AdminTerms />} />
            </Route>
          </Routes>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
