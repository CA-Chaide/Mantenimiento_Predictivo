import Image from 'next/image';

export default function AuthCheckingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-white/30 animate-glass-fade">
      <div className="flex flex-col items-center gap-6">
        <Image src="/img/Chaide.svg" alt="Chaide Logo" width={60} height={40} priority />
  <span className="text-[11px] font-bold text-gray-500/80 drop-shadow-lg">Comprobando...</span>
      </div>
    </div>
  );
}
