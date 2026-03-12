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
  LogOut
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/protocolo", label: "Pesquisar Protocolo", icon: Search },
  { href: "/telefone", label: "Pesquisar Telefone", icon: Phone },
  { href: "/anual", label: "Dashboard Anual", icon: CalendarRange },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { collapsed, toggle } = useSidebar();
  const { logout } = useAuth();

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
          "fixed inset-y-0 left-0 z-40 bg-[#0C2135] border-r border-[#165A8A] shadow-lg transition-all duration-300 ease-in-out md:translate-x-0",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-6 border-b border-[#165A8A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0">
                <img src="/Icone_Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-xl font-bold text-white whitespace-nowrap">
                    FIEAM
                  </h1>
                  <p className="text-xs text-sky-300/60">Sistema Indústria</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Label */}
          {!collapsed && (
            <div className="px-6 pt-6 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dashboards</p>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn("flex-1 px-4 space-y-1 overflow-y-auto", collapsed && "px-2 pt-4")}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block" onClick={() => setIsOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-[#009FE3]/20 text-sky-300 border border-[#009FE3]/40"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-sky-300" : "text-gray-500")} />
                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle (desktop only) */}
          <div className="hidden md:flex p-4 border-t border-[#165A8A] justify-center">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Logout */}
          <div className={cn("px-4 pb-2", collapsed && "px-2")}>
            <button
              onClick={logout}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-gray-400 hover:bg-red-500/10 hover:text-red-400",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Sair" : undefined}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Sair</span>}
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#165A8A]">
            <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-white/5", collapsed && "justify-center p-2")}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              {!collapsed && <p className="text-xs text-gray-400">Dados em tempo real</p>}
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
