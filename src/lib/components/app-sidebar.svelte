<script lang="ts" module>
    // Only the requested menu items with correct URLs
    const data = {
      navMain: [
        { title: "Dashboard", url: "/dashboard" },
        { title: "Planning", url: "/planning", children: [
          { title: "Beschikbaar", url: "/planning#beschikbaar" },
          { title: "Mijn planning", url: "/planning#mijn-planning" },
        ] },
        { title: "Cursussen", url: "/cursussen" },
        { title: "Lessen", url: "/lessen" },
        { title: "Scholen", url: "/scholen", children: [
        ] },
        { title: "Team", url: "/team" },
        { title: "Tabcontrol", url: "/abcontrol" },
        { title: "Game", url: "/game" },
      ],
    };
  </script>
  <script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    import type { ComponentProps } from "svelte";
    import SunIcon from "@lucide/svelte/icons/sun";
    import MoonIcon from "@lucide/svelte/icons/moon";
    import SettingsIcon from "@lucide/svelte/icons/settings";
    import UserIcon from "@lucide/svelte/icons/user";
    import { onMount } from "svelte";
    import { writable } from "svelte/store";

    let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

    const themeStore = writable('dark');
    let theme = 'dark';
    const unsubscribe = themeStore.subscribe(value => theme = value);

    function toggleTheme() {
      themeStore.update(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', next === 'dark');
        document.documentElement.classList.toggle('light', next === 'light');
        localStorage.setItem('theme', next);
        return next;
      });
    }

    onMount(() => {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        themeStore.set(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
        document.documentElement.classList.toggle('light', saved === 'light');
      } else {
        themeStore.set('dark');
        document.documentElement.classList.add('dark');
      }
    });
  </script>
  <Sidebar.Root variant="floating" {...restProps}>
    <Sidebar.Header>
      <div class="flex items-center justify-center py-6">
        <img src="/toekomst_logo.svg" alt="Toekomst Logo" class="h-12 w-auto logo-invert-light" />
      </div>
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.Menu class="gap-2">
          {#each data.navMain as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href={item.url} class="font-medium" {...props}>
                    {item.title}
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              {#if item.children}
                <Sidebar.MenuSub>
                  {#each item.children as subitem (subitem.title)}
                    <Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton>
                        <a href={subitem.url} class="font-medium">{subitem.title}</a>
                      </Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>
                  {/each}
                </Sidebar.MenuSub>
              {/if}
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>
      <div class="flex items-center justify-around gap-2 pt-2 border-t border-sidebar-border">
        <button aria-label="Toggle theme" on:click={toggleTheme} class="p-2 rounded hover:bg-sidebar-accent transition-colors">
          {#if theme === 'dark'}
            <SunIcon />
          {:else}
            <MoonIcon />
          {/if}
        </button>
        <a href="#" aria-label="Settings" class="p-2 rounded hover:bg-sidebar-accent transition-colors">
          <SettingsIcon />
        </a>
        <a href="#" aria-label="Account" class="p-2 rounded hover:bg-sidebar-accent transition-colors">
          <UserIcon />
        </a>
      </div>
    </Sidebar.Footer>
  </Sidebar.Root>