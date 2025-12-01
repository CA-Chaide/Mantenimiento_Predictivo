"use client";

import * as React from "react";
import { format } from "date-fns";
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

export function DateRangePicker({ className, initialDate }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);

  // When initialDate changes (e.g. on navigation), update the client state
  React.useEffect(() => {
      setDate(initialDate);
  }, [initialDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("from", format(range.from, "yyyy-MM-dd"));
      // If only `from` is selected, we can default `to` to the end of that month or just from
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
            {date?.from ? (
              date.to && date.from.getTime() !== date.to.getTime() ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
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
