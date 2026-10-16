import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { Sprout, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800/80 w-full min-w-0 overflow-hidden">
      {/* ================= MOBILE COMPACT VIEW (< sm) ================= */}
      <div className="block sm:hidden px-4 pt-3.5 pb-5 space-y-2.5">
        {/* Brand & Socials Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Link to="/" className="inline-flex items-center gap-1.5 text-white group">
              <Sprout size={18} className="text-emerald-500 group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-sm font-bold tracking-tight">{t("dr_agri_ai")}</span>
            </Link>
            <p className="text-gray-400 text-[11px] leading-tight truncate">
              {t("empowering_farmers_w")}
            </p>
          </div>
          {/* Compact Social Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a href="#" className="w-7 h-7 rounded-md bg-gray-800/90 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" className="w-7 h-7 rounded-md bg-gray-800/90 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white" aria-label="Twitter">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </a>
            <a href="#" className="w-7 h-7 rounded-md bg-gray-800/90 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" className="w-7 h-7 rounded-md bg-gray-800/90 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white" aria-label="LinkedIn">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>

        {/* 2-Column Links */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div>
            <h4 className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">{t("quick_links")}</h4>
            <ul className="space-y-0.5 text-[11px]">
              <li><Link to="/scan" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("ai_disease_scan")}</Link></li>
              <li><Link to="/marketplace" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("marketplace")}</Link></li>
              <li><Link to="/track" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("track_order")}</Link></li>
              <li><Link to="/prices" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("commodity_prices")}</Link></li>
              <li><Link to="/b2b" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("enterprise_b2b")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">{t("solutions")}</h4>
            <ul className="space-y-0.5 text-[11px]">
              <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("for_farmers")}</a></li>
              <li><a href="/schemes" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("for_warehouses")}</a></li>
              <li><Link to="/support" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("support_helpdesk")}</Link></li>
              <li><Link to="/dashboard" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("government_schemes")}</Link></li>
              <li><Link to="/consult" className="text-gray-400 hover:text-emerald-400 transition inline-block py-0.5">{t("call___consultation")}</Link></li>
            </ul>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="pt-2 border-t border-gray-800/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-emerald-500 shrink-0" />
            <span>{t("123_agri_tech_park__")}</span>
          </div>
          <a href="tel:+91900343432" className="flex items-center gap-1.5 hover:text-emerald-400 transition">
            <Phone size={12} className="text-emerald-500 shrink-0" />
            <span>+91 900 343 432</span>
          </a>
          <a href="mailto:support@dragri.ai" className="flex items-center gap-1.5 hover:text-emerald-400 transition">
            <Mail size={12} className="text-emerald-500 shrink-0" />
            <span>{t("support_dragri_ai")}</span>
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-2 border-t border-gray-800/60 flex flex-col items-center gap-1 text-[10px] text-gray-500 text-center pr-12">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("privacy_policy")}</a>
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("terms_of_service")}</a>
            <a href="#" className="hover:text-gray-300 transition py-0.5">{t("cookie_settings")}</a>
          </div>
          <p>&copy; {new Date().getFullYear()} {t("dr_agri_ai__all_righ")}</p>
        </div>
      </div>

      {/* ================= TABLET & DESKTOP VIEW (>= sm) ================= */}
      <div className="hidden sm:block max-w-7xl mx-auto px-6 lg:px-8 pt-10 lg:pt-14 pb-8 sm:pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-8 sm:mb-10">
          {/* Brand */}
          <div className="space-y-3 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 text-white group">
              <Sprout size={24} className="text-emerald-500 group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xl font-black tracking-tight">{t("dr_agri_ai")}</span>
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm break-words">
              {t("empowering_farmers_w")}
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-emerald-600 flex items-center justify-center transition text-gray-400 hover:text-white shrink-0" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-3">{t("quick_links")}</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><Link to="/scan" className="hover:text-emerald-400 transition inline-block">{t("ai_disease_scan")}</Link></li>
              <li><Link to="/marketplace" className="hover:text-emerald-400 transition inline-block">{t("marketplace")}</Link></li>
              <li><Link to="/track" className="hover:text-emerald-400 transition inline-block">{t("track_order")}</Link></li>
              <li><Link to="/prices" className="hover:text-emerald-400 transition inline-block">{t("commodity_prices")}</Link></li>
              <li><Link to="/b2b" className="hover:text-emerald-400 transition inline-block">{t("enterprise_b2b")}</Link></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-3">{t("solutions")}</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition inline-block">{t("for_farmers")}</a></li>
              <li><a href="/schemes" className="hover:text-emerald-400 transition inline-block">{t("for_warehouses")}</a></li>
              <li><Link to="/support" className="hover:text-emerald-400 transition inline-block">{t("support_helpdesk")}</Link></li>
              <li><Link to="/dashboard" className="hover:text-emerald-400 transition inline-block">{t("government_schemes")}</Link></li>
              <li><Link to="/consult" className="hover:text-emerald-400 transition inline-block">{t("call___consultation")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider mb-3">{t("contact_us")}</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-snug break-words">{t("123_agri_tech_park__")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <a href="tel:+91900343432" className="hover:text-emerald-400 transition leading-snug">+91 900 343 432</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <a href="mailto:support@dragri.ai" className="hover:text-emerald-400 transition leading-snug break-all">{t("support_dragri_ai")}</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {t("dr_agri_ai__all_righ")}</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="hover:text-gray-300 transition">{t("privacy_policy")}</a>
            <a href="#" className="hover:text-gray-300 transition">{t("terms_of_service")}</a>
            <a href="#" className="hover:text-gray-300 transition">{t("cookie_settings")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
