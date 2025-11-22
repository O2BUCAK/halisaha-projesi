import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, LogOut, User } from 'lucide-react';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            padding: '1rem 0',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div className="container flex-center" style={{ justifyContent: 'space-between' }}>
                <Link to="/" className="flex-center" style={{ gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                    <Trophy size={28} />
                    <span>HalıSaha <span style={{ fontSize: '0.8rem', background: 'var(--accent-secondary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>v2.0</span></span>
                </Link>

                <div className="flex-center" style={{ gap: '1rem' }}>
                    {currentUser ? (
                        <>
                            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                                Dashboard
                            </Link>
                            <Link to="/profile" className="flex-center" style={{ gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                <User size={18} />
                                <span>{currentUser.name}</span>
                            </Link>
                            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary">Giriş Yap</Link>
                            <Link to="/register" className="btn btn-primary">Kayıt Ol</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
