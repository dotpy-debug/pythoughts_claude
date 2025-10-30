import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date | undefined) => boolean;
  mode?: 'single' | 'multiple' | 'range';
  initialFocus?: boolean;
}

export function Calendar({ selected, onSelect, className, disabled, mode: _mode, initialFocus: _initialFocus }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (disabled && disabled(newDate)) return;
    onSelect?.(newDate);
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return (
      selected.getDate() === day &&
      selected.getMonth() === currentMonth.getMonth() &&
      selected.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const isDisabled = disabled && disabled(date);

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => handleDateClick(day)}
        disabled={isDisabled}
        className={cn(
          "h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
          isSelected(day) && "bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 hover:bg-gray-900 dark:hover:bg-gray-50",
          isToday(day) && !isSelected(day) && "border border-gray-900 dark:border-gray-50",
          isDisabled && "text-gray-400 dark:text-gray-600 cursor-not-allowed hover:bg-transparent"
        )}
      >
        {day}
      </button>
    );
  }

  return (
    <div className={cn("p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md", className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={previousMonth}
          className="h-7 w-7 bg-transparent p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </button>
        <div className="text-sm font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="h-7 w-7 bg-transparent p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="h-9 w-9 text-center text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}
