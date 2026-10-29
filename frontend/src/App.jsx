import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import Vendor from './pages/Vendor.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<ProtectedRoute role="CUSTOMER"><Cart /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute role="CUSTOMER"><Orders /></ProtectedRoute>} />
        <Route path="/vendor" element={<ProtectedRoute role="VENDOR"><Vendor /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<p className="p-6">Page not found.</p>} />
      </Routes>
    </div>
  );
}