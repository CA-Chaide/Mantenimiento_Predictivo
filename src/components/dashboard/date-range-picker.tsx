
"use client";

import * as React from "react";
import { format, startOfMonth, subMonths, max, startOfYear, differenceInDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  initialDate?: DateRange;
}

const formatInTimeZone = (date: Date, formatString: string, timeZone: string) => {
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, formatString, { locale: es });
}

export function DateRangePicker({ className, initialDate }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);
  const [isClient, setIsClient] = React.useState(false);
  const [timeZone, setTimeZone] = React.useState('UTC');
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const yesterday = subDays(new Date(), 1);
  const sinceStartDate = new Date('2024-01-01T00:00:00Z');

  React.useEffect(() => {
      setDate(initialDate);
  }, [initialDate]);
  
  React.useEffect(() => {
    setIsClient(true);
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const updateURL = (range: DateRange | undefined) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (range?.from) {
      newParams.set("from", format(range.from, "yyyy-MM-dd"));
      const toDate = range.to || range.from;
      newParams.set("to", format(toDate, "yyyy-MM-dd"));
    } else {
        newParams.delete("from");
        newParams.delete("to");
    }
    router.push(`${pathname}?${newParams.toString()}`);
  }

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    // Only update URL when a complete range is selected
    if (range?.from && range?.to) {
        updateURL(range);
        setPopoverOpen(false); // Close popover after selection
    }
  };

  const handlePreset = (preset: 'thisMonth' | 'last3Months' | 'thisYear' | 'sinceStart') => {
    const today = new Date();
    let from: Date;
    const to = today;

    switch (preset) {
        case 'thisMonth':
            from = startOfMonth(today);
            break;
        case 'last3Months':
            from = subMonths(today, 3);
            break;
        case 'thisYear':
            from = startOfYear(today);
            break;
        case 'sinceStart':
            from = sinceStartDate;
            break;
    }
    // Ensure the preset range does not go into the future
    const newRange = { from, to: max([from, to]) > yesterday ? yesterday : to };
    setDate(newRange);
    updateURL(newRange);
    setPopoverOpen(false);
  }

  const handleClear = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("from");
    newParams.delete("to");
    router.push(`${pathname}?${newParams.toString()}`);
    setPopoverOpen(false);
  }

  const selectedDays = date?.from && date?.to ? differenceInDays(date.to, date.from) + 1 : 0;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-white" />
            {isClient && date?.from ? (
              date.to && date.from.getTime() !== date.to.getTime() ? (
                <>
                  {formatInTimeZone(date.from, "dd MMM yyyy", timeZone)} - {formatInTimeZone(date.to, "dd MMM yyyy", timeZone)}
                </>
              ) : (
                formatInTimeZone(date.from, "dd MMM yyyy", timeZone)
              )
            ) : (
              <span>Seleccione un rango</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="start">
            <div className="flex flex-col justify-between p-2 border-r h-full">
                <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Atajos</div>
                    <div className="flex flex-col gap-1">
                        <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => handlePreset('thisMonth')}>Este Mes</Button>
                        <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => handlePreset('last3Months')}>Últimos 3 Meses</Button>
                        <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => handlePreset('thisYear')}>Este Año</Button>
                        <Button variant="ghost" className="justify-start text-sm h-8" onClick={() => handlePreset('sinceStart')}>Desde Inicio</Button>
                    </div>
                </div>
                <div>
                    <Separator className="my-2" />
                    <Button variant="ghost" className="justify-start text-sm h-8 w-full text-slate-600 hover:text-slate-700" onClick={handleClear}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restablecer
                    </Button>
                </div>
            </div>
            <div>
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from || subDays(new Date(), 30)}
                    selected={date}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                    toDate={new Date()}
                    locale={es}
                    classNames={{
                        day_range_start: "day-range-start",
                        day_range_end: "day-range-end",
                        day_range_middle: "day-range-middle"
                    }}
                    disabled={{ after: new Date() }}
                />
                <div className="border-t text-center text-xs text-slate-500 py-2">
                    {selectedDays > 0 ? `Periodo seleccionado: ${selectedDays} días` : 'Seleccione un rango de fechas'}
                </div>
            </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
