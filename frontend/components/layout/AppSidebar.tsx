"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { useSidebar } from "@/contexts/SidebarContext";

interface NavItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  children?: { name: string; path: string }[];
}

const mainMenu: NavItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    name: "Analisis",
    path: "/analisis",
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    name: "Chat AI",
    path: "/chat-ai",
    icon: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 9h8M8 13h6" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },

];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const showLabels = isExpanded || isHovered || isMobileOpen;

  const isActive = useCallback(
    (path: string) => pathname === path || pathname.startsWith(path + "/"),
    [pathname]
  );

  const isSubmenuActive = useCallback(
    (children: { path: string }[]) => children.some((child) => isActive(child.path)),
    [isActive]
  );

  const toggleSubmenu = (name: string) => {
    setOpenSubmenu((prev) => (prev === name ? null : name));
  };

  const renderMenuItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = item.path ? isActive(item.path) : hasChildren && isSubmenuActive(item.children!);
    const isOpen = openSubmenu === item.name || (hasChildren && isSubmenuActive(item.children!));

    if (hasChildren) {
      return (
        <li key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`relative flex items-center w-full gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors
              ${active
                ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              }
              ${!showLabels ? "lg:justify-center" : ""}
            `}
          >
            <span className={`shrink-0 ${active ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
              {item.icon}
            </span>
            {showLabels && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
          {/* Submenu */}
          {showLabels && (
            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: isOpen ? `${item.children!.length * 44}px` : "0px" }}
            >
              <ul className="mt-1 ml-9 space-y-1">
                {item.children!.map((child) => (
                  <li key={child.path}>
                    <Link
                      href={child.path}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors
                        ${isActive(child.path)
                          ? "text-brand-500 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/[0.08]"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-white/5"
                        }
                      `}
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Link
          href={item.path!}
          className={`relative flex items-center w-full gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors
            ${active
              ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }
            ${!showLabels ? "lg:justify-center" : ""}
          `}
        >
          <span className={`shrink-0 ${active ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
            {item.icon}
          </span>
          {showLabels && <span>{item.name}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!showLabels ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          {showLabels && (
            <span className="text-xl font-bold text-gray-800 dark:text-white">StockPulse</span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        <div>
          <h2 className={`mb-4 text-xs uppercase leading-5 text-gray-400 ${!showLabels ? "lg:text-center" : ""}`}>
            {showLabels ? "Menu" : "---"}
          </h2>
          <ul className="flex flex-col gap-1">
            {mainMenu.map(renderMenuItem)}
          </ul>
        </div>

      </nav>

      {/* Sidebar Widget (shown only when expanded) */}
      {showLabels && (
        <div className="mx-auto mb-10 mt-6 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
          <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            StockPulse Pro
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Get advanced AI predictions and real-time alerts
          </p>
          <a
            href="#"
            className="flex items-center justify-center rounded-lg bg-brand-500 p-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
          >
            Upgrade Now
          </a>
        </div>
      )}
    </aside>
  );
}
