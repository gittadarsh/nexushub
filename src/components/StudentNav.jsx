import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, Compass, Rss, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listMyDoubtThreads } from '../services/clubDoubts';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/subscriptions', label: 'Subscriptions', icon: Rss }
];

function TabLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-card text-sm font-semibold transition ${
          isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-line'
        }`
      }
    >
      <Icon size={18} strokeWidth={2} />
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}

export default function StudentNav() {
  const { logout, firebaseUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser) return;
    listMyDoubtThreads(firebaseUser.uid).then((threads) => {
      const count = threads.filter(
        (t) => !!t.lastMessageAt && !(t.readUids || []).includes(firebaseUser.uid)
      ).length;
      setUnreadCount(count);
    });
  }, [firebaseUser]);

  return (
    <nav className="border-b border-line bg-paper sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <span className="font-display text-xl shrink-0">NexusHub</span>

        <div className="flex items-center gap-1">
          {TABS.map((tab) => <TabLink key={tab.to} {...tab} />)}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link to="/my-doubts" className="relative text-muted hover:text-ink transition p-2" title="My questions">
            <MessageCircle size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-signal text-paper text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 px-1 grid place-items-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button onClick={logout} className="text-muted hover:text-ink transition p-2" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
