"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar-new';

export function SidebarLogo() {
  const { isCollapsed } = useSidebar();
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-2 py-4 cursor-pointer group">
      <div className="flex-shrink-0">
        {isCollapsed ? (
          <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/img/chaide.svg`} alt="Chaide" width={32} height={32} />
        ) : (
          <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/img/logo_chaide.svg`} alt="Certificados Calidad" width={180} height={128} />
        )}
      </div>
      {/* {!isCollapsed && (
        <span className="font-semibold text-lg whitespace-nowrap">Certificados Calidad</span>
      )} */}
    </Link>
  );
}
