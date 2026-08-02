import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingCart, User, X } from 'lucide-react';
import fyLogoIcon from '../../../assets/fy-logo-icon.jpeg';

const customerNavLinks = [
  { name: 'Home', path: '/' },
  { name: 'Shop All', path: '/products' },
  { name: 'Book Appointment', path: '/book-appointment' },
  { name: 'Contact us', path: '/contact-us' },
];

const CustomerNavbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    `relative px-1 py-2 text-xs font-bold transition md:text-sm ${
      isActive
        ? 'text-black after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-black'
        : 'text-black/70 hover:text-black'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={fyLogoIcon} alt="FrameYaad" className="h-7 w-7 object-contain" />
          <span className="text-sm font-black text-black md:text-base">FrameYaad</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {customerNavLinks.map((link) => (
            <NavLink key={link.path} to={link.path} className={navClassName} end={link.path === '/'}>
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link to="/cart" className="relative rounded-full p-2 text-black transition hover:bg-black/5" title="Cart">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
              0
            </span>
          </Link>
          <Link to="/profile" className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-xs font-bold text-black transition hover:bg-black hover:text-white">
            <User className="h-4 w-4" />
            Login
          </Link>
        </div>

        <button className="rounded-lg border border-outline-variant p-2 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto h-full w-80 max-w-[86vw] bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-8 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                <img src={fyLogoIcon} alt="FrameYaad" className="h-8 w-8 object-contain" />
                <span className="font-black text-black">FrameYaad</span>
              </Link>
              <button className="rounded-lg p-2 hover:bg-black/5" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              {[...customerNavLinks, { name: 'Cart', path: '/cart' }, { name: 'Login', path: '/profile' }].map((link) => (
                <NavLink key={link.path} to={link.path} className={navClassName} end={link.path === '/'} onClick={() => setMenuOpen(false)}>
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
};

export default CustomerNavbar;
