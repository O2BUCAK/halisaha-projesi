import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, AlertCircle, Chrome, CheckCircle } from 'lucide-react';

const Register = () => {
    const [step, setStep] = useState('register'); // 'register' | 'verify'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const { register, verifyEmail, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const validatePassword = (pwd) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasLowerCase = /[a-z]/.test(pwd);
        const hasNumbers = /\d/.test(pwd);
        const hasNonalphas = /\W/.test(pwd);

        if (pwd.length < minLength) return "Şifre en az 8 karakter olmalıdır.";
        if (!hasUpperCase) return "Şifre en az bir büyük harf içermelidir.";
        if (!hasLowerCase) return "Şifre en az bir küçük harf içermelidir.";
        if (!hasNumbers) return "Şifre en az bir rakam içermelidir.";
        if (!hasNonalphas) return "Şifre en az bir özel karakter içermelidir.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        const result = await register(name, email, password);
        if (result.success) {
            if (result.requiresVerification) {
                setStep('verify');
                // Simulate sending email
                alert(`DEMO: Doğrulama kodunuz: ${result.demoCode}`);
                console.log('Verification Code:', result.demoCode);
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.error);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        const result = await verifyEmail(email, verificationCode);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        const result = await loginWithGoogle();
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Google ile giriş yapılamadı.');
        }
    };

    if (step === 'verify') {
        return (
            <div className="flex-center" style={{ minHeight: '80vh' }}>
                <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-success)' }}>
                            <Mail size={32} />
                        </div>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>E-posta Doğrulama</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {email} adresine gönderilen 6 haneli kodu giriniz.
                        <br />
                        <small>(Demo: Kod ekrana gelen uyarıda yazmaktadır)</small>
                    </p>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-danger)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                            justifyContent: 'center'
                        }}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleVerify}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                required
                                placeholder="123456"
                                maxLength="6"
                                style={{
                                    textAlign: 'center',
                                    letterSpacing: '0.5rem',
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold'
                                }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            Doğrula ve Giriş Yap
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-center" style={{ minHeight: '80vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Kayıt Ol</h2>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--accent-danger)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                    }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ad Soyad</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Adınız Soyadınız"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>E-posta</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ornek@email.com"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Şifre</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            En az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                        Kayıt Ol
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>veya</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Chrome size={18} /> Google ile Kayıt Ol
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Zaten hesabınız var mı? <Link to="/login" style={{ color: 'var(--accent-primary)' }}>Giriş Yap</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
