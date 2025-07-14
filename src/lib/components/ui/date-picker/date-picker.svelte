<script lang="ts">
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import {
    DateFormatter,
    type DateValue,
    getLocalTimeZone,
    CalendarDate
  } from "@internationalized/date";
  import { cn } from "$lib/utils.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
 
  let { value = $bindable(), placeholder = 'Pick a date' }: {
    value?: Date | undefined;
    placeholder?: string;
  } = $props();
  
  const df = new DateFormatter("nl-NL", {
    dateStyle: "long"
  });
 
  let dateValue = $state<DateValue | undefined>();
  let contentRef = $state<HTMLElement | null>(null);
  let open = $state(false);
  
  // Convert Date to DateValue when value changes (external -> internal)
  $effect(() => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      const newDateValue = new CalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
      // Only update if different to avoid loops
      if (!dateValue || 
          dateValue.year !== newDateValue.year || 
          dateValue.month !== newDateValue.month || 
          dateValue.day !== newDateValue.day) {
        dateValue = newDateValue;
      }
    } else {
      dateValue = undefined;
    }
  });
  
  // Handle calendar selection (internal -> external)
  function handleDateSelect(selected: DateValue | undefined) {
    dateValue = selected;
    if (selected) {
      value = new Date(selected.year, selected.month - 1, selected.day);
      open = false; // Close popover when date is selected
    }
  }
</script>
 
<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      buttonVariants({
        variant: "outline",
        class: "w-full justify-start text-left font-normal"
      }),
      !value && "text-muted-foreground"
    )}
    style="background: transparent !important; color: var(--foreground) !important;"
  >
    <CalendarIcon />
    {value instanceof Date && !isNaN(value.getTime()) ? df.format(value) : placeholder}
  </Popover.Trigger>
  <Popover.Content bind:ref={contentRef} class="w-auto p-0 border">
    <div style="background-color: var(--background) !important;" class="p-0">
      <Calendar type="single" value={dateValue} onValueChange={handleDateSelect} style="background-color: var(--background) !important;" />
    </div>
  </Popover.Content>
</Popover.Root>