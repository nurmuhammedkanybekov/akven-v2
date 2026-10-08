import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { RequireAuth } from "./components/RequireAuth";
import { ToastProvider } from "./components/Toast";
import { I18nProvider } from "./i18n/I18n";
import { ShopLayout } from "./layouts/ShopLayout";
import { CartPage } from "./pages/Cart";
import { CatalogPage } from "./pages/Catalog";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { ProductPage } from "./pages/Product";
import { RegisterPage } from "./pages/Register";

// Rarely used screens (admin, checkout, order history, style guide) load on demand, so the shop opens faster.
const AdminLayout = lazy(() => import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOrderDetail = lazy(() => import("./admin/AdminOrderDetail").then((m) => ({ default: m.AdminOrderDetail })));
const AdminNegotiations = lazy(() => import("./admin/AdminNegotiations").then((m) => ({ default: m.AdminNegotiations })));
const AdminOrders = lazy(() => import("./admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminProducts = lazy(() => import("./admin/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const AdminTerms = lazy(() => import("./admin/AdminTerms").then((m) => ({ default: m.AdminTerms })));
const ProductEditor = lazy(() => import("./admin/ProductEditor").then((m) => ({ default: m.ProductEditor })));
const CheckoutPage = lazy(() => import("./pages/Checkout").then((m) => ({ default: m.CheckoutPage })));
const OrderDetailPage = lazy(() => import("./pages/OrderDetail").then((m) => ({ default: m.OrderDetailPage })));
const OrdersPage = lazy(() => import("./pages/Orders").then((m) => ({ default: m.OrdersPage })));
const StyleGuide = lazy(() => import("./pages/StyleGuide").then((m) => ({ default: m.StyleGuide })));

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
          <Suspense fallback={<div className="av-container av-page" role="status" aria-live="polite">Loading…</div>}>
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
          </Suspense>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
