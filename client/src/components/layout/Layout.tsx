import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function LayoutInner({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[#071A2E] text-gray-100 flex">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? "md:ml-20" : "md:ml-64"}`}>
        <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
          {/* Header Section — FIEAM Banner */}
          <header className="relative flex items-center justify-between rounded-xl overflow-hidden -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-2">
            {/* Background that matches the image blue */}
            <div className="absolute inset-0 bg-[#2D8FCF]" />
            <div className="relative z-10 px-6 py-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h2>
              {subtitle && <p className="text-white/70 mt-1 text-sm">{subtitle}</p>}
            </div>
            <div className="relative z-10 flex items-center gap-3 mr-4 md:mr-8" style={{ isolation: "isolate" }}>
              <img src="/anexo/FIEAM-removebg-preview.png" alt="FIEAM" className="h-10 object-contain" />
              <img src="/anexo/SESI-removebg-preview.png" alt="SESI" className="h-10 object-contain" />
              <img src="/anexo/SENAI-removebg-preview.png" alt="SENAI" className="h-10 object-contain" />
              <img src="/anexo/IEL-removebg-preview.png" alt="IEL" className="h-10 object-contain" />
            </div>
          </header>

          {/* Main Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
