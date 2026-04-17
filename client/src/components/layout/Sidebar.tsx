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
import { useTheme } from "@/lib/ThemeContext";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard, category: "principal" },
  { href: "/protocolo", label: "Protocolo", icon: Search, category: "pesquisa" },
  { href: "/telefone", label: "Telefones", icon: Phone, category: "pesquisa" },
  { href: "/anual", label: "Dashboard Anual", icon: CalendarRange, category: "analytics" },
  { href: "/openai", label: "Monitor OpenAI", icon: Brain, category: "analytics" },
  { href: "/patrocinados", label: "Patrocinados", icon: Users, category: "analytics" },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { collapsed, toggle } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  const canAccess = (href: string) => {
    if (href === "/" || href === "/search" || href === "/phones") return true;
    return user && (user.nivel_acesso === "admin" || user.nivel_acesso === "master" || user.nivel_acesso === "gerente");
  };

  // Cores seguras sem decimais problemáticos
  const borderColor = isDark ? "rgba(0, 159, 227, 0.12)" : "rgba(226, 232, 240, 0.8)";
  const borderBottomColor = isDark ? "rgba(0, 159, 227, 0.1)" : "rgba(226, 232, 240, 0.6)";
  const accentBg = isDark ? "rgba(0, 159, 227, 0.1)" : "rgba(0, 159, 227, 0.08)";
  const accentBorder = isDark ? "rgba(0, 159, 227, 0.2)" : "rgba(0, 159, 227, 0.16)";
  const secondaryText = isDark ? "rgba(0, 159, 227, 0.6)" : "#64748B";
  const categoryText = isDark ? "rgba(255,255,255,0.35)" : "#94A3B8";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-all duration-500 ease-out md:translate-x-0",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
        style={{
          background: isDark 
            ? "linear-gradient(180deg, #0A1929 0%, #071626 100%)" 
            : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          borderRight: `1px solid ${borderColor}`,
          boxShadow: isDark 
            ? "4px 0 32px rgba(0, 0, 0, 0.4)" 
            : "4px 0 32px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div className="flex flex-col h-full">
          <div 
            className="px-5 py-6"
            style={{ borderBottom: `1px solid ${borderBottomColor}` }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ 
                  background: accentBg,
                  border: `1px solid ${accentBorder}`,
                }}
              >
                <img src="/Icone_Logo.png" alt="Logo" className="w-7 h-7 object-contain" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 
                    className="text-lg font-bold tracking-tight"
                    style={{ 
                      fontFamily: "var(--font-display)",
                      color: isDark ? "rgba(255,255,255,0.9)" : "#0F172A"
                    }}
                  >
                    FIEAM
                  </h1>
                  <p 
                    className="text-[10px] uppercase tracking-[0.12em] font-semibold"
                    style={{ color: secondaryText }}
                  >
                    Sistema Indústria
                  </p>
                </div>
              )}
            </div>
          </div>

          <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
            {!collapsed && (
              <div className="px-3 mb-2">
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: categoryText }}
                >
                  Principal
                </span>
              </div>
            )}
            
            {navItems
              .filter((item) => canAccess(item.href) && item.category === "principal")
              .map((item) => {
                const isActive = location === item.href;
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isDark={isDark}
                    collapsed={collapsed}
                    onClick={() => setIsOpen(false)}
                  />
                );
              })}

            {!collapsed && (
              <div className="px-3 mt-5 mb-2">
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: categoryText }}
                >
                  Pesquisa
                </span>
              </div>
            )}
            
            {collapsed && <div className="h-4" />}
            
            {navItems
              .filter((item) => canAccess(item.href) && item.category === "pesquisa")
              .map((item) => {
                const isActive = location === item.href;
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isDark={isDark}
                    collapsed={collapsed}
                    onClick={() => setIsOpen(false)}
                  />
                );
              })}

            {!collapsed && (
              <div className="px-3 mt-5 mb-2">
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: categoryText }}
                >
                  Analytics
                </span>
              </div>
            )}
            
            {collapsed && <div className="h-4" />}
            
            {navItems
              .filter((item) => canAccess(item.href) && item.category === "analytics")
              .map((item) => {
                const isActive = location === item.href;
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isDark={isDark}
                    collapsed={collapsed}
                    onClick={() => setIsOpen(false)}
                  />
                );
              })}
          </nav>

          <div 
            className={cn("p-3", collapsed ? "px-2" : "px-3")}
            style={{ borderTop: `1px solid ${borderBottomColor}` }}
          >
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-3 rounded-xl transition-all duration-300 w-full group",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2.5"
              )}
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
              }}
              title={collapsed ? (isDark ? "Modo Claro" : "Modo Escuro") : undefined}
            >
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
                style={{
                  background: isDark ? "rgba(245, 183, 0, 0.08)" : "rgba(217, 119, 6, 0.08)",
                }}
              >
                {isDark
                  ? <Sun className="w-[18px] h-[18px] text-[#F5B700]" />
                  : <Moon className="w-[18px] h-[18px] text-[#D97706]" />
                }
              </div>
              {!collapsed && <span className="text-[13px] font-medium">{isDark ? "Claro" : "Escuro"}</span>}
            </button>

            <button
              onClick={logout}
              className={cn(
                "flex items-center gap-3 mt-1 rounded-xl transition-all duration-300 w-full group",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2.5"
              )}
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "#64748B",
              }}
              title={collapsed ? "Sair" : undefined}
            >
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
                style={{
                  background: isDark ? "rgba(232, 93, 117, 0.08)" : "rgba(220, 38, 38, 0.06)",
                }}
              >
                <LogOut className="w-[18px] h-[18px]" />
              </div>
              {!collapsed && <span className="text-[13px] font-medium">Sair</span>}
            </button>

            <div className="hidden md:flex justify-center mt-3">
              <button
                onClick={toggle}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200"
                style={{
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(241, 245, 249, 0.8)",
                  color: isDark ? "rgba(255,255,255,0.4)" : "#94A3B8",
                }}
                title={collapsed ? "Expandir" : "Recolher"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div 
            className={cn("px-3 py-2", collapsed ? "px-2" : "px-3")}
            style={{ borderTop: `1px solid ${borderBottomColor}` }}
          >
            <div className={cn(
              "flex items-center gap-2",
              collapsed ? "justify-center" : ""
            )}>
              <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping bg-emerald-500 opacity-50" />
              </div>
              {!collapsed && (
                <span className="text-[11px] text-emerald-500 font-medium">
                  Sistema Online
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function NavItem({ 
  item, 
  isActive, 
  isDark, 
  collapsed, 
  onClick 
}: { 
  item: typeof navItems[0]; 
  isActive: boolean; 
  isDark: boolean; 
  collapsed: boolean;
  onClick: () => void;
}) {
  const activeBg = isDark 
    ? "linear-gradient(135deg, rgba(0, 159, 227, 0.15) 0%, rgba(0, 159, 227, 0.05) 100%)" 
    : "linear-gradient(135deg, rgba(0, 159, 227, 0.1) 0%, rgba(0, 159, 227, 0.02) 100%)";
  
  const activeBorder = isDark 
    ? "1px solid rgba(0, 159, 227, 0.25)" 
    : "1px solid rgba(0, 159, 227, 0.2)";

  return (
    <Link href={item.href} className="block mb-0.5" onClick={onClick}>
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-xl transition-all duration-300 group",
          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
        )}
        style={{
          background: isActive ? activeBg : "transparent",
          border: isActive ? activeBorder : "1px solid transparent",
          color: isActive
            ? (isDark ? "#009FE3" : "#0077CC")
            : (isDark ? "rgba(255,255,255,0.55)" : "#64748B"),
        }}
        title={collapsed ? item.label : undefined}
      >
        {isActive && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full"
            style={{ 
              height: collapsed ? "16px" : "20px",
              background: "#009FE3",
              boxShadow: "0 0 8px rgba(0, 159, 227, 0.5)",
            }}
          />
        )}
        
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors"
          style={{
            background: isActive
              ? (isDark ? "rgba(0, 159, 227, 0.12)" : "rgba(0, 159, 227, 0.1)")
              : (isDark ? "rgba(255,255,255,0.03)" : "rgba(241, 245, 249, 0.5)"),
          }}
        >
          <item.icon 
            className="w-[18px] h-[18px]"
            style={{
              color: isActive
                ? "#009FE3"
                : (isDark ? "rgba(255,255,255,0.5)" : "#94A3B8"),
            }}
          />
        </div>
        
        {!collapsed && (
          <span 
            className="text-[13px] font-medium"
            style={{ 
              fontWeight: isActive ? 600 : 500,
              letterSpacing: isActive ? "0.01em" : "0",
            }}
          >
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}
