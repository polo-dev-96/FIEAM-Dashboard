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
  Brain,
  Users
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
  { href: "/patrocinados", label: "Dashboard - Patrocinados", icon: Users },
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
          "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out md:translate-x-0 border-r",
          isDark
            ? "bg-[#0A1929] border-ds-default"
            : "bg-white border-ds-default shadow-sm",
          collapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="px-5 py-4 border-b border-ds-subtle">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 flex-shrink-0 rounded-lg p-1.5",
                isDark ? "bg-[#009FE3]/10" : "bg-blue-50"
              )}>
                <img src="/Icone_Logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-base font-bold whitespace-nowrap tracking-tight text-ds-primary">
                    FIEAM
                  </h1>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-ds-tertiary">Sistema Indústria</p>
                </div>
              )}
            </div>
          </div>

          {/* Section Label */}
          {!collapsed && (
            <div className="px-5 pt-5 pb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ds-tertiary">Navegação</p>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn("flex-1 px-3 space-y-0.5 overflow-y-auto", collapsed && "px-2 pt-4")}>
            {navItems.filter((item) => canAccess(item.href)).map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block" onClick={() => setIsOpen(false)}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                      collapsed && "justify-center px-2",
                      isActive
                        ? isDark
                          ? "bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]"
                          : "bg-[var(--ds-accent-muted)] text-[var(--ds-accent)]"
                        : "text-ds-secondary hover:bg-[var(--ds-accent-muted)] hover:text-ds-primary"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full bg-[var(--ds-accent)]",
                        collapsed ? "h-4" : "h-5"
                      )} />
                    )}
                    <item.icon className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isActive
                        ? "text-[var(--ds-accent)]"
                        : "text-ds-tertiary group-hover:text-ds-secondary"
                    )} strokeWidth={1.75} />
                    {!collapsed && <span className={cn("text-[13px]", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-ds-subtle">
            {/* Collapse Toggle (desktop only) */}
            <div className={cn("hidden md:flex px-3 pt-2 justify-center", collapsed && "px-2")}>
              <button
                onClick={toggle}
                className="flex items-center justify-center w-7 h-7 rounded-md transition-colors text-ds-tertiary hover:text-ds-secondary hover:bg-[var(--ds-accent-muted)]"
                title={collapsed ? "Expandir" : "Recolher"}
              >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Theme Toggle */}
            <div className={cn("px-3 pt-1", collapsed && "px-2")}>
              <button
                onClick={toggleTheme}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 w-full group text-ds-tertiary hover:text-ds-secondary hover:bg-[var(--ds-accent-muted)]",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? (isDark ? "Modo Claro" : "Modo Escuro") : undefined}
              >
                {isDark
                  ? <Sun className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  : <Moon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
                {!collapsed && (
                  <span className="text-[13px] font-medium">
                    {isDark ? "Modo Claro" : "Modo Escuro"}
                  </span>
                )}
              </button>
            </div>

            {/* Logout */}
            <div className={cn("px-3 pt-0.5 pb-2", collapsed && "px-2")}>
              <button
                onClick={logout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 w-full group text-ds-tertiary hover:text-rose-500 hover:bg-rose-500/8",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? "Sair" : undefined}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="text-[13px] font-medium">Sair</span>}
              </button>
            </div>

            {/* Status Footer */}
            <div className="px-3 pb-3 pt-1">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border border-ds-subtle",
                collapsed && "justify-center px-2"
              )}>
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                {!collapsed && <p className="text-[10px] font-medium text-ds-tertiary">Tempo real</p>}
              </div>
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
