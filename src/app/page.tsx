
import { calculosCorrientesDatosMantenimientoService } from "@/services/calculoscorrientesdatosmantenimiento.service";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

async function getMachines() {
  try {
    const response = await calculosCorrientesDatosMantenimientoService.getMachines();
    // Assuming the API returns an array of objects with a 'MAQUINA' property
    return response.data.map((item: any) => item.MAQUINA);
  } catch (error) {
    console.error("Error fetching machines:", error);
    return [];
  }
}

export default async function Home() {
  const machines = await getMachines();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center">
          <h1 className="text-xl font-bold text-slate-800">Dashboard de Mantenimiento Predictivo</h1>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 lg:p-6">
        <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-700">Seleccione una Máquina</h2>
            <p className="text-slate-500 mt-1">Haga clic en una máquina para ver el detalle de sus componentes y métricas.</p>
        </div>
        
        {machines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {machines.map((machineName: string) => (
              <Link href={`/dashboard?machine=${machineName.toLowerCase().replace(/ /g, '_')}`} key={machineName}>
                <Card className="hover:shadow-lg hover:border-primary transition-all duration-200 cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold text-slate-700 group-hover:text-primary">
                      {machineName}
                    </CardTitle>
                    <HardDrive className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-slate-500">Ver detalles del equipo</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">No se encontraron máquinas. Verifique la conexión con el servicio.</p>
          </div>
        )}
      </main>
       <footer className="bg-white border-t mt-auto">
          <div className="container mx-auto px-4 lg:px-6 h-14 flex items-center justify-center">
            <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} - Sistema Integrado de Productividad Operacional (SIPO)</p>
          </div>
      </footer>
    </div>
  );
}
