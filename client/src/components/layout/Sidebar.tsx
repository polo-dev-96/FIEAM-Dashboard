import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Search,
  Phone,
  CalendarRange,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Brain
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/protocolo", label: "Pesquisar Protocolo", icon: Search },
  { href: "/telefone", label: "Pesquisar Telefone", icon: Phone },
  { href: "/anual", label: "Dashboard - SAC", icon: CalendarRange },
  { href: "/openai", label: "Dashboard - OpenAI", icon: Brain },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { collapsed, toggle } = useSidebar();
  const { logout, canAccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 shadow-lg transition-all duration-300 ease-in-out md:translate-x-0",
          isDark ? "bg-[#0C2135] border-r border-[#165A8A]" : "bg-white border-r border-slate-200",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className={cn("p-6 border-b", isDark ? "border-[#165A8A]" : "border-slate-200")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0">
                <img src="/Icone_Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 className={cn("text-xl font-bold whitespace-nowrap", isDark ? "text-white" : "text-gray-900")}>
                    FIEAM
                  </h1>
                  <p className={cn("text-xs", isDark ? "text-sky-300/60" : "text-slate-400")}>Sistema Indústria</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Label */}
          {!collapsed && (
            <div className="px-6 pt-6 pb-2">
              <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-gray-400" : "text-slate-600")}>Dashboards</p>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn("flex-1 px-4 space-y-1 overflow-y-auto", collapsed && "px-2 pt-4")}>
            {navItems.filter((item) => canAccess(item.href)).map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block" onClick={() => setIsOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      collapsed && "justify-center px-2",
                      isActive
                        ? isDark
                          ? "bg-[#009FE3]/20 text-sky-300 border border-[#009FE3]/40"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                        : isDark
                          ? "text-gray-100 hover:bg-white/5 hover:text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive
                        ? isDark ? "text-sky-300" : "text-blue-600"
                        : isDark ? "text-gray-300" : "text-slate-500"
                    )} />
                    {!collapsed && <span className={cn("text-sm", isDark ? "font-medium" : "font-semibold")}>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle (desktop only) */}
          <div className={cn("hidden md:flex p-4 border-t justify-center", isDark ? "border-[#165A8A]" : "border-slate-200")}>
            <button
              onClick={toggle}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                isDark ? "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
              )}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Theme Toggle */}
          <div className={cn("px-4 pb-1", collapsed && "px-2")}>
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full",
                collapsed && "justify-center px-2",
                isDark
                  ? "text-gray-100 hover:bg-white/5 hover:text-yellow-400"
                  : "text-slate-700 hover:bg-slate-100 hover:text-amber-600"
              )}
              title={collapsed ? (isDark ? "Modo Claro" : "Modo Escuro") : undefined}
            >
              {isDark
                ? <Sun className="w-5 h-5 flex-shrink-0" />
                : <Moon className="w-5 h-5 flex-shrink-0" />}
              {!collapsed && (
                <span className="font-medium text-sm">
                  {isDark ? "Modo Claro" : "Modo Escuro"}
                </span>
              )}
            </button>
          </div>

          {/* Logout */}
          <div className={cn("px-4 pb-2", collapsed && "px-2")}>
            <button
              onClick={logout}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full",
                collapsed && "justify-center px-2",
                isDark
                  ? "text-gray-100 hover:bg-red-500/10 hover:text-red-400"
                  : "text-slate-700 hover:bg-red-50 hover:text-red-600"
              )}
              title={collapsed ? "Sair" : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Sair</span>}
            </button>
          </div>

          {/* Footer */}
          <div className={cn("p-4 border-t", isDark ? "border-[#165A8A]" : "border-slate-200")}>
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              isDark ? "bg-white/5" : "bg-slate-50",
              collapsed && "justify-center p-2"
            )}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              {!collapsed && <p className={cn("text-xs", isDark ? "text-gray-200" : "text-slate-600")}>Dados em tempo real</p>}
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
