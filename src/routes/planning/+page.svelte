<script context="module" lang="ts">
declare module '@event-calendar/core';
</script>

<script>
    // import Interaction from '@event-calendar/interaction';
    // @ts-ignore
    import List from '@event-calendar/list';
    import { writable } from 'svelte/store';
    import { account, databases } from '$lib/appwrite';
    import { onMount } from 'svelte';
    import { derived } from 'svelte/store';
    import { page } from '$app/stores';
    import WorkshopForm from '$lib/components/WorkshopForm.svelte';
    import {Calendar, TimeGrid, DayGrid} from '@event-calendar/core';
    import { Client, Databases, Query } from 'appwrite';
    import WorkshopView from '$lib/components/WorkshopView.svelte';
    import { appwrite } from '$lib/appwrite';

    // Calculate Monday of this week
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    let eventIdCounter = 1;
    const exampleEvents = [
      // Available event (orange)
      {
        id: eventIdCounter++,
        title: "Workshop: Robotica",
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 10, 0).toISOString(),
        end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 11, 0).toISOString(),
        color: 'var(--warning)',
        status: 'pending',
        teacher: '',
      },
      // My event (teal)
      {
        id: eventIdCounter++,
        title: "Workshop: 3D Printen",
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 9, 30).toISOString(),
        end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 11, 0).toISOString(),
        color: 'var(--accent)',
        status: 'confirmed',
        teacher: '', // Will be set to currentUserId on mount
      },
      // Available event (orange)
      {
        id: eventIdCounter++,
        title: "Kinderfeestje: Spelletjes",
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 14, 0).toISOString(),
        end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 16, 0).toISOString(),
        color: 'var(--warning)',
        status: 'pending',
        teacher: '',
      },
      // My event (teal)
      {
        id: eventIdCounter++,
        title: "Digi Scouting: Code Challenge",
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 15, 0).toISOString(),
        end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 16, 30).toISOString(),
        color: 'var(--accent)',
        status: 'confirmed',
        teacher: '', // Will be set to currentUserId on mount
      },
      // Available event (orange)
      {
        id: eventIdCounter++,
        title: "Kinderfeestje: Wetenschap",
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4, 13, 0).toISOString(),
        end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4, 15, 0).toISOString(),
        color: 'var(--warning)',
        status: 'pending',
        teacher: '',
      },
    ];

    // Remove static lessonOptions, replace with dynamic
    /** @type {{ value: string, label: string }[]} */
    let lessonOptions: { value: string, label: string }[] = [];
    let schoolOptions: { value: string, label: string }[] = [];
    /** @type {{ value: string, label: string }[]} */
    let teacherOptions: { value: string, label: string }[] = [];
    const groupOptions = [
      { value: 1, label: 'Groep 1' },
      { value: 2, label: 'Groep 2' },
      { value: 3, label: 'Groep 3' },
      { value: 4, label: 'Groep 4' },
      { value: 5, label: 'Groep 5' },
      { value: 6, label: 'Groep 6' },
      { value: 7, label: 'Groep 7' },
      { value: 8, label: 'Groep 8' },
      { value: 9, label: 'Brugklas' },
      { value: 10, label: 'Klas 2' },
      { value: 11, label: 'Klas 3' },
      { value: 12, label: 'Klas 4' },
      { value: 13, label: 'Klas 5' },
      { value: 14, label: 'Klas 6' },
    ];

    // Modal state for editing events
    let showEditModal = false;
    let editEvent: any = null;
    let description = '';
    /** @type {string} */
    let editEventStart = '';
    /** @type {string} */
    let editEventEnd = '';

    let showCreateModal = false;

    let calendarKey = 0;
    /** @type {any} */
    let calendarRef: any;

    // Modal state for new fields
    let selectedLesson = '';
    let selectedSchool = '';
    let selectedGroup = '';
    let selectedTeacher = '';
    let lessonLength = 45;
    let materialen = '';
    let status = 'pending'; // default: 'pending' (In afwachting)
    const statusOptions = [
      { value: 'pending', label: 'In afwachting' },
      { value: 'confirmed', label: 'Bevestigd' },
      { value: 'declined', label: 'Geweigerd' },
    ];

    let currentUserId = '';
    let currentUserLabels = [];
    let isAdmin = false;
    let isVakdocent = false;
    let currentTab = 'beschikbaar'; // 'beschikbaar' or 'mijn-planning'

    const databaseId = 'lessen';
    const collectionId = 'planning';

    let groupExtension = '';

    // For fetching schools
    const SCHOOL_DB_ID = 'scholen';
    const SCHOOL_COLLECTION_ID = 'school';

    /** @type {any} */
    const options = writable({
        view: 'dayGridMonth',
        events: [], // Start empty, will be filled from Appwrite
        locale: 'nl',
        firstDay: 1,
        editable: true,
        headerToolbar: {
            start: 'prev,next today',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        eventClick: handleEventClick
    });

    // Filtered event lists
    /** @type {import('svelte/store').Readable<any[]>} */
    const myEvents = derived(options, ($options: any) => ($options.events as any[]).filter(ev => ev.teacher === currentUserId));
    /** @type {import('svelte/store').Readable<any[]>} */
    const availableEvents = derived(options, ($options: any) => ($options.events as any[]).filter(ev => !ev.teacher || ev.status === 'pending'));

    let showViewModal = false;
    let viewEvent = null;

    onMount(async () => {
      try {
        // Fetch lessons for the select
        const lessonsRes = await databases.listDocuments('lessen', 'les');
        lessonOptions = lessonsRes.documents.map(lesson => ({
          value: lesson.$id,
          label: lesson.onderwerp || lesson.lesnummer || 'Les zonder naam'
        }));

        // Fetch vakdocenten for the select
        const teachersRes = await databases.listDocuments('lessen', 'vakdocent');
        teacherOptions = teachersRes.documents.map(teacher => ({
          value: teacher.$id,
          label: teacher.name || teacher.email || 'Vakdocent zonder naam'
        }));

        // Fetch only client schools (KLANT = true) from correct DB/collection
        const schoolsRes = await databases.listDocuments(SCHOOL_DB_ID, SCHOOL_COLLECTION_ID, [Query.equal('KLANT', true), Query.limit(1000)]);
        schoolOptions = schoolsRes.documents.map(school => ({
          value: school.$id,
          label: school.NAAM || school.$id
        }));

        const user = await account.get();
        currentUserId = user.$id;
        currentUserLabels = user.labels || [];
        isAdmin = currentUserLabels.includes('admin');
        isVakdocent = currentUserLabels.includes('vakdocent');
        // Fetch events from Appwrite
        const res = await databases.listDocuments(databaseId, collectionId);
        options.update(current => ({
          ...current,
          events: res.documents.map(doc => ({
            ...doc,
            id: doc.$id,
            extendedProps: {
              lesson: doc.lesson,
              school: doc.school,
              teacher: doc.teacher,
              group: doc.group,
              groupExtension: doc.groupExtension,
              materialen: doc.materialen,
              status: doc.status,
              description: doc.description,
              length: doc.length,
              color: doc.color,
              start: doc.start,
              end: doc.end
            }
          }))
        }));
      } catch (e) {
        currentUserId = '';
        currentUserLabels = [];
        isAdmin = false;
        isVakdocent = false;
        console.error('Failed to fetch planning events, user, lessons, vakdocenten, or schools:', e);
      }
    });

    /**
     * @param {any} event
     */
    async function claimEvent(event) {
        if (!currentUserId) return;
        const updatedEvent = { ...event, teacher: currentUserId, status: 'confirmed', color: 'var(--accent)' };
        try {
            await databases.updateDocument(databaseId, collectionId, updatedEvent.id, updatedEvent);
            // @ts-ignore
            options.update(current => ({
                ...current,
                events: current.events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev)
            }));
            if (calendarRef && typeof calendarRef.updateEvent === 'function') {
                calendarRef.updateEvent(updatedEvent);
            }
        } catch (e) {
            console.error('Failed to claim event:', e);
        }
    }

    /**
     * @param {any} event
     */
    function openEditModal(event) {
        editEvent = event;
        description = event.description || '';
        let startStr = typeof event.start === 'string' ? event.start : event.start.toISOString();
        editEventStart = startStr.slice(0, 16);
        selectedLesson = lessonOptions.find(opt => opt.value === event.lesson) || null;
        selectedSchool = schoolOptions.find(opt => opt.value === event.school) || null;
        selectedGroup = event.group || '';
        groupExtension = event.groupExtension || '';
        selectedTeacher = teacherOptions.find(opt => opt.value === event.teacher) || null;
        lessonLength = event.length || 45;
        materialen = event.materialen || '';
        status = event.status || 'pending';
        showEditModal = true;
    }
    function closeEditModal() {
        showEditModal = false;
        editEvent = null;
        description = '';
        editEventStart = '';
        selectedLesson = '';
        selectedSchool = '';
        selectedGroup = '';
        groupExtension = '';
        selectedTeacher = '';
        lessonLength = 45;
        materialen = '';
        status = 'pending';
    }
    function getEndTime() {
        if (!editEventStart || !lessonLength) return '';
        const totalMinutes = Number(lessonLength);
        const end = new Date(new Date(editEventStart).getTime() + totalMinutes * 60000);
        return end.toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    }
    async function submitEditEvent(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!editEvent) return;
        const totalMinutes = Number(lessonLength);
        const end = new Date(new Date(editEventStart).getTime() + totalMinutes * 60000).toISOString();
        const updatedEvent = {
            ...editEvent,
            description,
            start: new Date(editEventStart).toISOString(),
            end,
            lesson: selectedLesson ? selectedLesson.value : '',
            school: selectedSchool ? selectedSchool.value : '',
            group: groupExtension ? `${selectedGroup} - ${groupExtension}` : selectedGroup,
            groupExtension,
            teacher: selectedTeacher ? selectedTeacher.value : '',
            length: lessonLength,
            materialen,
            status,
            color: status === 'pending' || !selectedTeacher ? 'var(--warning)' : 'var(--accent)',
        };
        try {
            await databases.updateDocument(databaseId, collectionId, updatedEvent.id, updatedEvent);
            options.update(current => ({
                ...current,
                events: current.events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev)
            }));
            if (calendarRef && typeof calendarRef.updateEvent === 'function') {
                calendarRef.updateEvent(updatedEvent);
            }
        } catch (e) {
            console.error('Failed to update event:', e);
        }
        closeEditModal();
    }

    function openCreateModal() {
        showCreateModal = true;
        editEvent = null;
        editEventStart = '';
        const now = new Date();
        editEventStart = now.toISOString().slice(0, 16);
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        editEventEnd = end.toISOString().slice(0, 16);
        selectedLesson = null;
        selectedSchool = null;
        selectedGroup = '';
        selectedTeacher = null;
        lessonLength = 45;
        materialen = '';
        status = 'pending';
    }

    function closeCreateModal() {
        showCreateModal = false;
        editEvent = null;
        editEventStart = '';
        editEventEnd = '';
        selectedLesson = '';
        selectedSchool = '';
        selectedGroup = '';
        selectedTeacher = '';
        lessonLength = 45;
        materialen = '';
        status = 'pending';
    }

    async function submitCreateEvent(e) {
        if (e && e.preventDefault) e.preventDefault();
        const totalMinutes = Number(lessonLength);
        const end = new Date(new Date(editEventStart).getTime() + totalMinutes * 60000).toISOString();
        const newEvent = {
            description,
            start: new Date(editEventStart).toISOString(),
            end,
            lesson: selectedLesson ? selectedLesson.value : '',
            school: selectedSchool ? selectedSchool.value : '',
            group: groupExtension ? `${selectedGroup} - ${groupExtension}` : selectedGroup,
            groupExtension,
            teacher: selectedTeacher ? selectedTeacher.value : '',
            length: lessonLength,
            materialen,
            status,
            color: status === 'pending' || !selectedTeacher ? 'var(--warning)' : 'var(--accent)',
        };
        try {
            const doc = await databases.createDocument(databaseId, collectionId, 'unique()', newEvent);
            options.update(current => ({
                ...current,
                events: [...current.events, { ...newEvent, id: doc.$id }]
            }));
        } catch (e) {
            console.error('Failed to create event:', e);
        }
        closeCreateModal();
    }

    /**
     * @param {object} info
     * @property {object} info.el - The HTML element for the event
     * @property {object} info.event - The associated Event object
     * @property {object} info.jsEvent - The native JS event
     * @property {object} info.view - The current View object
     */
    function handleEventClick(info) {
        openViewModal(info.event);
    }

    async function openViewModal(event) {
        const props = event.extendedProps || event;
        console.log('openViewModal: event', event);
        console.log('openViewModal: props', props);
        const lessonOpt = lessonOptions.find(opt => opt.value === props.lesson);
        const schoolOpt = schoolOptions.find(opt => opt.value === props.school);
        const teacherOpt = teacherOptions.find(opt => opt.value === props.teacher);
        console.log('Resolved lessonOpt:', lessonOpt);
        console.log('Resolved schoolOpt:', schoolOpt);
        console.log('Resolved teacherOpt:', teacherOpt);
        let schoolData = null;
        if (props.school) {
            try {
                const databases = new Databases(appwrite);
                schoolData = await databases.getDocument('scholen', 'school', props.school);
            } catch (e) {
                console.error('Failed to fetch school data for view modal:', e);
            }
        }
        viewEvent = {
            ...props,
            lessonName: lessonOpt ? lessonOpt.label : '-',
            lessonId: props.lesson,
            schoolName: schoolOpt ? schoolOpt.label : '-',
            schoolId: props.school,
            teacherName: teacherOpt ? teacherOpt.label : '-',
            teacherId: props.teacher,
            schoolData
        };
        console.log('viewEvent for modal:', viewEvent);
        showViewModal = true;
    }
    function closeViewModal() {
        showViewModal = false;
        viewEvent = null;
    }

    function handleEditFromView() {
        const currentViewEvent = viewEvent;
        if (!currentViewEvent) {
            console.warn('handleEditFromView: viewEvent is null or undefined');
            return;
        }
        closeViewModal();
        // Find the event in the current events list by id (viewEvent.id or viewEvent.$id)
        let eventId = currentViewEvent.id || currentViewEvent.$id;
        let event = null;
        // Try to find in $myEvents and $availableEvents
        if ($myEvents) event = $myEvents.find(ev => ev.id === eventId || ev.$id === eventId);
        if (!event && $availableEvents) event = $availableEvents.find(ev => ev.id === eventId || ev.$id === eventId);
        if (!event) event = currentViewEvent; // fallback
        openEditModal(event);
    }
