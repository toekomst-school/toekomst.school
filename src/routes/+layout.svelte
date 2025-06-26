<script lang="ts">
  import '../app.css';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/stores";
//   let { children } = $props();
</script>

{#if $page.url.pathname !== '/'}
  <Sidebar.Provider style="--sidebar-width: 19rem;">
    <AppSidebar />
    <Sidebar.Inset>
      <header class="flex h-16 shrink-0 items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item class="hidden md:block">
              <Breadcrumb.Link href="#">Building Your Application</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator class="hidden md:block" />
            <Breadcrumb.Item>
              <Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
          <slot />
      </div>
    </Sidebar.Inset>
  </Sidebar.Provider>
{:else}
  <div class="fixed top-4 left-4 z-50">
    <img src="/toekomst_logo.svg" alt="Toekomst Logo" class="h-12 w-auto" />
  </div>
  <div class="fixed top-4 right-4 z-50">
	<a href="/dashboard">
    <button class="h-10 px-6  bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition flex items-center" style="line-height:1;">
      Login
    </button></a>
  </div>
  <slot />
{/if}


<!-- {@render children()} -->
