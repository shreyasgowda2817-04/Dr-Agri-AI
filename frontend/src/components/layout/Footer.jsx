import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { Sprout, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-gray-300 pt-8 sm:pt-12 lg:pt-16 pb-20 sm:pb-12 lg:pb-8 border-t border-gray-800/80 w-full min-w-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-10 lg:mb-12">
          {/* Brand */}
          <div className="space-y-3 sm:space-y-4 col-span-1 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 text-white group">
              <Sprout size={28} className="text-emerald-500 group-hover:scale-105 transition-transform shrink-0 sm:w-8 sm:h-8" />
              <span className="text-xl sm:text-2xl font-black tracking-tight">{t("dr_agri_ai")}</span>
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm break-words">
              {t("empowering_farmers_w")}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links & Solutions Container (2 columns on mobile/tablet, separate columns on desktop) */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 col-span-1 sm:col-span-2 lg:contents">
            {/* Quick Links */}
            <div>
              <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 sm:mb-4">{t("quick_links")}</h3>
              <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
                <li><Link to="/scan" className="hover:text-emerald-400 transition inline-block py-0.5">{t("ai_disease_scan")}</Link></li>
                <li><Link to="/marketplace" className="hover:text-emerald-400 transition inline-block py-0.5">{t("marketplace")}</Link></li>
                <li><Link to="/track" className="hover:text-emerald-400 transition inline-block py-0.5">{t("track_order")}</Link></li>
                <li><Link to="/prices" className="hover:text-emerald-400 transition inline-block py-0.5">{t("commodity_prices")}</Link></li>
                <li><Link to="/b2b" className="hover:text-emerald-400 transition inline-block py-0.5">{t("enterprise_b2b")}</Link></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 sm:mb-4">{t("solutions")}</h3>
              <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition inline-block py-0.5">{t("for_farmers")}</a></li>
                <li><a href="/schemes" className="hover:text-emerald-400 transition inline-block py-0.5">{t("for_warehouses")}</a></li>
                <li><Link to="/support" className="hover:text-emerald-400 transition inline-block py-0.5">{t("support_helpdesk")}</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-400 transition inline-block py-0.5">{t("government_schemes")}</Link></li>
                <li><Link to="/consult" className="hover:text-emerald-400 transition inline-block py-0.5">{t("call___consultation")}</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 sm:mb-4">{t("contact_us")}</h3>
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5 sm:gap-3">
                <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-snug break-words">{t("123_agri_tech_park__")}</span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <Phone size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <a href="tel:+91900343432" className="hover:text-emerald-400 transition leading-snug">+91 900 343 432</a>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <Mail size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <a href="mailto:support@dragri.ai" className="hover:text-emerald-400 transition leading-snug break-all">{t("support_dragri_ai")}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 sm:pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 text-center sm:text-left">
          <p className="order-2 sm:order-1">
            &copy; {new Date().getFullYear()} {t("dr_agri_ai__all_righ")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 order-1 sm:order-2">
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("privacy_policy")}</a>
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("terms_of_service")}</a>
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("cookie_settings")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
