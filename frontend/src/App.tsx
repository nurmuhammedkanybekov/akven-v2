import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { AdminProducts } from "./admin/AdminProducts";
import { AdminTerms } from "./admin/AdminTerms";
import { ProductEditor } from "./admin/ProductEditor";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ShopLayout } from "./layouts/ShopLayout";
import { CatalogPage } from "./pages/Catalog";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { ProductPage } from "./pages/Product";
import { StyleGuide } from "./pages/StyleGuide";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
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
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="styleguide" element={<StyleGuide />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminProducts />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="sections" element={<AdminTerms />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
