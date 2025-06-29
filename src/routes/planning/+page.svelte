<script>
    import {Calendar, TimeGrid} from '@event-calendar/core';
    import { writable } from 'svelte/store';

    let showModal = false;
    let eventType = 'workshop';
    let workshopCount = 1;
    let workshopDurations = ['45m', '1h', '1.5h', '2h'];
    let workshops = [
        { duration: '1h', lesson: '' }
    ];
    let lessons = ['Les 1', 'Les 2', 'Les 3', 'Les 4']; // Replace with your actual lessons
    let eventTitle = '';
    let eventDate = '';
    let eventTime = '';
    let breaks = [15];

    /** @type {any} */
    const options = writable({
        view: 'timeGridWeek',
        events: [],
        locale: 'nl',
        firstDay: 1,
    });

    function openModal() {
        showModal = true;
    }
    function closeModal() {
        showModal = false;
        resetForm();
    }
    function resetForm() {
        eventType = 'workshop';
        workshopCount = 1;
        workshops = [{ duration: '1h', lesson: '' }];
        eventTitle = '';
        eventDate = '';
        eventTime = '';
    }
    function addWorkshop() {
        if (workshops.length < 4) {
            workshops = [...workshops, { duration: '1h', lesson: '' }];
            if (workshops.length > 1) breaks = [...breaks, 15];
        }
    }
    // @ts-ignore
    function removeWorkshop(idx) {
        if (workshops.length > 1) {
            if (idx < breaks.length) breaks = breaks.filter((_, i) => i !== idx);
            workshops = workshops.filter((_, i) => i !== idx);
        }
    }
    // @ts-ignore
    function handleWorkshopChange(idx, field, value) {
        workshops = workshops.map((w, i) => i === idx ? { ...w, [field]: value } : w);
    }
    function submitEvent() {
        // @ts-ignore
        options.update(current => {
            let newEvents = [...current.events];
            if (eventType === 'workshop') {
                let start = new Date(`${eventDate}T${eventTime}`);
                for (let i = 0; i < workshops.length; i++) {
                    let duration = workshops[i].duration;
                    let mins = duration === '45m' ? 45 : duration === '1h' ? 60 : duration === '1.5h' ? 90 : 120;
                    let end = new Date(start.getTime() + mins * 60000);
                    newEvents.push({
                        title: `Workshop: ${workshops[i].lesson}`,
                        start: start.toISOString(),
                        end: end.toISOString(),
                    });
                    // Add a break event between workshops, except after the last one
                    if (i < workshops.length - 1) {
                        let breakDuration = breaks[i] || 15;
                        let breakStart = end;
                        let breakEnd = new Date(breakStart.getTime() + breakDuration * 60000);
                        newEvents.push({
                            title: 'Break',
                            start: breakStart.toISOString(),
                            end: breakEnd.toISOString(),
                        });
                        start = breakEnd;
                    } else {
                        start = new Date(end.getTime() + 15 * 60000);
                    }
                }
            } else {
                let start = new Date(`${eventDate}T${eventTime}`);
                let end = new Date(start.getTime() + 60 * 60000);
                newEvents.push({
                    title: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
                    start: start.toISOString(),
                    end: end.toISOString(),
                });
            }
            return { ...current, events: newEvents };
        });
        closeModal();
    }
</script>

<button on:click={openModal}>Create Event</button>

{#if showModal}
<div class="modal-backdrop" on:click={closeModal}></div>
<div class="modal" on:click|stopPropagation>
    <form on:submit|preventDefault={submitEvent}>
        <h2>Create Event</h2>
        <label>
            Event type:
            <select bind:value={eventType}>
                <option value="workshop">Workshop</option>
                <option value="kinderfeestje">Kinderfeestje</option>
                <option value="digi scouting">Digi Scouting</option>
            </select>
        </label>
        <label>
            Date:
            <input type="date" bind:value={eventDate} required />
        </label>
        <label>
            Start time:
            <input type="time" bind:value={eventTime} required />
        </label>
        {#if eventType === 'workshop'}
            <div>
                <h3>Workshops (max 4 in a row)</h3>
                {#each workshops as workshop, idx (idx)}
                    <div class="workshop-row">
                        <label>
                            Duration:
                            <select bind:value={workshop.duration} on:change={e => { 
                                // @ts-ignore
                                const target = /** @type {HTMLSelectElement} */ (e.target); 
                                if (target) handleWorkshopChange(idx, 'duration', target.value); 
                            }}>
                                {#each workshopDurations as d}
                                    <option value={d}>{d}</option>
                                {/each}
                            </select>
                        </label>
                        <label>
                            Lesson:
                            <select bind:value={workshop.lesson} on:change={e => { 
                                // @ts-ignore
                                const target = /** @type {HTMLSelectElement} */ (e.target); 
                                if (target) handleWorkshopChange(idx, 'lesson', target.value); 
                            }} required>
                                <option value="" disabled selected>Select lesson</option>
                                {#each lessons as lesson}
                                    <option value={lesson}>{lesson}</option>
                                {/each}
                            </select>
                        </label>
                        {#if workshops.length > 1}
                            <button type="button" on:click={() => removeWorkshop(idx)}>Remove</button>
                        {/if}
                    </div>
                    {#if idx < workshops.length - 1}
                        <div class="break-row">
                            <label>
                                Break after this workshop (minutes):
                                <input type="number" min="1" bind:value={breaks[idx]} />
                            </label>
                        </div>
                    {/if}
                {/each}
                {#if workshops.length < 4}
                    <button type="button" on:click={addWorkshop}>Add Workshop</button>
                {/if}
            </div>
        {/if}
        <div class="modal-actions">
            <button type="submit">Add Event</button>
            <button type="button" on:click={closeModal}>Cancel</button>
        </div>
    </form>
</div>
{/if}

<Calendar plugins={[TimeGrid]} options={$options} />

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
    background: white;
    padding: 2rem;
    border-radius: 8px;
    z-index: 11;
    min-width: 300px;
    max-width: 90vw;
}
.workshop-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    align-items: center;
}
.modal-actions {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
}
.break-row {
    margin-bottom: 0.5rem;
    margin-left: 2rem;
}
</style>