<script lang="ts">
  import '../app.css';
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/stores";
  import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '$lib/components/ui/sheet/index.js';
  import Button from '$lib/components/ui/button/button.svelte';
  export let data;
//   let { children } = $props();

  let breadcrumbMain = 'Home';
  let breadcrumbSecond = '';
  let breadcrumbPage = '';
  let breadcrumbSecondHref = '';

  let showRoleModal = false;
  let selectedRole = '';

  $: currentPath = ($page && $page.url && $page.url.pathname) ? $page.url.pathname : '';
  $: if (typeof currentPath === 'string' && currentPath.length > 0) {
    if (currentPath.startsWith('/lessen')) {
      breadcrumbSecond = 'Lessen';
      breadcrumbSecondHref = '/lessen';
      if (currentPath === '/lessen') {
        breadcrumbPage = '';
      } else if (currentPath === '/lessen/nieuw') {
        breadcrumbPage = 'Nieuwe Les';
      } else if (/^\/lessen\/nieuw\/.+/.test(currentPath)) {
        breadcrumbPage = 'Les Bewerken';
      } else if (/^\/lessen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
        breadcrumbPage = 'Les Details';
      }
    } else if (currentPath.startsWith('/cursussen')) {
      breadcrumbSecond = 'Cursussen';
      breadcrumbSecondHref = '/cursussen';
      if (currentPath === '/cursussen') {
        breadcrumbPage = '';
      } else if (/^\/cursussen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
        breadcrumbPage = 'Cursus Details';
      }
    } else if (currentPath.startsWith('/scholen')) {
      breadcrumbSecond = 'Scholen';
      breadcrumbSecondHref = '/scholen';
      if (currentPath === '/scholen') {
        breadcrumbPage = '';
      } else if (/^\/scholen\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
        breadcrumbPage = 'School Details';
      }
    } else if (currentPath.startsWith('/team')) {
      breadcrumbSecond = 'Team';
      breadcrumbSecondHref = '/team';
      if (currentPath === '/team') {
        breadcrumbPage = '';
      } else if (/^\/team\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
        breadcrumbPage = 'Team Details';
      }
    } else if (currentPath.startsWith('/planning')) {
      breadcrumbSecond = 'Planning';
      breadcrumbSecondHref = '/planning';
      if (currentPath === '/planning') {
        breadcrumbPage = '';
      } else if (currentPath === '/planning/beschikbaar') {
        breadcrumbPage = 'Beschikbaar';
      }
    } else if (currentPath.startsWith('/dashboard')) {
      breadcrumbSecond = 'Dashboard';
      breadcrumbSecondHref = '/dashboard';
      breadcrumbPage = '';
    } else if (currentPath.startsWith('/remote')) {
      breadcrumbSecond = 'Remote';
      breadcrumbSecondHref = '/remote';
      breadcrumbPage = '';
    } else if (currentPath.startsWith('/tabcontrol')) {
      breadcrumbSecond = 'Tabcontrol';
      breadcrumbSecondHref = '/tabcontrol';
      breadcrumbPage = '';
    } else if (currentPath.startsWith('/game')) {
      breadcrumbSecond = 'Game';
      breadcrumbSecondHref = '/game';
      breadcrumbPage = '';
    } else {
      breadcrumbSecond = 'Overzicht';
      breadcrumbSecondHref = '/';
      breadcrumbPage = '';
    }
  } else {
    breadcrumbMain = 'Home';
    breadcrumbSecond = '';
    breadcrumbSecondHref = '';
    breadcrumbPage = '';
  }

  $: if (data.user && (!data.user.labels || data.user.labels.length === 0)) {
    showRoleModal = true;
  }

  async function setRole(role: string) {
    if (!data.user) return;
    selectedRole = role;
    try {
      const res = await fetch('/api/set-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.$id, label: role })
      });
      const result = await res.json();
      if (result.success) {
        showRoleModal = false;
        location.reload();
      } else {
        alert('Kon rol niet opslaan. Probeer opnieuw.');
      }
    } catch (e) {
      alert('Kon rol niet opslaan. Probeer opnieuw.');
      console.error(e);
    }
  }
</script>

{#if $page.url.pathname !== '/'}
  {#if data.user}
    {#if showRoleModal}
      <Sheet open={showRoleModal}>
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Kies je rol</SheetTitle>
            <SheetDescription>
              Ben je een leraar of een leerling? Dit helpt ons de juiste ervaring te bieden.
            </SheetDescription>
          </SheetHeader>
          <div class="flex gap-4 justify-center my-6">
            <Button on:click={() => setRole('teacher')} variant={selectedRole === 'teacher' ? 'secondary' : 'default'}>Leraar</Button>
            <Button on:click={() => setRole('student')} variant={selectedRole === 'student' ? 'secondary' : 'default'}>Leerling</Button>
          </div>
          <SheetFooter>
            <div class="text-xs text-gray-500 text-center">Je kunt dit later aanpassen via je profiel.</div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    {/if}
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
                  <Breadcrumb.Link href={breadcrumbSecondHref}>{breadcrumbSecond}</Breadcrumb.Link>
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
