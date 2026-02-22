import React, { useState } from 'react';

interface LoginPageProps {
    onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Get stored credentials or use defaults
        const storedEmail = localStorage.getItem('auth_email') || 'obarragan@alphabuildershq.com';
        const storedPassword = localStorage.getItem('auth_password') || '062£M2kqdt4B';

        setTimeout(() => {
            setLoading(false);
            if (email === storedEmail && password === storedPassword) {
                onLogin();
            } else {
                setError('Credenciales incorrectas. Por favor, intente de nuevo.');
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans">
            {/* Dynamic Background with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] scale-110 hover:scale-100"
                style={{
                    backgroundImage: `url('/assets/login-bg.png')`,
                    backgroundBlendMode: 'overlay',
                }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-brightness-50"></div>
                {/* Subtle Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-6 shadow-lg shadow-indigo-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-widest uppercase mb-2">TrainAlytics</h1>
                        <p className="text-gray-400 text-sm tracking-wide">PLATAFORMA DE INTELIGENCIA DE CAPACITACIÓN</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@empresa.com"
                                className="w-full bg-white/5 border-b border-white/20 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors duration-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border-b border-white/20 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors duration-300"
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" className="rounded border-white/20 bg-transparent" />
                                Recordarme
                            </label>
                            <a href="#" className="hover:text-amber-500 transition-colors">¿Olvidaste tu contraseña?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-500 group relative overflow-hidden ${loading ? 'bg-amber-600/50 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                                }`}
                        >
                            <span className={`relative z-10 flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                                Ingresar
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500 tracking-wide">
                            ¿No tienes una cuenta? <a href="#" className="text-white hover:text-amber-500 underline underline-offset-4 transition-colors">Contactar a soporte</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Credits / Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 tracking-[0.2em] uppercase whitespace-nowrap">
                &copy; 2026 TrainAlytics AI • Excellence in Learning
            </div>
        </div>
    );
};
