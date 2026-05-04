import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    { name: 'RUDIMENTS', path: '/' },
    { name: 'METRONOME', path: '/metronome' },
    { name: 'ANALYTICS', path: '/analytics' },
    { name: 'SOCIAL', path: '/social' },
  ];

  return (
    <aside className={`
      w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-900 h-screen flex flex-col p-6 overflow-hidden
      fixed z-30 top-0 left-0 transition-transform duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:sticky md:translate-x-0
    `}>
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <span className="font-black text-slate-950 text-xs italic">GV</span>
        </div>
        <h1 className="text-sm font-black uppercase tracking-[0.4em] text-slate-100">GROOVE VAULT</h1>
      </div>

      <nav className="flex-1 space-y-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-[0.2em] ${
                isActive
                  ? 'bg-slate-900 text-cyan-500 shadow-xl'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
        <div className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-widest">ENGINE STATUS</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">ONLINE</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
