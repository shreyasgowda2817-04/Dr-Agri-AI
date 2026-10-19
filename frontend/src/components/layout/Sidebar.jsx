import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logoutUser } from '../../store/slices/authSlice';
import { LogoIcon } from '../common/AppLogo';
import { 
  Leaf, 
  Home, 
  LayoutDashboard, 
  PieChart, 
  Map, 
  FlaskConical, 
  Store, 
  Video, 
  Radio, 
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Scan,
  Sprout,
  CalendarDays,
  Camera,
  Cpu,
  BarChart3,
  Building2,
  Package,
  Newspaper,
  MessageSquare,
  Megaphone
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false);
    }
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    // Farmer Panel
    { name: t('dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('ai_scan'), path: '/scan', icon: <Scan size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('finance'), path: '/finance', icon: <PieChart size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('farm_plots'), path: '/farm', icon: <Map size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('my_crops'), path: '/crops', icon: <Sprout size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('price_predictor'), path: '/prices', icon: <BarChart3 size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('drone_recovery'), path: '/drones', icon: <Camera size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('ai_assistant'), path: '/agronomy', icon: <FlaskConical size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('marketplace'), path: '/marketplace', icon: <Store size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('expert_portal'), path: '/expert-dashboard', icon: <FlaskConical size={20} />, roles: ['AGRONOMY_EXPERT', 'ADMIN', 'SUPER_ADMIN'] },
    { name: t('consult'), path: '/consult', icon: <Video size={20} />, roles: ['FARMER', 'AGRONOMY_EXPERT', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Advertiser Portal', path: '/advertiser', icon: <Megaphone size={20} className="text-emerald-500" />, roles: ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN'] },
  ];

  // If we have a user, filter tabs by role. Admin/Super Admin sees almost everything.
  const visibleNavItems = navItems.filter(item => {
    if (!user) return true; 
    const userRole = user.role?.toUpperCase() || 'FARMER';
    if (userRole === 'SUPER_ADMIN') return true;
    return item.roles.includes(userRole);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl lg:shadow-sm transition-all duration-300 ease-in-out w-72 max-w-[85vw] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isOpen ? 'lg:w-64' : 'lg:w-20'}`}
      >
        <div className={`p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between ${!isOpen ? 'lg:justify-center' : ''}`}>
          <Link 
            to="/dashboard" 
            onClick={handleNavClick}
            className="flex items-center space-x-3 hover:opacity-90 transition cursor-pointer min-w-0 group"
          >
            <LogoIcon size={38} className="drop-shadow-sm" />
            <div className={`flex items-center gap-1.5 ${!isOpen ? 'lg:hidden' : 'flex'}`}>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white truncate">{t("dr_agri_ai")}</span>
              {(user?.is_premium || user?.tier === 'pro') && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm flex-shrink-0">
                  PRO
                </span>
              )}
            </div>
          </Link>

          {/* Close button on mobile */}
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden transition"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 sm:py-6 ${isOpen ? 'px-3 sm:px-4' : 'px-2 lg:px-2'} space-y-1`}>
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={handleNavClick}
                title={!isOpen ? item.name : ""}
                className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isOpen ? 'px-3 sm:px-4' : 'px-3 sm:px-4 lg:justify-center lg:px-0'
                } ${
                  isActive 
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
              >
                <div className={`flex-shrink-0 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {item.icon}
                </div>
                <span className={`${!isOpen ? 'lg:hidden' : ''} truncate`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <Link 
              to="/admin" 
              onClick={handleNavClick}
              title={!isOpen ? "Admin Panel" : ""}
              className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${
                isOpen ? 'px-3 sm:px-4' : 'px-3 sm:px-4 lg:justify-center lg:px-0'
              } ${
                location.pathname === '/admin' 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300' 
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-900 dark:hover:text-purple-300'
              }`}
            >
              <ShieldCheck size={20} className="text-purple-500 flex-shrink-0" />
              <span className={`${!isOpen ? 'lg:hidden' : ''} truncate`}>{t('admin_panel')}</span>
            </Link>
          )}
          <Link 
            to="/settings" 
            onClick={handleNavClick}
            title={!isOpen ? "Settings" : ""}
            className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${
              isOpen ? 'px-3 sm:px-4' : 'px-3 sm:px-4 lg:justify-center lg:px-0'
            } ${
              location.pathname === '/settings' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Settings size={20} className="text-gray-400 flex-shrink-0" />
            <span className={`${!isOpen ? 'lg:hidden' : ''} truncate`}>{t('settings')}</span>
          </Link>
          <button 
            type="button"
            onClick={handleLogout}
            title={!isOpen ? "Logout" : ""}
            className={`w-full flex items-center space-x-3 py-3 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${
              isOpen ? 'px-3 sm:px-4' : 'px-3 sm:px-4 lg:justify-center lg:px-0'
            }`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`${!isOpen ? 'lg:hidden' : ''} truncate`}>{t('logout')}</span>
          </button>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