</script>

<div style="display: flex; justify-content: flex-end; margin-bottom: 1rem; gap: 1rem;">
    {#if isAdmin}
      <button type="button" class="add-workshop-btn" on:click={openCreateModal}>+ Workshop toevoegen</button>
    {/if}
    <button type="button" class="tab-btn" class:active-tab={currentTab === 'mijn-planning'} on:click={() => currentTab = 'mijn-planning'}>Mijn planning</button>
</div>

{#if currentTab === 'beschikbaar'}
    <!-- Beschikbare events calendar only -->
    <Calendar bind:this={calendarRef} key={calendarKey + '-beschikbaar'} plugins={[TimeGrid, DayGrid, List]} options={{ ...$options, events: $availableEvents }} />
{/if}
{#if currentTab === 'mijn-planning'}
    <!-- Mijn planning calendar -->
    <Calendar bind:this={calendarRef} key={calendarKey + '-mijn'} plugins={[TimeGrid, DayGrid, List]} options={{ ...$options, events: $myEvents }} />
    <div class="event-list">
        <h3>Mijn geplande events</h3>
        {#each $myEvents as event (event.id)}
            <div class="event-row" on:click={() => openViewModal(event)} style="cursor:pointer;">
                <span>{event.title} ({event.start.slice(0, 16)})</span>
            </div>
        {/each}
    </div>
{/if}

{#if showEditModal}
<div class="modal-backdrop" on:click={closeEditModal}></div>
<div class="modal" on:click|stopPropagation>
    <WorkshopForm
        lessonOptions={lessonOptions}
        schoolOptions={schoolOptions}
        groupOptions={groupOptions}
        teacherOptions={teacherOptions}
        statusOptions={statusOptions}
        isEdit={true}
        initialValues={{
            lesson: selectedLesson,
            school: selectedSchool,
            group: selectedGroup,
            groupExtension,
            teacher: selectedTeacher,
            length: lessonLength,
            materialen,
            status,
            description,
            start: editEventStart
        }}
        bind:selectedLesson
        bind:selectedSchool
        bind:selectedGroup
        bind:groupExtension
        bind:selectedTeacher
        bind:lessonLength
        bind:materialen
        bind:status
        bind:description
        bind:editEventStart
        on:submit={submitEditEvent}
        on:cancel={closeEditModal}
    />
</div>
{/if}

{#if showCreateModal}
<div class="modal-backdrop" on:click={closeCreateModal}></div>
<div class="modal" on:click|stopPropagation>
    <WorkshopForm
        lessonOptions={lessonOptions}
        schoolOptions={schoolOptions}
        groupOptions={groupOptions}
        teacherOptions={teacherOptions}
        statusOptions={statusOptions}
        isEdit={false}
        initialValues={{}}
        bind:selectedLesson
        bind:selectedSchool
        bind:selectedGroup
        bind:groupExtension
        bind:selectedTeacher
        bind:lessonLength
        bind:materialen
        bind:status
        bind:description
        bind:editEventStart
        on:submit={submitCreateEvent}
        on:cancel={closeCreateModal}
    />
</div>
{/if}

{#if showViewModal}
<div class="modal-backdrop" on:click={closeViewModal}></div>
<div class="modal" on:click|stopPropagation>
    <WorkshopView event={viewEvent} on:close={closeViewModal} on:edit={handleEditFromView} />
</div>
{/if}

<style>
.modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 10;
}
.modal {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: var(--background);
    color: var(--foreground);
    padding: 2.5rem 2rem;
    border-radius: 1rem;
    z-index: 11;
    min-width: 320px;
    max-width: 95vw;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}
@media (max-width: 600px) {
    .modal {
        padding: 1.25rem 0.5rem;
        min-width: 0;
        width: 98vw;
    }
}
.modal form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 2rem;
}
@media (max-width: 600px) {
    .modal form {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }
}
.modal h2 {
    grid-column: 1 / -1;
    margin-bottom: 0.5rem;
    font-size: 1.3rem;
    font-weight: bold;
    letter-spacing: 0.02em;
}
.modal label {
    display: flex;
    flex-direction: column;
    font-weight: bold;
    font-size: 1rem;
    gap: 0.25rem;
}
.modal input,
.modal select,
.modal textarea {
    font-size: 1rem;
    padding: 0.5em 0.75em;
    border-radius: var(--radius);
    border: 1px solid var(--color-ash-grey);
    background: #fff;
    color: var(--color-blackened-steel);
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
}
.modal textarea {
    resize: vertical;
    min-height: 2.5em;
}
.modal-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}
@media (max-width: 600px) {
    .modal-actions {
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
}
.workshop-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    align-items: center;
}
.break-row {
    margin-bottom: 0.5rem;
    margin-left: 2rem;
}
.add-workshop-btn {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}
.add-workshop-btn:hover {
    background: var(--warning);
    color: var(--color-blackened-steel);
}
.tab-btn {
    background: var(--ash-grey);
    color: var(--color-blackened-steel);
    border: none;
    border-radius: var(--radius);
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}
.tab-btn.active-tab {
    background: var(--accent);
    color: #fff;
}
.event-list {
    margin-top: 1rem;
}
.event-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
}
.claim-btn {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 0.25rem 0.75rem;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.2s;
}
.claim-btn:hover {
    background: var(--warning);
    color: var(--color-blackened-steel);
}
</style>