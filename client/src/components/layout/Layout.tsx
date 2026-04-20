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
    <div className={cn("min-h-screen flex transition-theme", isDark ? "bg-ds-primary text-ds-primary" : "bg-ds-primary text-ds-primary")}>
      <Sidebar />
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "md:ml-20" : "md:ml-64")}>
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
          {/* Header — Enterprise Banner */}
          <header className="relative flex items-center justify-between rounded-xl overflow-hidden -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 mb-1 min-h-[64px]">
            {/* Gradient background — deep institutional blue */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D3B66] via-[#1A6FB5] to-[#0D3B66]" />
            {/* Subtle dot pattern */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 0.5px, transparent 0.5px)`,
              backgroundSize: '24px 24px',
            }} />
            {/* Top edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-white/15" />

            <div className="relative z-10 px-6 md:px-8 py-3.5">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h2>
              {subtitle && <p className="text-white/50 mt-0.5 text-xs font-medium tracking-wide">{subtitle}</p>}
            </div>

            <div className="relative z-10 hidden md:flex items-center gap-5 mr-6 md:mr-8">
              <div className="w-px h-8 bg-white/15" />
              <img src="/anexo/FIEAM-removebg-preview.png" alt="FIEAM" className="h-8 object-contain opacity-90" />
              <img src="/anexo/SESI-removebg-preview.png" alt="SESI" className="h-8 object-contain opacity-90" />
              <img src="/anexo/SENAI-removebg-preview.png" alt="SENAI" className="h-8 object-contain opacity-90" />
              <img src="/anexo/IEL-removebg-preview.png" alt="IEL" className="h-8 object-contain opacity-90" />
            </div>
          </header>

          {/* Main Content */}
          <div className="animate-in">
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
