import { Link } from 'react-router-dom';

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden md:flex flex-col justify-between bg-ink text-paper p-12">
        <Link to="/" className="font-display text-xl tracking-tight">NexusHub</Link>
        <div>
          <p className="text-signal font-semibold text-sm mb-3 tracking-wide uppercase">{eyebrow}</p>
          <h1 className="font-display text-4xl leading-tight mb-4">{title}</h1>
          <p className="text-white/60 max-w-sm">{subtitle}</p>
        </div>
        <p className="text-white/40 text-xs">One place to find what's happening across every club on campus.</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden font-display text-xl block mb-8">NexusHub</Link>
          {children}
        </div>
      </div>
    </div>
  );
}
