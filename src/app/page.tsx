"use client";
import { useEffect, useState } from "react";
function NoProfileToast() {
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("showNoProfileToast") === "1") {
      toast({
        title: "Error Login",
        description: 'No tienes perfiles asignados para esta aplicación.',
        variant: "destructive",
      });
      sessionStorage.removeItem("showNoProfileToast");
    }
  }, []);
  return null;
}
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { useRouter } from "next/navigation";
import { ScanFace } from "lucide-react";
import { X as XIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  // Declarar hooks solo una vez
  const router = useRouter();
  const [codigoEmpleado, setCodigoEmpleado] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [hasCamera, setHasCamera] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState("");
  const [counter, setCounter] = React.useState(3);
  const [videoReady, setVideoReady] = React.useState(false);
  const [showTurnoModal, setShowTurnoModal] = React.useState(false);
  const [turno, setTurno] = React.useState<"diurno" | "nocturno" | null>(null);

  // Calcular progreso para el spinner circular exterior
  const progress = counter > 0 ? ((3 - counter) / 3) * 100 : 100;

  // Color fijo azul para el progreso
  const progressColor = "#0055b8";

  // Abrir cámara cuando el modal se muestra
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (modalOpen) {
      setVideoReady(false);
      interval = setInterval(() => {
        if (videoRef.current) {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
              .getUserMedia({ video: true })
              .then((stream) => {
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  // Esperar a que el video esté listo
                  videoRef.current.onloadedmetadata = () => {
                    setVideoReady(true);
                  };
                }
                clearInterval(interval);
              })
              .catch(() => {
                //setError("No se pudo acceder a la cámara.");
                clearInterval(interval);
              });
          } else {
            setError("Este navegador no soporta acceso a la cámara.");
            clearInterval(interval);
          }
        }
      }, 100);
      return () => {
        clearInterval(interval);
      };
    }
  }, [modalOpen]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (videoReady && modalOpen) {
      setCounter(3);
      timer = setInterval(() => {
        setCounter((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(timer);
          handleTakePhoto();
          return 0;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [videoReady, modalOpen]);

  React.useEffect(() => {
    // Detectar si hay cámara disponible
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false));
  }, []);

  const handleScanFace = async () => {
    if (!codigoEmpleado) {
      toast({
        title: "Advertencia",
        description: (
          <div className="flex items-center gap-2">
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH + '/img/Chaide.svg' : '/img/Chaide.svg'}`} alt="Chaide Logo" className="w-6 h-6" />
            <span>Ingrese su Código de Empleado</span>
          </div>
        ),
        variant: "default",
      });
      return;
    }
    // Guardar el código en sessionStorage al abrir el modal
    sessionStorage.setItem("usuario_codigo", codigoEmpleado);
    setModalOpen(true);
    setError("");
  };

  const handleTakePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          setLoading(true);
          let shouldCloseModal = true;
          let respuesta;
          try {
            // Importar servicios dinámicamente para SSR
            const { authUsersService } = await import(
              "@/services/authUsers.service"
            );
            const { menuService } = await import("@/services/menu.service");
            const res = (respuesta = await authUsersService.getAuthUser(
              codigoEmpleado,
              blob
            ));
            // Permitir objeto o array
            const userData = Array.isArray(res.data) ? res.data[0] : res.data;
            if (res.success && userData && userData.CODIGO) {
              //console.log("Usuario autenticado:", userData);
              // Guardar datos en sessionStorage
              sessionStorage.setItem("usuario_nombre", userData.NOMBRE);
              sessionStorage.setItem("usuario_codigo", userData.CODIGO);
              sessionStorage.setItem(
                "usuario_departamento",
                userData.DEPARTAMENTO
              );
              sessionStorage.setItem(
                "usuario_grupo_departamento",
                userData.GRUPO_DEPARTAMENTO
              );
              sessionStorage.setItem("usuario_localidad", userData.LOCALIDAD);
              // Establecer timestamp de actividad inicial
              sessionStorage.setItem("lastActivity", Date.now().toString());
    

              // Recuperar menú
              //await menuService.getMenuCodigoAplicacion(userData.CODIGO, environment.nombreAplicacion);
              // Redirigir al dashboard
              router.push(`/dashboard`);
            } else {
              // Mostrar toast rojo con el mensaje de error del backend
              //console.log("Error de autenticación:", res);
              toast({
                title: "Error de autenticación",
                description: res.error || "No se pudo identificar al usuario",
                variant: "destructive",
              });
              // Mantener el modal abierto para reintentar
              shouldCloseModal = true;
              setLoading(false);
              return;
            }
          } catch (e: any) {
            // Imprime el mensaje real del backend si existe
            const backendMsg =
              `No se pudo identificar al usuario (${codigoEmpleado})`;
            if (e?.response?.status === 403) {
              toast({
                title: "Error en la Autenticación",
                description: backendMsg,
                variant: "destructive",
              });
              return;
            }
            setError(backendMsg);
          } finally {
            setLoading(false);
            if (shouldCloseModal) {
              setModalOpen(false);
              // Detener la cámara
              if (video.srcObject) {
                (video.srcObject as MediaStream)
                  .getTracks()
                  .forEach((track) => track.stop());
              }
            }
          }
        }
      }, "image/jpeg");
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  return (
    <>
      <NoProfileToast />
      <div className="flex min-h-screen w-full">
  <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-10 text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH + '/img/logo_chaide.svg' : '/img/logo_chaide.svg'}`}
          alt="Chaide Logo"
          width={300}
          height={300}
          priority
        />
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center items-center gap-4">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH + '/img/Chaide.svg' : '/img/Chaide.svg'}`}
                alt="Chaide App Icon"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <CardTitle className="text-2xl font-headline">
                Módulo de Mantenimiento Predictivo
              </CardTitle>
            </div>
            <CardDescription>Inicio de Sesión</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 pt-4">
              <div className="grid gap-2 text-left">
                <Label htmlFor="codigo">Código Empleado</Label>
                <Input
                  id="codigo"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ingrese su código de empleado"
                  value={codigoEmpleado}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setCodigoEmpleado(value);
                  }}
                  required
                />
              </div>
              <button
                className={`w-full flex items-center justify-center gap-2 py-2 rounded ${
                  hasCamera
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 cursor-not-allowed"
                }`}
                disabled={!hasCamera || loading}
                onClick={handleScanFace}
                type="button"
              >
                {/* Ludice React ScanFace icon (puedes cambiar por el icono real si lo tienes) */}
                <ScanFace size={32} color="#fff" />
              </button>
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
            </div>
            {/* Modal flotante para la cámara */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                {loading ? (
                  <div
                    className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center relative"
                    style={{
                      width: "55vw",
                      height: "55vh",
                      maxWidth: "95vw",
                      maxHeight: "95vh",
                      minWidth: "300px",
                      minHeight: "300px",
                      overflow: "hidden",
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className="relative flex items-center justify-center mb-4">
                        <img
                          src={`${process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH + '/img/Chaide.svg' : '/img/Chaide.svg'}`}
                          alt="Chaide Logo"
                          className="w-20 h-20"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="animate-spin rounded-full border-4 border-blue-400 border-t-transparent w-24 h-24"></span>
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-blue-700">
                        Verificando identidad...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center relative"
                    style={{
                      width: "55vw",
                      height: "55vh",
                      maxWidth: "95vw",
                      maxHeight: "95vh",
                      minWidth: "300px",
                      minHeight: "300px",
                      overflow: "hidden",
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="absolute top-0 left-0 w-full h-full object-cover rounded"
                      style={{ zIndex: 1, transform: "scaleX(-1)" }}
                    />
                    {/* Logo Chaide en esquina superior izquierda */}
                    <div
                      className="absolute top-4 left-4"
                      style={{ zIndex: 10 }}
                    >
                      <img
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH + '/img/Chaide.svg' : '/img/Chaide.svg'}`}
                        alt="Chaide Logo"
                        style={{ width: 48, height: 48 }}
                      />
                    </div>
                    {/* Botón cancelar en esquina superior derecha */}
                    <div
                      className="absolute top-4 right-4 flex items-center justify-center"
                      style={{ zIndex: 10 }}
                    >
                      <div
                        className="w-12 h-12 flex items-center justify-center rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.6)",
                          backdropFilter: "blur(6px)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          cursor: "pointer",
                        }}
                        onClick={handleCloseModal}
                      >
                        <XIcon size={28} color="#333" />
                      </div>
                    </div>
                    {/* Círculo guía con animación de progreso */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "290px",
                        height: "290px",
                        zIndex: 3,
                      }}
                    >
                      <svg width="290" height="290" viewBox="0 0 290 290">
                        <circle
                          cx="145"
                          cy="145"
                          r="135"
                          stroke="#fff"
                          strokeWidth="8"
                          fill="none"
                          opacity="0.8"
                        />
                        <circle
                          cx="145"
                          cy="145"
                          r="135"
                          stroke={progressColor}
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 135}
                          strokeDashoffset={
                            2 * Math.PI * 135 * (1 - progress / 100)
                          }
                          style={{
                            transition: "stroke-dashoffset 1s linear",
                            filter: `drop-shadow(0 0 8px ${progressColor})`,
                          }}
                        />
                      </svg>
                    </div>
                    {/* Contador regresivo: centro del círculo en móvil, debajo en desktop */}
                    {videoReady &&
                      (typeof window !== "undefined" &&
                      window.innerWidth < 768 ? (
                        <div
                          className="absolute left-1/2"
                          style={{
                            bottom: "18px",
                            transform: "translateX(-50%)",
                            zIndex: 4,
                            width: "220px",
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            className="text-3xl font-extrabold px-6 py-2 rounded-full shadow"
                            style={{
                              background: "rgba(0, 85, 184, 0.85)",
                              color: "#fff",
                              letterSpacing: "1px",
                              textShadow: "0 1px 4px rgba(0,0,0,0.18)",
                            }}
                          >
                            {counter > 0 ? `${counter}s` : "¡Listo!"}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="absolute left-1/2"
                          style={{
                            top: "calc(50% + 150px)",
                            transform: "translateX(-50%)",
                            zIndex: 4,
                          }}
                        >
                          <span
                            className="text-2xl font-bold px-6 py-2 rounded-lg shadow"
                            style={{
                              background: "rgba(0, 85, 184, 0.85)",
                              color: "#fff",
                              letterSpacing: "0.5px",
                              textShadow: "0 1px 4px rgba(0,0,0,0.18)",
                            }}
                          >
                            {counter > 0
                              ? `Foto en ${counter}s`
                              : "Procesando..."}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            {/* Contador debajo del círculo en móvil */}
            {/* El contador móvil ahora está centrado en el círculo, no debajo */}
            {/* Modal para seleccionar turno de producción */}
            {showTurnoModal && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
                <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center gap-6 min-w-[320px] max-w-[90vw]">
                  <h2 className="text-xl font-bold mb-2">
                    Selecciona tu jornada
                  </h2>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Eres usuario de producción. Por favor selecciona tu jornada
                    de trabajo:
                  </p>
                  <div className="flex flex-col gap-4 w-full">
                    <label className="flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="turno"
                        value="diurno"
                        checked={turno === "diurno"}
                        onChange={() => setTurno("diurno")}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        {/* Icono sol */}
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                        >
                          <circle cx="16" cy="16" r="6" fill="#FFD700" />
                          <g
                            stroke="#FFD700"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          >
                            <line x1="16" y1="3" x2="16" y2="6" />
                            <line x1="16" y1="26" x2="16" y2="29" />
                            <line x1="3" y1="16" x2="6" y2="16" />
                            <line x1="26" y1="16" x2="29" y2="16" />
                            <line x1="6.34" y1="6.34" x2="8.46" y2="8.46" />
                            <line x1="23.54" y1="23.54" x2="25.66" y2="25.66" />
                            <line x1="6.34" y1="25.66" x2="8.46" y2="23.54" />
                            <line x1="23.54" y1="8.46" x2="25.66" y2="6.34" />
                          </g>
                        </svg>
                        <span className="text-base font-medium">
                          Jornada Diurna
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="turno"
                        value="nocturno"
                        checked={turno === "nocturno"}
                        onChange={() => setTurno("nocturno")}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        {/* Icono luna */}
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                        >
                          <path
                            d="M22 16c0 4.418-3.582 8-8 8a8 8 0 0 1 0-16c.34 0 .677.02 1.01.06A10 10 0 1 0 22 16Z"
                            fill="#4A5568"
                          />
                          <circle cx="24" cy="10" r="1.5" fill="#4A5568" />
                          <circle cx="26" cy="12" r="0.8" fill="#4A5568" />
                        </svg>
                        <span className="text-base font-medium">
                          Jornada Nocturna
                        </span>
                      </div>
                    </label>
                  </div>
                  <button
                    className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    disabled={!turno}
                    onClick={() => {
                      if (turno) {
                        // Guardar turno en sessionStorage
                        sessionStorage.setItem("usuario_turno", turno);
                        // Actualizar timestamp de actividad
                        sessionStorage.setItem(
                          "lastActivity",
                          Date.now().toString()
                        );
                        setShowTurnoModal(false);
                        // Redirigir al dashboard
                        router.push(`/dashboard/reservar-actualizar`);
                      }
                    }}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
