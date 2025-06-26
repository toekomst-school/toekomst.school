<script lang="ts">
  import '../app.css';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/stores";
  export let data;
//   let { children } = $props();

  let breadcrumbMain = 'Home';
  let breadcrumbSecond = '';
  let breadcrumbPage = '';

  $: currentPath = ($page && $page.url && $page.url.pathname) ? $page.url.pathname : '';
  $: if (typeof currentPath === 'string' && currentPath.length > 0) {
    if (currentPath.startsWith('/lessen')) {
      breadcrumbSecond = 'Lessen';
      if (currentPath === '/lessen') {
        breadcrumbPage = '';
      } else if (currentPath === '/lessen/nieuw') {
        breadcrumbPage = 'Nieuwe Les';
      } else if (/^\/lessen\/nieuw\/.+/.test(currentPath)) {
        breadcrumbPage = 'Les Bewerken';
      } else if (/^\/lessen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
        breadcrumbPage = 'Les Details';
      }
    } else {
      breadcrumbSecond = 'Building Your Application';
      breadcrumbPage = 'Data Fetching';
    }
  } else {
    breadcrumbMain = 'Home';
    breadcrumbSecond = '';
    breadcrumbPage = '';
  }
</script>

{#if $page.url.pathname !== '/'}
  {#if data.user}
    <Sidebar.Provider style="--sidebar-width: 19rem;">
      <AppSidebar />
      <Sidebar.Inset>
        <header class="flex h-16 shrink-0 items-center gap-2 px-4">
          <Sidebar.Trigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb.Root>
            <Breadcrumb.List>
              <Breadcrumb.Item class="hidden md:block">
                <Breadcrumb.Link href="/">{breadcrumbMain}</Breadcrumb.Link>
              </Breadcrumb.Item>
              {#if breadcrumbSecond}
                <Breadcrumb.Separator class="hidden md:block" />
                <Breadcrumb.Item>
                  {#if breadcrumbSecond === 'Lessen'}
                    <Breadcrumb.Link href="/lessen">Lessen</Breadcrumb.Link>
                  {:else}
                    <Breadcrumb.Link href="#">{breadcrumbSecond}</Breadcrumb.Link>
                  {/if}
                </Breadcrumb.Item>
              {/if}
              {#if breadcrumbPage}
                <Breadcrumb.Separator class="hidden md:block" />
                <Breadcrumb.Item>
                  <Breadcrumb.Page>{breadcrumbPage}</Breadcrumb.Page>
                </Breadcrumb.Item>
              {/if}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </header>
        <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
            <slot />
        </div>
      </Sidebar.Inset>
    </Sidebar.Provider>
  {/if}
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
