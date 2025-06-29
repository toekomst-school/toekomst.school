<script lang="ts" module>
    // Only the requested menu items with correct URLs
    const data = {
      navMain: [
        { title: "dashboard", url: "/dashboard" },
        { title: "Beschikbaar", url: "/beschikbaar" },
        { title: "planning", url: "/planning" },
        { title: "cursussen", url: "/cursussen" },
        { title: "lessen", url: "/lessen" },
        { title: "tabcontrol", url: "/tabcontrol" },
        { title: "game", url: "/game" },
      ],
    };
  </script>
  <script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    import type { ComponentProps } from "svelte";
    let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
  </script>
  <Sidebar.Root variant="floating" {...restProps}>
    <Sidebar.Header>
      <div class="flex items-center justify-center py-6">
        <img src="/toekomst_logo.svg" alt="Toekomst Logo" class="h-12 w-auto" />
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
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.Group>
    </Sidebar.Content>
  </Sidebar.Root>