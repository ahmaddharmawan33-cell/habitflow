import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onGuest }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            background: "radial-gradient(circle at top left, #1a1a1e, #0d0d0f)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <div className="login-card" style={{
                maxWidth: 420,
                width: "90%",
                textAlign: "center",
                padding: "48px 40px",
                background: "rgba(26, 26, 30, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "24px",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                backdropFilter: "blur(20px)",
                animation: "fadeInUp 0.6s ease-out"
            }}>
                <div className="logo-icon" style={{
                    margin: "0 auto 24px",
                    width: 64,
                    height: 64,
                    fontSize: 32,
                    background: "linear-gradient(135deg, #ff6b35, #ff3d00)",
                    boxShadow: "0 8px 16px rgba(255, 107, 53, 0.3)"
                }}>🌊</div>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>HabitFlow</h1>
                <p style={{ color: "var(--text2)", marginBottom: 40, fontSize: 15, lineHeight: 1.6 }}>
                    Bangun disiplin dalam keindahan. <br />
                    Mulai perjalananmu hanya dengan satu klik.
                </p>

                {error && (
                    <div style={{
                        background: "rgba(248,113,113,0.1)",
                        color: "var(--red)",
                        padding: "14px",
                        borderRadius: "12px",
                        marginBottom: 24,
                        fontSize: 13,
                        border: "1px solid rgba(248,113,113,0.2)"
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <button className="btn btn-primary"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 12,
                            padding: "16px",
                            fontSize: "15px",
                            fontWeight: "600",
                            borderRadius: "16px",
                            background: "white",
                            color: "#000",
                            border: "none",
                            transition: "all 0.2s",
                            cursor: "pointer"
                        }}>
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="" width="20" height="20" />
                        {loading ? "Menghubungkan..." : "Masuk dengan Google"}
                    </button>

                    <button className="btn btn-ghost"
                        onClick={onGuest}
                        style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            color: "var(--text2)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            opacity: 0.8
                        }}>
                        Lanjutkan sebagai Tamu (Mode Lokal)
                    </button>
                </div>

                <p style={{ marginTop: 32, fontSize: 12, color: "var(--text2)", opacity: 0.7 }}>
                    Dengan melanjutkan, Anda menyetujui Ketentuan Layanan kami.
                </p>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .btn-primary:hover {
                    box-shadow: 0 8px 24px rgba(255, 255, 255, 0.1) !important;
                    transform: translateY(-2px);
                }
                .btn-ghost:hover {
                    opacity: 1 !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}

