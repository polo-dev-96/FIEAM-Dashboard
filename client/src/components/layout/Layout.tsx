import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";

function LayoutInner({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { collapsed } = useSidebar();
  const { isDark } = useTheme();

  return (
    <div 
      className={cn(
        "min-h-screen flex transition-colors duration-500",
        isDark 
          ? "bg-[#071A2E] text-white" 
          : "bg-[#F8FAFC] text-slate-900"
      )}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <Sidebar />
      <main 
        className={cn(
          "flex-1 transition-all duration-500 ease-out",
          collapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        <div className="p-6 md:p-10 space-y-8 max-w-[1680px] mx-auto">
          {/* ═══════════════════════════════════════════════════════════════
             HEADER EXECUTIVO PREMIUM
             ═══════════════════════════════════════════════════════════════ */}
          <header 
            className={cn(
              "relative flex items-center justify-between rounded-2xl overflow-hidden",
              "min-h-[84px] shadow-xl"
            )}
          >
            {/* Layer 1: Base Gradient */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #1a6fb5 0%, #2D8FCF 50%, #009FE3 100%)',
              }}
            />
            
            {/* Layer 2: Subtle Noise Texture */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Layer 3: Glass Highlight Top */}
            <div 
              className="absolute inset-x-0 top-0 h-1/2"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, transparent 100%)',
              }}
            />
            
            {/* Layer 4: Subtle Glow */}
            <div 
              className="absolute inset-0"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            />

            {/* Content: Title Section */}
            <div className="relative z-10 px-8 md:px-10 py-5 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-white/40" />
                <div>
                  <h1 
                    className="text-2xl md:text-3xl font-bold tracking-tight text-white"
                    style={{ 
                      fontFamily: 'var(--font-display)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-white/70 mt-1 text-sm font-medium tracking-wide">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative z-10 w-px h-12 bg-white/20 hidden md:block" />

            {/* Content: Brand Logos */}
            <div 
              className="relative z-10 flex items-center gap-5 mr-8 md:mr-10"
              style={{ isolation: "isolate" }}
            >
              <img 
                src="/anexo/FIEAM-removebg-preview.png" 
                alt="FIEAM" 
                className="h-11 object-contain opacity-95 hover:opacity-100 transition-opacity"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
              />
              <img 
                src="/anexo/SESI-removebg-preview.png" 
                alt="SESI" 
                className="h-11 object-contain opacity-95 hover:opacity-100 transition-opacity"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
              />
              <img 
                src="/anexo/SENAI-removebg-preview.png" 
                alt="SENAI" 
                className="h-11 object-contain opacity-95 hover:opacity-100 transition-opacity"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
              />
              <img 
                src="/anexo/IEL-removebg-preview.png" 
                alt="IEL" 
                className="h-11 object-contain opacity-95 hover:opacity-100 transition-opacity"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
              />
            </div>
          </header>

          {/* ═══════════════════════════════════════════════════════════════
             MAIN CONTENT AREA
             ═══════════════════════════════════════════════════════════════ */}
          <div 
            className="animate-enter"
            style={{ animationDelay: '0.1s' }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function Layout({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <SidebarProvider>
      <LayoutInner title={title} subtitle={subtitle}>
        {children}
      </LayoutInner>
    </SidebarProvider>
  );
}
