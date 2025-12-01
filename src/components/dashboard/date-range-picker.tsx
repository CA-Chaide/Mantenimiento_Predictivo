"use client";

import * as React from "react";
import { format, startOfMonth, subMonths, max } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  const minDate = new Date('2025-04-10T00:00:00Z');

  React.useEffect(() => {
      setDate(initialDate);
  }, [initialDate]);
  
  React.useEffect(() => {
    setIsClient(true);
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const updateURL = (range: DateRange) => {
    if (range?.from) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("from", format(range.from, "yyyy-MM-dd"));
      const toDate = range.to || range.from;
      newParams.set("to", format(toDate, "yyyy-MM-dd"));
      router.push(`${pathname}?${newParams.toString()}`);
    }
  }

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
        updateURL(range);
        setPopoverOpen(false);
    } else if (!range?.to) {
      // Still selecting end date, don't close
    } else {
      setPopoverOpen(false);
    }
  };

  const handlePreset = (preset: 'thisMonth' | 'last3Months' | 'sinceStart') => {
    const simulatedToday = new Date('2025-11-15T00:00:00Z');
    let from: Date;
    const to = simulatedToday;

    switch (preset) {
        case 'thisMonth':
            from = max([startOfMonth(simulatedToday), minDate]);
            break;
        case 'last3Months':
            from = max([subMonths(simulatedToday, 3), minDate]);
            break;
        case 'sinceStart':
            from = minDate;
            break;
    }
    const newRange = { from, to };
    setDate(newRange);
    updateURL(newRange);
    setPopoverOpen(false);
  }

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
            <div className="flex flex-col gap-1 p-2 border-r">
                <Button variant="ghost" className="justify-start text-sm" onClick={() => handlePreset('thisMonth')}>Este Mes</Button>
                <Button variant="ghost" className="justify-start text-sm" onClick={() => handlePreset('last3Months')}>Últimos 3 Meses</Button>
                <Button variant="ghost" className="justify-start text-sm" onClick={() => handlePreset('sinceStart')}>Desde Inicio</Button>
            </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date('2025-11-01T00:00:00Z')}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            fromDate={minDate}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
