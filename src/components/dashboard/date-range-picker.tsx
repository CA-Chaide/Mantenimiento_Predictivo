"use client";

import * as React from "react";
import { format } from "date-fns";
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
  return format(zonedDate, formatString);
}

export function DateRangePicker({ className, initialDate }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);
  const [isClient, setIsClient] = React.useState(false);
  const [timeZone, setTimeZone] = React.useState('UTC');

  React.useEffect(() => {
      setDate(initialDate);
  }, [initialDate]);
  
  React.useEffect(() => {
    setIsClient(true);
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("from", format(range.from, "yyyy-MM-dd"));
      const toDate = range.to || range.from;
      newParams.set("to", format(toDate, "yyyy-MM-dd"));
      router.push(`${pathname}?${newParams.toString()}`);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {isClient && date?.from ? (
              date.to && date.from.getTime() !== date.to.getTime() ? (
                <>
                  {formatInTimeZone(date.from, "LLL dd, y", timeZone)} - {formatInTimeZone(date.to, "LLL dd, y", timeZone)}
                </>
              ) : (
                formatInTimeZone(date.from, "LLL dd, y", timeZone)
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date('2025-11-01T00:00:00Z')}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            fromDate={new Date('2025-04-01T00:00:00Z')} // Min date April 2025
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
