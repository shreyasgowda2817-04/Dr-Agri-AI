import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { Leaf, Menu } from 'lucide-react';

const Navbar = () => {
  const { t } = useTranslation();
  

  return (
    <nav className="fixed w-full z-50 glass shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition">
            <Leaf className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight">{t("cropai")}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6 items-center">
            <Link to="/" className="text-gray-600 hover:text-green-600 font-medium transition">{t("home")}</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-green-600 font-medium transition">{t("dashboard")}</Link>
            <Link to="/finance" className="text-gray-600 hover:text-green-600 font-medium transition">{t("finance")}</Link>
            <Link to="/farm" className="text-gray-600 hover:text-green-600 font-medium transition">{t("plots")}</Link>
            <Link to="/agronomy" className="text-gray-600 hover:text-green-600 font-medium transition">{t("agronomy")}</Link>
            <Link to="/marketplace" className="text-gray-600 hover:text-green-600 font-medium transition">{t("market")}</Link>
            <Link to="/consult" className="text-gray-600 hover:text-green-600 font-medium transition">{t("consult")}</Link>
            <Link to="/iot" className="text-gray-600 hover:text-green-600 font-medium transition">{t("iot_sensors")}</Link>
            <Link to="/settings" className="text-gray-600 hover:text-green-600 font-medium transition">{t("settings")}</Link>
            <div className="flex items-center space-x-4 ml-4 border-l pl-4 border-gray-300">
              <Link to="/login" className="text-gray-600 hover:text-green-600 font-medium transition">{t("login")}</Link>
              <Link to="/register" className="bg-green-600 text-white px-5 py-2 rounded-full font-medium hover:bg-green-700 transition shadow-md hover:shadow-lg">{t("get_started")}</Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button className="text-gray-600 hover:text-green-600 focus:outline-none">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
