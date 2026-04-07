import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function DashboardPatrocinadosPage() {
  return (
    <Layout
      title="Dashboard - Patrocinados/Campanhas"
      subtitle="Monitoramento de patrocinados e campanhas"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-[#0C2135] border-[#165A8A] shadow-lg max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Users className="w-12 h-12 text-purple-400" />
            <h2 className="text-white text-xl font-bold">Em breve</h2>
            <p className="text-gray-400 text-sm text-center">
              Esta dashboard está em construção e será disponibilizada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
