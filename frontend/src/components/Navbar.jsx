import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-indigo-600">Marketplace</Link>
        <div className="flex items-center gap-4 text-sm">
          {user?.role === 'CUSTOMER' && (
            <>
              <Link to="/cart">Cart</Link>
              <Link to="/orders">My orders</Link>
            </>
          )}
          {user?.role === 'VENDOR' && <Link to="/vendor">Vendor dashboard</Link>}
          {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          {user ? (
            <>
              <span className="text-gray-500">{user.name}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="bg-indigo-600 text-white px-3 py-1.5 rounded">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}