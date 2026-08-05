import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
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
  MessageSquare
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    // Farmer Panel
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'AI Scan', path: '/scan', icon: <Scan size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Finance', path: '/finance', icon: <PieChart size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Farm Plots', path: '/farm', icon: <Map size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'My Crops', path: '/crops', icon: <Sprout size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Price Predictor', path: '/prices', icon: <BarChart3 size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Drone Recovery', path: '/drones', icon: <Camera size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'AI Assistant', path: '/agronomy', icon: <FlaskConical size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Marketplace', path: '/marketplace', icon: <Store size={20} />, roles: ['FARMER', 'ADMIN', 'SUPER_ADMIN'] },
    { name: 'Expert Portal', path: '/expert-dashboard', icon: <FlaskConical size={20} />, roles: ['AGRONOMY_EXPERT', 'ADMIN', 'SUPER_ADMIN'] },
  ];

  // If we have a user, filter tabs by role. Admin/Super Admin sees almost everything.
  const visibleNavItems = navItems.filter(item => {
    if (!user) return true; 
    const userRole = user.role?.toUpperCase() || 'FARMER';
    if (userRole === 'SUPER_ADMIN') return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside 
      className={`h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed left-0 top-0 z-50 shadow-sm transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}
    >
      <div className={`p-6 border-b border-gray-100 dark:border-gray-700 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition cursor-pointer">
          <div className="bg-green-100 p-2 rounded-xl flex-shrink-0">
            <Leaf className="w-6 h-6 text-green-600" />
          </div>
          {isOpen && <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">Dr Agri AI</span>}
        </Link>
      </div>

      <nav className={`flex-1 overflow-y-auto py-6 ${isOpen ? 'px-4' : 'px-2'} space-y-1`}>
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              title={!isOpen ? item.name : ""}
              className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${isOpen ? 'px-4' : 'justify-center'} ${
                isActive 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              <div className={`${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {item.icon}
              </div>
              {isOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-gray-100 dark:border-gray-700 space-y-1`}>
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <Link 
            to="/admin" 
            title={!isOpen ? "Admin Panel" : ""}
            className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${isOpen ? 'px-4' : 'justify-center'} ${
              location.pathname === '/admin' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300' 
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-900 dark:hover:text-purple-300'
            }`}
          >
            <ShieldCheck size={20} className="text-purple-500" />
            {isOpen && <span>Admin Panel</span>}
          </Link>
        )}
        <Link 
          to="/settings" 
          title={!isOpen ? "Settings" : ""}
          className={`flex items-center space-x-3 py-3 rounded-xl font-medium transition-all duration-200 ${isOpen ? 'px-4' : 'justify-center'} ${
            location.pathname === '/settings' 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings size={20} className="text-gray-400" />
          {isOpen && <span>Settings</span>}
        </Link>
        <button 
          onClick={handleLogout}
          title={!isOpen ? "Logout" : ""}
          className={`w-full flex items-center space-x-3 py-3 rounded-xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${isOpen ? 'px-4' : 'justify-center'}`}
        >
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
