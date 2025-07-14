<script lang="ts">
  import Clock from "@lucide/svelte/icons/clock";
  import { cn } from "$lib/utils.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";

  let { 
    value = $bindable(), 
    placeholder = '08:30 AM' 
  }: {
    value?: { hour: number; minute: number } | undefined;
    placeholder?: string;
  } = $props();

  let open = $state(false);
  let mode = $state<'hour' | 'minute'>('hour');
  let tempHour = $state(8);
  let tempMinute = $state(30);
  let tempPeriod = $state<'AM' | 'PM'>('AM');

  // Initialize temp values when value changes
  $effect(() => {
    if (value) {
      const hour12 = value.hour === 0 ? 12 : value.hour > 12 ? value.hour - 12 : value.hour;
      const period = value.hour >= 12 ? 'PM' : 'AM';
      tempHour = hour12;
      tempMinute = value.minute;
      tempPeriod = period;
    }
  });

  function selectHour(hour: number) {
    tempHour = hour;
    // Update value immediately when hour changes
    let hour24 = hour;
    if (tempPeriod === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (tempPeriod === 'AM' && hour === 12) {
      hour24 = 0;
    }
    value = { hour: hour24, minute: tempMinute };
    // Automatically switch to minute selection
    setTimeout(() => {
      mode = 'minute';
    }, 300);
  }

  function selectMinute(minute: number) {
    tempMinute = minute;
    // Convert 12-hour to 24-hour format
    let hour24 = tempHour;
    if (tempPeriod === 'PM' && tempHour !== 12) {
      hour24 = tempHour + 12;
    } else if (tempPeriod === 'AM' && tempHour === 12) {
      hour24 = 0;
    }
    value = { hour: hour24, minute: tempMinute };
    // Close popover immediately after selecting minutes
    open = false;
    mode = 'hour';
  }

  function togglePeriod() {
    tempPeriod = tempPeriod === 'AM' ? 'PM' : 'AM';
    // Update value immediately when period changes
    let hour24 = tempHour;
    if (tempPeriod === 'PM' && tempHour !== 12) {
      hour24 = tempHour + 12;
    } else if (tempPeriod === 'AM' && tempHour === 12) {
      hour24 = 0;
    }
    value = { hour: hour24, minute: tempMinute };
  }


  // Generate clock positions for hours and minutes
  function getClockPosition(index: number, total: number, radius: number = 80) {
    const angle = (index * 360 / total) - 90;
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius + 100,
      y: Math.sin(radian) * radius + 100
    };
  }

  const hours = Array.from({ length: 12 }, (_, i) => i); // 0-11 for 12-hour format
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
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
    <Clock />
    {value ? (() => {
      const hour12 = value.hour === 0 ? 12 : value.hour > 12 ? value.hour - 12 : value.hour;
      const period = value.hour >= 12 ? 'PM' : 'AM';
      return `${hour12.toString().padStart(2, '0')}:${value.minute.toString().padStart(2, '0')} ${period}`;
    })() : '08:30 AM'}
  </Popover.Trigger>
  <Popover.Content class="w-auto max-w-[100vw] sm:max-w-md p-4 border">
    <div style="background-color: var(--background) !important;" class="space-y-4 w-full">
      <!-- Analog Clock -->
      <div class="relative mx-auto w-full min-w-[250px] max-w-[350px] aspect-square">
        <svg width="100%" height="100%" viewBox="0 0 200 200" class="absolute inset-0">
          
          {#if mode === 'hour'}
            <!-- AM/PM Toggle in center -->
            <circle 
              cx="100" 
              cy="100" 
              r="30" 
              fill={tempPeriod === 'AM' ? 'var(--accent)' : 'var(--muted)'} 
              stroke="currentColor" 
              stroke-width="2"
              class="cursor-pointer"
              onclick={togglePeriod}
            />
            <text 
              x="100" 
              y="105" 
              text-anchor="middle" 
              class="text-sm font-bold pointer-events-none"
              fill="white"
            >
              {tempPeriod}
            </text>
            
            <!-- Hour markers -->
            {#each hours as hour}
              {@const pos = getClockPosition(hour, 12)}
              {@const displayHour = hour === 0 ? 12 : hour}
              <g>
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="18" 
                  fill={tempHour === displayHour ? 'var(--accent)' : 'transparent'} 
                  stroke="currentColor" 
                  stroke-width="1"
                  class="cursor-pointer hover:fill-accent/50"
                  onclick={() => selectHour(displayHour)}
                />
                <text 
                  x={pos.x} 
                  y={pos.y + 4} 
                  text-anchor="middle" 
                  class="text-sm font-medium pointer-events-none"
                  fill={tempHour === displayHour ? 'white' : 'currentColor'}
                >
                  {displayHour}
                </text>
              </g>
            {/each}
          {:else}
            <!-- Minute markers -->
            {#each minutes as minute}
              {@const pos = getClockPosition(minute / 5, 12)}
              <g>
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="18" 
                  fill={tempMinute === minute ? 'var(--accent)' : 'transparent'} 
                  stroke="currentColor" 
                  stroke-width="1"
                  class="cursor-pointer hover:fill-accent/50"
                  onclick={() => selectMinute(minute)}
                />
                <text 
                  x={pos.x} 
                  y={pos.y + 4} 
                  text-anchor="middle" 
                  class="text-xs font-medium pointer-events-none"
                  fill={tempMinute === minute ? 'white' : 'currentColor'}
                >
                  {minute.toString().padStart(2, '0')}
                </text>
              </g>
            {/each}
          {/if}
        </svg>
      </div>

    </div>
  </Popover.Content>
</Popover.Root>